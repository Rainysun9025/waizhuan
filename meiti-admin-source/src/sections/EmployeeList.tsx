/**
 * sections/EmployeeList.tsx — P1 employee list page
 * (URS FR-02 add entry point, FR-03 list, FR-10 search/filter, FR-11 headcount).
 *
 * Features:
 *  - live search by name OR padded ID ('007' finds employee 7);
 *  - dropdown filters for department and job title (built from the data,
 *    so new codes appear automatically);
 *  - pagination, 8 rows per page — resetting to page 1 on every new search;
 *  - probation badge: anyone who started less than 60 days ago shows 试用;
 *  - colour coding per department (violet cashier / amber warehouse / sky sales)
 *    so departments are recognisable at a glance;
 *  - edit/delete buttons render only for admins (managers are read-only).
 */
import { useMemo, useState } from 'react'
import type { Employee } from '../types'
import { padId, today } from '../lib/dates'
import { useT } from '../i18n'
import type { DictKey } from '../i18n'

const PAGE_SIZE = 8

/** avatar ring colours per department */
const DEPT_RING: Record<string, string> = {
  cashier: 'ring-violet-300 bg-violet-100 text-violet-700',
  warehouse: 'ring-amber-300 bg-amber-100 text-amber-700',
  sales: 'ring-sky-300 bg-sky-100 text-sky-700',
}
const DEPT_BADGE: Record<string, string> = {
  cashier: 'bg-violet-100 text-violet-800',
  warehouse: 'bg-amber-100 text-amber-800',
  sales: 'bg-sky-100 text-sky-800',
}

/** started < 60 days ago → still on probation */
function isProbation(e: Employee): boolean {
  const days = (new Date(today()).getTime() - new Date(e.startDate).getTime()) / 86400000
  return days < 60
}

interface Props {
  employees: Employee[]
  isAdmin: boolean
  onView: (id: number) => void
  onAdd: () => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
}

export default function EmployeeList({ employees, isAdmin, onView, onAdd, onEdit, onDelete }: Props) {
  const { t } = useT()
  const [query, setQuery] = useState('')
  const [dept, setDept] = useState('')
  const [title, setTitle] = useState('')
  const [page, setPage] = useState(1)

  // filter options derived from live data (Set removes duplicates)
  const departments = useMemo(() => [...new Set(employees.map((e) => e.department))], [employees])
  const jobTitles = useMemo(() => [...new Set(employees.map((e) => e.jobTitle))], [employees])

  // all three criteria combine with AND; memoised so typing stays cheap
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return employees.filter(
      (e) =>
        (!q || e.name.toLowerCase().includes(q) || padId(e.id).includes(q)) &&
        (!dept || e.department === dept) &&
        (!title || e.jobTitle === title),
    )
  }, [employees, query, dept, title])

  // clamp the current page: after a filter the old page number may not exist
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const cur = Math.min(page, pageCount)
  const pageRows = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE)

  return (
    <div>
      {/* FR-11 headcount card */}
      <div className="inline-block overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#00C9A7] to-[#38bdf8]" />
        <div className="px-6 py-4">
          <div className="text-sm text-neutral-500">{t('stat.active')}</div>
          <div className="mt-1 text-3xl font-bold text-[#1B1B27]">{employees.length}</div>
        </div>
      </div>

      {/* search + filters + add */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1) // new search → back to page 1
          }}
          placeholder={t('search.ph')}
          className="w-72 rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-[#00C9A7] focus:ring-2 focus:ring-[#00C9A7]/25"
        />
        {isAdmin && (
          <button
            onClick={onAdd}
            className="rounded-lg bg-[#00C9A7] px-4 py-2 text-sm font-semibold text-[#0B3B33] shadow-sm hover:bg-[#00B295]"
          >
            {t('add')}
          </button>
        )}
        <select
          value={dept}
          onChange={(e) => {
            setDept(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">{t('filter.deptAll')}</option>
          {departments.map((d) => (
            <option key={d} value={d}>{t(`dept.${d}` as DictKey)}</option>
          ))}
        </select>
        <select
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">{t('filter.titleAll')}</option>
          {jobTitles.map((jt) => (
            <option key={jt} value={jt}>{t(`job.${jt}` as DictKey)}</option>
          ))}
        </select>
      </div>

      {/* employee table */}
      <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1B1B27] text-left text-white">
              <th className="px-4 py-3 font-semibold">{t('th.id')}</th>
              <th className="px-4 py-3 font-semibold">{t('th.name')}</th>
              <th className="px-4 py-3 font-semibold">{t('th.title')}</th>
              <th className="px-4 py-3 font-semibold">{t('th.dept')}</th>
              <th className="px-4 py-3 font-semibold">{t('th.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((e, idx) => {
              const prob = isProbation(e)
              return (
                <tr
                  key={e.id}
                  className={`border-t border-slate-100 hover:bg-[#00C9A7]/5 ${idx % 2 === 1 ? 'bg-[#F5F6FA]' : ''}`}
                >
                  <td className="px-4 py-3 font-mono text-neutral-500">{padId(e.id)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {/* avatar initial, ring colour encodes the department */}
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-2 ${DEPT_RING[e.department] ?? 'ring-slate-300 bg-slate-100 text-slate-600'}`}
                      >
                        {e.name.slice(0, 1)}
                      </span>
                      <span className="font-medium">{e.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          prob ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {t(prob ? 'probation' : 'active')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {t(`job.${e.jobTitle}` as DictKey)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DEPT_BADGE[e.department] ?? 'bg-slate-100 text-slate-700'}`}
                    >
                      {t(`dept.${e.department}` as DictKey)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onView(e.id)} className="text-[#0A8F79] hover:underline">
                      {t('act.view')}
                    </button>
                    {/* destructive actions are admin-only */}
                    {isAdmin && (
                      <>
                        <span className="mx-2 text-neutral-300">/</span>
                        <button onClick={() => onEdit(e.id)} className="text-[#0A8F79] hover:underline">
                          {t('act.edit')}
                        </button>
                        <span className="mx-2 text-neutral-300">/</span>
                        <button onClick={() => onDelete(e.id)} className="text-rose-600 hover:underline">
                          {t('act.delete')}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-14 text-center text-neutral-400">{t('empty.noEmp')}</div>
        )}
      </div>

      {/* pagination (only shown when there is more than one page) */}
      {pageCount > 1 && (
        <div className="mt-4 flex justify-center gap-3 text-sm">
          <button
            disabled={cur === 1}
            onClick={() => setPage(cur - 1)}
            className="disabled:text-neutral-300"
          >
            ‹
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={p === cur ? 'font-bold text-[#0A8F79] underline' : 'text-neutral-500'}
            >
              {p}
            </button>
          ))}
          <button
            disabled={cur === pageCount}
            onClick={() => setPage(cur + 1)}
            className="disabled:text-neutral-300"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
