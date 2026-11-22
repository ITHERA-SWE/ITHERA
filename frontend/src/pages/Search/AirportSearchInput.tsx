import { useState } from 'react'
import type { FlightAirportOption } from '../../services/flights'

export function AirportSearchInput({
  id,
  value,
  options,
  loading,
  onChange,
  onSelect,
  onBlur,
  placeholder,
  lookupError,
}: {
  id: string
  value: string
  options: FlightAirportOption[]
  loading: boolean
  onChange: (value: string) => void
  onSelect: (airport: FlightAirportOption) => void
  onBlur: () => void
  placeholder: string
  lookupError?: string | null
}) {
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(-1)
  const open = focused && value.trim().length >= 2 && options.length > 0
  const choose = (option: FlightAirportOption) => {
    onSelect(option)
    setFocused(false)
    setActive(-1)
  }
  return (
    <div className="atlas-airport-input">
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-activedescendant={
          open && active >= 0 && active < options.length
            ? `${id}-option-${active}`
            : undefined
        }
        aria-describedby={`${id}-hint`}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setFocused(true)
          setActive(-1)
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          onBlur()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            setFocused(false)
            setActive(-1)
          }
          if (
            (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
            options.length
          ) {
            event.preventDefault()
            setFocused(true)
            setActive((previous) =>
              event.key === 'ArrowDown'
                ? (previous + 1) % options.length
                : previous <= 0
                  ? options.length - 1
                  : previous - 1,
            )
          }
          if (event.key === 'Enter' && open && active >= 0 && options[active]) {
            event.preventDefault()
            choose(options[active])
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      {open && (
        <div
          role="listbox"
          id={`${id}-list`}
          aria-label="Aeropuertos disponibles"
          className="atlas-airport-list"
        >
          {options.map((option, index) => (
            <button
              id={`${id}-option-${index}`}
              key={option.code}
              type="button"
              role="option"
              aria-selected={index === active}
              tabIndex={-1}
              onPointerDown={(e) => e.preventDefault()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(option)}
            >
              <strong>{option.code}</strong>
              <span>
                {option.city}, {option.country}
                <small>
                  {option.name}
                  {typeof option.distanceKm === 'number'
                    ? ` · ${Math.round(option.distanceKm)} km aprox.`
                    : ''}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}
      <small id={`${id}-hint`} aria-live="polite">
        {loading
          ? 'Consultando aeropuertos…'
          : lookupError ||
            (/^[a-z]{3}$/i.test(value.trim())
              ? 'Código IATA. Puedes cambiarlo por otro aeropuerto.'
              : 'Escribe ciudad, aeropuerto o código IATA.')}
      </small>
    </div>
  )
}
