/**
 * sections/EmployeeDetail.tsx — P3 employee detail page (URS FR-04).
 *
 * Shows the full record plus a summary of THIS week's shifts and approved
 * leaves, with a shortcut into the shift planner. Two deliberate privacy /
 * safety decisions:
 *  - NF-03: the hourly wage is sensitive and only rendered for admins
 *    (managers see everything except pay);
 *  - edit/delete buttons are admin-only as well.
 * The "Login ID" row tells an admin exactly which ID to hand to the employee.
 */
import type { Employee, Leave, Shift } from '../types'
import { padId, staffLoginId, weekDates } from '../lib/dates'
import { useT, DAY_KEYS, SHIFT_KEYS } from '../i18n'
import type { DictKey } from '../i18n'

interface Props {
  employee: Employee
  shifts: Shift[]
  leaves: Leave[]
  isAdmin: boolean
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onGoPlanner: () => void
}

export default function EmployeeDetail({
  employee: e,
  shifts,
  leaves,
  isAdmin,
  onBack,
  onEdit,
  onDelete,
  onGoPlanner,
}: Props) {
  const { t } = useT()
  const week = weekDates(0)
  // this person's shifts / approved leaves inside the current week, sorted by date
  const myShifts = shifts
    .filter((s) => s.employeeId === e.id && week.includes(s.date))
    .sort((a, b) => a.date.localeCompare(b.date))
  const myLeaves = leaves
    .filter((l) => l.employeeId === e.id && week.includes(l.date))
    .sort((a, b) => a.date.localeCompare(b.date))

  /** label–value row; empty values render as '—' */
  const item = (label: string, value: string) => (
    <div className="flex gap-6 py-2.5">
      <span className="w-32 shrink-0 text-sm text-neutral-500">{label}</span>
      <span className="text-sm">{value || '—'}</span>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-[#0A8F79] hover:underline">
          {t('back')}
        </button>
        {isAdmin && (
          <div className="flex gap-3">
            <button
              onClick={onEdit}
              className="rounded-lg border border-neutral-300 bg-white px-5 py-1.5 text-sm hover:bg-neutral-50"
            >
              {t('act.edit')}
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg border border-rose-300 bg-white px-5 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
            >
              {t('act.delete')}
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 max-w-5xl rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00C9A7] to-[#38bdf8] text-xl font-black text-white">
            {e.name.slice(0, 1)}
          </span>
          <div>
            <h2 className="text-2xl font-bold">{e.name}</h2>
            <span className="text-sm text-neutral-500">
              ID {padId(e.id)} · <span className="text-emerald-600">{t('active')}</span>
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-12">
          {item(t('f.gender'), t(e.gender === 'male' ? 'g.male' : 'g.female'))}
          {item(t('f.loginId'), staffLoginId(e.id))}
          {item(t('f.birth'), e.birth)}
          {item(t('f.phone'), e.phone)}
          {item(t('f.email'), e.email)}
          {item(t('f.jobTitle'), t(`job.${e.jobTitle}` as DictKey))}
          {item(t('f.department'), t(`dept.${e.department}` as DictKey))}
          {item(t('f.startDate'), e.startDate)}
          {/* NF-03: wage is a sensitive field, hidden from manager accounts */}
          {isAdmin && item(t('f.wage'), `${e.wage} CNY / hour`)}
          {item(t('f.address'), e.address)}
          {item(t('f.emgName'), e.emergencyName && `${e.emergencyName} · ${e.emergencyPhone}`)}
        </div>
      </div>

      {/* this week at a glance: teal chips = shifts, red chips = approved leave */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="font-bold">{t('thisWeek')}</span>
        {myShifts.length === 0 && <span className="text-sm text-neutral-400">{t('noShiftWeek')}</span>}
        {myShifts.map((s) => (
          <span
            key={s.date}
            className="rounded-full bg-[#E6FAF6] px-3 py-1 text-sm font-medium text-[#0B6B5C]"
          >
            {t(DAY_KEYS[week.indexOf(s.date)])} · {t(SHIFT_KEYS[s.type])}
          </span>
        ))}
        {myLeaves.map((l) => (
          <span
            key={l.id}
            className="rounded-full bg-rose-100 px-3 py-1 text-sm font-medium text-rose-700"
          >
            {t(DAY_KEYS[week.indexOf(l.date)])} · {t('onLeaveTag')}
          </span>
        ))}
        <button onClick={onGoPlanner} className="ml-3 text-sm text-[#0A8F79] hover:underline">
          {t('viewFull')}
        </button>
      </div>
    </div>
  )
}
