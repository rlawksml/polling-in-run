import type { FacilityType } from '../api/facilities'

export function getFacilityIconSvg(type: FacilityType) {
  if (type === 'water') {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.8C9.7 6.2 6.2 9.4 6.2 14a5.8 5.8 0 0 0 11.6 0C17.8 9.4 14.3 6.2 12 2.8Z" fill="currentColor"/>
        <path d="M9.4 14.2c.2 1.5 1.2 2.4 2.8 2.7" fill="none" stroke="white" stroke-linecap="round" stroke-width="1.7"/>
      </svg>
    `
  }

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="7.5" cy="5" r="2.1" fill="currentColor"/>
      <circle cx="16.5" cy="5" r="2.1" fill="currentColor"/>
      <path d="M4.6 9.1c0-1 .8-1.8 1.8-1.8h2.2c1 0 1.8.8 1.8 1.8v4.8H8.8V21H6.2v-7.1H4.6V9.1Z" fill="currentColor"/>
      <path d="M13.6 9.1c0-1 .8-1.8 1.8-1.8h2.2c1 0 1.8.8 1.8 1.8v4.8h-1.6V21h-2.6v-7.1h-1.6V9.1Z" fill="currentColor"/>
      <path d="M12 3v18" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".45"/>
    </svg>
  `
}
