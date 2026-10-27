/**
 * sections/Login.tsx — P0 login page (URS FR-01).
 *
 * Design decision (client feedback, v3): there are NO role buttons and no
 * password. The user types a single staff ID and the system recognises the
 * role from the leading letter:
 *      A001 → administrator        (full access)
 *      B001 → store manager        (read-only view)
 *      C + any number → employee   (personal portal; C001, C013, C999… — the
 *                                   number of employees is unlimited)
 *
 * For demo robustness a bare number ('7') is also accepted as employee 7.
 */
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Account, Employee } from '../types'
import { ACCOUNTS } from '../data/seed'
import { staffLoginId } from '../lib/dates'
import { useT } from '../i18n'

interface Props {
  employees: Employee[]
  onLogin: (a: Account) => void
}

export default function Login({ employees, onLogin }: Props) {
  const { t, lang, setLang } = useT()
  const [idText, setIdText] = useState('')
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const raw = idText.trim().toUpperCase() // case-insensitive: 'a001' works too
    if (!raw) {
      setError(t('login.errEmptyId'))
      return
    }
    // 1) Fixed back-office accounts: A… admin, B… manager
    const acc = ACCOUNTS.find((a) => a.id.toUpperCase() === raw)
    if (acc) {
      onLogin(acc)
      return
    }
    // 2) Staff: 'C' + digits, or a bare number. The ID must match a living
    //    employee record — deleted employees can no longer log in.
    const m = /^C(\d+)$/.test(raw) || /^\d+$/.test(raw)
    if (m) {
      const n = Number(raw.replace(/^C/, ''))
      const emp = employees.find((e2) => e2.id === n)
      if (emp) {
        onLogin({
          id: staffLoginId(emp.id),
          displayName: emp.name,
          role: 'employee',
          employeeId: emp.id,
        })
        return
      }
    }
    setError(t('login.errId'))
  }

  return (
    // dark gradient background with two soft decorative glows (client asked
    // for a livelier look than plain black/white)
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#14141d] via-[#1B1B27] to-[#2D2D45] p-4">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#00C9A7]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#3b82f6]/15 blur-3xl" />

      {/* language toggle is available BEFORE login, so a foreign lecturer can
          switch to English and a Chinese employee to 中文 independently */}
      <button
        onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
        className="absolute right-6 top-5 rounded-full border border-white/30 px-4 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10"
      >
        {lang === 'en' ? '中文' : 'EN'}
      </button>

      <form
        onSubmit={submit}
        className="relative w-[440px] max-w-full rounded-2xl bg-white/95 px-11 py-10 shadow-2xl backdrop-blur"
      >
        <div className="flex flex-col items-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00C9A7] to-[#38bdf8] text-2xl font-black text-white shadow-lg">
            M
          </span>
          <h1 className="mt-4 text-2xl font-bold text-neutral-900">{t('app.name')}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t('login.sub')}</p>
        </div>

        <label className="mt-8 block text-sm font-medium text-neutral-700">{t('login.id')}</label>
        <input
          value={idText}
          onChange={(e) => setIdText(e.target.value)}
          placeholder={t('login.idPh')}
          autoFocus
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 outline-none focus:border-[#00C9A7] focus:ring-2 focus:ring-[#00C9A7]/25"
        />

        {/* fixed-height error slot so the form does not jump when an error appears */}
        <div className="mt-3 h-5 text-sm text-rose-600">{error}</div>

        <button
          type="submit"
          className="mt-2 w-full rounded-lg bg-[#00C9A7] py-2.5 font-semibold text-[#0B3B33] shadow-md hover:bg-[#00B295]"
        >
          {t('login.btn')}
        </button>

        <p className="mt-5 text-center text-xs text-neutral-400">{t('login.idHint')}</p>
      </form>
    </div>
  )
}
