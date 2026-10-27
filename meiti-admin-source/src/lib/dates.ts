/**
 * lib/dates.ts — date & ID helpers shared by all pages.
 *
 * Conventions used everywhere in the app:
 *  - Weeks are Monday-first (the shop plans per calendar week, ISO-8601 style).
 *  - Dates are plain 'YYYY-MM-DD' strings: they serialise cleanly into
 *    localStorage and can be compared with simple string comparison
 *    (s.date >= today() is correct because of the zero-padded format).
 */

/** Format a Date as 'YYYY-MM-DD' (zero-padded). */
export function fmt(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Monday 00:00 of the week offset by offsetWeeks from the current week */
export function mondayOf(offsetWeeks = 0): Date {
  const d = new Date()
  const dow = (d.getDay() + 6) % 7 // convert JS Sunday-first (0=Sun) to Monday-first index
  d.setDate(d.getDate() - dow + offsetWeeks * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

/** The 7 dates of that week, index 0 = Monday */
export function weekDates(offsetWeeks = 0): string[] {
  const m = mondayOf(offsetWeeks)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(m)
    d.setDate(m.getDate() + i)
    return fmt(d)
  })
}

/** Compact label for the week switcher, e.g. '2026-10-19 ~ 10-25'. */
export function weekLabel(dates: string[]): string {
  return `${dates[0]} ~ ${dates[6].slice(5)}`
}

export function today(): string {
  return fmt(new Date())
}

/** Zero-pad an employee number: 7 → '007'. */
export function padId(id: number): string {
  return String(id).padStart(3, '0')
}

/**
 * Staff login ID: 'C' + number (C001, C013, C999… — no upper limit).
 * The login page derives role from the leading letter (A=admin, B=manager,
 * C=staff), so any number of employees can be added without new accounts.
 */
export function staffLoginId(id: number): string {
  return 'C' + padId(id)
}

/** Current timestamp as 'YYYY-MM-DD HH:mm' — used by the operation log. */
export function now(): string {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${fmt(d)} ${hh}:${mm}`
}
