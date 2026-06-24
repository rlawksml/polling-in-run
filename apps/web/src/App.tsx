import { useQuery } from '@tanstack/react-query'
import { Capacitor } from '@capacitor/core'
import { extent, line, max, scaleBand, scaleLinear } from 'd3'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  getFacilities,
  type FacilityBounds,
  type FacilityType,
} from './api/facilities'
import { FacilityIcon } from './components/FacilityIcon'
import { KakaoMap } from './components/KakaoMap'
import { Button } from './components/ui/button'
import { useCurrentLocation } from './hooks/use-current-location'
import {
  formatDistance,
  formatElapsedTime,
  formatPace,
  type RunLocationPoint,
  useRunningSession,
} from './hooks/use-running-session'
import './App.css'
import {
  NativeMap,
  type NativeMapFacility,
  type NativeMapTouchArea,
} from './lib/native-map'

const locationMessages = {
  idle: '현재 위치를 준비하고 있어요.',
  loading: '현재 위치를 확인하고 있어요.',
  success: '현재 위치를 중심으로 지도를 보여드려요.',
  denied: '위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해주세요.',
  unavailable: '현재 위치를 가져올 수 없어요. 잠시 후 다시 시도해주세요.',
  timeout: '위치 확인 시간이 오래 걸리고 있어요. 다시 시도해주세요.',
  unsupported: '이 브라우저는 위치 기능을 지원하지 않아요.',
}

const RUN_RECORDS_STORAGE_KEY = 'polling-in-run.records.v1'
const RUN_GOALS_STORAGE_KEY = 'polling-in-run.goals.v1'
const APP_BOOT_MIN_LOADING_MS = 2000
const NATIVE_MAP_FACILITY_LIMIT = 300
const NATIVE_TOUCH_AREA_SELECTORS = [
  '.home-brand-card',
  '.app-loading-screen',
  '.map-loading-skeleton',
  '.facility-filter',
  '.facility-status',
  '.native-map-controls',
  '.native-map-status',
  '.location-card',
  '.records-panel',
  '.my-panel',
  '.running-panel',
  '.start-button',
  '.bottom-nav',
] as const
const DEFAULT_RUN_GOALS = {
  monthlyDistanceKm: 40,
  weeklyDistanceKm: 10,
}

type AppTab = 'home' | 'records' | 'my'
type RecordMemoFilter = 'all' | 'memo'
type RecordSortKey = 'date' | 'distance' | 'duration' | 'pace'

type RunRecord = {
  distanceM: number
  elapsedMs: number
  id: string
  memo?: string
  pace: string
  routePoints?: RunLocationPoint[]
  routePointCount: number
  savedAt: string
}

type RunGoals = typeof DEFAULT_RUN_GOALS

function readRunRecords(storageKey: string): RunRecord[] {
  try {
    const rawRecords = window.localStorage.getItem(storageKey)

    return rawRecords ? JSON.parse(rawRecords) : []
  } catch {
    return []
  }
}

function readRunGoals(storageKey: string): RunGoals {
  try {
    const rawGoals = window.localStorage.getItem(storageKey)

    if (!rawGoals) {
      return DEFAULT_RUN_GOALS
    }

    const parsedGoals = JSON.parse(rawGoals)

    return {
      monthlyDistanceKm:
        Number(parsedGoals.monthlyDistanceKm) || DEFAULT_RUN_GOALS.monthlyDistanceKm,
      weeklyDistanceKm:
        Number(parsedGoals.weeklyDistanceKm) || DEFAULT_RUN_GOALS.weeklyDistanceKm,
    }
  } catch {
    return DEFAULT_RUN_GOALS
  }
}

function startOfWeek(date: Date) {
  const nextDate = new Date(date)
  const day = nextDate.getDay()
  const diff = day === 0 ? -6 : 1 - day

  nextDate.setDate(nextDate.getDate() + diff)
  nextDate.setHours(0, 0, 0, 0)

  return nextDate
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function sumDistanceSince(records: RunRecord[], startDate: Date) {
  return records.reduce((sum, record) => {
    const savedAt = new Date(record.savedAt)

    return savedAt >= startDate ? sum + record.distanceM : sum
  }, 0)
}

function formatGoalProgress(distanceM: number, goalKm: number) {
  if (goalKm <= 0) {
    return 0
  }

  return Math.min(100, Math.round((distanceM / (goalKm * 1000)) * 100))
}

function formatAveragePace(records: RunRecord[]) {
  const totalDistanceM = records.reduce((sum, record) => sum + record.distanceM, 0)
  const totalElapsedMs = records.reduce((sum, record) => sum + record.elapsedMs, 0)

  return formatPace(totalElapsedMs, totalDistanceM)
}

function getMonthlyDistanceSeries(records: RunRecord[]) {
  const now = new Date()

  return Array.from({ length: 4 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (3 - index), 1)
    const label = `${monthDate.getMonth() + 1}월`
    const distanceM = records
      .filter((record) => {
        const savedAt = new Date(record.savedAt)

        return (
          savedAt.getFullYear() === monthDate.getFullYear() &&
          savedAt.getMonth() === monthDate.getMonth()
        )
      })
      .reduce((sum, record) => sum + record.distanceM, 0)

    return { distanceM, label }
  })
}

function getGoalComparisonSeries(
  weeklyDistanceM: number,
  monthlyDistanceM: number,
  goals: RunGoals,
) {
  return [
    {
      actualKm: weeklyDistanceM / 1000,
      goalKm: goals.weeklyDistanceKm,
      label: '이번 주',
    },
    {
      actualKm: monthlyDistanceM / 1000,
      goalKm: goals.monthlyDistanceKm,
      label: '이번 달',
    },
  ]
}

function getRunningCalendarDays(records: RunRecord[]) {
  const currentMonth = startOfMonth(new Date())
  const runningDays = new Set(
    records
      .filter((record) => new Date(record.savedAt) >= currentMonth)
      .map((record) => new Date(record.savedAt).getDate()),
  )
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate()

  return Array.from({ length: daysInMonth }, (_, index) => ({
    day: index + 1,
    hasRun: runningDays.has(index + 1),
  }))
}

function getRecordMonthKey(record: RunRecord) {
  const savedAt = new Date(record.savedAt)

  return `${savedAt.getFullYear()}-${String(savedAt.getMonth() + 1).padStart(2, '0')}`
}

function getRecordMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-')

  return `${year}년 ${Number(month)}월`
}

function getRecordMonthOptions(records: RunRecord[]) {
  return Array.from(new Set(records.map(getRecordMonthKey))).sort((a, b) =>
    b.localeCompare(a),
  )
}

function getSortedRecords(records: RunRecord[], sortKey: RecordSortKey) {
  return [...records].sort((a, b) => {
    if (sortKey === 'distance') {
      return b.distanceM - a.distanceM
    }

    if (sortKey === 'duration') {
      return b.elapsedMs - a.elapsedMs
    }

    if (sortKey === 'pace') {
      const paceA = a.distanceM > 0 ? a.elapsedMs / (a.distanceM / 1000) : Infinity
      const paceB = b.distanceM > 0 ? b.elapsedMs / (b.distanceM / 1000) : Infinity

      return paceA - paceB
    }

    return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  })
}

function getVisibleRecords(
  records: RunRecord[],
  memoFilter: RecordMemoFilter,
  monthFilter: string,
  sortKey: RecordSortKey,
) {
  const filteredRecords = records.filter((record) => {
    const matchesMemo =
      memoFilter === 'all' || (record.memo?.trim().length ?? 0) > 0
    const matchesMonth =
      monthFilter === 'all' || getRecordMonthKey(record) === monthFilter

    return matchesMemo && matchesMonth
  })

  return getSortedRecords(filteredRecords, sortKey)
}

function getRoutePathData(points: RunLocationPoint[], distanceM: number) {
  if (points.length < 2) {
    return null
  }

  const [minLongitude, maxLongitude] = extent(points, (point) => point.longitude)
  const [minLatitude, maxLatitude] = extent(points, (point) => point.latitude)

  if (
    minLongitude === undefined ||
    maxLongitude === undefined ||
    minLatitude === undefined ||
    maxLatitude === undefined
  ) {
    return null
  }

  const width = 280
  const height = 132
  const padding = 16
  const longitudeDelta = maxLongitude - minLongitude
  const latitudeDelta = maxLatitude - minLatitude
  const isStationary = distanceM <= 0 || (longitudeDelta < 0.00003 && latitudeDelta < 0.00003)
  const xScale = scaleLinear()
    .domain(
      minLongitude === maxLongitude
        ? [minLongitude - 0.0005, maxLongitude + 0.0005]
        : [minLongitude, maxLongitude],
    )
    .range([padding, width - padding])
  const yScale = scaleLinear()
    .domain(
      minLatitude === maxLatitude
        ? [minLatitude - 0.0005, maxLatitude + 0.0005]
        : [minLatitude, maxLatitude],
    )
    .range([height - padding, padding])
  const pathData = line<RunLocationPoint>()
    .x((point) => xScale(point.longitude))
    .y((point) => yScale(point.latitude))(points)

  if (!pathData) {
    return null
  }

  return {
    end: points[points.length - 1],
    height,
    isStationary,
    pathData,
    start: points[0],
    width,
    xScale,
    yScale,
  }
}

function App() {
  const isNativePlatform = Capacitor.isNativePlatform()
  const routePreviewRef = useRef<HTMLDivElement | null>(null)
  const { location, requestLocation, status } = useCurrentLocation()
  const running = useRunningSession()
  const [mapBounds, setMapBounds] = useState<FacilityBounds | null>(null)
  const [nativeMapMessage, setNativeMapMessage] = useState<string | null>(null)
  const [runMemo, setRunMemo] = useState('')
  const [recordSaveMessage, setRecordSaveMessage] = useState<string | null>(null)
  const [isBootSplashVisible, setIsBootSplashVisible] = useState(true)
  const [activeTab, setActiveTab] = useState<AppTab>('home')
  const [recordMemoFilter, setRecordMemoFilter] =
    useState<RecordMemoFilter>('all')
  const [recordMonthFilter, setRecordMonthFilter] = useState('all')
  const [recordSortKey, setRecordSortKey] = useState<RecordSortKey>('date')
  const [runRecords, setRunRecords] = useState<RunRecord[]>(() =>
    readRunRecords(RUN_RECORDS_STORAGE_KEY),
  )
  const [runGoals, setRunGoals] = useState<RunGoals>(() =>
    readRunGoals(RUN_GOALS_STORAGE_KEY),
  )
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(() => {
    const records = readRunRecords(RUN_RECORDS_STORAGE_KEY)

    return records[0]?.id ?? null
  })
  const facilities = useQuery({
    queryKey: [
      'facilities',
      location?.latitude,
      location?.longitude,
      mapBounds,
    ],
    queryFn: () =>
      getFacilities({
        bounds: mapBounds,
        latitude: location?.latitude,
        longitude: location?.longitude,
      }),
    enabled:
      status !== 'loading' &&
      (isNativePlatform ? location !== null : mapBounds !== null),
  })
  const [visibleTypes, setVisibleTypes] = useState<FacilityType[]>([
    'water',
    'restroom',
  ])
  const hasLocationError = [
    'denied',
    'unavailable',
    'timeout',
    'unsupported',
  ].includes(status)
  const currentLatitude = location?.latitude
  const currentLongitude = location?.longitude
  const visibleFacilities = useMemo(
    () =>
      (facilities.data ?? []).filter((facility) =>
        visibleTypes.includes(facility.type),
      ),
    [facilities.data, visibleTypes],
  )
  const nativeFacilities = useMemo<NativeMapFacility[]>(
    () =>
      visibleFacilities
        .slice(0, NATIVE_MAP_FACILITY_LIMIT)
        .map(({ address, id, latitude, longitude, name, type }) => ({
          address,
          id,
          latitude,
          longitude,
          name,
          type,
        })),
    [visibleFacilities],
  )
  const isRunningSessionActive = running.status !== 'idle'
  const isAppBootLoading =
    !isRunningSessionActive &&
    activeTab === 'home' &&
    (isBootSplashVisible ||
      (!hasLocationError && (status === 'idle' || status === 'loading')))
  const isMapDataLoading =
    !isRunningSessionActive &&
    activeTab === 'home' &&
    !hasLocationError &&
    !isAppBootLoading &&
    facilities.isPending
  const recordMonthOptions = getRecordMonthOptions(runRecords)
  const visibleRunRecords = getVisibleRecords(
    runRecords,
    recordMemoFilter,
    recordMonthFilter,
    recordSortKey,
  )
  const selectedRecord =
    visibleRunRecords.find((record) => record.id === selectedRecordId) ??
    visibleRunRecords[0] ??
    null
  const totalDistanceM = runRecords.reduce(
    (sum, record) => sum + record.distanceM,
    0,
  )
  const latestRecordDate = runRecords[0]
    ? new Date(runRecords[0].savedAt).toLocaleDateString('ko-KR')
    : '아직 없음'
  const now = new Date()
  const weeklyDistanceM = sumDistanceSince(runRecords, startOfWeek(now))
  const monthlyDistanceM = sumDistanceSince(runRecords, startOfMonth(now))
  const longestRecord = runRecords.reduce<RunRecord | null>(
    (longest, record) =>
      !longest || record.distanceM > longest.distanceM ? record : longest,
    null,
  )
  const averagePace = formatAveragePace(runRecords)
  const weeklyProgress = formatGoalProgress(
    weeklyDistanceM,
    runGoals.weeklyDistanceKm,
  )
  const monthlyProgress = formatGoalProgress(
    monthlyDistanceM,
    runGoals.monthlyDistanceKm,
  )
  const monthlyDistanceSeries = getMonthlyDistanceSeries(runRecords)
  const goalComparisonSeries = getGoalComparisonSeries(
    weeklyDistanceM,
    monthlyDistanceM,
    runGoals,
  )
  const runningCalendarDays = getRunningCalendarDays(runRecords)
  const distanceChartWidth = 280
  const distanceChartHeight = 150
  const distanceChartPadding = {
    bottom: 28,
    left: 12,
    right: 12,
    top: 14,
  }
  const distanceXScale = scaleBand<string>()
    .domain(monthlyDistanceSeries.map((item) => item.label))
    .range([distanceChartPadding.left, distanceChartWidth - distanceChartPadding.right])
    .padding(0.34)
  const distanceYScale = scaleLinear()
    .domain([0, max(monthlyDistanceSeries, (item) => item.distanceM) || 1000])
    .nice()
    .range([distanceChartHeight - distanceChartPadding.bottom, distanceChartPadding.top])
  const goalChartWidth = 280
  const goalChartHeight = 124
  const goalChartPadding = {
    bottom: 28,
    left: 64,
    right: 12,
    top: 12,
  }
  const goalYScale = scaleBand<string>()
    .domain(goalComparisonSeries.map((item) => item.label))
    .range([goalChartPadding.top, goalChartHeight - goalChartPadding.bottom])
    .padding(0.34)
  const goalXScale = scaleLinear()
    .domain([
      0,
      max(goalComparisonSeries, (item) => Math.max(item.actualKm, item.goalKm)) || 1,
    ])
    .nice()
    .range([goalChartPadding.left, goalChartWidth - goalChartPadding.right])
  const selectedRoutePath = selectedRecord?.routePoints
    ? getRoutePathData(selectedRecord.routePoints, selectedRecord.distanceM)
    : null
  const selectedRoutePoints = selectedRecord?.routePoints ?? []
  const hasSelectedRoutePoints = selectedRoutePoints.length > 0

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsBootSplashVisible(false)
    }, APP_BOOT_MIN_LOADING_MS)

    return () => window.clearTimeout(timerId)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('is-native-map', isNativePlatform)
    document.body.classList.toggle('is-native-map', isNativePlatform)

    return () => {
      document.documentElement.classList.remove('is-native-map')
      document.body.classList.remove('is-native-map')
    }
  }, [isNativePlatform])

  useLayoutEffect(() => {
    if (!isNativePlatform) {
      return
    }

    let animationFrameId = 0

    const getInteractiveTouchAreas = (): NativeMapTouchArea[] => {
      if (running.status === 'finished') {
        return [
          {
            height: window.innerHeight,
            width: window.innerWidth,
            x: 0,
            y: 0,
          },
        ]
      }

      return NATIVE_TOUCH_AREA_SELECTORS.flatMap((selector) =>
        Array.from(document.querySelectorAll<HTMLElement>(selector)),
      )
        .map((element) => {
          const styles = window.getComputedStyle(element)
          const rect = element.getBoundingClientRect()

          if (
            styles.display === 'none' ||
            styles.visibility === 'hidden' ||
            rect.width <= 0 ||
            rect.height <= 0
          ) {
            return null
          }

          return {
            height: rect.height,
            width: rect.width,
            x: rect.left,
            y: rect.top,
          }
        })
        .filter((area): area is NativeMapTouchArea => area !== null)
    }

    const syncTouchAreas = () => {
      window.cancelAnimationFrame(animationFrameId)
      animationFrameId = window.requestAnimationFrame(() => {
        void NativeMap.setTouchAreas({
          areas: getInteractiveTouchAreas(),
        }).catch(() => undefined)
      })
    }

    syncTouchAreas()
    document.addEventListener('focusin', syncTouchAreas)
    document.addEventListener('focusout', syncTouchAreas)
    window.addEventListener('resize', syncTouchAreas)
    window.addEventListener('orientationchange', syncTouchAreas)
    window.visualViewport?.addEventListener('resize', syncTouchAreas)
    window.visualViewport?.addEventListener('scroll', syncTouchAreas)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      document.removeEventListener('focusin', syncTouchAreas)
      document.removeEventListener('focusout', syncTouchAreas)
      window.removeEventListener('resize', syncTouchAreas)
      window.removeEventListener('orientationchange', syncTouchAreas)
      window.visualViewport?.removeEventListener('resize', syncTouchAreas)
      window.visualViewport?.removeEventListener('scroll', syncTouchAreas)
      void NativeMap.setTouchAreas({ areas: [] }).catch(() => undefined)
    }
  }, [
    activeTab,
    facilities.isPending,
    facilities.isSuccess,
    hasLocationError,
    isAppBootLoading,
    isMapDataLoading,
    isNativePlatform,
    isRunningSessionActive,
    nativeMapMessage,
    recordMemoFilter,
    recordMonthFilter,
    recordSortKey,
    runRecords.length,
    running.status,
    selectedRecordId,
    status,
    visibleFacilities.length,
    visibleRunRecords.length,
    visibleTypes,
  ])

  useLayoutEffect(() => {
    if (!isNativePlatform) {
      return
    }

    let animationFrameId = 0
    const recordsPanel = document.querySelector<HTMLElement>('.records-panel')

    const hideRoutePreview = () => {
      void NativeMap.showRoutePreview({
        distanceM: 0,
        frame: null,
        points: [],
      }).catch(() => undefined)
    }

    const syncRoutePreview = () => {
      window.cancelAnimationFrame(animationFrameId)
      animationFrameId = window.requestAnimationFrame(() => {
        if (
          activeTab !== 'records' ||
          !selectedRecord ||
          !selectedRecord.routePoints?.length
        ) {
          hideRoutePreview()
          return
        }

        const element = routePreviewRef.current

        if (!element) {
          hideRoutePreview()
          return
        }

        const rect = element.getBoundingClientRect()
        const isVisible =
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight

        if (!isVisible) {
          hideRoutePreview()
          return
        }

        void NativeMap.showRoutePreview({
          distanceM: selectedRecord.distanceM,
          frame: {
            height: rect.height,
            width: rect.width,
            x: rect.left,
            y: rect.top,
          },
          points: selectedRecord.routePoints.map((point) => ({
            latitude: point.latitude,
            longitude: point.longitude,
          })),
        }).catch(() => undefined)
      })
    }

    syncRoutePreview()
    recordsPanel?.addEventListener('scroll', syncRoutePreview)
    window.addEventListener('resize', syncRoutePreview)
    window.addEventListener('orientationchange', syncRoutePreview)
    window.visualViewport?.addEventListener('resize', syncRoutePreview)
    window.visualViewport?.addEventListener('scroll', syncRoutePreview)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      recordsPanel?.removeEventListener('scroll', syncRoutePreview)
      window.removeEventListener('resize', syncRoutePreview)
      window.removeEventListener('orientationchange', syncRoutePreview)
      window.visualViewport?.removeEventListener('resize', syncRoutePreview)
      window.visualViewport?.removeEventListener('scroll', syncRoutePreview)
      hideRoutePreview()
    }
  }, [activeTab, isNativePlatform, selectedRecord])

  const toggleFacilityType = (type: FacilityType) => {
    setVisibleTypes((current) =>
      current.includes(type)
        ? current.filter((currentType) => currentType !== type)
        : [...current, type],
    )
  }

  const resetRunningResult = () => {
    setRunMemo('')
    setRecordSaveMessage(null)
    running.reset()
  }

  const dismissFocusedControl = () => {
    const activeElement = document.activeElement

    if (activeElement instanceof HTMLElement) {
      activeElement.blur()
    }
  }

  const saveRunningRecord = () => {
    dismissFocusedControl()

    if (Math.round(running.distanceM) <= 0) {
      setRecordSaveMessage('0km 러닝은 기록으로 저장하지 않아요. 조금 이동한 뒤 다시 저장해주세요.')
      return
    }

    const trimmedMemo = runMemo.trim()

    if (trimmedMemo.length === 0) {
      setRecordSaveMessage('러닝 메모를 남겨야 기록으로 저장할 수 있어요.')
      return
    }

    try {
      const record: RunRecord = {
        distanceM: Math.round(running.distanceM),
        elapsedMs: running.elapsedMs,
        id: `run-${Date.now()}`,
        memo: trimmedMemo,
        pace: formatPace(running.elapsedMs, running.distanceM),
        routePoints: running.routePoints,
        routePointCount: running.routePointCount,
        savedAt: new Date().toISOString(),
      }

      const records = readRunRecords(RUN_RECORDS_STORAGE_KEY)
      const nextRecords = [record, ...records]

      window.localStorage.setItem(
        RUN_RECORDS_STORAGE_KEY,
        JSON.stringify(nextRecords),
      )
      setRunRecords(nextRecords)
      setSelectedRecordId(record.id)
      setRunMemo('')
      setRecordSaveMessage(null)
      setActiveTab('records')
      running.reset()
    } catch {
      setRecordSaveMessage('기록 저장에 실패했어요. 작성한 메모는 화면에 그대로 남아 있어요.')
    }
  }

  const deleteRunRecord = (recordId: string) => {
    const nextRecords = runRecords.filter((record) => record.id !== recordId)

    window.localStorage.setItem(
      RUN_RECORDS_STORAGE_KEY,
      JSON.stringify(nextRecords),
    )
    setRunRecords(nextRecords)
    setSelectedRecordId(nextRecords[0]?.id ?? null)
  }

  const openRecordsTab = () => {
    setActiveTab('records')
  }

  const moveNativeMapToCurrentLocation = () => {
    requestLocation()

    if (currentLatitude === undefined || currentLongitude === undefined) {
      return
    }

    void NativeMap.recenter({
      center: {
        latitude: currentLatitude,
        longitude: currentLongitude,
      },
    }).catch((error) => {
      setNativeMapMessage(
        error instanceof Error
          ? error.message
          : '현재 위치로 지도를 이동하지 못했어요.',
      )
    })
  }

  const updateRunGoal = (goalKey: keyof RunGoals, value: string) => {
    const nextGoals = {
      ...runGoals,
      [goalKey]: Math.max(1, Number(value) || 1),
    }

    window.localStorage.setItem(
      RUN_GOALS_STORAGE_KEY,
      JSON.stringify(nextGoals),
    )
    setRunGoals(nextGoals)
  }

  useEffect(() => {
    if (
      !isNativePlatform ||
      currentLatitude === undefined ||
      currentLongitude === undefined
    ) {
      return
    }

    void NativeMap.sync({
      center: {
        latitude: currentLatitude,
        longitude: currentLongitude,
      },
      facilities: nativeFacilities,
    })
      .then(() => setNativeMapMessage(null))
      .catch((error) => {
        setNativeMapMessage(
          error instanceof Error
            ? error.message
            : 'Apple 지도를 동기화하지 못했어요.',
        )
      })
  }, [
    isNativePlatform,
    currentLatitude,
    currentLongitude,
    nativeFacilities,
  ])

  const appShellClassName = isNativePlatform
    ? 'app-shell is-native-map'
    : 'app-shell'

  return (
    <main className={appShellClassName}>
      {isNativePlatform ? (
        <div className="map-area native-map-placeholder" aria-hidden="true" />
      ) : (
        <KakaoMap
          facilities={visibleFacilities}
          location={location}
          onBoundsChange={setMapBounds}
          onRequestLocation={requestLocation}
        />
      )}

      {!isRunningSessionActive && activeTab === 'home' && (
        <header className="home-brand-card">
          <p className="eyebrow">POLLING IN RUN</p>
        </header>
      )}

      {isAppBootLoading && (
        <section
          className="app-loading-screen"
          aria-label="앱 로딩 화면"
          aria-live="polite"
        >
          <div className="app-loading-logo">POLLING IN RUN</div>
          <div className="app-loading-copy">
            <p className="loading-label">LOADING</p>
            <h1>달릴 준비를 하고 있어요.</h1>
            <span>현재 위치와 지도를 연결하는 중이에요.</span>
          </div>
          <div className="loading-bar" aria-hidden="true">
            <span />
          </div>
        </section>
      )}

      {isMapDataLoading && (
        <section
          className="map-loading-skeleton"
          aria-label="지도 데이터 로딩 상태"
          aria-live="polite"
        >
          <div>
            <p className="loading-label">MAP DATA</p>
            <strong>주변 시설을 불러오고 있어요.</strong>
          </div>
          <div className="skeleton-row is-wide" aria-hidden="true" />
          <div className="skeleton-row" aria-hidden="true" />
        </section>
      )}

      {!isRunningSessionActive && activeTab === 'home' && (
        <section className="facility-filter" aria-label="편의시설 필터">
          <Button
            variant="outline"
            className={visibleTypes.includes('water') ? 'is-active' : ''}
            type="button"
            aria-pressed={visibleTypes.includes('water')}
            onClick={() => toggleFacilityType('water')}
          >
            <span className="facility-icon water" aria-hidden="true">
              <FacilityIcon type="water" />
            </span>
            음수대
          </Button>
          <Button
            variant="outline"
            className={visibleTypes.includes('restroom') ? 'is-active' : ''}
            type="button"
            aria-pressed={visibleTypes.includes('restroom')}
            onClick={() => toggleFacilityType('restroom')}
          >
            <span className="facility-icon restroom" aria-hidden="true">
              <FacilityIcon type="restroom" />
            </span>
            화장실
          </Button>
        </section>
      )}

      {!isRunningSessionActive && activeTab === 'home' && (
        <div className="facility-status" aria-live="polite">
          {facilities.isPending && '시설 정보를 불러오는 중'}
          {facilities.isSuccess && `현재 영역 시설 ${visibleFacilities.length}곳 표시 중`}
          {facilities.isError && '시설 정보를 불러오지 못했어요'}
        </div>
      )}

      {!isRunningSessionActive &&
        activeTab === 'home' &&
        isNativePlatform &&
        nativeMapMessage && (
          <div className="native-map-status" role="status">
            {nativeMapMessage}
          </div>
        )}

      {!isRunningSessionActive && activeTab === 'home' && isNativePlatform && (
        <div className="native-map-controls" aria-label="지도 제어">
          <Button
            type="button"
            onClick={moveNativeMapToCurrentLocation}
            aria-label="현재 위치로 이동"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4" fill="currentColor" />
              <circle
                cx="12"
                cy="12"
                r="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 2v3M12 19v3M2 12h3M19 12h3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </Button>
        </div>
      )}

      {!isRunningSessionActive && activeTab === 'home' && (
        <section className={`location-card ${hasLocationError ? 'is-error' : ''}`}>
          <div>
            <p className="location-label">현재 위치</p>
            <p>{locationMessages[status]}</p>
            {location && (
              <span className="accuracy">
                약 {Math.round(location.accuracy)}m 정확도
              </span>
            )}
          </div>
          {hasLocationError && status !== 'unsupported' && (
            <Button type="button" onClick={requestLocation}>
              다시 시도
            </Button>
          )}
        </section>
      )}

      {!isRunningSessionActive && activeTab === 'records' && (
        <section className="records-panel" aria-label="러닝 기록">
          <div>
            <p className="eyebrow">RECORDS</p>
            <h1>저장한 러닝 기록</h1>
          </div>

          {runRecords.length === 0 && (
            <div className="records-empty">
              <strong>아직 저장한 기록이 없어요.</strong>
              <span>러닝을 종료한 뒤 메모와 함께 첫 기록을 남겨보세요.</span>
            </div>
          )}

          {runRecords.length > 0 && (
            <div className="records-layout">
              <div className="record-controls" aria-label="러닝 기록 필터와 정렬">
                <Button
                  type="button"
                  variant="outline"
                  className={recordMemoFilter === 'all' ? 'is-active' : ''}
                  aria-pressed={recordMemoFilter === 'all'}
                  onClick={() => setRecordMemoFilter('all')}
                >
                  전체
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={recordMemoFilter === 'memo' ? 'is-active' : ''}
                  aria-pressed={recordMemoFilter === 'memo'}
                  onClick={() => setRecordMemoFilter('memo')}
                >
                  메모 있음
                </Button>
                <label>
                  <span>월별</span>
                  <select
                    aria-label="월별 기록 필터"
                    value={recordMonthFilter}
                    onChange={(event) => setRecordMonthFilter(event.target.value)}
                  >
                    <option value="all">전체 월</option>
                    {recordMonthOptions.map((monthKey) => (
                      <option key={monthKey} value={monthKey}>
                        {getRecordMonthLabel(monthKey)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>정렬</span>
                  <select
                    aria-label="러닝 기록 정렬"
                    value={recordSortKey}
                    onChange={(event) =>
                      setRecordSortKey(event.target.value as RecordSortKey)
                    }
                  >
                    <option value="date">최신순</option>
                    <option value="distance">거리순</option>
                    <option value="duration">시간순</option>
                    <option value="pace">페이스순</option>
                  </select>
                </label>
              </div>

              {visibleRunRecords.length === 0 && (
                <div className="records-empty is-filtered">
                  <strong>조건에 맞는 기록이 없어요.</strong>
                  <span>필터를 바꾸거나 전체 기록으로 다시 확인해보세요.</span>
                </div>
              )}

              <div className="record-list" aria-label="러닝 기록 목록">
                {visibleRunRecords.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    className={record.id === selectedRecordId ? 'is-selected' : ''}
                    onClick={() => setSelectedRecordId(record.id)}
                  >
                    <span>{new Date(record.savedAt).toLocaleDateString('ko-KR')}</span>
                    <strong>{formatDistance(record.distanceM)}</strong>
                    <small>{formatElapsedTime(record.elapsedMs)} · {record.pace}</small>
                  </button>
                ))}
              </div>

              {selectedRecord && (
                <article className="record-detail" aria-label="러닝 기록 상세">
                  <p className="result-label">기록 상세</p>
                  <h2>{formatDistance(selectedRecord.distanceM)}</h2>
                  <dl>
                    <div>
                      <dt>시간</dt>
                      <dd>{formatElapsedTime(selectedRecord.elapsedMs)}</dd>
                    </div>
                    <div>
                      <dt>평균 페이스</dt>
                      <dd>{selectedRecord.pace}</dd>
                    </div>
                    <div>
                      <dt>GPS 포인트</dt>
                      <dd>{selectedRecord.routePointCount}개</dd>
                    </div>
                  </dl>
                  <p>{selectedRecord.memo || '남긴 메모가 없어요.'}</p>
                  <section className="record-route-preview" aria-label="기록 경로 미리보기">
                    <strong>경로 미리보기</strong>
                    {hasSelectedRoutePoints && isNativePlatform ? (
                      <div
                        ref={routePreviewRef}
                        className="native-route-preview-map"
                        aria-label="Apple 지도 경로 미리보기"
                        role="img"
                      >
                        <span>Apple 지도에 경로를 불러오고 있어요.</span>
                      </div>
                    ) : selectedRoutePath ? (
                      <svg
                        role="img"
                        aria-label="러닝 경로 간단 시각화"
                        viewBox={`0 0 ${selectedRoutePath.width} ${selectedRoutePath.height}`}
                      >
                        <rect className="route-map-park" x="16" y="18" width="62" height="34" rx="16" />
                        <rect className="route-map-block" x="174" y="82" width="76" height="26" rx="13" />
                        <path className="route-map-road" d="M20 96 C72 74 108 76 150 48 S230 20 262 34" />
                        <path className="route-map-road is-secondary" d="M54 24 C80 58 86 86 74 118" />
                        <path className="route-map-road is-secondary" d="M134 118 C154 94 184 70 226 58" />
                        {!selectedRoutePath.isStationary && (
                          <path className="route-line" d={selectedRoutePath.pathData} />
                        )}
                        <circle
                          className="route-start"
                          cx={selectedRoutePath.xScale(selectedRoutePath.start.longitude)}
                          cy={selectedRoutePath.yScale(selectedRoutePath.start.latitude)}
                          r={selectedRoutePath.isStationary ? '7' : '4'}
                        />
                        {selectedRoutePath.isStationary ? (
                          <text
                            className="route-stationary-label"
                            x={selectedRoutePath.width / 2}
                            y={selectedRoutePath.height - 18}
                            textAnchor="middle"
                          >
                            이동 없이 머문 기록
                          </text>
                        ) : (
                          <circle
                            className="route-end"
                            cx={selectedRoutePath.xScale(selectedRoutePath.end.longitude)}
                            cy={selectedRoutePath.yScale(selectedRoutePath.end.latitude)}
                            r="4"
                          />
                        )}
                      </svg>
                    ) : (
                      <span>
                        저장된 경로 좌표가 없어요. 새로 저장하는 기록부터 경로를
                        간단히 볼 수 있어요.
                      </span>
                    )}
                  </section>
                  <Button
                    type="button"
                    className="record-delete-button"
                    onClick={() => deleteRunRecord(selectedRecord.id)}
                  >
                    기록 삭제
                  </Button>
                </article>
              )}
            </div>
          )}
        </section>
      )}

      {!isRunningSessionActive && activeTab === 'my' && (
        <section className="my-panel" aria-label="마이 페이지">
          <div>
            <p className="eyebrow">MY PAGE</p>
            <h1>내 iPhone에 저장하는 러닝 노트</h1>
            <p>
              지금은 로그인보다 내 기기에서 안정적으로 쓰는 local-first
              프로토타입을 우선해요.
            </p>
          </div>

          <section className="local-profile-card" aria-label="로컬 프로필">
            <p className="result-label">로컬 프로필</p>
            <h2>Solo Runner</h2>
            <p>
              러닝 기록은 이 기기의 로컬 저장소에 보관돼요. 앱 삭제나 브라우저
              데이터 삭제 시 기록도 사라질 수 있어요.
            </p>
          </section>

          <section className="my-summary-grid" aria-label="러닝 기록 요약">
            <article>
              <span>총 러닝 횟수</span>
              <strong>{runRecords.length}개</strong>
            </article>
            <article>
              <span>총 뛴 거리</span>
              <strong>{formatDistance(totalDistanceM)}</strong>
            </article>
            <article>
              <span>최근 기록</span>
              <strong>{latestRecordDate}</strong>
            </article>
            <article>
              <span>월간 거리</span>
              <strong>{formatDistance(monthlyDistanceM)}</strong>
            </article>
            <article>
              <span>최장 러닝</span>
              <strong>{longestRecord ? formatDistance(longestRecord.distanceM) : '0.00 km'}</strong>
            </article>
            <article>
              <span>평균 페이스</span>
              <strong>{averagePace}</strong>
            </article>
          </section>

          <section className="dashboard-section" aria-label="러닝 목표">
            <div className="section-heading">
              <p className="result-label">GOALS</p>
              <h2>목표 설정과 진행률</h2>
            </div>

            <div className="goal-inputs">
              <label>
                <span>주간 목표</span>
                <input
                  aria-label="주간 목표"
                  min="1"
                  type="number"
                  value={runGoals.weeklyDistanceKm}
                  onChange={(event) =>
                    updateRunGoal('weeklyDistanceKm', event.target.value)
                  }
                />
                <em>km</em>
              </label>
              <label>
                <span>월간 목표</span>
                <input
                  aria-label="월간 목표"
                  min="1"
                  type="number"
                  value={runGoals.monthlyDistanceKm}
                  onChange={(event) =>
                    updateRunGoal('monthlyDistanceKm', event.target.value)
                  }
                />
                <em>km</em>
              </label>
            </div>

            <div className="progress-list" aria-label="목표 대비 진행률">
              <article>
                <div>
                  <strong>이번 주</strong>
                  <span>
                    {formatDistance(weeklyDistanceM)} / {runGoals.weeklyDistanceKm} km
                  </span>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${weeklyProgress}%` }} />
                </div>
                <small>{weeklyProgress}% 달성</small>
              </article>
              <article>
                <div>
                  <strong>이번 달</strong>
                  <span>
                    {formatDistance(monthlyDistanceM)} / {runGoals.monthlyDistanceKm} km
                  </span>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${monthlyProgress}%` }} />
                </div>
                <small>{monthlyProgress}% 달성</small>
              </article>
            </div>
          </section>

          <section className="dashboard-section" aria-label="월간 거리 그래프">
            <div className="section-heading">
              <p className="result-label">TREND</p>
              <h2>D3 최근 4개월 거리</h2>
            </div>
            <svg
              className="distance-chart-svg"
              role="img"
              aria-label="최근 4개월 러닝 거리 막대 그래프"
              viewBox={`0 0 ${distanceChartWidth} ${distanceChartHeight}`}
            >
              {monthlyDistanceSeries.map((item) => (
                <g key={item.label}>
                  <rect
                    x={distanceXScale(item.label)}
                    y={distanceYScale(item.distanceM)}
                    width={distanceXScale.bandwidth()}
                    height={
                      distanceYScale(0) - distanceYScale(item.distanceM)
                    }
                    rx="7"
                  />
                  <text
                    className="chart-value-label"
                    x={(distanceXScale(item.label) ?? 0) + distanceXScale.bandwidth() / 2}
                    y={Math.max(12, distanceYScale(item.distanceM) - 6)}
                    textAnchor="middle"
                  >
                    {(item.distanceM / 1000).toFixed(1)}
                  </text>
                  <text
                    className="chart-axis-label"
                    x={(distanceXScale(item.label) ?? 0) + distanceXScale.bandwidth() / 2}
                    y={distanceChartHeight - 8}
                    textAnchor="middle"
                  >
                    {item.label}
                  </text>
                </g>
              ))}
            </svg>
          </section>

          <section className="dashboard-section" aria-label="목표 대비 비교 그래프">
            <div className="section-heading">
              <p className="result-label">COMPARE</p>
              <h2>D3 목표 대비 비교</h2>
            </div>
            <svg
              className="goal-chart-svg"
              role="img"
              aria-label="주간과 월간 목표 대비 실제 거리 비교 그래프"
              viewBox={`0 0 ${goalChartWidth} ${goalChartHeight}`}
            >
              {goalComparisonSeries.map((item) => {
                const y = goalYScale(item.label) ?? 0
                const barHeight = goalYScale.bandwidth()

                return (
                  <g key={item.label}>
                    <text
                      className="chart-axis-label"
                      x="8"
                      y={y + barHeight / 2 + 4}
                    >
                      {item.label}
                    </text>
                    <rect
                      className="goal-chart-target"
                      x={goalChartPadding.left}
                      y={y}
                      width={goalXScale(item.goalKm) - goalChartPadding.left}
                      height={barHeight}
                      rx="7"
                    />
                    <rect
                      className="goal-chart-actual"
                      x={goalChartPadding.left}
                      y={y + barHeight * 0.2}
                      width={goalXScale(item.actualKm) - goalChartPadding.left}
                      height={barHeight * 0.6}
                      rx="6"
                    />
                    <text
                      className="chart-value-label"
                      x={goalChartWidth - goalChartPadding.right}
                      y={y + barHeight / 2 + 4}
                      textAnchor="end"
                    >
                      {item.actualKm.toFixed(1)} / {item.goalKm}km
                    </text>
                  </g>
                )
              })}
            </svg>
          </section>

          <section className="dashboard-section" aria-label="러닝 달력">
            <div className="section-heading">
              <p className="result-label">CALENDAR</p>
              <h2>이번 달 러닝 날짜</h2>
            </div>
            <div className="running-calendar">
              {runningCalendarDays.map((item) => (
                <span
                  key={item.day}
                  className={item.hasRun ? 'has-run' : ''}
                  aria-label={
                    item.hasRun
                      ? `${item.day}일 러닝 기록 있음`
                      : `${item.day}일 러닝 기록 없음`
                  }
                >
                  {item.day}
                </span>
              ))}
            </div>
          </section>

          <section className="settings-list" aria-label="계정 기능">
            <article className="is-planned">
              <div>
                <strong>로그인</strong>
                <span>계정과 여러 기기 동기화는 local-first 흐름을 검증한 뒤 다시 연결할 예정이에요.</span>
              </div>
              <span className="settings-badge is-muted">
                <span aria-hidden="true" className="settings-badge-icon">⚙</span>
                기능 개발중
              </span>
            </article>
          </section>
        </section>
      )}

      {isRunningSessionActive && (
        <section
          className={`running-panel ${running.status === 'finished' ? 'is-result' : ''}`}
          aria-label={running.status === 'finished' ? '러닝 결과' : '러닝 진행'}
        >
          {running.status === 'finished' && (
            <Button
              type="button"
              className="result-close-button"
              aria-label="러닝 결과 닫기"
              onPointerDown={dismissFocusedControl}
              onTouchStart={dismissFocusedControl}
              onClick={resetRunningResult}
            >
              ×
            </Button>
          )}
          <div>
            <p className="running-eyebrow">
              {running.status === 'running' && '러닝 진행 중'}
              {running.status === 'paused' && '러닝 일시정지'}
              {running.status === 'finished' && '러닝 완료'}
            </p>
            {running.status === 'finished' && <h1>러닝 결과를 확인해요.</h1>}
          </div>

          <dl className="running-metrics">
            <div>
              <dt>시간</dt>
              <dd>{formatElapsedTime(running.elapsedMs)}</dd>
            </div>
            <div>
              <dt>거리</dt>
              <dd>{formatDistance(running.distanceM)}</dd>
            </div>
            <div>
              <dt>평균 페이스</dt>
              <dd>{formatPace(running.elapsedMs, running.distanceM)}</dd>
            </div>
          </dl>

          {running.status !== 'finished' && (
            <p className="running-note">
              {running.trackingStatus === 'tracking' &&
                `화면이 켜진 동안 GPS 포인트 ${running.routePointCount}개를 기록하고 있어요.`}
              {running.trackingStatus === 'paused' &&
                `위치 추적을 잠시 멈췄어요. 현재 ${running.routePointCount}개 포인트가 있어요.`}
              {running.trackingStatus === 'unsupported' &&
                '이 브라우저에서는 실시간 위치 추적을 사용할 수 없어요.'}
              {running.trackingStatus === 'error' &&
                '위치 추적 중 오류가 발생했어요. 위치 권한과 GPS 상태를 확인해주세요.'}
              {running.trackingStatus === 'idle' &&
                '화면이 켜진 상태에서 위치 추적을 준비하고 있어요.'}
              {running.trackingError && (
                <span className="running-warning">{running.trackingError}</span>
              )}
            </p>
          )}

          {running.status === 'finished' && (
            <section className="running-result-summary" aria-label="러닝 결과 요약">
              <div>
                <p className="result-label">오늘의 러닝 결과</p>
                <h2>저장하기 전에 기록을 확인해요.</h2>
              </div>
              <p>
                GPS 포인트 {running.routePointCount}개를 기반으로 거리와 평균 페이스를
                계산했어요. 오늘의 느낌을 짧게 남겨둘 수 있어요.
              </p>
            </section>
          )}

          {running.status === 'finished' && (
            <label className="running-memo-field">
              <span>러닝 메모</span>
              <textarea
                value={runMemo}
                onChange={(event) => setRunMemo(event.target.value)}
                placeholder="오늘의 러닝 느낌, 기억하고 싶은 장소를 적어보세요."
                rows={3}
              />
            </label>
          )}

          {recordSaveMessage && (
            <p className="running-save-message" role="status">
              {recordSaveMessage}
            </p>
          )}

          <div className="running-actions">
            {running.status === 'running' && (
              <Button type="button" className="secondary-action" onClick={running.pause}>
                일시정지
              </Button>
            )}
            {running.status === 'paused' && (
              <Button type="button" className="secondary-action" onClick={running.resume}>
                재개
              </Button>
            )}
            {running.status !== 'finished' && (
              <Button type="button" className="danger-action" onClick={running.finish}>
                종료
              </Button>
            )}
            {running.status === 'finished' && (
              <>
                <Button
                  type="button"
                  className="secondary-action"
                  onPointerDown={dismissFocusedControl}
                  onTouchStart={dismissFocusedControl}
                  onClick={resetRunningResult}
                >
                  홈으로
                </Button>
                <Button
                  type="button"
                  className="primary-action"
                  onPointerDown={dismissFocusedControl}
                  onTouchStart={dismissFocusedControl}
                  onClick={saveRunningRecord}
                >
                  기록 저장
                </Button>
              </>
            )}
          </div>
        </section>
      )}

      {!isRunningSessionActive && activeTab === 'home' && (
        <Button className="start-button" type="button" onClick={running.start}>
          러닝 시작
        </Button>
      )}

      {!isRunningSessionActive && (
        <nav className="bottom-nav" aria-label="주요 메뉴">
          <Button
            variant="ghost"
            className={activeTab === 'home' ? 'is-active' : ''}
            type="button"
            onClick={() => setActiveTab('home')}
          >
            홈
          </Button>
          <Button
            variant="ghost"
            className={activeTab === 'records' ? 'is-active' : ''}
            type="button"
            onClick={openRecordsTab}
          >
            기록
          </Button>
          <Button
            variant="ghost"
            className={activeTab === 'my' ? 'is-active' : ''}
            type="button"
            onClick={() => setActiveTab('my')}
          >
            마이
          </Button>
        </nav>
      )}
    </main>
  )
}

export default App
