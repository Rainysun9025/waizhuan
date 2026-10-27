/**
 * sections/ShiftPlanner.tsx — P5 per-employee shift planner (URS FR-07 / FR-08).
 *
 * A 7-day × 3-shift grid for ONE selected employee. Two ways to assign:
 *   A) toolbar: pick day + shift type in the controls, press "Assign";
 *   B) shortcut (added after user testing): click an empty cell — the cell
 *      preselects that day and shift in the toolbar, then press "Assign".
 * Clicking a marked (✓) cell asks to CLEAR that shift.
 *
 * All rule enforcement (leave days, one-shift-per-day conflicts) lives in
 * App.tsx's assignShift — this component only collects intent.
 *
 * Managers see the grid without the editing controls (read-only, FR: manager
 * role may browse but not modify).
 */
import { useState } from 'react'
import type { Employee, Leave, Shift, ShiftType } from '../types'
import { padId, weekDates, weekLabel } from '../lib/dates'
import { useT, DAY_KEYS, SHIFT_KEYS } from '../i18n'

interface Props {
  employees: Employee[]
  shifts: Shift[]
  leaves: Leave[]
  isAdmin: boolean
  weekOffset: number
  onWeekChange: (offset: number) => void
  selectedId: number | null
  onSelectEmployee: (id: number) => void
  onAssign: (employeeId: number, date: string, type: ShiftType) => void
  onCellClick: (employeeId: number, date: string) => void
}

const weekBtn =
  'rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50'

/** colour theme per shift type — amber morning / sky noon / violet evening */
const SHIFT_CHIP = [
  'bg-amber-100 text-amber-800 border-amber-300',
  'bg-sky-100 text-sky-800 border-sky-300',
  'bg-violet-100 text-violet-800 border-violet-300',
]

export default function ShiftPlanner({
  employees,
  shifts,
  leaves,
  isAdmin,
  weekOffset,
  onWeekChange,
  selectedId,
  onSelectEmployee,
  onAssign,
  onCellClick,
}: Props) {
  const { t } = useT()
  const dates = weekDates(weekOffset)
  // toolbar state: which day / shift type is currently picked
  const [dayIdx, setDayIdx] = useState<number | null>(null)
  const [shiftType, setShiftType] = useState<ShiftType | null>(null)

  const myShift = (date: string) =>
    selectedId == null ? undefined : shifts.find((s) => s.employeeId === selectedId && s.date === date)
  const onLeave = (date: string) =>
    selectedId != null && leaves.some((l) => l.employeeId === selectedId && l.date === date)

  // Assign stays disabled until day + shift + employee are all chosen
  const canAssign = isAdmin && selectedId != null && dayIdx != null && shiftType != null

  // week switcher + employee picker, shared between admin and manager layouts
  const weekSwitch = (
    <>
      <span className="text-sm font-bold">{t('week')}</span>
      <button className={weekBtn} onClick={() => onWeekChange(weekOffset - 1)}>‹</button>
      <span className="rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-sm">
        {weekLabel(dates)}
      </span>
      <button className={weekBtn} onClick={() => onWeekChange(weekOffset + 1)}>›</button>
      <span className="ml-4 text-sm font-bold">{t('employee')}</span>
      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelectEmployee(Number(e.target.value))}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
      >
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name} ({padId(e.id)})
          </option>
        ))}
      </select>
    </>
  )

  return (
    <div>
      {/* editing controls: hidden entirely for manager accounts */}
      {isAdmin ? (
        <div className="flex flex-wrap items-center gap-3">
          {weekSwitch}
          <span className="ml-4 text-sm font-bold">{t('day')}</span>
          <select
            value={dayIdx ?? ''}
            onChange={(e) => setDayIdx(e.target.value === '' ? null : Number(e.target.value))}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">{t('sel.please')}</option>
            {DAY_KEYS.map((k, i) => (
              <option key={k} value={i}>{t(k)} ({dates[i].slice(5)})</option>
            ))}
          </select>

          <span className="ml-4 text-sm font-bold">{t('shift')}</span>
          <div className="flex items-center gap-3 text-sm">
            {SHIFT_KEYS.map((k, i) => (
              <label key={k} className="flex cursor-pointer items-center gap-1">
                <input
                  type="radio"
                  name="shiftType"
                  className="accent-[#00C9A7]"
                  checked={shiftType === i}
                  onChange={() => setShiftType(i as ShiftType)}
                />
                {t(k)}
              </label>
            ))}
          </div>

          <button
            disabled={!canAssign}
            onClick={() => {
              if (selectedId != null && dayIdx != null && shiftType != null) {
                onAssign(selectedId, dates[dayIdx], shiftType)
              }
            }}
            className="ml-2 rounded-lg bg-[#00C9A7] px-6 py-2 text-sm font-semibold text-[#0B3B33] shadow-sm hover:bg-[#00B295] disabled:bg-neutral-300 disabled:text-neutral-500"
          >
            {t('assign')}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">{weekSwitch}</div>
      )}

      {/* 7 days × 3 shifts grid */}
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
                {/* row header tinted with the shift's theme colour */}
                <th className={`border-b border-slate-200 px-3 py-6 text-left font-bold ${SHIFT_CHIP[si].split(' ')[0]} ${SHIFT_CHIP[si].split(' ')[1]}`}>
                  {t(k)}
                </th>
                {dates.map((date) => {
                  const hit = myShift(date)
                  const marked = hit?.type === si
                  const leave = onLeave(date)
                  return (
                    <td
                      key={date}
                      onClick={() => {
                        if (!isAdmin || selectedId == null) return
                        if (marked) onCellClick(selectedId, date) // ✓ cell → ask to clear
                        else if (!leave) {
                          // empty cell → preselect that day + shift in the toolbar;
                          // the actual assignment happens via the Assign button
                          setDayIdx(dates.indexOf(date))
                          setShiftType(si as ShiftType)
                        }
                      }}
                      className={`border-b border-l border-slate-100 text-center align-middle ${
                        isAdmin && marked ? 'cursor-pointer hover:bg-rose-50' : ''
                      } ${isAdmin && !marked && !leave ? 'cursor-pointer hover:bg-[#00C9A7]/10' : ''} ${leave ? 'bg-rose-50/60' : ''}`}
                      title={isAdmin && marked ? t('m.clearOk') : leave ? t('onLeaveTag') : ''}
                    >
                      {marked && (
                        <span className={`inline-block rounded-full border px-3 py-0.5 text-sm font-bold ${SHIFT_CHIP[si]}`}>
                          ✓ {t(SHIFT_KEYS[si])}
                        </span>
                      )}
                      {!marked && leave && (
                        <span className="inline-block rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-600">
                          {t('onLeaveTag')}
                        </span>
                      )}
                      {/* faint ＋ on empty cells signals "clickable" to admins */}
                      {!marked && !leave && isAdmin && (
                        <span className="text-lg leading-none text-neutral-300">＋</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-neutral-500">
        {t(isAdmin ? 'planner.tip.admin' : 'planner.tip.manager')}
      </div>
    </div>
  )
}
