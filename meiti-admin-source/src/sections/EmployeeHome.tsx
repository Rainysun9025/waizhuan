/**
 * sections/EmployeeHome.tsx — the staff personal portal (URS FR-01 role
 * landing page + FR-14 employee leave requests).
 *
 * A staff member logging in with a C-ID lands here instead of the admin
 * Shell. They can ONLY:
 *  - see their own week (shifts / approved leave / rest days);
 *  - submit a leave request for THEMSELVES (goes to "pending" until the
 *    admin approves it — the rule lives in requestLeave in App.tsx);
 *  - withdraw one of their own requests/records.
 * Everything else (other people's data, planning, approval) is unreachable,
 * which is the whole point of role-based access.
 */
import { useState } from 'react'
import type { Account, Employee, Leave, Shift } from '../types'
import { staffLoginId, weekDates, weekLabel } from '../lib/dates'
import { LEAVE_CAP_MAX, LEAVE_CAP_PER_DAY } from '../data/seed'
import { useT, DAY_KEYS, SHIFT_KEYS } from '../i18n'
import type { DictKey } from '../i18n'

interface Props {
  account: Account
  employee: Employee
  shifts: Shift[]
  leaves: Leave[]
  onAddLeave: (employeeId: number, date: string, reason: string) => void
  onCancelLeave: (id: number) => void
  onLogout: () => void
}

/** colour theme per shift type — matches the planner pages */
const SHIFT_CHIP = [
  'bg-amber-100 text-amber-800 ring-amber-200',
  'bg-sky-100 text-sky-800 ring-sky-200',
  'bg-violet-100 text-violet-800 ring-violet-200',
]

const inputCls =
  'rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#00C9A7] focus:ring-2 focus:ring-[#00C9A7]/25'

export default function EmployeeHome({
  account,
  employee,
  shifts,
  leaves,
  onAddLeave,
  onCancelLeave,
  onLogout,
}: Props) {
  const { t, lang, setLang } = useT()
  const [weekOffset, setWeekOffset] = useState(0)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')

  const dates = weekDates(weekOffset)
  // strictly filtered to the logged-in person — no one else's data ever arrives here
  const myShifts = shifts.filter((s) => s.employeeId === employee.id && dates.includes(s.date))
  const myLeaves = leaves
    .filter((l) => l.employeeId === employee.id && dates.includes(l.date))
    .sort((a, b) => a.date.localeCompare(b.date))
  const canSubmit = date !== '' && reason.trim() !== ''

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-neutral-900">
      {/* simplified header: brand + language + logout (no admin navigation) */}
      <header className="flex items-center justify-between bg-gradient-to-r from-[#1B1B27] to-[#2D2D45] px-6 py-3 text-white shadow-md">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00C9A7] to-[#38bdf8] text-lg font-black">
            M
          </span>
          <div className="text-xl font-bold tracking-wide">
            Meiti
            <span className="ml-3 hidden text-sm font-normal text-white/50 sm:inline">{t('app.sub')}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
            className="rounded-full border border-white/30 px-4 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10"
          >
            {lang === 'en' ? '中文' : 'EN'}
          </button>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00C9A7]/20 text-sm font-bold text-[#00C9A7] ring-2 ring-[#00C9A7]/50">
            {employee.name.slice(0, 1)}
          </span>
          <span className="text-sm">
            {account.displayName} · {t('role.employee')}
          </span>
          <button
            onClick={onLogout}
            className="rounded-lg bg-white/10 px-4 py-1.5 text-sm font-medium hover:bg-white/20"
          >
            {t('logout')}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        {/* welcome card with the person's key facts (incl. their login ID) */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="h-1.5 bg-gradient-to-r from-[#00C9A7] to-[#38bdf8]" />
          <div className="flex flex-wrap items-center gap-4 px-6 py-5">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#00C9A7] to-[#38bdf8] text-xl font-black text-white ring-4 ring-[#00C9A7]/20">
              {employee.name.slice(0, 1)}
            </span>
            <div>
              <div className="text-xl font-bold">{t('portal.hi', { name: employee.name })}</div>
              <div className="mt-0.5 text-sm text-neutral-500">{t('portal.sub')}</div>
            </div>
            <div className="ml-auto flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-mono font-medium text-neutral-600">
                ID {staffLoginId(employee.id)}
              </span>
              <span className="rounded-full bg-[#E6FAF6] px-3 py-1 font-medium text-[#0B6B5C]">
                {t(`job.${employee.jobTitle}` as DictKey)}
              </span>
              <span className="rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-800">
                {t(`dept.${employee.department}` as DictKey)}
              </span>
            </div>
          </div>
        </div>

        {/* week switcher */}
        <div className="mt-6 flex items-center gap-3">
          <span className="text-sm font-bold">{t('week')}</span>
          <button
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
            onClick={() => setWeekOffset(weekOffset - 1)}
          >
            ‹
          </button>
          <span className="rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-sm">
            {weekLabel(dates)}
          </span>
          <button
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
            onClick={() => setWeekOffset(weekOffset + 1)}
          >
            ›
          </button>
        </div>

        {/* my week: 7 cards, each showing shift / leave / rest */}
        <h3 className="mt-5 text-sm font-bold text-neutral-700">{t('portal.myShifts')}</h3>
        <div className="mt-3 grid grid-cols-7 gap-3">
          {dates.map((d, i) => {
            const shift = myShifts.find((s) => s.date === d)
            const onLeave = myLeaves.some((l) => l.date === d && l.status === 'approved')
            return (
              <div key={d} className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200">
                <div className="text-xs font-bold text-neutral-600">{t(DAY_KEYS[i])}</div>
                <div className="text-[11px] text-neutral-400">{d.slice(5)}</div>
                <div className="mt-2">
                  {onLeave ? (
                    <span className="inline-block rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600 ring-1 ring-rose-200">
                      🌿 {t('onLeaveTag')}
                    </span>
                  ) : shift ? (
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs font-medium ring-1 ${SHIFT_CHIP[shift.type]}`}
                    >
                      {t(SHIFT_KEYS[shift.type])}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-300">{t('portal.rest')}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {/* request leave (for myself only → pending until admin approves) */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="text-sm font-bold text-neutral-700">{t('portal.request')}</div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('leave.reasonPh')}
                className={`${inputCls} min-w-0 flex-1`}
              />
              <button
                disabled={!canSubmit}
                onClick={() => {
                  onAddLeave(employee.id, date, reason.trim())
                  setReason('')
                }}
                className="rounded-lg bg-[#00C9A7] px-5 py-2 text-sm font-semibold text-[#0B3B33] shadow-sm hover:bg-[#00B295] disabled:bg-neutral-300 disabled:text-neutral-500"
              >
                {t('portal.request')}
              </button>
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              {t('portal.selfOnly')} {t('leave.capNote', { cap: LEAVE_CAP_PER_DAY, max: LEAVE_CAP_MAX })}
            </p>
          </div>

          {/* my leave records with status chips and a withdraw action */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="text-sm font-bold text-neutral-700">{t('portal.myLeaves')}</div>
            {myLeaves.length === 0 ? (
              <div className="py-8 text-center text-sm text-neutral-400">{t('leave.empty')}</div>
            ) : (
              <ul className="mt-3 space-y-2">
                {myLeaves.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-sm"
                  >
                    <span>
                      <span className="font-medium">{l.date}</span>
                      <span className="ml-2 text-neutral-500">
                        {t(DAY_KEYS[dates.indexOf(l.date)] ?? 'day.mon')}
                      </span>
                      <span className="ml-3 text-neutral-600">{l.reason}</span>
                      <span
                        className={`ml-3 rounded-full px-2 py-0.5 text-xs font-medium ${
                          l.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : l.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {t(`leave.${l.status}` as DictKey)}
                      </span>
                    </span>
                    {l.status !== 'rejected' && (
                      <button
                        onClick={() => onCancelLeave(l.id)}
                        className="text-rose-600 hover:underline"
                      >
                        {t('leave.withdraw')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
