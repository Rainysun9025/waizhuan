/**
 * sections/LogsPage.tsx — operation log page (URS FR-13, Could have).
 *
 * Shows who did what and when: employee add/edit/delete, shift assign /
 * change / clear, leave request / approve / reject / withdraw. The newest
 * entries render first (the stored array is chronological, so we reverse a
 * copy for display). Admin-only — the menu entry is hidden from managers.
 */
import type { OpLog } from '../types'
import { useT } from '../i18n'
import type { DictKey } from '../i18n'

export default function LogsPage({ logs }: { logs: OpLog[] }) {
  const { t } = useT()
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#1B1B27] text-left text-white">
            <th className="px-5 py-3 font-semibold">{t('log.time')}</th>
            <th className="px-5 py-3 font-semibold">{t('log.actor')}</th>
            <th className="px-5 py-3 font-semibold">{t('log.action')}</th>
            <th className="px-5 py-3 font-semibold">{t('log.detail')}</th>
          </tr>
        </thead>
        <tbody>
          {logs
            .slice()
            .reverse() // newest first; slice() keeps the stored order untouched
            .map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-5 py-2.5 font-mono text-xs text-neutral-500">{l.time}</td>
                <td className="px-5 py-2.5">{l.actor}</td>
                <td className="px-5 py-2.5">
                  {/* action is an i18n key, so the log translates too */}
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {t(l.action as DictKey)}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-neutral-600">{l.detail}</td>
              </tr>
            ))}
        </tbody>
      </table>
      {logs.length === 0 && (
        <div className="py-14 text-center text-neutral-400">{t('log.empty')}</div>
      )}
    </div>
  )
}
