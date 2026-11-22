import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { SimulatedCheckoutPayload } from '../../services/checkout'

type Mode = 'vuelo' | 'hospedaje'

type ValidationErrors = Partial<
  Record<
    | 'cardHolder'
    | 'cardNumber'
    | 'expirationMonth'
    | 'expirationYear'
    | 'cvv'
    | 'email'
    | 'mainPerson',
    string
  >
>

const onlyDigits = (value: string) => value.replace(/\D/g, '')

const luhnCheck = (cardNumber: string) => {
  const digits = onlyDigits(cardNumber)
  let sum = 0
  let shouldDouble = false

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index])
    if (shouldDouble) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    shouldDouble = !shouldDouble
  }

  return digits.length >= 13 && digits.length <= 19 && sum % 10 === 0
}

const hasTooManyConsecutiveEqualDigits = (digits: string, limit = 3) => {
  if (!digits) return false
  let streak = 1
  for (let index = 1; index < digits.length; index += 1) {
    streak = digits[index] === digits[index - 1] ? streak + 1 : 1
    if (streak > limit) return true
  }
  return false
}

const isSameDigitRepeated = (digits: string) => /^([0-9])\1+$/.test(digits)

const validateExpiry = (monthValue: string, yearValue: string) => {
  const month = Number(onlyDigits(monthValue))
  const yearDigits = onlyDigits(yearValue)
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const fullYear =
    yearDigits.length === 2 ? Number(`20${yearDigits}`) : Number(yearDigits)

  if (!Number.isInteger(month) || month < 1 || month > 12)
    return 'El mes debe estar entre 01 y 12.'
  if (!Number.isInteger(fullYear) || fullYear < currentYear)
    return 'El año de vencimiento no puede estar vencido.'
  if (fullYear === currentYear && month < currentMonth)
    return 'La tarjeta no puede estar vencida.'
  if (fullYear > currentYear + 10)
    return 'Usa una vigencia razonable, máximo 10 años hacia adelante.'
  return null
}

const validateEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())

const formatCardNumber = (value: string) => {
  const digits = onlyDigits(value).slice(0, 19)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

export function PaymentCardForm({
  mode,
  loading,
  disabled = false,
  defaultEmail,
  onSubmit,
}: {
  mode: Mode
  loading: boolean
  disabled?: boolean
  defaultEmail?: string
  onSubmit: (payload: SimulatedCheckoutPayload) => Promise<void> | void
}) {
  const [cardHolder, setCardHolder] = useState('')
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242')
  const [expirationMonth, setExpirationMonth] = useState('12')
  const [expirationYear, setExpirationYear] = useState('30')
  const [cvv, setCvv] = useState('123')
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [phone, setPhone] = useState('')
  const [mainPerson, setMainPerson] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [acknowledged, setAcknowledged] = useState(false)
  const submitting = useRef(false)

  const helperText = useMemo(() => {
    if (mode === 'vuelo')
      return 'Datos de prueba del pasajero y del método simulado.'
    return 'Datos de prueba del huésped y del método simulado.'
  }, [mode])

  const validateForm = () => {
    const nextErrors: ValidationErrors = {}
    const cleanCard = onlyDigits(cardNumber)
    const cleanCvv = onlyDigits(cvv)
    const expiryError = validateExpiry(expirationMonth, expirationYear)

    if (!cardHolder.trim())
      nextErrors.cardHolder = 'Escribe el nombre del titular.'
    if (!mainPerson.trim() && !cardHolder.trim())
      nextErrors.mainPerson = 'Escribe el nombre principal.'
    if (!cleanCard) nextErrors.cardNumber = 'Escribe el número de tarjeta.'
    else if (cleanCard.length < 13 || cleanCard.length > 19)
      nextErrors.cardNumber = 'El número debe tener entre 13 y 19 dígitos.'
    else if (isSameDigitRepeated(cleanCard))
      nextErrors.cardNumber =
        'No se aceptan tarjetas formadas por un solo dígito repetido.'
    else if (hasTooManyConsecutiveEqualDigits(cleanCard))
      nextErrors.cardNumber =
        'No se aceptan más de 3 dígitos iguales consecutivos.'
    else if (!luhnCheck(cleanCard))
      nextErrors.cardNumber = 'El número no pasa la validación Luhn.'

    if (expiryError) {
      nextErrors.expirationMonth = expiryError
      nextErrors.expirationYear = expiryError
    }

    if (cleanCvv.length < 3 || cleanCvv.length > 4)
      nextErrors.cvv = 'El CVV debe tener 3 o 4 dígitos.'
    else if (isSameDigitRepeated(cleanCvv))
      nextErrors.cvv =
        'Por seguridad, no uses un CVV con todos los dígitos iguales.'

    if (!validateEmail(email))
      nextErrors.email = 'Escribe un correo válido para el comprobante.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (
      loading ||
      disabled ||
      submitting.current ||
      !acknowledged ||
      !validateForm()
    )
      return
    submitting.current = true

    const person = {
      fullName: mainPerson.trim() || cardHolder.trim(),
      documentNumber: null,
    }

    try {
      await onSubmit({
        cardHolder: cardHolder.trim(),
        cardNumber: onlyDigits(cardNumber),
        expirationMonth: onlyDigits(expirationMonth).padStart(2, '0'),
        expirationYear: onlyDigits(expirationYear),
        cvv: onlyDigits(cvv),
        email: email.trim(),
        phone: phone.trim() || null,
        passengers: mode === 'vuelo' ? [person] : undefined,
        guests: mode === 'hospedaje' ? [person] : undefined,
        notes: notes.trim() || null,
      })
    } finally {
      submitting.current = false
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="atlas-checkout-form"
      aria-busy={loading}
      aria-label="Confirmar simulación"
    >
      <div>
        <p className="atlas-eyebrow">DATOS EXCLUSIVAMENTE DE PRUEBA</p>
        <h2>Confirmar simulación</h2>
        <p>{helperText} No uses tarjetas ni documentos reales.</p>
      </div>
      <fieldset disabled={loading || disabled}>
        <legend className="sr-only">Datos de prueba</legend>
        <div className="atlas-checkout-fields">
          <Field
            label="Titular de prueba"
            value={cardHolder}
            onChange={setCardHolder}
            placeholder="Nombre de prueba"
            required
            error={errors.cardHolder}
          />
          <Field
            label={
              mode === 'vuelo'
                ? 'Pasajero principal de prueba'
                : 'Huésped principal de prueba'
            }
            value={mainPerson}
            onChange={setMainPerson}
            placeholder="Puede ser el mismo titular"
            error={errors.mainPerson}
          />
          <Field
            label="Número de tarjeta de prueba"
            value={cardNumber}
            onChange={(value) => setCardNumber(formatCardNumber(value))}
            required
            error={errors.cardNumber}
            inputMode="numeric"
          />
          <div className="atlas-checkout-expiry">
            <Field
              label="Mes"
              value={expirationMonth}
              onChange={(value) =>
                setExpirationMonth(onlyDigits(value).slice(0, 2))
              }
              required
              error={errors.expirationMonth}
              inputMode="numeric"
            />
            <Field
              label="Año"
              value={expirationYear}
              onChange={(value) =>
                setExpirationYear(onlyDigits(value).slice(0, 4))
              }
              required
              error={errors.expirationYear}
              inputMode="numeric"
            />
            <Field
              label="CVV de prueba"
              value={cvv}
              onChange={(value) => setCvv(onlyDigits(value).slice(0, 4))}
              required
              error={errors.cvv}
              inputMode="numeric"
            />
          </div>
          <Field
            label="Correo para el comprobante de simulación"
            type="email"
            value={email}
            onChange={setEmail}
            required
            error={errors.email}
          />
          <Field
            label="Teléfono (opcional)"
            value={phone}
            onChange={setPhone}
          />
        </div>
        <label>
          Notas
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
      </fieldset>
      <label className="atlas-simulation-ack">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          disabled={loading || disabled}
        />
        Entiendo que la operación es simulada y que el flujo existente puede
        generar el gasto asociado en el registro financiero del grupo.
      </label>
      <button
        type="submit"
        className="atlas-button atlas-button-primary"
        disabled={loading || disabled || !acknowledged}
      >
        {loading
          ? 'Procesando simulación…'
          : mode === 'vuelo'
            ? 'Simular compra de vuelo'
            : 'Simular reserva de hotel'}
      </button>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
  error,
  inputMode,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  type?: string
  error?: string
  inputMode?:
    'text' | 'numeric' | 'decimal' | 'tel' | 'search' | 'email' | 'url'
}) {
  return (
    <label>
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `error-${label.replace(/[^a-z0-9]/gi, '-')}` : undefined
        }
        autoComplete="off"
        className={`mt-1.5 w-full rounded-2xl border bg-white px-4 py-3 font-body text-base text-[#1E0A4E] outline-none transition focus:ring-4 ${error ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/10' : 'border-[#E2E8F0] focus:border-[#1E6FD9] focus:ring-[#1E6FD9]/10'}`}
      />
      {error && (
        <span
          id={`error-${label.replace(/[^a-z0-9]/gi, '-')}`}
          className="mt-1 block font-body text-xs font-semibold text-[#EF4444]"
        >
          {error}
        </span>
      )}
    </label>
  )
}
