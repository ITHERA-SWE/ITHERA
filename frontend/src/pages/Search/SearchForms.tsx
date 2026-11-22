import type { CabinClass, FlightAirportOption } from '../../services/flights'
import type {
  DateWindow,
  FlightFormState,
  HotelFormState,
} from './search-types'
import { AirportSearchInput } from './AirportSearchInput'

interface Props {
  kind: 'flights' | 'hotels'
  flight: FlightFormState
  hotel: HotelFormState
  startWindow: { startMin: string; startMax: string }
  returnWindow: DateWindow
  checkoutWindow: DateWindow
  airportOptions: Record<'origin' | 'destination', FlightAirportOption[]>
  airportLoading: Record<'origin' | 'destination', boolean>
  airportErrors: Record<'origin' | 'destination', string | null>
  onFlightChange: <K extends keyof FlightFormState>(
    key: K,
    value: FlightFormState[K],
  ) => void
  onHotelChange: <K extends keyof HotelFormState>(
    key: K,
    value: HotelFormState[K],
  ) => void
  onAirportBlur: (field: 'origin' | 'destination') => void
}
const cabins: Record<CabinClass, string> = {
  economy: 'Económica',
  premium_economy: 'Premium economy',
  business: 'Business',
  first: 'Primera',
}
const numeric = (value: string, fallback: number) =>
  Number.isFinite(Number(value))
    ? Math.max(0, Math.trunc(Number(value)))
    : fallback
export function SearchForms(p: Props) {
  const { flight, hotel, kind, onFlightChange: fc, onHotelChange: hc } = p
  return (
    <>
      {kind === 'flights' ? (
        <>
          <div className="atlas-search-fields">
            <label htmlFor="atlas-origin">
              Origen
              <AirportSearchInput
                id="atlas-origin"
                value={flight.origin}
                options={p.airportOptions.origin}
                loading={p.airportLoading.origin}
                lookupError={p.airportErrors.origin}
                onChange={(value) => fc('origin', value)}
                onSelect={(airport) => fc('origin', airport.code)}
                onBlur={() => p.onAirportBlur('origin')}
                placeholder="Ciudad o código IATA"
              />
            </label>
            <label htmlFor="atlas-destination">
              Destino
              <AirportSearchInput
                id="atlas-destination"
                value={flight.destination}
                options={p.airportOptions.destination}
                loading={p.airportLoading.destination}
                lookupError={p.airportErrors.destination}
                onChange={(value) => fc('destination', value)}
                onSelect={(airport) => fc('destination', airport.code)}
                onBlur={() => p.onAirportBlur('destination')}
                placeholder="¿A dónde vamos?"
              />
            </label>
            <label htmlFor="atlas-departure">
              Salida
              <input
                id="atlas-departure"
                type="date"
                required
                min={p.startWindow.startMin}
                max={p.startWindow.startMax}
                value={flight.departureDate}
                onChange={(e) => fc('departureDate', e.target.value)}
              />
            </label>
            <label htmlFor="atlas-return">
              Regreso
              <input
                id="atlas-return"
                type="date"
                required
                min={p.returnWindow.min}
                max={p.returnWindow.max}
                value={flight.returnDate}
                onChange={(e) => fc('returnDate', e.target.value)}
              />
            </label>
          </div>
          <details className="atlas-traveler-options">
            <summary>
              {flight.adults + flight.children + flight.infantsWithoutSeat}{' '}
              viajero(s) · {cabins[flight.cabinClass]}{' '}
              <span>Pasajeros y cabina ⌄</span>
            </summary>
            <div className="atlas-traveler-grid">
              <label htmlFor="atlas-flight-adults">
                Adultos
                <input
                  id="atlas-flight-adults"
                  type="number"
                  min={1}
                  max={50}
                  value={flight.adults}
                  onChange={(e) => fc('adults', numeric(e.target.value, 1))}
                />
              </label>
              <label htmlFor="atlas-flight-children">
                Niños
                <input
                  id="atlas-flight-children"
                  type="number"
                  min={0}
                  max={50 - flight.adults - flight.infantsWithoutSeat}
                  value={flight.children}
                  onChange={(e) => fc('children', numeric(e.target.value, 0))}
                />
              </label>
              <label htmlFor="atlas-flight-infants">
                Infantes sin asiento
                <input
                  id="atlas-flight-infants"
                  type="number"
                  min={0}
                  max={Math.min(
                    flight.adults,
                    50 - flight.adults - flight.children,
                  )}
                  value={flight.infantsWithoutSeat}
                  onChange={(e) =>
                    fc('infantsWithoutSeat', numeric(e.target.value, 0))
                  }
                />
              </label>
              <label htmlFor="atlas-cabin">
                Cabina
                <select
                  id="atlas-cabin"
                  value={flight.cabinClass}
                  onChange={(e) =>
                    fc('cabinClass', e.target.value as CabinClass)
                  }
                >
                  {Object.entries(cabins).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p>
              Hasta 50 pasajeros. Cada infante sin asiento debe viajar con un
              adulto.
            </p>
          </details>
        </>
      ) : (
        <>
          <div className="atlas-search-fields atlas-hotel-fields">
            <label htmlFor="atlas-hotel-destination">
              Destino
              <input
                id="atlas-hotel-destination"
                value={hotel.destination}
                onChange={(e) => hc('destination', e.target.value)}
                placeholder="Ciudad o destino del viaje"
              />
            </label>
            <label htmlFor="atlas-checkin">
              Entrada
              <input
                id="atlas-checkin"
                type="date"
                required
                value={hotel.checkIn}
                min={p.startWindow.startMin}
                max={p.startWindow.startMax}
                onChange={(e) => hc('checkIn', e.target.value)}
              />
            </label>
            <label htmlFor="atlas-checkout">
              Salida
              <input
                id="atlas-checkout"
                type="date"
                required
                value={hotel.checkOut}
                min={p.checkoutWindow.min}
                max={p.checkoutWindow.max}
                onChange={(e) => hc('checkOut', e.target.value)}
              />
            </label>
          </div>
          <details className="atlas-traveler-options">
            <summary>
              {hotel.adults + hotel.children} huésped(es) · {hotel.rooms}{' '}
              habitación(es) <span>Huéspedes y habitaciones ⌄</span>
            </summary>
            <div className="atlas-traveler-grid">
              <label htmlFor="atlas-hotel-adults">
                Adultos
                <input
                  id="atlas-hotel-adults"
                  type="number"
                  min={1}
                  max={50}
                  value={hotel.adults}
                  onChange={(e) => hc('adults', numeric(e.target.value, 1))}
                />
              </label>
              <label htmlFor="atlas-hotel-children">
                Niños
                <input
                  id="atlas-hotel-children"
                  type="number"
                  min={0}
                  max={50 - hotel.adults}
                  value={hotel.children}
                  onChange={(e) => hc('children', numeric(e.target.value, 0))}
                />
              </label>
              <label htmlFor="atlas-hotel-rooms">
                Habitaciones
                <input
                  id="atlas-hotel-rooms"
                  type="number"
                  min={1}
                  max={Math.min(50, hotel.adults)}
                  value={hotel.rooms}
                  onChange={(e) => hc('rooms', numeric(e.target.value, 1))}
                />
              </label>
            </div>
            {hotel.children > 0 && (
              <fieldset className="atlas-child-ages">
                <legend>Edad de cada menor al llegar (0 a 17 años)</legend>
                {hotel.childrenAges.map((age, index) => (
                  <label key={index} htmlFor={`atlas-child-${index}`}>
                    Menor {index + 1}
                    <input
                      id={`atlas-child-${index}`}
                      type="number"
                      required
                      min={0}
                      max={17}
                      value={age ?? ''}
                      onChange={(e) =>
                        hc(
                          'childrenAges',
                          hotel.childrenAges.map((value, i) =>
                            i === index
                              ? e.target.value === ''
                                ? null
                                : numeric(e.target.value, 0)
                              : value,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
              </fieldset>
            )}
            <p>
              Hasta 50 huéspedes, con al menos un adulto por habitación. Se
              envían las edades que captures.
            </p>
          </details>
        </>
      )}
      <p className="atlas-search-date-note">
        Entrada o salida inicial: {p.startWindow.startMin} —{' '}
        {p.startWindow.startMax}.{' '}
        {kind === 'flights' ? 'Regreso' : 'Salida del hotel'} posterior, hasta{' '}
        {kind === 'flights' ? p.returnWindow.max : p.checkoutWindow.max}, según
        el margen de 3 días del viaje.
      </p>
    </>
  )
}
