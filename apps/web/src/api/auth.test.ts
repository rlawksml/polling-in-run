import { describe, expect, it } from 'vitest'
import {
  formatAuthErrorMessage,
  isValidUserId,
  normalizeUserId,
  userIdToAuthEmail,
} from './auth'

describe('auth helpers', () => {
  it('normalizes and validates user IDs', () => {
    expect(normalizeUserId(' Runner_01 ')).toBe('runner_01')
    expect(isValidUserId('runner_01')).toBe(true)
    expect(isValidUserId('abc')).toBe(false)
    expect(isValidUserId('runner@email.com')).toBe(false)
  })

  it('converts a user ID to the internal auth email', () => {
    expect(userIdToAuthEmail(' Runner ')).toBe('runner@polling-in-run.local')
  })

  it('maps Supabase auth errors to user-facing Korean messages', () => {
    expect(formatAuthErrorMessage('User already registered')).toBe(
      '이미 사용 중인 ID예요. 다른 ID를 입력해주세요.',
    )
    expect(formatAuthErrorMessage('Invalid login credentials')).toBe(
      'ID 또는 비밀번호를 확인해주세요.',
    )
    expect(formatAuthErrorMessage('Password should be at least 8 characters')).toBe(
      '비밀번호 조건을 확인해주세요. 8자 이상 입력해야 해요.',
    )
    expect(formatAuthErrorMessage('Failed to fetch')).toBe(
      '네트워크 상태를 확인한 뒤 다시 시도해주세요.',
    )
  })

  it('uses a safe fallback for unknown auth errors', () => {
    expect(formatAuthErrorMessage('unexpected provider error')).toBe(
      '인증 요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.',
    )
  })
})
