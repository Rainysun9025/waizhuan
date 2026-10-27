/**
 * sections/Stats.tsx — P7 statistics page (URS FR-11 + management reporting).
 *
 * Everything on this page is COMPUTED LIVE from the current employees /
 * shifts / leaves arrays — nothing is typed in or stored separately, so the
 * numbers can never go stale. The page is fully read-only and identical for
 * admins and managers.
 *
 * Charts are hand-rolled with CSS instead of a chart library:
 *  - the department "pie" is a conic-gradient whose stops are computed from
 *    the per-department counts;
 *  - the weekly bar chart is flexbox columns with height proportional to the
 *    busiest day. Zero dependencies, zero config.
 */
import type { Employee, Leave, Shift } from '../types'
import { today, weekDates } from '../lib/dates'
import { useT, DAY_KEYS } from '../i18n'
import type { DictKey } from '../i18n'

/** chart palette aligned with the brand colours (teal / blue / amber / violet / rose) */
const PIE_COLORS = ['#00C9A7', '#3b82f6', '#f59e0b', '#8b5cf6', '#f43f5e']

export default function Stats({
  employees,
  shifts,
  leaves,
}: {
  employees: Employee[]
  shifts: Shift[]
  leaves: Leave[]
}) {
  const { t } = useT()
  const week = weekDates(0)
  const weekShifts = shifts.filter((s) => week.includes(s.date))
  const todayCount = shifts.filter((s) => s.date === today()).length
  const todayLeave = leaves.filter((l) => l.date === today()).length

  // ---- department distribution (pie): count employees per department ----
  const deptCounts = new Map<string, number>()
  employees.forEach((e) =>
    deptCounts.set(e.department || 'unassigned', (deptCounts.get(e.department || 'unassigned') ?? 0) + 1),
  )
  const depts = [...deptCounts.entries()].sort((a, b) => b[1] - a[1]) // largest first
  const total = Math.max(1, employees.length)
  // build the conic-gradient stops: each department gets count/total × 360°
  let acc = 0
  const stops = depts
    .map(([, count], i) => {
      const from = (acc / total) * 360
      acc += count
      const to = (acc / total) * 360
      return `${PIE_COLORS[i % PIE_COLORS.length]} ${from}deg ${to}deg`
    })
    .join(', ')

  // ---- scheduled headcount per day this week (bars) ----
  const perDay = week.map((d) => weekShifts.filter((s) => s.date === d).length)
  const maxDay = Math.max(1, ...perDay) // guard against ÷0 on an empty week

  /** KPI card with a coloured top bar (blue / teal / amber / violet) */
  const card = (label: string, value: string, bar: string, numColor: string) => (
    <div className="w-52 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className={`h-1.5 bg-gradient-to-r ${bar}`} />
      <div className="px-5 py-4">
        <div className="text-sm text-neutral-500">{label}</div>
        <div className={`mt-1 text-3xl font-bold ${numColor}`}>{value}</div>
      </div>
    </div>
  )

  return (
    <div>
      {/* KPI row */}
      <div className="flex flex-wrap gap-5">
        {card(t('stat.active'), `${employees.length}`, 'from-sky-500 to-blue-400', 'text-sky-600')}
        {card(t('stats.weekShifts'), `${weekShifts.length}`, 'from-[#00C9A7] to-emerald-400', 'text-[#0A8F79]')}
        {card(t('stats.today'), `${todayCount}`, 'from-amber-500 to-orange-400', 'text-amber-600')}
        {card(t('stats.leaveToday'), `${todayLeave}`, 'from-violet-500 to-purple-400', 'text-violet-600')}
      </div>

      <div className="mt-6 flex flex-wrap gap-5">
        {/* employees by department */}
        <div className="w-[420px] rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 className="font-bold">{t('stats.byDept')}</h3>
          <div className="mt-5 flex items-center gap-8">
            <div
              className="h-44 w-44 shrink-0 rounded-full shadow-inner"
              style={{ background: `conic-gradient(${stops})` }}
            />
            <ul className="space-y-2 text-sm">
              {depts.map(([code, count], i) => (
                <li key={code} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  {code === 'unassigned' ? t('unassigned') : t(`dept.${code}` as DictKey)}: {count}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* scheduled headcount per day */}
        <div className="min-w-[420px] flex-1 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 className="font-bold">{t('stats.perDay')}</h3>
          <div className="mt-5 flex h-48 items-end gap-4 border-b-2 border-slate-300 px-4">
            {perDay.map((n, i) => (
              <div key={week[i]} className="flex flex-1 flex-col items-center justify-end">
                <span className="mb-1 text-xs text-neutral-500">{n}</span>
                <div
                  className="w-full max-w-12 rounded-t bg-gradient-to-t from-[#00C9A7] to-[#38bdf8]"
                  style={{ height: `${(n / maxDay) * 130}px` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-4 px-4 pt-2 text-center text-xs text-neutral-500">
            {DAY_KEYS.map((k) => (
              <span key={k} className="flex-1">{t(k)}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-neutral-500">
        {t('stats.note')}
      </div>
    </div>
  )
}
