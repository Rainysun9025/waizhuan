/**
 * components/Modal.tsx — the one and only dialog component in the app.
 *
 * Every confirmation/warning (delete employee, shift conflict, leave quota,
 * cell roster, …) renders through this component, driven by the ModalState
 * union in App.tsx. Keeping it generic means all dialogs look and behave
 * identically (focus order, danger styling, cancel/OK layout).
 *
 * Props:
 *  - danger     → red OK button for destructive actions (delete / withdraw)
 *  - hideCancel → info-only dialogs that can only be acknowledged
 *  - children   → optional body content (e.g. the full roster of a cell)
 */
import type { ReactNode } from 'react'
import { useT } from '../i18n'

interface ModalProps {
  title: string
  children?: ReactNode
  cancelText?: string
  okText?: string
  danger?: boolean
  hideCancel?: boolean
  onCancel?: () => void
  onOk: () => void
}

/** Centered confirmation dialog (delete / shift conflict / leave flows / cell roster) */
export default function Modal({
  title,
  children,
  cancelText,
  okText,
  danger = false,
  hideCancel = false,
  onCancel,
  onOk,
}: ModalProps) {
  const { t } = useT()
  return (
    // semi-transparent backdrop covering the whole viewport
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-[480px] max-w-full rounded-2xl bg-white px-8 py-7 shadow-2xl ring-1 ring-black/5">
        <h3 className="text-center text-lg font-bold text-neutral-900">{title}</h3>
        {children && (
          <div className="mt-4 max-h-80 overflow-y-auto text-center leading-relaxed text-neutral-600">
            {children}
          </div>
        )}
        <div className="mt-7 flex justify-center gap-5">
          {!hideCancel && (
            <button
              onClick={onCancel}
              className="min-w-28 rounded-lg border border-neutral-300 bg-white px-5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              {cancelText ?? t('cancel')}
            </button>
          )}
          <button
            onClick={onOk}
            className={`min-w-28 rounded-lg px-5 py-2 text-sm font-medium text-white ${
              danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-[#00C9A7] hover:bg-[#00B295] text-[#0B3B33] font-semibold'
            }`}
          >
            {okText ?? t('modal.ok')}
          </button>
        </div>
      </div>
    </div>
  )
}
