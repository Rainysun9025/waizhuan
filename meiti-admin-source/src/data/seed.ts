/**
 * data/seed.ts — demo dataset, business constants and lookup lists.
 *
 * The seed data only loads on FIRST launch (or when localStorage is empty);
 * afterwards the user's own data wins. The sample shifts/leaves are generated
 * relative to the CURRENT week (see weekDates(0)), so the demo always shows
 * a living week instead of stale hard-coded dates.
 */
import type { Account, Employee, Leave, Shift } from '../types'
import { weekDates } from '../lib/dates'

/** Fixed back-office accounts. Staff log in with C + their employee number. */
export const ACCOUNTS: Account[] = [
  { id: 'A001', displayName: 'Wang Jianguo', role: 'admin' },
  { id: 'B001', displayName: 'Henriette', role: 'manager' },
]

/** Lookup lists for the dropdowns in EmployeeForm (codes, not display text) */
export const DEPARTMENTS = ['sales', 'warehouse', 'cashier']
export const JOB_TITLES = ['cashier', 'stock', 'sales', 'leader']

/** Normal daily leave quota — beyond this the admin must specially approve */
export const LEAVE_CAP_PER_DAY = 3
/** Absolute daily maximum — never exceeded, otherwise the shop is understaffed */
export const LEAVE_CAP_MAX = 5

/** First free IDs after the seed data (counters continue from here) */
export const SEED_NEXT_ID = 13
export const SEED_NEXT_LEAVE_ID = 4

/** Twelve sample employees covering all departments and job titles */
export const SEED_EMPLOYEES: Employee[] = [
  { id: 1, name: 'Zhang San', gender: 'male', birth: '1998-03-12', phone: '13800000001', email: 'zhangsan@meiti.cn', address: '1 Huayuan Rd, Jinshui, Zhengzhou', jobTitle: 'cashier', department: 'cashier', startDate: '2026-09-01', wage: 25, emergencyName: 'Mr. Zhang (father)', emergencyPhone: '13900000001' },
  { id: 2, name: 'Li Si', gender: 'male', birth: '1996-07-25', phone: '13800000002', email: 'lisi@meiti.cn', address: '22 Daxue Rd, Erqi, Zhengzhou', jobTitle: 'stock', department: 'warehouse', startDate: '2026-09-01', wage: 23, emergencyName: 'Mrs. Li (mother)', emergencyPhone: '13900000002' },
  { id: 3, name: 'Wang Wu', gender: 'female', birth: '1999-11-08', phone: '13800000003', email: 'wangwu@meiti.cn', address: '15 Jianshe Rd, Zhongyuan, Zhengzhou', jobTitle: 'sales', department: 'sales', startDate: '2026-09-05', wage: 24, emergencyName: 'Ms. Wang (sister)', emergencyPhone: '13900000003' },
  { id: 4, name: 'Zhao Liu', gender: 'male', birth: '1990-01-30', phone: '13800000004', email: 'zhaoliu@meiti.cn', address: '8 Hanghai Rd, Guancheng, Zhengzhou', jobTitle: 'leader', department: 'warehouse', startDate: '2026-08-20', wage: 32, emergencyName: 'Mrs. Zhao (wife)', emergencyPhone: '13900000004' },
  { id: 5, name: 'Chen Jing', gender: 'female', birth: '2001-05-16', phone: '13800000005', email: 'chenjing@meiti.cn', address: '3 Weiwu Rd, Jinshui, Zhengzhou', jobTitle: 'cashier', department: 'cashier', startDate: '2026-09-10', wage: 25, emergencyName: 'Mrs. Chen (mother)', emergencyPhone: '13900000005' },
  { id: 6, name: 'Liu Yang', gender: 'male', birth: '1997-09-02', phone: '13800000006', email: 'liuyang@meiti.cn', address: '19 Kaiyuan Rd, Huiji, Zhengzhou', jobTitle: 'sales', department: 'sales', startDate: '2026-09-10', wage: 24, emergencyName: 'Mr. Liu (father)', emergencyPhone: '13900000006' },
  { id: 7, name: 'Sun Li', gender: 'female', birth: '1995-12-21', phone: '13800000007', email: 'sunli@meiti.cn', address: '100 Kexue Ave, Gaoxin, Zhengzhou', jobTitle: 'leader', department: 'sales', startDate: '2026-08-20', wage: 33, emergencyName: 'Mr. Sun (husband)', emergencyPhone: '13900000007' },
  { id: 8, name: 'Zhou Jie', gender: 'male', birth: '2000-04-11', phone: '13800000008', email: 'zhoujie@meiti.cn', address: '56 Wenhua Rd, Jinshui, Zhengzhou', jobTitle: 'stock', department: 'warehouse', startDate: '2026-09-15', wage: 23, emergencyName: 'Mrs. Zhou (mother)', emergencyPhone: '13900000008' },
  { id: 9, name: 'Wu Min', gender: 'female', birth: '1998-08-05', phone: '13800000009', email: 'wumin@meiti.cn', address: '41 Longhai Rd, Erqi, Zhengzhou', jobTitle: 'cashier', department: 'cashier', startDate: '2026-09-15', wage: 25, emergencyName: 'Ms. Wu (sister)', emergencyPhone: '13900000009' },
  { id: 10, name: 'Zheng Hao', gender: 'male', birth: '1993-02-18', phone: '13800000010', email: 'zhenghao@meiti.cn', address: '27 Tongbai Rd, Zhongyuan, Zhengzhou', jobTitle: 'sales', department: 'sales', startDate: '2026-09-20', wage: 24, emergencyName: 'Mr. Zheng (father)', emergencyPhone: '13900000010' },
  { id: 11, name: 'Feng Xue', gender: 'female', birth: '2002-06-27', phone: '13800000011', email: 'fengxue@meiti.cn', address: '12 Nongye Rd, Jinshui, Zhengzhou', jobTitle: 'stock', department: 'warehouse', startDate: '2026-10-01', wage: 23, emergencyName: 'Mrs. Feng (mother)', emergencyPhone: '13900000011' },
  { id: 12, name: 'Jiang Lei', gender: 'male', birth: '1999-10-09', phone: '13800000012', email: 'jianglei@meiti.cn', address: '66 Weilai Rd, Guancheng, Zhengzhou', jobTitle: 'sales', department: 'sales', startDate: '2026-10-01', wage: 24, emergencyName: 'Mr. Jiang (brother)', emergencyPhone: '13900000012' },
]

/** Sample shifts for the current week (relative dates — always "this week") */
export function seedShifts(): Shift[] {
  const w = weekDates(0)
  const s: Shift[] = []
  const put = (empId: number, dayIdx: number, type: 0 | 1 | 2) =>
    s.push({ employeeId: empId, date: w[dayIdx], type })
  // Monday morning deliberately gets 4 people to demonstrate the
  // "+N more" collapsing of crowded overview cells.
  put(1, 0, 0); put(2, 0, 0); put(3, 0, 0); put(5, 0, 0)
  put(1, 2, 1); put(1, 4, 0)
  put(2, 1, 1); put(2, 3, 2)
  put(3, 3, 1); put(3, 5, 0)
  put(4, 0, 1); put(4, 2, 2); put(4, 4, 1)
  put(5, 1, 1); put(5, 3, 0); put(5, 6, 1)
  put(6, 2, 0); put(6, 4, 2)
  put(7, 0, 2); put(7, 5, 1)
  put(8, 2, 0); put(8, 6, 0)
  put(9, 3, 1); put(9, 5, 2)
  put(10, 4, 0); put(10, 6, 1)
  return s
}

/** Sample leave records for the current week (treated as already approved) */
export function seedLeaves(): Leave[] {
  const w = weekDates(0)
  return [
    { id: 1, employeeId: 8, date: w[1], reason: 'Sick leave', status: 'approved' },
    { id: 2, employeeId: 11, date: w[1], reason: 'Personal matters', status: 'approved' },
    { id: 3, employeeId: 6, date: w[4], reason: 'Doctor appointment', status: 'approved' },
  ]
}
