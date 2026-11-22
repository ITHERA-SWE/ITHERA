import { useState } from 'react'
import type {
  SearchFilters as Filters,
  SearchKind,
  SearchSort,
} from './search-data'
export function SearchFilters({
  kind,
  filters,
  onChange,
  onReset,
  units,
  airlines,
  sort,
  onSort,
}: {
  kind: SearchKind
  filters: Filters
  onChange: (filters: Filters) => void
  onReset: () => void
  units: string[]
  airlines: string[]
  sort: SearchSort
  onSort: (sort: SearchSort) => void
}) {
  const [expanded, setExpanded] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 900,
  )
  const unit = filters.currency || (units.length === 1 ? units[0] : '')
  const field = (key: keyof Filters, value: string) =>
    onChange({
      ...filters,
      [key]: value,
      ...(key === 'currency' ? { maxPrice: '' } : {}),
    })
  return (
    <details
      className="atlas-search-filters"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>
        Filtrar resultados <span>⌄</span>
      </summary>
      <div className="atlas-search-filter-fields">
        {kind === 'flights' ? (
          <>
            <label htmlFor="atlas-stops">
              Escalas por trayecto
              <select
                id="atlas-stops"
                value={filters.stops}
                onChange={(e) => field('stops', e.target.value)}
              >
                <option value="">Cualquier número</option>
                <option value="0">Solo vuelos directos</option>
                <option value="1">Hasta una escala</option>
              </select>
            </label>
            <label htmlFor="atlas-airline">
              Aerolínea
              <select
                id="atlas-airline"
                value={filters.airline}
                onChange={(e) => field('airline', e.target.value)}
              >
                <option value="">Todas</option>
                {airlines.map((airline) => (
                  <option key={airline}>{airline}</option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <label htmlFor="atlas-rating">
            Valoración mínima informada
            <select
              id="atlas-rating"
              value={filters.minRating}
              onChange={(e) => field('minRating', e.target.value)}
            >
              <option value="">Cualquiera</option>
              <option value="3">3 o más</option>
              <option value="4">4 o más</option>
              <option value="4.5">4.5 o más</option>
            </select>
            <small>La fuente se indica en cada hotel.</small>
          </label>
        )}
        <label htmlFor="atlas-filter-currency">
          Moneda de los resultados
          <select
            id="atlas-filter-currency"
            value={filters.currency}
            onChange={(e) => field('currency', e.target.value)}
          >
            <option value="">Todas las monedas</option>
            {units.map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </label>
        <label htmlFor="atlas-price-cap">
          Precio total máximo {unit && `(${unit})`}
          <input
            id="atlas-price-cap"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            disabled={!unit}
            value={filters.maxPrice}
            onChange={(e) => field('maxPrice', e.target.value)}
            placeholder={unit ? 'Sin límite' : 'Elige una moneda'}
          />
          <small>No se convierten monedas.</small>
        </label>
        <label htmlFor="atlas-search-sort">
          Ordenar
          <select
            id="atlas-search-sort"
            value={sort}
            onChange={(e) => onSort(e.target.value as SearchSort)}
          >
            <option value="recommended">Orden inicial</option>
            <option value="price-up">Precio: menor a mayor</option>
            <option value="price-down">Precio: mayor a menor</option>
          </select>
          <small>Los importes se ordenan por moneda.</small>
        </label>
        <button className="atlas-text-link" type="button" onClick={onReset}>
          Limpiar filtros
        </button>
        <p>
          Filtros sobre las opciones recibidas, sin consultar de nuevo al
          proveedor.
        </p>
      </div>
    </details>
  )
}
