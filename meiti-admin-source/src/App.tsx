/**
 * App.tsx — application root and the single source of truth.
 *
 * What this file does:
 *  1. Holds ALL business data in React state (employees / shifts / leaves / logs /
 *     id counters) and mirrors every change into localStorage, so the app keeps
 *     its data across refreshes without needing a backend server.
 *  2. Owns every business rule — shift conflicts, leave quota & approval flow,
 *     cascading deletes, operation logging. The page components under
 *     src/sections/ only collect input and call the callbacks defined here.
 *  3. Routes between pages with a small discriminated-union `Page` state
 *     (a full router library would be overkill at this size).
 *
 * Data flow (classic one-way React flow):
 *      state ──props──▶ page components      (render)
 *      state ◀─callbacks── page components   (user events)
 *
 * URS traceability: FR-01 login routing happens here (admin/manager → Shell,
 * employee → EmployeeHome portal); FR-02..06 employee CRUD; FR-07..09 shift
 * planning; FR-14 leave management; FR-13 operation log.
 */
import { useEffect, useState } from 'react'
import type { Account, Employee, EmployeeDraft, Leave, OpLog, Shift, ShiftType } from './types'
import {
  LEAVE_CAP_MAX,
  LEAVE_CAP_PER_DAY,
  SEED_EMPLOYEES,
  SEED_NEXT_ID,
  SEED_NEXT_LEAVE_ID,
  seedLeaves,
  seedShifts,
} from './data/seed'
import { now, padId, today, weekDates } from './lib/dates'
import { useT, DAY_KEYS, SHIFT_KEYS } from './i18n'
import Login from './sections/Login'
import Shell from './sections/Shell'
import type { MenuKey } from './sections/Shell'
import EmployeeList from './sections/EmployeeList'
import EmployeeForm from './sections/EmployeeForm'
import EmployeeDetail from './sections/EmployeeDetail'
import ShiftPlanner from './sections/ShiftPlanner'
import ShiftOverview from './sections/ShiftOverview'
import LeavePage from './sections/LeavePage'
import LogsPage from './sections/LogsPage'
import Stats from './sections/Stats'
import EmployeeHome from './sections/EmployeeHome'
import Modal from './components/Modal'

/**
 * Page — every screen the admin/manager Shell can show.
 * Using a union type means TypeScript forces us to handle each page
 * with exactly the data it needs (e.g. `detail` always carries an id).
 */
type Page =
  | { name: 'list' }
  | { name: 'form'; id?: number } // id present = edit mode, absent = add mode
  | { name: 'detail'; id: number }
  | { name: 'shift' }
  | { name: 'leave' }
  | { name: 'stats' }
  | { name: 'logs' }

/**
 * ModalState — every confirmation/warning dialog in the app.
 * Business actions never mutate data silently; when something needs a
 * human decision (overwrite a shift? exceed the leave quota?) we open a
 * modal, remember the pending action inside it, and only apply the change
 * after the user confirms. `null` = no dialog open.
 */
type ModalState =
  | { kind: 'delete'; id: number }                                    // confirm employee deletion
  | { kind: 'conflict'; employeeId: number; date: string; type: ShiftType } // day already has a different shift
  | { kind: 'clear'; employeeId: number; date: string }               // confirm removing a shift
  | { kind: 'cell'; date: string; type: ShiftType }                   // overview cell: show the full roster
  | { kind: 'leaveCap'; date: string }                                // hard daily leave cap reached
  | { kind: 'leaveShift'; employeeId: number; date: string; reason: string } // leave day has a shift → clear it?
  | { kind: 'leaveBlock'; employeeId: number; date: string }          // cannot schedule: approved leave that day
  | { kind: 'leaveCancel'; id: number }                               // confirm withdrawing a leave record
  | { kind: 'leaveAddWarn'; employeeId: number; date: string; reason: string } // over soft cap → special approval
  | { kind: 'leaveWarn'; id: number }                                 // approving would exceed the soft cap
  | { kind: 'leaveShiftClear'; id: number }                           // approve + clear that day's shift
  | { kind: 'leaveReject'; id: number }                               // confirm rejecting a request
  | null

/**
 * load — read one slice of state from localStorage, falling back to the
 * seed/demo data when nothing is stored yet (first launch) or the stored
 * JSON is corrupt. All keys are namespaced with `meiti2:` to avoid
 * clashing with anything else on the same origin.
 */
function load<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem('meiti2:' + key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    /* corrupt storage → fall back to seed data */
  }
  return fallback()
}

export default function App() {
  const { t } = useT()

  // ----- Session: who is logged in (null = show the login page) -----
  const [session, setSession] = useState<Account | null>(null)

  // ----- Business data. Each slice lazily initialises from localStorage. -----
  const [employees, setEmployees] = useState<Employee[]>(() => load('employees', () => SEED_EMPLOYEES))
  const [shifts, setShifts] = useState<Shift[]>(() => {
    const stored = load<Shift[]>('shifts', seedShifts)
    // Edge case found in testing: on a new Monday the stored shifts all belong
    // to last week, so the planner would open completely empty and look broken.
    // If the current week has no shifts at all, merge in a fresh template week.
    const week = weekDates(0)
    if (!stored.some((s) => week.includes(s.date))) return [...stored, ...seedShifts()]
    return stored
  })
  const [leaves, setLeaves] = useState<Leave[]>(() =>
    // Backward compatibility: records stored before the approval flow existed
    // have no `status`; treat them as approved so old data stays valid.
    load<Leave[]>('leaves', seedLeaves).map((l) => ({ ...l, status: l.status ?? ('approved' as const) })),
  )
  const [logs, setLogs] = useState<OpLog[]>(() => load('logs', () => []))

  // Auto-increment counters. They are stored too, so deleted IDs are never reused.
  const [nextId, setNextId] = useState<number>(() => load('nextId', () => SEED_NEXT_ID))
  const [nextLeaveId, setNextLeaveId] = useState<number>(() => load('nextLeaveId', () => SEED_NEXT_LEAVE_ID))
  const [nextLogId, setNextLogId] = useState<number>(() => load('nextLogId', () => 1))

  // ----- UI state: current page, tabs, selected week/employee, open modal -----
  const [page, setPage] = useState<Page>({ name: 'list' })
  const [shiftTab, setShiftTab] = useState<'planner' | 'overview'>('planner')
  const [plannerEmp, setPlannerEmp] = useState<number | null>(null)
  const [plannerWeek, setPlannerWeek] = useState(0) // 0 = current week, ±n = n weeks away
  const [overviewWeek, setOverviewWeek] = useState(0)
  const [leaveWeek, setLeaveWeek] = useState(0)
  const [modal, setModal] = useState<ModalState>(null)

  // ----- Persistence: write each slice back to localStorage on every change -----
  useEffect(() => { localStorage.setItem('meiti2:employees', JSON.stringify(employees)) }, [employees])
  useEffect(() => { localStorage.setItem('meiti2:shifts', JSON.stringify(shifts)) }, [shifts])
  useEffect(() => { localStorage.setItem('meiti2:leaves', JSON.stringify(leaves)) }, [leaves])
  useEffect(() => { localStorage.setItem('meiti2:logs', JSON.stringify(logs)) }, [logs])
  useEffect(() => { localStorage.setItem('meiti2:nextId', JSON.stringify(nextId)) }, [nextId])
  useEffect(() => { localStorage.setItem('meiti2:nextLeaveId', JSON.stringify(nextLeaveId)) }, [nextLeaveId])
  useEffect(() => { localStorage.setItem('meiti2:nextLogId', JSON.stringify(nextLogId)) }, [nextLogId])

  const isAdmin = session?.role === 'admin'
  const empOf = (id: number) => employees.find((e) => e.id === id)
  const nameOf = (id: number) => empOf(id)?.name ?? t('departed') // deleted employee → "departed"

  /** FR-13 operation log: append one entry, keep only the latest 200. */
  function log(action: string, detail: string) {
    setLogs((list) => [
      ...list.slice(-199),
      { id: nextLogId, time: now(), actor: session?.displayName ?? '-', action, detail },
    ])
    setNextLogId((n) => n + 1)
  }

  // ==================== Employees (FR-02 add / FR-04 detail / FR-05 edit / FR-06 delete) ====================

  function saveEmployee(draft: EmployeeDraft, id?: number) {
    if (id != null) {
      // Edit: replace the record but keep its system-generated ID.
      setEmployees((list) => list.map((e) => (e.id === id ? { ...draft, id } : e)))
      log('log.employee.edit', `${draft.name} (${padId(id)})`)
      setPage({ name: 'detail', id })
    } else {
      // Add: the ID comes from the counter and is never reused, even after
      // deletions, so old shifts/logs can never point at the wrong person.
      const newId = nextId
      setNextId(newId + 1)
      setEmployees((list) => [...list, { ...draft, id: newId }])
      log('log.employee.add', `${draft.name} (${padId(newId)})`)
      setPage({ name: 'list' })
    }
  }

  function confirmDelete(id: number) {
    const t0 = today()
    log('log.employee.delete', `${nameOf(id)} (${padId(id)})`)
    setEmployees((list) => list.filter((e) => e.id !== id))
    // Cascade: also remove that person's FUTURE shifts and leave records.
    // Past records are deliberately kept — history should not change
    // retroactively just because someone leaves the company.
    setShifts((list) => list.filter((s) => !(s.employeeId === id && s.date >= t0)))
    setLeaves((list) => list.filter((l) => !(l.employeeId === id && l.date >= t0)))
    if (plannerEmp === id) setPlannerEmp(null)
    setModal(null)
    setPage({ name: 'list' })
  }

  // ==================== Shifts (FR-07 assign / FR-08 conflict handling) ====================

  function assignShift(employeeId: number, date: string, type: ShiftType) {
    // Rule 1: a day with APPROVED leave is unavailable — block and explain.
    if (leaves.some((l) => l.employeeId === employeeId && l.date === date && l.status === 'approved')) {
      setModal({ kind: 'leaveBlock', employeeId, date })
      return
    }
    const existing = shifts.find((s) => s.employeeId === employeeId && s.date === date)
    // Rule 2: one person works at most one shift per day. A different shift on
    // the same day is a conflict — ask the admin instead of silently overwriting.
    if (existing && existing.type !== type) {
      setModal({ kind: 'conflict', employeeId, date, type })
      return
    }
    if (!existing) {
      setShifts((list) => [...list, { employeeId, date, type }])
      log('log.shift.assign', `${nameOf(employeeId)} · ${date} · ${t(SHIFT_KEYS[type])}`)
    }
    // (same shift again → no-op, keeps the log clean)
  }

  /** Conflict dialog answered: ok=true replaces the old shift with the new one. */
  function resolveConflict(ok: boolean) {
    if (modal?.kind === 'conflict' && ok) {
      const { employeeId, date, type } = modal
      setShifts((list) => [
        ...list.filter((s) => !(s.employeeId === employeeId && s.date === date)),
        { employeeId, date, type },
      ])
      log('log.shift.replace', `${nameOf(employeeId)} · ${date} · ${t(SHIFT_KEYS[type])}`)
    }
    setModal(null)
  }

  /** Clear-shift dialog answered: ok=true removes that day's shift. */
  function clearShift(ok: boolean) {
    if (modal?.kind === 'clear' && ok) {
      const { employeeId, date } = modal
      const hit = shifts.find((s) => s.employeeId === employeeId && s.date === date)
      if (hit) log('log.shift.clear', `${nameOf(employeeId)} · ${date} · ${t(SHIFT_KEYS[hit.type])}`)
      setShifts((list) => list.filter((s) => !(s.employeeId === employeeId && s.date === date)))
    }
    setModal(null)
  }

  // ==================== Leave (FR-14, Should have) ====================
  // Business rules (agreed with the client):
  //  * soft cap: LEAVE_CAP_PER_DAY (3) people per day — beyond that the admin
  //    gets a warning and can specially approve;
  //  * hard cap: LEAVE_CAP_MAX (5) per day — never exceeded, otherwise the
  //    shop would be understaffed;
  //  * employees submit requests in their portal as "pending"; they only take
  //    effect once the admin approves them.

  /** How many APPROVED leaves a date already has (drives both caps). */
  const approvedOn = (date: string) =>
    leaves.filter((l) => l.date === date && l.status === 'approved').length

  /** Admin registers a leave directly → immediately approved. */
  function addLeave(employeeId: number, date: string, reason: string) {
    if (approvedOn(date) >= LEAVE_CAP_MAX) {
      setModal({ kind: 'leaveCap', date }) // hard cap: no one can override this
      return
    }
    // Same person + same day already has a pending/approved record → ignore.
    if (leaves.some((l) => l.employeeId === employeeId && l.date === date && l.status !== 'rejected')) return
    if (approvedOn(date) >= LEAVE_CAP_PER_DAY) {
      setModal({ kind: 'leaveAddWarn', employeeId, date, reason }) // soft cap → confirm special approval
      return
    }
    if (shifts.some((s) => s.employeeId === employeeId && s.date === date)) {
      setModal({ kind: 'leaveShift', employeeId, date, reason }) // has a shift that day → ask to clear it
      return
    }
    doAddLeave(employeeId, date, reason)
  }

  function doAddLeave(employeeId: number, date: string, reason: string) {
    setLeaves((list) => [...list, { id: nextLeaveId, employeeId, date, reason, status: 'approved' }])
    setNextLeaveId((n) => n + 1)
    log('log.leave.add', `${nameOf(employeeId)} · ${date} · ${reason}`)
  }

  /** Employee submits a request in the personal portal → pending approval. */
  function requestLeave(employeeId: number, date: string, reason: string) {
    // Duplicate guard: one active record per person per day.
    if (leaves.some((l) => l.employeeId === employeeId && l.date === date && l.status !== 'rejected')) return
    setLeaves((list) => [...list, { id: nextLeaveId, employeeId, date, reason, status: 'pending' }])
    setNextLeaveId((n) => n + 1)
    log('log.leave.request', `${nameOf(employeeId)} · ${date} · ${reason}`)
  }

  /**
   * Admin approves a pending request. Same checks as addLeave, in order:
   * hard cap → soft cap warning → shift collision question → approve.
   */
  function approveLeave(id: number) {
    const rec = leaves.find((l) => l.id === id)
    if (!rec || rec.status !== 'pending') return
    if (approvedOn(rec.date) >= LEAVE_CAP_MAX) {
      setModal({ kind: 'leaveCap', date: rec.date })
      return
    }
    if (approvedOn(rec.date) >= LEAVE_CAP_PER_DAY) {
      setModal({ kind: 'leaveWarn', id })
      return
    }
    if (shifts.some((s) => s.employeeId === rec.employeeId && s.date === rec.date)) {
      setModal({ kind: 'leaveShiftClear', id })
      return
    }
    doApprove(id)
  }

  function doApprove(id: number) {
    const rec = leaves.find((l) => l.id === id)
    if (!rec) return
    setLeaves((list) => list.map((l) => (l.id === id ? { ...l, status: 'approved' as const } : l)))
    log('log.leave.approve', `${nameOf(rec.employeeId)} · ${rec.date}`)
  }

  /** Soft-cap warning accepted (admin-registered leave) → continue the chain. */
  function resolveLeaveAddWarn(ok: boolean) {
    if (modal?.kind === 'leaveAddWarn' && ok) {
      const { employeeId, date, reason } = modal
      if (shifts.some((s) => s.employeeId === employeeId && s.date === date)) {
        setModal({ kind: 'leaveShift', employeeId, date, reason })
        return
      }
      doAddLeave(employeeId, date, reason)
    }
    setModal(null)
  }

  /** Soft-cap warning accepted (approving a request) → continue the chain. */
  function resolveLeaveWarn(ok: boolean) {
    if (modal?.kind === 'leaveWarn' && ok) {
      const rec = leaves.find((l) => l.id === modal.id)
      if (rec && shifts.some((s) => s.employeeId === rec.employeeId && s.date === rec.date)) {
        setModal({ kind: 'leaveShiftClear', id: rec.id })
        return
      }
      if (rec) doApprove(rec.id)
    }
    setModal(null)
  }

  /** "Clear the shift and approve?" answered. */
  function resolveLeaveShiftClear(ok: boolean) {
    if (modal?.kind === 'leaveShiftClear' && ok) {
      const rec = leaves.find((l) => l.id === modal.id)
      if (rec) {
        setShifts((list) => list.filter((s) => !(s.employeeId === rec.employeeId && s.date === rec.date)))
        doApprove(rec.id)
      }
    }
    setModal(null)
  }

  function confirmRejectLeave(ok: boolean) {
    if (modal?.kind === 'leaveReject' && ok) {
      const rec = leaves.find((l) => l.id === modal.id)
      if (rec) {
        setLeaves((list) => list.map((l) => (l.id === rec.id ? { ...l, status: 'rejected' as const } : l)))
        log('log.leave.reject', `${nameOf(rec.employeeId)} · ${rec.date}`)
      }
    }
    setModal(null)
  }

  /** "The leave day has a shift — clear it and register?" answered. */
  function resolveLeaveShift(ok: boolean) {
    if (modal?.kind === 'leaveShift' && ok) {
      const { employeeId, date, reason } = modal
      setShifts((list) => list.filter((s) => !(s.employeeId === employeeId && s.date === date)))
      doAddLeave(employeeId, date, reason)
    }
    setModal(null)
  }

  function confirmCancelLeave(ok: boolean) {
    if (modal?.kind === 'leaveCancel' && ok) {
      const rec = leaves.find((l) => l.id === modal.id)
      if (rec) log('log.leave.cancel', `${nameOf(rec.employeeId)} · ${rec.date}`)
      setLeaves((list) => list.filter((l) => l.id !== modal.id))
    }
    setModal(null)
  }

  // ==================== Navigation ====================

  /** Jump from any page to a specific employee's planner week. */
  function goPlanner(employeeId: number) {
    setPlannerEmp(employeeId)
    setShiftTab('planner')
    setPage({ name: 'shift' })
  }

  function navigate(key: MenuKey) {
    if (key === 'employee') setPage({ name: 'list' })
    else if (key === 'shift') setPage({ name: 'shift' })
    else if (key === 'leave') setPage({ name: 'leave' })
    else if (key === 'logs') setPage({ name: 'logs' })
    else setPage({ name: 'stats' })
  }

  // ==================== Render ====================

  // Not logged in → login page only (FR-01).
  if (!session) {
    return <Login employees={employees} onLogin={(a) => { setSession(a); setPage({ name: 'list' }) }} />
  }

  const activeMenu: MenuKey =
    page.name === 'shift' ? 'shift'
    : page.name === 'leave' ? 'leave'
    : page.name === 'stats' ? 'stats'
    : page.name === 'logs' ? 'logs'
    : 'employee'

  // Planner needs a selected employee: fall back to the first one if the
  // previously selected person was deleted.
  const effectivePlannerEmp =
    plannerEmp != null && empOf(plannerEmp) ? plannerEmp : (employees[0]?.id ?? null)

  const plannerDates = weekDates(plannerWeek)
  const dayNameOf = (date: string) => t(DAY_KEYS[plannerDates.indexOf(date)] ?? 'day.mon')

  // ----- Pick the page component for the current route -----
  let content: React.ReactNode = null
  if (page.name === 'list') {
    content = (
      <EmployeeList
        employees={employees}
        isAdmin={isAdmin}
        onView={(id) => setPage({ name: 'detail', id })}
        onAdd={() => setPage({ name: 'form' })}
        onEdit={(id) => setPage({ name: 'form', id })}
        onDelete={(id) => setModal({ kind: 'delete', id })}
      />
    )
  } else if (page.name === 'form') {
    const editing = page.id != null ? empOf(page.id) : undefined
    content = (
      <EmployeeForm
        initial={editing}
        onCancel={() => setPage(editing ? { name: 'detail', id: editing.id } : { name: 'list' })}
        onSave={(draft) => saveEmployee(draft, page.id)}
      />
    )
  } else if (page.name === 'detail') {
    const emp = empOf(page.id)
    content = emp ? (
      <EmployeeDetail
        employee={emp}
        shifts={shifts}
        leaves={leaves.filter((l) => l.status === 'approved')}
        isAdmin={isAdmin}
        onBack={() => setPage({ name: 'list' })}
        onEdit={() => setPage({ name: 'form', id: emp.id })}
        onDelete={() => setModal({ kind: 'delete', id: emp.id })}
        onGoPlanner={() => goPlanner(emp.id)}
      />
    ) : null
  } else if (page.name === 'shift') {
    content = (
      <div>
        {/* Planner (per employee) ↔ Overview (whole shop) tab switch */}
        <div className="mb-5 flex gap-2">
          {(['planner', 'overview'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setShiftTab(key)}
              className={`rounded-lg px-5 py-1.5 text-sm font-medium ${
                shiftTab === key
                  ? 'bg-[#00C9A7] text-[#0B3B33] font-semibold shadow-sm'
                  : 'bg-white text-neutral-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {t(key === 'planner' ? 'tab.planner' : 'tab.overview')}
            </button>
          ))}
        </div>
        {shiftTab === 'planner' ? (
          <ShiftPlanner
            employees={employees}
            shifts={shifts}
            leaves={leaves.filter((l) => l.status === 'approved')}
            isAdmin={isAdmin}
            weekOffset={plannerWeek}
            onWeekChange={setPlannerWeek}
            selectedId={effectivePlannerEmp}
            onSelectEmployee={setPlannerEmp}
            onAssign={assignShift}
            onCellClick={(empId, date) => setModal({ kind: 'clear', employeeId: empId, date })}
          />
        ) : (
          <ShiftOverview
            employees={employees}
            shifts={shifts}
            weekOffset={overviewWeek}
            onWeekChange={setOverviewWeek}
            onGoPlanner={goPlanner}
            onCellOpen={(date, type) => setModal({ kind: 'cell', date, type })}
          />
        )}
      </div>
    )
  } else if (page.name === 'leave') {
    content = (
      <LeavePage
        employees={employees}
        leaves={leaves}
        isAdmin={isAdmin}
        weekOffset={leaveWeek}
        onWeekChange={setLeaveWeek}
        onAddLeave={addLeave}
        onApprove={approveLeave}
        onReject={(id) => setModal({ kind: 'leaveReject', id })}
        onCancelLeave={(id) => setModal({ kind: 'leaveCancel', id })}
      />
    )
  } else if (page.name === 'logs') {
    content = <LogsPage logs={logs} />
  } else {
    content = <Stats employees={employees} shifts={shifts} leaves={leaves.filter((l) => l.status === 'approved')} />
  }

  // ----- Build the modal dialog (if any). One per kind; see ModalState above. -----

  let modalNode: React.ReactNode = null
  if (modal?.kind === 'delete') {
    const emp = empOf(modal.id)
    modalNode = emp ? (
      <Modal
        title={t('m.delTitle')}
        okText={t('m.delOk')}
        danger
        onCancel={() => setModal(null)}
        onOk={() => confirmDelete(modal.id)}
      >
        {t('m.delBody', { name: emp.name, id: padId(emp.id) })}
      </Modal>
    ) : null
  } else if (modal?.kind === 'conflict') {
    const emp = empOf(modal.employeeId)
    const existing = shifts.find((s) => s.employeeId === modal.employeeId && s.date === modal.date)
    modalNode = emp && existing ? (
      <Modal
        title={t('m.conflictTitle', {
          name: emp.name,
          day: dayNameOf(modal.date),
          old: t(SHIFT_KEYS[existing.type]),
          new: t(SHIFT_KEYS[modal.type]),
        })}
        cancelText={t('m.conflictNo')}
        okText={t('m.conflictYes')}
        onCancel={() => resolveConflict(false)}
        onOk={() => resolveConflict(true)}
      />
    ) : null
  } else if (modal?.kind === 'clear') {
    const emp = empOf(modal.employeeId)
    const hit = shifts.find((s) => s.employeeId === modal.employeeId && s.date === modal.date)
    modalNode = emp && hit ? (
      <Modal
        title={t('m.clearTitle', { name: emp.name, shift: t(SHIFT_KEYS[hit.type]), day: dayNameOf(modal.date) })}
        okText={t('m.clearOk')}
        danger
        onCancel={() => clearShift(false)}
        onOk={() => clearShift(true)}
      />
    ) : null
  } else if (modal?.kind === 'cell') {
    // Overview cell clicked → show the COMPLETE roster of that cell (names are
    // collapsed to "+N more" in the grid when many people share a shift).
    const cell = shifts.filter((s) => s.date === modal.date && s.type === modal.type)
    modalNode = (
      <Modal
        title={t('cell.title', {
          day: t(DAY_KEYS[weekDates(overviewWeek).indexOf(modal.date)] ?? 'day.mon'),
          date: modal.date.slice(5),
          shift: t(SHIFT_KEYS[modal.type]),
          n: cell.length,
        })}
        hideCancel
        okText={t('close')}
        onOk={() => setModal(null)}
      >
        <div className="flex flex-wrap justify-center gap-2">
          {cell.map((s) => {
            const emp = empOf(s.employeeId)
            return emp ? (
              <button
                key={s.employeeId}
                onClick={() => {
                  setModal(null)
                  goPlanner(s.employeeId) // click a name → jump to that person's planner
                }}
                className="rounded-full bg-[#E6FAF6] px-3 py-1 text-sm font-medium text-[#0B6B5C] hover:bg-[#C8F3EB]"
              >
                {emp.name}
              </button>
            ) : (
              <span key={s.employeeId} className="text-neutral-400">{t('departed')}</span>
            )
          })}
        </div>
      </Modal>
    )
  } else if (modal?.kind === 'leaveCap') {
    modalNode = (
      <Modal
        title={t('leave.capTitle')}
        hideCancel
        onOk={() => setModal(null)}
      >
        {t('leave.capBody', { cap: LEAVE_CAP_MAX, date: modal.date })}
      </Modal>
    )
  } else if (modal?.kind === 'leaveAddWarn') {
    const emp = empOf(modal.employeeId)
    modalNode = emp ? (
      <Modal
        title={t('leave.warnTitle')}
        okText={t('leave.warnOk')}
        onCancel={() => resolveLeaveAddWarn(false)}
        onOk={() => resolveLeaveAddWarn(true)}
      >
        {t('leave.warnBody', { date: modal.date, n: approvedOn(modal.date), cap: LEAVE_CAP_PER_DAY, max: LEAVE_CAP_MAX })}
      </Modal>
    ) : null
  } else if (modal?.kind === 'leaveWarn') {
    const rec = leaves.find((l) => l.id === modal.id)
    modalNode = rec ? (
      <Modal
        title={t('leave.warnTitle')}
        okText={t('leave.warnOk')}
        onCancel={() => resolveLeaveWarn(false)}
        onOk={() => resolveLeaveWarn(true)}
      >
        {t('leave.warnBody', { date: rec.date, n: approvedOn(rec.date), cap: LEAVE_CAP_PER_DAY, max: LEAVE_CAP_MAX })}
      </Modal>
    ) : null
  } else if (modal?.kind === 'leaveShiftClear') {
    const rec = leaves.find((l) => l.id === modal.id)
    const hit = rec && shifts.find((s) => s.employeeId === rec.employeeId && s.date === rec.date)
    modalNode = rec && hit ? (
      <Modal
        title={t('leave.shiftTitle')}
        okText={t('leave.shiftOk')}
        onCancel={() => resolveLeaveShiftClear(false)}
        onOk={() => resolveLeaveShiftClear(true)}
      >
        {t('leave.shiftBody', { name: nameOf(rec.employeeId), day: rec.date, shift: t(SHIFT_KEYS[hit.type]) })}
      </Modal>
    ) : null
  } else if (modal?.kind === 'leaveReject') {
    const rec = leaves.find((l) => l.id === modal.id)
    modalNode = rec ? (
      <Modal
        title={t('leave.rejectTitle')}
        okText={t('leave.rejectOk')}
        danger
        onCancel={() => confirmRejectLeave(false)}
        onOk={() => confirmRejectLeave(true)}
      >
        {t('leave.cancelBody', { name: nameOf(rec.employeeId), date: rec.date })}
      </Modal>
    ) : null
  } else if (modal?.kind === 'leaveShift') {
    const emp = empOf(modal.employeeId)
    const hit = shifts.find((s) => s.employeeId === modal.employeeId && s.date === modal.date)
    modalNode = emp && hit ? (
      <Modal
        title={t('leave.shiftTitle')}
        okText={t('leave.shiftOk')}
        onCancel={() => resolveLeaveShift(false)}
        onOk={() => resolveLeaveShift(true)}
      >
        {t('leave.shiftBody', { name: emp.name, day: modal.date, shift: t(SHIFT_KEYS[hit.type]) })}
      </Modal>
    ) : null
  } else if (modal?.kind === 'leaveBlock') {
    const emp = empOf(modal.employeeId)
    modalNode = emp ? (
      <Modal title={t('leave.blockTitle')} hideCancel onOk={() => setModal(null)}>
        {t('leave.blockBody', { name: emp.name, day: modal.date })}
      </Modal>
    ) : null
  } else if (modal?.kind === 'leaveCancel') {
    const rec = leaves.find((l) => l.id === modal.id)
    modalNode = rec ? (
      <Modal
        title={t('leave.cancelTitle')}
        okText={t('leave.withdrawOk')}
        danger
        onCancel={() => confirmCancelLeave(false)}
        onOk={() => confirmCancelLeave(true)}
      >
        {t('leave.cancelBody', { name: nameOf(rec.employeeId), date: rec.date })}
      </Modal>
    ) : null
  }

  // ----- Employee role → personal portal (FR-01: role-based landing page).
  // Employees never see the admin Shell; they can only view their own data
  // and request leave for themselves. -----
  if (session.role === 'employee' && session.employeeId != null) {
    const me = empOf(session.employeeId)
    if (!me) {
      // Their record was deleted while logged in → the ID is dead; kick back
      // to the login screen instead of crashing.
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F5F6FA]">
          <p className="text-neutral-500">{t('login.errId')}</p>
          <button
            onClick={() => setSession(null)}
            className="rounded-lg bg-[#00C9A7] px-6 py-2 text-sm font-semibold text-[#0B3B33] hover:bg-[#00B295]"
          >
            {t('logout')}
          </button>
        </div>
      )
    }
    return (
      <>
        <EmployeeHome
          account={session}
          employee={me}
          shifts={shifts}
          leaves={leaves}
          onAddLeave={requestLeave}
          onCancelLeave={(id) => setModal({ kind: 'leaveCancel', id })}
          onLogout={() => setSession(null)}
        />
        {modalNode}
      </>
    )
  }

  // Admin / store manager → full management UI inside the Shell layout.
  return (
    <Shell account={session} active={activeMenu} onNavigate={navigate} onLogout={() => setSession(null)}>
      {content}
      {modalNode}
    </Shell>
  )
}
