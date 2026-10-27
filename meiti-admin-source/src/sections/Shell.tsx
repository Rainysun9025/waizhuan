/**
 * sections/Shell.tsx — the shared layout for admin & manager accounts:
 * dark gradient top bar + left navigation rail + page content area.
 *
 * Brand palette (chosen to move away from the plain black/white v1):
 *   deep sea blue #1B1B27 → #2D2D45   (anchor: top bar & nav)
 *   teal          #00C9A7             (primary actions, active states)
 *   sky blue      #38bdf8             (gradients / accents)
 *
 * The "Operation Logs" entry is admin-only (FR-13); managers never see it.
 */
import type { ReactNode } from 'react'
import type { Account } from '../types'
import { useT } from '../i18n'
import type { DictKey } from '../i18n'

export type MenuKey = 'employee' | 'shift' | 'leave' | 'stats' | 'logs'

const MENUS: { key: MenuKey; labelKey: DictKey; icon: string; adminOnly?: boolean }[] = [
  { key: 'employee', labelKey: 'menu.employees', icon: '👥' },
  { key: 'shift', labelKey: 'menu.shift', icon: '🗓' },
  { key: 'leave', labelKey: 'menu.leave', icon: '🌿' },
  { key: 'stats', labelKey: 'menu.stats', icon: '📊' },
  { key: 'logs', labelKey: 'menu.logs', icon: '📋', adminOnly: true },
]

interface ShellProps {
  account: Account
  active: MenuKey
  onNavigate: (key: MenuKey) => void
  onLogout: () => void
  children: ReactNode
}

export default function Shell({ account, active, onNavigate, onLogout, children }: ShellProps) {
  const { t, lang, setLang } = useT()
  // filter out admin-only entries for the read-only manager role
  const menus = MENUS.filter((m) => !m.adminOnly || account.role === 'admin')

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-neutral-900">
      {/* top bar: logo, language toggle, current account, logout */}
      <header className="flex items-center justify-between bg-gradient-to-r from-[#1B1B27] to-[#2D2D45] px-6 py-3 text-white shadow-md">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00C9A7] to-[#38bdf8] text-lg font-black">
            M
          </span>
          <div className="text-xl font-bold tracking-wide">
            Meiti
            <span className="ml-3 hidden text-sm font-normal text-white/50 sm:inline">
              {t('app.sub')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
            className="rounded-full border border-white/30 px-4 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10"
          >
            {lang === 'en' ? '中文' : 'EN'}
          </button>
          {/* avatar circle with the first letter of the display name */}
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00C9A7]/20 text-sm font-bold text-[#00C9A7] ring-2 ring-[#00C9A7]/50">
            {account.displayName.slice(0, 1)}
          </span>
          <span className="text-sm">
            {account.displayName} · {t(account.role === 'admin' ? 'role.admin' : 'role.manager')}
          </span>
          <button
            onClick={onLogout}
            className="rounded-lg bg-white/10 px-4 py-1.5 text-sm font-medium hover:bg-white/20"
          >
            {t('logout')}
          </button>
        </div>
      </header>

      <div className="flex">
        {/* left nav rail; active item gets the teal border + highlight */}
        <aside className="min-h-[calc(100vh-60px)] w-48 shrink-0 bg-gradient-to-b from-[#1B1B27] to-[#2D2D45] py-3">
          {menus.map((m) => (
            <button
              key={m.key}
              onClick={() => onNavigate(m.key)}
              className={`flex w-full items-center gap-2.5 border-l-4 px-5 py-3.5 text-left text-[15px] transition-colors ${
                active === m.key
                  ? 'border-[#00C9A7] bg-white/[0.07] font-bold text-[#00C9A7]'
                  : 'border-transparent text-white/60 hover:bg-white/5 hover:text-white/90'
              }`}
            >
              <span aria-hidden>{m.icon}</span>
              {t(m.labelKey)}
            </button>
          ))}
        </aside>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
