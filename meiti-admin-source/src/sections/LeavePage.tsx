/**
 * sections/LeavePage.tsx — leave management page (URS FR-14, Should have).
 *
 * Business rules agreed with the client:
 *  - normally at most LEAVE_CAP_PER_DAY (3) people on leave per day, so the
 *    shop always keeps enough staff;
 *  - in special cases the admin may specially approve up to LEAVE_CAP_MAX (5) —
 *    a hard ceiling that can never be passed;
 *  - employees themselves submit requests from their portal; those stay
 *    "pending" until the admin approves or rejects them here.
 *
 * The page has four blocks:
 *   1. admin-only registration bar (phone-call scenario: admin writes it in);
 *   2. pending requests queue with Approve / Reject buttons;
 *   3. a 7-day strip showing each day's approved count with a colour-coded
 *      quota bar (green → amber when the soft cap is hit → red at the hard cap);
 *   4. the week's full record table with withdraw actions.
 *
 * All rule enforcement and the confirm-dialog chain live in App.tsx.
 */
import { useState } from 'react'
import type { Employee, Leave, LeaveStatus } from '../types'
import { padId, weekDates, weekLabel } from '../lib/dates'
import { LEAVE_CAP_MAX, LEAVE_CAP_PER_DAY } from '../data/seed'
import { useT, DAY_KEYS } from '../i18n'
import type { DictKey } from '../i18n'

interface Props {
  employees: Employee[]
  leaves: Leave[]
  isAdmin: boolean
  weekOffset: number
  onWeekChange: (offset: number) => void
  onAddLeave: (employeeId: number, date: string, reason: string) => void
  onApprove: (id: number) => void
  onReject: (id: number) => void
  onCancelLeave: (id: number) => void
}

const weekBtn =
  'rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50'

const inputCls =
  'rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#00C9A7] focus:ring-2 focus:ring-[#00C9A7]/25'

/** chip colour per leave status: amber pending / green approved / grey rejected */
const STATUS_CHIP: Record<LeaveStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-slate-100 text-slate-500',
}

export default function LeavePage({
  employees,
  leaves,
  isAdmin,
  weekOffset,
  onWeekChange,
  onAddLeave,
  onApprove,
  onReject,
  onCancelLeave,
}: Props) {
  const { t } = useT()
  const dates = weekDates(weekOffset)
  const weekLeaves = leaves.filter((l) => dates.includes(l.date))
  const pending = weekLeaves
    .filter((l) => l.status === 'pending')
    .sort((a, b) => a.date.localeCompare(b.date))
  // registration bar state
  const [empId, setEmpId] = useState<number | ''>('')
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')

  const nameOf = (id: number) => employees.find((e) => e.id === id)?.name ?? t('departed')
  /** approved headcount for one date — drives the quota strip colours */
  const countOn = (d: string) =>
    leaves.filter((l) => l.date === d && l.status === 'approved').length
  const canSubmit = isAdmin && empId !== '' && date !== '' && reason.trim() !== ''

  return (
    <div>
      {/* 1) admin-only registration bar (managers are read-only) */}
      {isAdmin && (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold">{t('leave.add')}</span>
            <select
              value={empId}
              onChange={(e) => setEmpId(e.target.value === '' ? '' : Number(e.target.value))}
              className={inputCls}
            >
              <option value="">{t('employee')}…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({padId(e.id)})
                </option>
              ))}
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('leave.reasonPh')}
              className={`${inputCls} w-64`}
            />
            <button
              disabled={!canSubmit}
              onClick={() => {
                if (empId !== '' && date) {
                  onAddLeave(empId, date, reason.trim())
                  setReason('')
                }
              }}
              className="rounded-lg bg-[#00C9A7] px-5 py-2 text-sm font-semibold text-[#0B3B33] shadow-sm hover:bg-[#00B295] disabled:bg-neutral-300 disabled:text-neutral-500"
            >
              {t('leave.add')}
            </button>
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            {t('leave.capNote', { cap: LEAVE_CAP_PER_DAY, max: LEAVE_CAP_MAX })}
          </p>
        </div>
      )}

      {/* 2) pending queue — only admins get Approve/Reject buttons */}
      <div className="mt-5 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-sm font-bold text-neutral-700">
          {t('leave.pendingList')}
          {pending.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
              {pending.length}
            </span>
          )}
        </div>
        {pending.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-400">{t('leave.noPending')}</div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {pending.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-5 py-2.5 font-medium">{nameOf(l.employeeId)}</td>
                  <td className="px-5 py-2.5">
                    {l.date}
                    <span className="ml-2 text-neutral-400">
                      {t(DAY_KEYS[dates.indexOf(l.date)] ?? 'day.mon')}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-neutral-600">{l.reason}</td>
                  <td className="px-5 py-2.5">
                    {isAdmin ? (
                      <>
                        <button
                          onClick={() => onApprove(l.id)}
                          className="rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-200"
                        >
                          {t('leave.approve')}
                        </button>
                        <button
                          onClick={() => onReject(l.id)}
                          className="ml-2 rounded-md bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                        >
                          {t('leave.reject')}
                        </button>
                      </>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {t('leave.pending')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 3) week strip: approved leave count per day with quota bar */}
      <div className="mt-5 flex items-center gap-3">
        <span className="text-sm font-bold">{t('week')}</span>
        <button className={weekBtn} onClick={() => onWeekChange(weekOffset - 1)}>‹</button>
        <span className="rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-sm">
          {weekLabel(dates)}
        </span>
        <button className={weekBtn} onClick={() => onWeekChange(weekOffset + 1)}>›</button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-3">
        {dates.map((d, i) => {
          const n = countOn(d)
          const hardFull = n >= LEAVE_CAP_MAX
          const quotaFull = n >= LEAVE_CAP_PER_DAY
          return (
            <div
              key={d}
              className={`rounded-xl bg-white p-3 text-center shadow-sm ring-1 ${
                hardFull ? 'ring-rose-300' : quotaFull ? 'ring-amber-300' : 'ring-slate-200'
              }`}
            >
              <div className="text-xs font-bold text-neutral-600">{t(DAY_KEYS[i])}</div>
              <div className="text-[11px] text-neutral-400">{d.slice(5)}</div>
              <div
                className={`mt-2 text-xl font-bold ${
                  hardFull ? 'text-rose-600' : quotaFull ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {n}
                <span className="text-xs font-normal text-neutral-400">/{LEAVE_CAP_MAX}</span>
              </div>
              {/* progress bar: fill ratio against the HARD cap */}
              <div className="mx-auto mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${hardFull ? 'bg-rose-500' : quotaFull ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(100, (n / LEAVE_CAP_MAX) * 100)}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] font-medium">
                {hardFull ? (
                  <span className="text-rose-600">{t('leave.full')}</span>
                ) : quotaFull ? (
                  <span className="text-amber-600">{t('leave.quotaFull')}</span>
                ) : (
                  <span className="text-neutral-400">{t('leave.onLeave', { n })}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 4) full record table for the selected week */}
      <div className="mt-5 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-100 px-5 py-3 text-sm font-bold text-neutral-700">
          {t('leave.records')}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-neutral-500">
              <th className="px-5 py-2.5 font-semibold">{t('employee')}</th>
              <th className="px-5 py-2.5 font-semibold">{t('leave.date')}</th>
              <th className="px-5 py-2.5 font-semibold">{t('leave.reason')}</th>
              <th className="px-5 py-2.5 font-semibold">{t('leave.status')}</th>
              {isAdmin && <th className="px-5 py-2.5 font-semibold">{t('th.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {weekLeaves
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-5 py-2.5 font-medium">{nameOf(l.employeeId)}</td>
                  <td className="px-5 py-2.5">
                    {l.date}
                    <span className="ml-2 text-neutral-400">
                      {t(DAY_KEYS[dates.indexOf(l.date)] ?? 'day.mon')}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-neutral-600">{l.reason}</td>
                  <td className="px-5 py-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CHIP[l.status]}`}>
                      {t(`leave.${l.status}` as DictKey)}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-2.5">
                      {/* rejected records are kept for the audit trail and can no
                          longer be withdrawn */}
                      {l.status !== 'rejected' && (
                        <button
                          onClick={() => onCancelLeave(l.id)}
                          className="text-rose-600 hover:underline"
                        >
                          {t('leave.withdraw')}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
        {weekLeaves.length === 0 && (
          <div className="py-12 text-center text-neutral-400">{t('leave.empty')}</div>
        )}
      </div>
    </div>
  )
}
