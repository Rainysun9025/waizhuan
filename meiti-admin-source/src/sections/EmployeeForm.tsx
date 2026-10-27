/**
 * sections/EmployeeForm.tsx — P2/P4 add & edit employee (URS FR-02 / FR-05).
 *
 * One component serves both modes: when `initial` is provided the form is
 * prefilled and acts as "edit", otherwise it starts empty as "add". The
 * employee ID itself is never typed — it is assigned by the system
 * (see saveEmployee in App.tsx).
 *
 * Validation happens on submit and every error is shown under its own field;
 * valid input the user already typed is kept. Rules:
 *  - name / gender / phone / job title / start date / wage are required;
 *  - phone must be an 11-digit Chinese mobile number starting with 1
 *    (the emergency contact phone follows the same rule when filled in);
 *  - wage must be a number > 0.
 */
import { useState } from 'react'
import type { Employee, EmployeeDraft } from '../types'
import { DEPARTMENTS, JOB_TITLES } from '../data/seed'
import { useT } from '../i18n'
import type { DictKey } from '../i18n'

interface Props {
  /** Edit mode when provided (form prefilled), add mode otherwise */
  initial?: Employee
  onCancel: () => void
  onSave: (draft: EmployeeDraft) => void
}

type FieldKey = keyof EmployeeDraft
type Errors = Partial<Record<FieldKey, string>>

// all fields are edited as strings; conversion (wage → number) happens on save
const EMPTY: Record<FieldKey, string> = {
  name: '',
  gender: '',
  birth: '',
  phone: '',
  email: '',
  address: '',
  jobTitle: '',
  department: '',
  startDate: '',
  wage: '',
  emergencyName: '',
  emergencyPhone: '',
}

const inputCls =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-[#00C9A7] focus:ring-2 focus:ring-[#00C9A7]/25'

export default function EmployeeForm({ initial, onCancel, onSave }: Props) {
  const { t } = useT()
  const [form, setForm] = useState<Record<FieldKey, string>>(() =>
    initial
      ? {
          name: initial.name,
          gender: initial.gender,
          birth: initial.birth,
          phone: initial.phone,
          email: initial.email,
          address: initial.address,
          jobTitle: initial.jobTitle,
          department: initial.department,
          startDate: initial.startDate,
          wage: String(initial.wage),
          emergencyName: initial.emergencyName,
          emergencyPhone: initial.emergencyPhone,
        }
      : { ...EMPTY },
  )
  const [errors, setErrors] = useState<Errors>({})

  /** update one field and clear its error message as soon as the user types */
  const set = (k: FieldKey, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function submit() {
    const errs: Errors = {}
    if (!form.name.trim()) errs.name = t('err.name')
    if (!form.gender) errs.gender = t('err.gender')
    if (!form.phone.trim()) errs.phone = t('err.phone')
    else if (!/^1\d{10}$/.test(form.phone.trim())) errs.phone = t('err.phoneInvalid')
    // emergency phone is optional, but if filled in it must be a valid mobile
    if (form.emergencyPhone.trim() && !/^1\d{10}$/.test(form.emergencyPhone.trim()))
      errs.emergencyPhone = t('err.emgPhoneInvalid')
    if (!form.jobTitle) errs.jobTitle = t('err.jobTitle')
    if (!form.startDate) errs.startDate = t('err.startDate')
    const wage = Number(form.wage)
    if (!form.wage.trim()) errs.wage = t('err.wageEmpty')
    else if (Number.isNaN(wage) || wage <= 0) errs.wage = t('err.wageInvalid')
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return // keep everything the user already typed

    onSave({
      name: form.name.trim(),
      gender: form.gender as Employee['gender'],
      birth: form.birth,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      jobTitle: form.jobTitle,
      department: form.department,
      startDate: form.startDate,
      wage,
      emergencyName: form.emergencyName.trim(),
      emergencyPhone: form.emergencyPhone.trim(),
    })
  }

  /** small helper that renders label + control + inline error consistently */
  const field = (
    key: FieldKey,
    label: string,
    required = false,
    node?: React.ReactNode,
    placeholder = '',
  ) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </label>
      {node ?? (
        <input
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
      )}
      {errors[key] && <div className="mt-1 text-sm text-rose-600">{errors[key]}</div>}
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {t(initial ? 'form.edit' : 'form.add')}
          <span className="ml-3 text-sm font-normal text-neutral-500">
            {t('form.idNote')}
            {initial ? ` (${t('form.idCurrent', { id: String(initial.id).padStart(3, '0') })})` : ''}
          </span>
        </h2>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-neutral-300 bg-white px-5 py-1.5 text-sm hover:bg-neutral-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={submit}
            className="rounded-lg bg-[#00C9A7] px-5 py-1.5 text-sm font-semibold text-[#0B3B33] shadow-sm hover:bg-[#00B295]"
          >
            {t('save')}
          </button>
        </div>
      </div>

      <div className="mt-5 grid max-w-5xl grid-cols-2 gap-x-10 gap-y-5 rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        {field('name', t('f.name'), true, undefined, t('ph.name'))}
        {field(
          'gender',
          t('f.gender'),
          true,
          <div className="flex h-[42px] items-center gap-5 text-sm">
            {(['male', 'female'] as const).map((g) => (
              <label key={g} className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="gender"
                  className="accent-[#00C9A7]"
                  checked={form.gender === g}
                  onChange={() => set('gender', g)}
                />
                {t(g === 'male' ? 'g.male' : 'g.female')}
              </label>
            ))}
          </div>,
        )}
        {field('birth', t('f.birth'), false, (
          <input
            type="date"
            value={form.birth}
            onChange={(e) => set('birth', e.target.value)}
            className={inputCls}
          />
        ))}
        {/* maxLength 11 + numeric keypad reinforce the phone validation */}
        {field('phone', t('f.phone'), true, (
          <input
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder={t('ph.phone')}
            maxLength={11}
            inputMode="numeric"
            className={inputCls}
          />
        ))}
        {field('email', t('f.email'), false, undefined, 'name@example.com')}
        {field('address', t('f.address'), false, undefined, t('ph.address'))}
        {field('jobTitle', t('f.jobTitle'), true, (
          <select
            value={form.jobTitle}
            onChange={(e) => set('jobTitle', e.target.value)}
            className={inputCls}
          >
            <option value="">{t('sel.please')}</option>
            {JOB_TITLES.map((jt) => (
              <option key={jt} value={jt}>{t(`job.${jt}` as DictKey)}</option>
            ))}
          </select>
        ))}
        {field('department', t('f.department'), false, (
          <select
            value={form.department}
            onChange={(e) => set('department', e.target.value)}
            className={inputCls}
          >
            <option value="">{t('sel.please')}</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{t(`dept.${d}` as DictKey)}</option>
            ))}
          </select>
        ))}
        {field('startDate', t('f.startDate'), true, (
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)}
            className={inputCls}
          />
        ))}
        {field('wage', t('f.wage'), true, undefined, t('ph.wage'))}
        {field('emergencyName', t('f.emgName'), false, undefined, t('ph.emgName'))}
        {field('emergencyPhone', t('f.emgPhone'), false, (
          <input
            value={form.emergencyPhone}
            onChange={(e) => set('emergencyPhone', e.target.value)}
            placeholder={t('ph.emgPhone')}
            maxLength={11}
            inputMode="numeric"
            className={inputCls}
          />
        ))}
      </div>
    </div>
  )
}
