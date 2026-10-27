/**
 * types/index.ts — the shared domain model.
 *
 * These interfaces are the contract between the data layer (App.tsx state,
 * mirrored to localStorage) and every page component. Note the deliberate
 * choice to store codes ('cashier', 'sales', …) instead of display text:
 * display text is resolved through the i18n dictionaries at render time,
 * so switching language also translates stored data.
 */

export type Role = 'admin' | 'manager' | 'employee'

export interface Account {
  /** Login ID: A… = admin / B… = manager / C… = staff (C + number, unlimited) */
  id: string
  displayName: string
  role: Role
  /** Links a staff account to its employee record (role = employee only) */
  employeeId?: number
}

/** 0 = Morning, 1 = Noon, 2 = Evening — index into SHIFT_KEYS / colour tables */
export type ShiftType = 0 | 1 | 2

export type Gender = 'male' | 'female'

export interface Employee {
  id: number
  name: string
  gender: Gender
  birth: string
  phone: string
  email: string
  address: string
  /** code: cashier | stock | sales | leader (displayed via i18n) */
  jobTitle: string
  /** code: sales | warehouse | cashier (displayed via i18n) */
  department: string
  startDate: string
  wage: number
  emergencyName: string
  emergencyPhone: string
}

export interface Shift {
  employeeId: number
  /** YYYY-MM-DD */
  date: string
  type: ShiftType
}

/** Leave lifecycle: pending (staff request) → approved / rejected (admin decision) */
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

/** A full-day leave record */
export interface Leave {
  id: number
  employeeId: number
  /** YYYY-MM-DD */
  date: string
  reason: string
  status: LeaveStatus
}

/** One entry of the FR-13 operation log */
export interface OpLog {
  id: number
  time: string
  actor: string
  action: string
  detail: string
}

/** Form payload without the system-generated ID (used by EmployeeForm) */
export type EmployeeDraft = Omit<Employee, 'id'>
