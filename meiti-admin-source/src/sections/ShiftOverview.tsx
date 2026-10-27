/**
 * sections/ShiftOverview.tsx — P6 store-wide weekly schedule
 * (URS FR-09 overview, FR-12 export).
 *
 * One grid shows EVERYONE: rows = morning/noon/evening, columns = Mon–Sun.
 * This page answers the client's original complaint "we plan on paper and
 * can't see who works when" at a glance.
 *
 * Scalability detail (added after client feedback "what if many people are
 * in one cell?"): each cell shows a headcount badge plus at most
 * VISIBLE_NAMES names; the rest collapses into "+N more", and clicking the
 * cell opens a modal with the COMPLETE list. Clicking any name jumps to that
 * employee's personal planner.
 *
 * The CSV export (FR-12) opens directly in Excel — the BOM prefix '\ufeff'
 * keeps Chinese characters from turning into mojibake.
 */
import type { Employee, Shift, ShiftType } from '../types'
import { weekDates, weekLabel } from '../lib/dates'
import { useT, DAY_KEYS, SHIFT_KEYS } from '../i18n'

interface Props {
  employees: Employee[]
  shifts: Shift[]
  weekOffset: number
  onWeekChange: (offset: number) => void
  onGoPlanner: (employeeId: number) => void
  /** cell clicked → parent opens a modal with that cell's full roster */
  onCellOpen: (date: string, type: ShiftType) => void
}

const weekBtn =
  'rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50'

const SHIFT_HEAD = [
  'bg-amber-100 text-amber-800',
  'bg-sky-100 text-sky-800',
  'bg-violet-100 text-violet-800',
]

/** max names shown directly in a cell; the rest folds into "+N more" */
const VISIBLE_NAMES = 2

export default function ShiftOverview({
  employees,
  shifts,
  weekOffset,
  onWeekChange,
  onGoPlanner,
  onCellOpen,
}: Props) {
  const { t } = useT()
  const dates = weekDates(weekOffset)
  const weekShifts = shifts.filter((s) => dates.includes(s.date))
  const nameOf = (id: number) => employees.find((e) => e.id === id)?.name ?? t('departed')

  /** FR-12: build the week grid as CSV and trigger a browser download */
  function exportCsv() {
    const lines = [
      ['Shift / Date', ...DAY_KEYS.map((k, i) => `${t(k)} ${dates[i].slice(5)}`)].join(','),
      ...SHIFT_KEYS.map((k, si) =>
        [
          t(k),
          ...dates.map((date) =>
            weekShifts
              .filter((s) => s.date === date && s.type === si)
              .map((s) => nameOf(s.employeeId))
              .join(', '),
          ),
        ]
          .map((c) => `"${c}"`) // quote every cell: names may contain commas
          .join(','),
      ),
    ]
    // '\ufeff' = BOM so Excel detects UTF-8 and renders Chinese correctly
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `schedule_${dates[0]}_${dates[6]}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold">{t('week')}</span>
        <button className={weekBtn} onClick={() => onWeekChange(weekOffset - 1)}>‹</button>
        <span className="rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-sm">
          {weekLabel(dates)}
        </span>
        <button className={weekBtn} onClick={() => onWeekChange(weekOffset + 1)}>›</button>
        <button
          onClick={exportCsv}
          className="ml-auto rounded-lg border border-[#00C9A7]/40 bg-[#E6FAF6] px-5 py-1.5 text-sm font-medium text-[#0B6B5C] hover:bg-[#C8F3EB]"
        >
          {t('overview.export')}
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-24 border-b border-slate-200 bg-slate-50 px-3 py-2.5" />
              {DAY_KEYS.map((k, i) => (
                <th key={k} className="border-b border-l border-slate-200 bg-slate-50 px-3 py-2.5 font-bold">
                  {t(k)}
                  <span className="ml-1 text-xs font-normal text-neutral-400">{dates[i].slice(5)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SHIFT_KEYS.map((k, si) => (
              <tr key={k}>
                <th className={`border-b border-slate-200 px-3 py-4 text-left font-bold ${SHIFT_HEAD[si]}`}>
                  {t(k)}
                </th>
                {dates.map((date) => {
                  const cell = weekShifts.filter((s) => s.date === date && s.type === si)
                  const visible = cell.slice(0, VISIBLE_NAMES)
                  const hidden = cell.length - visible.length
                  return (
                    <td
                      key={date}
                      onClick={() => cell.length > 0 && onCellOpen(date, si as ShiftType)}
                      className={`border-b border-l border-slate-100 px-2 py-2 text-center align-top ${
                        cell.length > 0 ? 'cursor-pointer hover:bg-[#00C9A7]/5' : ''
                      }`}
                      title={cell.length > 0 ? t('cell.title', { day: t(DAY_KEYS[dates.indexOf(date)]), date: date.slice(5), shift: t(k), n: cell.length }) : ''}
                    >
                      {/* headcount badge in the cell's top corner */}
                      {cell.length > 0 && (
                        <span className={`mb-1 inline-block rounded-full px-2 text-[11px] font-bold ${SHIFT_HEAD[si]}`}>
                          {cell.length}
                        </span>
                      )}
                      <div>
                        {visible.map((s) => {
                          const emp = employees.find((e) => e.id === s.employeeId)
                          return (
                            <button
                              key={s.employeeId}
                              onClick={(ev) => {
                                ev.stopPropagation() // don't also trigger the cell-open modal
                                onGoPlanner(s.employeeId)
                              }}
                              title={t('viewFull')}
                              className="mx-0.5 my-0.5 rounded bg-slate-100 px-2 py-0.5 text-[#0A8F79] hover:bg-[#C8F3EB] hover:underline"
                            >
                              {emp ? emp.name : t('departed')}
                            </button>
                          )
                        })}
                        {hidden > 0 && (
                          <span className="mx-0.5 my-0.5 inline-block rounded bg-[#E6FAF6] px-2 py-0.5 text-xs font-medium text-[#0B6B5C]">
                            {t('cell.more', { n: hidden })}
                          </span>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {weekShifts.length === 0 && (
          <div className="py-14 text-center text-neutral-400">{t('empty.noShift')}</div>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-neutral-500">
        {t('overview.tip')}
      </div>
    </div>
  )
}
