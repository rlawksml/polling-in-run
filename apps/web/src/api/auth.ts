import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const DEFAULT_AUTH_EMAIL_DOMAIN = 'polling-in-run.local'

const DEFAULT_AUTH_ERROR_MESSAGE =
  '인증 요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.'

export type AuthSession = {
  accessToken: string
  email: string | null
  userId: string
}

export type AuthResult = {
  message: string
  session: AuthSession | null
}

export function normalizeUserId(userId: string): string {
  return userId.trim().toLowerCase()
}

export function isValidUserId(userId: string): boolean {
  return /^[a-z0-9_-]{4,24}$/.test(normalizeUserId(userId))
}

export function userIdToAuthEmail(userId: string): string {
  const domain =
    import.meta.env.VITE_AUTH_EMAIL_DOMAIN?.trim() || DEFAULT_AUTH_EMAIL_DOMAIN

  return `${normalizeUserId(userId)}@${domain}`
}

export function formatAuthErrorMessage(message?: string | null): string {
  const normalizedMessage = message?.toLowerCase() ?? ''

  if (!normalizedMessage) {
    return DEFAULT_AUTH_ERROR_MESSAGE
  }

  if (
    normalizedMessage.includes('already registered') ||
    normalizedMessage.includes('already exists') ||
    normalizedMessage.includes('user already')
  ) {
    return '이미 사용 중인 ID예요. 다른 ID를 입력해주세요.'
  }

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'ID 또는 비밀번호를 확인해주세요.'
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return '이 계정은 아직 인증 확인이 필요해요. Supabase 이메일 확인 설정을 확인해주세요.'
  }

  if (
    normalizedMessage.includes('password should be at least') ||
    normalizedMessage.includes('weak password')
  ) {
    return '비밀번호 조건을 확인해주세요. 8자 이상 입력해야 해요.'
  }

  if (
    normalizedMessage.includes('rate limit') ||
    normalizedMessage.includes('too many requests') ||
    normalizedMessage.includes('too many')
  ) {
    return '요청이 너무 많아요. 잠시 후 다시 시도해주세요.'
  }

  if (
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('network')
  ) {
    return '네트워크 상태를 확인한 뒤 다시 시도해주세요.'
  }

  return DEFAULT_AUTH_ERROR_MESSAGE
}

export function sessionToAuthSession(session: Session | null): AuthSession | null {
  if (!session) {
    return null
  }

  const email = session.user.email ?? null
  const userId =
    typeof session.user.user_metadata.user_id === 'string'
      ? session.user.user_metadata.user_id
      : email?.split('@')[0]

  return userId ? { accessToken: session.access_token, email, userId } : null
}

async function readApiErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json()

    return typeof payload.detail === 'string'
      ? payload.detail
      : '인증 API 요청을 처리하지 못했어요.'
  } catch {
    return '인증 API 요청을 처리하지 못했어요.'
  }
}

export async function checkUserIdAvailability(userId: string): Promise<boolean> {
  const query = new URLSearchParams({ user_id: normalizeUserId(userId) })
  const response = await fetch(`/api/auth/user-id-availability?${query}`)

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response))
  }

  const payload = (await response.json()) as { available: boolean }

  return payload.available
}

export async function getCurrentAuthSession(): Promise<AuthSession | null> {
  if (!supabase) {
    return null
  }

  const { data } = await supabase.auth.getSession()

  return sessionToAuthSession(data.session)
}

export function subscribeAuthSession(
  onChange: (session: AuthSession | null) => void,
) {
  if (!supabase) {
    return () => undefined
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(sessionToAuthSession(session))
  })

  return () => data.subscription.unsubscribe()
}

export async function signUpWithUserId(
  userId: string,
  password: string,
): Promise<AuthResult> {
  if (!supabase) {
    return {
      message: 'Supabase 환경변수를 설정하면 회원가입을 진행할 수 있어요.',
      session: null,
    }
  }

  const normalizedUserId = normalizeUserId(userId)
  const { data, error } = await supabase.auth.signUp({
    email: userIdToAuthEmail(normalizedUserId),
    password,
    options: {
      data: {
        user_id: normalizedUserId,
      },
    },
  })

  if (error) {
    throw new Error(formatAuthErrorMessage(error.message))
  }

  return {
    message: data.session
      ? '회원가입과 로그인이 완료됐어요.'
      : '회원가입 요청을 보냈어요. Supabase 이메일 확인 설정을 확인해주세요.',
    session: sessionToAuthSession(data.session),
  }
}

export async function signInWithUserId(
  userId: string,
  password: string,
): Promise<AuthResult> {
  if (!supabase) {
    return {
      message: 'Supabase 환경변수를 설정하면 로그인을 진행할 수 있어요.',
      session: null,
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: userIdToAuthEmail(userId),
    password,
  })

  if (error) {
    throw new Error(formatAuthErrorMessage(error.message))
  }

  return {
    message: '로그인했어요.',
    session: sessionToAuthSession(data.session),
  }
}

export async function signOut(): Promise<void> {
  if (!supabase) {
    return
  }

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(formatAuthErrorMessage(error.message))
  }
}

export async function deleteCurrentUserAccount(
  session: AuthSession,
): Promise<void> {
  const response = await fetch('/api/auth/account', {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response))
  }

  await signOut()
}

export { isSupabaseConfigured }
