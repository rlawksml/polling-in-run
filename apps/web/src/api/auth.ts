import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const DEFAULT_AUTH_EMAIL_DOMAIN = 'polling-in-run.local'

export type AuthSession = {
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

export function sessionToAuthSession(session: Session | null): AuthSession | null {
  if (!session) {
    return null
  }

  const email = session.user.email ?? null
  const userId =
    typeof session.user.user_metadata.user_id === 'string'
      ? session.user.user_metadata.user_id
      : email?.split('@')[0]

  return userId ? { email, userId } : null
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
    throw new Error(error.message)
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
    throw new Error(error.message)
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
    throw new Error(error.message)
  }
}

export { isSupabaseConfigured }
