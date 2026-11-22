import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SearchIntegratedShell } from './SearchIntegratedShell'
import { useAuth } from '../../context/useAuth'
import {
  flightsService,
  type FlightAirportOption,
  type FlightOffer,
} from '../../services/flights'
import { hotelsService, type HotelOffer } from '../../services/hotels'
import type { Group } from '../../types/groups'
import { proposalsService } from '../../services/proposals'
import { searchHistoryService } from '../../services/search-history'
import { useNetworkMonitor } from '../../hooks/useNetworkMonitor'
import { useSearchTrip } from './useSearchTrip'
import { SearchForms } from './SearchForms'
import { SearchFilters } from './SearchFilters'
import {
  FlightResult,
  HotelResult,
  HotelDetails,
  SearchSkeleton,
} from './SearchResults'
import {
  EMPTY_FILTERS,
  currencies,
  filterFlights,
  filterHotels,
  flightProposalIssue,
  hotelProposalIssue,
  hotelLocationParams,
  withSearchTimeout,
  getPrimaryRoute,
  searchFailure,
  travelPath,
  type SearchSort,
} from './search-data'
import type { FlightFormState, HotelFormState } from './search-types'

type SearchTab = 'flights' | 'hotels'
type ViewState = 'initial' | 'loading' | 'results' | 'error'

interface Flight extends FlightOffer {
  proposed: boolean
  saving?: boolean
}

interface Hotel extends HotelOffer {
  proposed: boolean
  saving?: boolean
}

function isIataCode(value: string) {
  return /^[A-Z]{3}$/.test(value.trim().toUpperCase())
}

const DEFAULT_FLIGHT_FORM: FlightFormState = {
  origin: 'MEX',
  destination: '',
  departureDate: '',
  returnDate: '',
  adults: 1,
  children: 0,
  infantsWithoutSeat: 0,
  cabinClass: 'economy',
}

const DEFAULT_HOTEL_FORM: HotelFormState = {
  destination: '',
  checkIn: '',
  checkOut: '',
  adults: 2,
  children: 0,
  childrenAges: [],
  rooms: 1,
  currency: 'MXN',
}

const MAX_TRIP_PEOPLE = 50
const MAX_HOTEL_ROOMS = 50
const TRIP_END_GRACE_DAYS = 3

function todayIsoDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseIsoDate(value?: string | null) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function addDaysIso(value: string, days: number) {
  const date = parseIsoDate(value)
  if (!date) return value
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function getDateWindow(currentGroup?: Group | null) {
  const tripStart = currentGroup?.fecha_inicio || todayIsoDate()
  const tripEnd = currentGroup?.fecha_fin || addDaysIso(tripStart, 60)
  return {
    startMin: tripStart,
    startMax: tripEnd,
  }
}

function getEndDateWindow(startDate: string, currentGroup?: Group | null) {
  const baseStart = startDate || currentGroup?.fecha_inicio || todayIsoDate()
  const min = addDaysIso(baseStart, 1)
  const max = currentGroup?.fecha_fin
    ? addDaysIso(currentGroup.fecha_fin, TRIP_END_GRACE_DAYS)
    : addDaysIso(baseStart, TRIP_END_GRACE_DAYS)
  return { min, max }
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

const PREFERRED_AIRLINE_NAMES = [
  'aeromexico',
  'aeroméxico',
  'volaris',
  'viva aerobus',
  'vivaaerobus',
  'magnicharters',
]

const LOW_PRIORITY_DUFFEL_TEST_AIRLINES = [
  'duffel airways',
  'british airways',
  'iberia',
  'test',
]

const FLIGHT_IMAGE_BY_AIRLINE: Record<string, string> = {
  aeromexico:
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&h=420&fit=crop',
  aeroméxico:
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&h=420&fit=crop',
  volaris:
    'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=900&h=420&fit=crop',
  'viva aerobus':
    'https://images.unsplash.com/photo-1490430657723-4d607c1503fc?w=900&h=420&fit=crop',
  vivaaerobus:
    'https://images.unsplash.com/photo-1490430657723-4d607c1503fc?w=900&h=420&fit=crop',
}

function normalizeText(value?: string | null) {
  return (value ?? '').trim().toLowerCase()
}

function getFlightImageUrl(flight: FlightOffer) {
  const airline = normalizeText(flight.airline)
  return (
    FLIGHT_IMAGE_BY_AIRLINE[airline] ??
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&h=420&fit=crop'
  )
}

function getFlightSortTier(flight: FlightOffer) {
  const airline = normalizeText(flight.airline)

  if (flight.liveMode) return 0
  if (PREFERRED_AIRLINE_NAMES.some((name) => airline.includes(name))) return 1
  if (LOW_PRIORITY_DUFFEL_TEST_AIRLINES.some((name) => airline.includes(name)))
    return 3

  return 2
}

function sortFlightOffers(flights: FlightOffer[]) {
  return [...flights].sort((a, b) => {
    const tierDiff = getFlightSortTier(a) - getFlightSortTier(b)
    if (tierDiff !== 0) return tierDiff

    const priceA = a.price ?? Number.POSITIVE_INFINITY
    const priceB = b.price ?? Number.POSITIVE_INFINITY
    return priceA - priceB
  })
}

const SearchExperience = ({ currentGroup }: { currentGroup: Group | null }) => {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const activeTab: SearchTab =
    new URLSearchParams(location.search).get('mode') === 'hotels'
      ? 'hotels'
      : 'flights'
  const online = useNetworkMonitor()
  const readOnly =
    ['finalizado', 'cerrado', 'archivado'].includes(
      currentGroup?.estado ?? '',
    ) ||
    Boolean(currentGroup?.fecha_fin && currentGroup.fecha_fin < todayIsoDate())
  const disabledReason = !currentGroup?.id
    ? 'Selecciona un viaje para guardar propuestas.'
    : readOnly
      ? 'Este viaje está en modo lectura.'
      : currentGroup.modulo_itinerario_bloqueado
        ? 'El organizador ha bloqueado el itinerario.'
        : !online
          ? 'Reconecta para guardar una propuesta.'
          : ''
  const canPropose = !disabledReason
  const requestVersion = useRef(0)
  const pendingSaves = useRef(new Set<string>())
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS })
  const [sort, setSort] = useState<SearchSort>('recommended')
  const [operationError, setOperationError] = useState<string | null>(null)
  const [historyWarning, setHistoryWarning] = useState(false)
  const [prebookWarning, setPrebookWarning] = useState(false)
  const [failureTitle, setFailureTitle] = useState('')
  const [airportErrors, setAirportErrors] = useState<
    Record<'origin' | 'destination', string | null>
  >({ origin: null, destination: null })
  useEffect(() => {
    const generation = requestVersion
    return () => {
      generation.current++
    }
  }, [])
  const [viewState, setViewState] = useState<ViewState>('initial')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [flightForm, setFlightForm] = useState<FlightFormState>(() => {
    const departureDate = currentGroup?.fecha_inicio ?? ''
    const { min, max } = getEndDateWindow(departureDate, currentGroup)
    const end = currentGroup?.fecha_fin ?? ''
    return {
      ...DEFAULT_FLIGHT_FORM,
      departureDate,
      returnDate:
        end && end >= min && end <= max ? end : departureDate ? min : '',
    }
  })
  const [lastFlightSearch, setLastFlightSearch] =
    useState<FlightFormState | null>(null)
  const [hotelForm, setHotelForm] = useState<HotelFormState>(() => {
    const checkIn = currentGroup?.fecha_inicio ?? ''
    const { min, max } = getEndDateWindow(checkIn, currentGroup)
    const end = currentGroup?.fecha_fin ?? ''
    return {
      ...DEFAULT_HOTEL_FORM,
      destination:
        currentGroup?.destino_formatted_address ?? currentGroup?.destino ?? '',
      checkIn,
      checkOut: end && end >= min && end <= max ? end : checkIn ? min : '',
    }
  })
  const [lastHotelSearch, setLastHotelSearch] = useState<HotelFormState | null>(
    null,
  )
  const [flights, setFlights] = useState<Flight[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null)
  const setSelectedHotel = (hotel: Hotel | null) =>
    setSelectedHotelId(hotel?.id ?? null)
  const selectedHotel =
    hotels.find((hotel) => hotel.id === selectedHotelId) ?? null

  const [airportOptions, setAirportOptions] = useState<
    Record<'origin' | 'destination', FlightAirportOption[]>
  >({
    origin: [],
    destination: [],
  })
  const [airportLoading, setAirportLoading] = useState<
    Record<'origin' | 'destination', boolean>
  >({
    origin: false,
    destination: false,
  })

  const startDateWindow = useMemo(
    () => getDateWindow(currentGroup),
    [currentGroup],
  )
  const flightReturnWindow = useMemo(
    () => getEndDateWindow(flightForm.departureDate, currentGroup),
    [currentGroup, flightForm.departureDate],
  )
  const hotelCheckoutWindow = useMemo(
    () => getEndDateWindow(hotelForm.checkIn, currentGroup),
    [currentGroup, hotelForm.checkIn],
  )

  const flightValidationMessage = useMemo(() => {
    if (!isIataCode(flightForm.origin) || !isIataCode(flightForm.destination))
      return 'Origen y destino deben resolverse a códigos IATA de 3 letras.'
    if (
      flightForm.origin.trim().toUpperCase() ===
      flightForm.destination.trim().toUpperCase()
    )
      return 'El origen y el destino no pueden ser iguales.'
    if (!flightForm.departureDate) return 'Selecciona una fecha de salida.'
    if (
      flightForm.departureDate < startDateWindow.startMin ||
      flightForm.departureDate > startDateWindow.startMax
    )
      return `La fecha de salida debe estar entre ${startDateWindow.startMin} y ${startDateWindow.startMax}.`
    if (!flightForm.returnDate) return 'Selecciona una fecha de regreso.'
    if (
      flightForm.returnDate < flightReturnWindow.min ||
      flightForm.returnDate > flightReturnWindow.max
    )
      return `La fecha de regreso debe estar entre ${flightReturnWindow.min} y ${flightReturnWindow.max}.`
    if (flightForm.adults < 1) return 'Debe viajar al menos un adulto.'
    if (flightForm.children < 0 || flightForm.infantsWithoutSeat < 0)
      return 'Los pasajeros no pueden ser negativos.'
    if (flightForm.infantsWithoutSeat > flightForm.adults)
      return 'No puede haber más infantes sin asiento que adultos.'
    if (
      flightForm.adults + flightForm.children + flightForm.infantsWithoutSeat >
      MAX_TRIP_PEOPLE
    )
      return `La búsqueda permite máximo ${MAX_TRIP_PEOPLE} pasajeros en total.`
    return null
  }, [
    flightForm,
    flightReturnWindow.max,
    flightReturnWindow.min,
    startDateWindow.startMax,
    startDateWindow.startMin,
  ])

  const hotelValidationMessage = useMemo(() => {
    const destination =
      hotelForm.destination.trim() ||
      currentGroup?.destino_formatted_address ||
      currentGroup?.destino ||
      ''
    if (
      !destination &&
      !currentGroup?.destino_latitud &&
      !currentGroup?.destino_longitud
    )
      return 'Captura un destino o selecciona un viaje con destino configurado.'
    if (!hotelForm.checkIn) return 'Selecciona una fecha de check-in.'
    if (
      hotelForm.checkIn < startDateWindow.startMin ||
      hotelForm.checkIn > startDateWindow.startMax
    )
      return `El check-in debe estar entre ${startDateWindow.startMin} y ${startDateWindow.startMax}.`
    if (!hotelForm.checkOut) return 'Selecciona una fecha de check-out.'
    if (
      hotelForm.checkOut < hotelCheckoutWindow.min ||
      hotelForm.checkOut > hotelCheckoutWindow.max
    )
      return `El check-out debe estar entre ${hotelCheckoutWindow.min} y ${hotelCheckoutWindow.max}.`
    if (hotelForm.adults < 1) return 'Debe hospedarse al menos un adulto.'
    if (hotelForm.children < 0) return 'Los niños no pueden ser negativos.'
    if (
      hotelForm.childrenAges.length !== hotelForm.children ||
      hotelForm.childrenAges.some(
        (age) => age == null || !Number.isInteger(age) || age < 0 || age > 17,
      )
    )
      return 'Indica la edad de cada menor (0 a 17 años).'
    if (hotelForm.adults + hotelForm.children > MAX_TRIP_PEOPLE)
      return `La búsqueda permite máximo ${MAX_TRIP_PEOPLE} huéspedes en total.`
    if (hotelForm.rooms < 1) return 'Debe haber al menos una habitación.'
    if (hotelForm.rooms > hotelForm.adults)
      return 'El número de habitaciones no puede ser mayor que el número de adultos.'
    return null
  }, [
    currentGroup,
    hotelCheckoutWindow.max,
    hotelCheckoutWindow.min,
    hotelForm,
    startDateWindow.startMax,
    startDateWindow.startMin,
  ])

  const isSearchDisabled =
    viewState === 'loading' ||
    !online ||
    readOnly ||
    (activeTab === 'flights'
      ? Boolean(flightValidationMessage)
      : Boolean(hotelValidationMessage))

  useEffect(() => {
    if (!currentGroup || !accessToken || readOnly) return

    let cancelled = false
    const destinationSource = [
      currentGroup.destino,
      currentGroup.destino_formatted_address,
    ]
      .filter(Boolean)
      .join(' ')

    if (
      !destinationSource &&
      !currentGroup.destino_latitud &&
      !currentGroup.destino_longitud
    )
      return

    flightsService
      .resolveAirport(
        {
          q: destinationSource || undefined,
          latitude: currentGroup.destino_latitud ?? undefined,
          longitude: currentGroup.destino_longitud ?? undefined,
          max: 8,
        },
        accessToken,
      )
      .then((response) => {
        if (
          cancelled ||
          !response.data?.code ||
          !isIataCode(response.data.code)
        )
          return
        setFlightForm((prev) =>
          prev.destination.trim()
            ? prev
            : { ...prev, destination: response.data.code },
        )
      })
      .catch(() => {
        // El usuario puede capturar el destino manualmente si no se resuelve por catálogo/Google.
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, currentGroup, readOnly])

  useEffect(() => {
    if (!accessToken || activeTab !== 'flights') return

    let cancelled = false
    const controller = window.setTimeout(() => {
      const query = flightForm.origin.trim()
      if (query.length < 2) {
        setAirportOptions((prev) => ({ ...prev, origin: [] }))
        return
      }

      setAirportErrors((prev) => ({ ...prev, origin: null }))
      setAirportLoading((prev) => ({ ...prev, origin: true }))
      flightsService
        .searchAirports({ q: query, max: 8 }, accessToken)
        .then((response) => {
          if (!cancelled)
            setAirportOptions((prev) => ({
              ...prev,
              origin: response.data ?? [],
            }))
        })
        .catch(() => {
          if (!cancelled) {
            setAirportOptions((prev) => ({ ...prev, origin: [] }))
            setAirportErrors((prev) => ({
              ...prev,
              origin:
                'El catálogo no respondió. Escribe un código IATA válido.',
            }))
          }
        })
        .finally(
          () =>
            !cancelled &&
            setAirportLoading((prev) => ({ ...prev, origin: false })),
        )
    }, 280)

    return () => {
      cancelled = true
      window.clearTimeout(controller)
    }
  }, [accessToken, activeTab, flightForm.origin])

  useEffect(() => {
    if (!accessToken || activeTab !== 'flights') return

    let cancelled = false
    const controller = window.setTimeout(() => {
      const query = flightForm.destination.trim()
      if (query.length < 2) {
        setAirportOptions((prev) => ({ ...prev, destination: [] }))
        return
      }

      setAirportErrors((prev) => ({ ...prev, destination: null }))
      setAirportLoading((prev) => ({ ...prev, destination: true }))
      flightsService
        .searchAirports(
          {
            q: query,
            latitude: currentGroup?.destino_latitud ?? undefined,
            longitude: currentGroup?.destino_longitud ?? undefined,
            max: 8,
          },
          accessToken,
        )
        .then((response) => {
          if (!cancelled)
            setAirportOptions((prev) => ({
              ...prev,
              destination: response.data ?? [],
            }))
        })
        .catch(() => {
          if (!cancelled) {
            setAirportOptions((prev) => ({ ...prev, destination: [] }))
            setAirportErrors((prev) => ({
              ...prev,
              destination:
                'El catálogo no respondió. Escribe un código IATA válido.',
            }))
          }
        })
        .finally(
          () =>
            !cancelled &&
            setAirportLoading((prev) => ({ ...prev, destination: false })),
        )
    }, 280)

    return () => {
      cancelled = true
      window.clearTimeout(controller)
    }
  }, [
    accessToken,
    activeTab,
    currentGroup?.destino_latitud,
    currentGroup?.destino_longitud,
    flightForm.destination,
  ])

  const handleFlightFieldChange = <K extends keyof FlightFormState>(
    field: K,
    value: FlightFormState[K],
  ) => {
    setFlightForm((prev) => {
      const next = { ...prev, [field]: value }

      if (field === 'adults') {
        next.adults = clampInteger(Number(value), 1, MAX_TRIP_PEOPLE)
      }

      if (field === 'children') {
        next.children = clampInteger(Number(value), 0, MAX_TRIP_PEOPLE)
      }

      if (field === 'infantsWithoutSeat') {
        next.infantsWithoutSeat = clampInteger(
          Number(value),
          0,
          MAX_TRIP_PEOPLE,
        )
      }

      if (field === 'departureDate') {
        const { min, max } = getEndDateWindow(String(value), currentGroup)
        if (!next.returnDate || next.returnDate < min) next.returnDate = min
        if (next.returnDate > max) next.returnDate = max
      }

      if (field === 'returnDate') {
        const { min, max } = getEndDateWindow(next.departureDate, currentGroup)
        if (String(value) < min) next.returnDate = min
        if (String(value) > max) next.returnDate = max
      }

      if (
        next.adults + next.children + next.infantsWithoutSeat >
        MAX_TRIP_PEOPLE
      ) {
        const availableForChildrenAndInfants = Math.max(
          0,
          MAX_TRIP_PEOPLE - next.adults,
        )
        next.children = Math.min(next.children, availableForChildrenAndInfants)
        next.infantsWithoutSeat = Math.min(
          next.infantsWithoutSeat,
          Math.max(0, availableForChildrenAndInfants - next.children),
        )
      }

      next.infantsWithoutSeat = Math.min(next.infantsWithoutSeat, next.adults)

      return next
    })
  }

  const handleHotelFieldChange = <K extends keyof HotelFormState>(
    field: K,
    value: HotelFormState[K],
  ) => {
    setHotelForm((prev) => {
      const next = { ...prev, [field]: value }

      if (field === 'adults') {
        next.adults = clampInteger(Number(value), 1, MAX_TRIP_PEOPLE)
      }

      if (field === 'children') {
        next.children = clampInteger(Number(value), 0, MAX_TRIP_PEOPLE)
      }

      if (field === 'rooms') {
        next.rooms = clampInteger(Number(value), 1, MAX_HOTEL_ROOMS)
      }

      if (field === 'checkIn') {
        const { min, max } = getEndDateWindow(String(value), currentGroup)
        if (!next.checkOut || next.checkOut < min) next.checkOut = min
        if (next.checkOut > max) next.checkOut = max
      }

      if (field === 'checkOut') {
        const { min, max } = getEndDateWindow(next.checkIn, currentGroup)
        if (String(value) < min) next.checkOut = min
        if (String(value) > max) next.checkOut = max
      }

      if (next.adults + next.children > MAX_TRIP_PEOPLE) {
        next.children = Math.max(0, MAX_TRIP_PEOPLE - next.adults)
      }

      next.rooms = Math.min(next.rooms, next.adults)
      next.childrenAges = Array.from(
        { length: next.children },
        (_, index) => next.childrenAges[index] ?? null,
      )

      return next
    })
  }

  const validateHotelForm = () => {
    const destination =
      hotelForm.destination.trim() ||
      currentGroup?.destino_formatted_address ||
      currentGroup?.destino ||
      ''

    if (
      !destination &&
      !currentGroup?.destino_latitud &&
      !currentGroup?.destino_longitud
    ) {
      throw new Error(
        'Captura un destino o selecciona un viaje con destino configurado.',
      )
    }

    if (!hotelForm.checkIn) {
      throw new Error('Selecciona una fecha de check-in.')
    }

    if (!hotelForm.checkOut) {
      throw new Error('Selecciona una fecha de check-out.')
    }

    if (
      hotelForm.checkIn < startDateWindow.startMin ||
      hotelForm.checkIn > startDateWindow.startMax
    ) {
      throw new Error(
        `El check-in debe estar entre ${startDateWindow.startMin} y ${startDateWindow.startMax}.`,
      )
    }

    if (
      hotelForm.checkOut < hotelCheckoutWindow.min ||
      hotelForm.checkOut > hotelCheckoutWindow.max
    ) {
      throw new Error(
        `El check-out debe estar entre ${hotelCheckoutWindow.min} y ${hotelCheckoutWindow.max}.`,
      )
    }

    if (
      hotelForm.childrenAges.length !== hotelForm.children ||
      hotelForm.childrenAges.some(
        (age) => age == null || !Number.isInteger(age) || age < 0 || age > 17,
      )
    )
      throw new Error('Indica la edad real de cada menor (0 a 17 años).')
    const adults = clampInteger(hotelForm.adults, 1, MAX_TRIP_PEOPLE)
    const children = clampInteger(hotelForm.children, 0, MAX_TRIP_PEOPLE)
    const rooms = clampInteger(hotelForm.rooms, 1, MAX_HOTEL_ROOMS)
    const guests = adults + children

    if (guests > MAX_TRIP_PEOPLE) {
      throw new Error(
        `La búsqueda permite máximo ${MAX_TRIP_PEOPLE} huéspedes en total.`,
      )
    }

    if (rooms > adults) {
      throw new Error(
        'El número de habitaciones no puede ser mayor que el número de adultos, porque cada habitación requiere al menos un adulto.',
      )
    }

    return {
      ...hotelForm,
      destination,
      adults,
      children,
      rooms,
    }
  }

  const resolveFlightAirport = async (field: 'origin' | 'destination') => {
    const rawValue = flightForm[field].trim()
    if (!rawValue) return ''
    if (isIataCode(rawValue)) return rawValue.toUpperCase()

    if (!accessToken)
      throw new Error('Inicia sesión para consultar aeropuertos.')

    const response = await flightsService.resolveAirport(
      {
        q: rawValue,
        latitude:
          field === 'destination'
            ? (currentGroup?.destino_latitud ?? undefined)
            : undefined,
        longitude:
          field === 'destination'
            ? (currentGroup?.destino_longitud ?? undefined)
            : undefined,
        max: 8,
      },
      accessToken,
    )

    return response.data.code
  }

  const normalizeAirportField = async (field: 'origin' | 'destination') => {
    const raw = flightForm[field]
    try {
      const code = await resolveFlightAirport(field)
      if (code)
        setFlightForm((prev) =>
          prev[field] === raw ? { ...prev, [field]: code } : prev,
        )
    } catch {
      setAirportErrors((prev) => ({
        ...prev,
        [field]:
          'No se pudo resolver el aeropuerto. Selecciona una opción o escribe su código IATA.',
      }))
    }
  }

  const validateFlightForm = async () => {
    const origin = await resolveFlightAirport('origin')
    const destination = await resolveFlightAirport('destination')

    if (origin.length !== 3 || destination.length !== 3) {
      throw new Error(
        'Origen y destino deben resolverse a códigos IATA de 3 letras. Ejemplo: Acapulco → ACA.',
      )
    }

    if (origin === destination) {
      throw new Error('El origen y el destino no pueden ser iguales.')
    }

    if (!flightForm.departureDate) {
      throw new Error('Selecciona una fecha de salida.')
    }

    if (
      flightForm.departureDate < startDateWindow.startMin ||
      flightForm.departureDate > startDateWindow.startMax
    ) {
      throw new Error(
        `La fecha de salida debe estar entre ${startDateWindow.startMin} y ${startDateWindow.startMax}.`,
      )
    }

    if (!flightForm.returnDate) {
      throw new Error('Selecciona una fecha de regreso.')
    }

    if (
      flightForm.returnDate < flightReturnWindow.min ||
      flightForm.returnDate > flightReturnWindow.max
    ) {
      throw new Error(
        `La fecha de regreso debe estar entre ${flightReturnWindow.min} y ${flightReturnWindow.max}.`,
      )
    }

    const adults = clampInteger(flightForm.adults, 1, MAX_TRIP_PEOPLE)
    const children = clampInteger(flightForm.children, 0, MAX_TRIP_PEOPLE)
    const infantsWithoutSeat = clampInteger(
      flightForm.infantsWithoutSeat,
      0,
      MAX_TRIP_PEOPLE,
    )
    const totalPassengers = adults + children + infantsWithoutSeat

    if (infantsWithoutSeat > adults) {
      throw new Error('No puede haber más infantes sin asiento que adultos.')
    }

    if (totalPassengers > MAX_TRIP_PEOPLE) {
      throw new Error(
        `La búsqueda permite máximo ${MAX_TRIP_PEOPLE} pasajeros en total.`,
      )
    }

    setFlightForm((prev) => ({
      ...prev,
      origin,
      destination,
      adults,
      children,
      infantsWithoutSeat,
    }))

    return {
      ...flightForm,
      origin,
      destination,
      adults,
      children,
      infantsWithoutSeat,
    }
  }

  const handleSearch = async () => {
    if (isSearchDisabled) return
    const version = ++requestVersion.current
    const current = () => version === requestVersion.current
    setErrorMessage(null)
    setOperationError(null)
    setHistoryWarning(false)
    setPrebookWarning(false)
    setFailureTitle('')
    setFilters({ ...EMPTY_FILTERS })
    setSort('recommended')
    setViewState('loading')

    if (activeTab === 'hotels') {
      try {
        if (!accessToken) {
          throw new Error(
            'Tu sesión no está disponible. Inicia sesión de nuevo.',
          )
        }

        const validatedForm = validateHotelForm()
        setViewState('loading')
        if (!current()) return
        setLastHotelSearch(validatedForm)

        const response = await withSearchTimeout(
          hotelsService.search(
            {
              destination: validatedForm.destination,
              ...hotelLocationParams(validatedForm.destination, currentGroup),
              checkIn: validatedForm.checkIn,
              checkOut: validatedForm.checkOut,
              adults: validatedForm.adults,
              childrenAges: validatedForm.childrenAges.map((age) =>
                Number(age),
              ),
              rooms: validatedForm.rooms,
              currency: validatedForm.currency,
              guestNationality: 'MX',
              countryCode: 'MX',
              limit: 12,
              radius: 20000,
            },
            accessToken,
          ),
          45000,
        )

        if (!current()) return
        setHotels(
          (response.data ?? []).map((hotel) => ({ ...hotel, proposed: false })),
        )
        setViewState('results')
      } catch (error) {
        if (!current()) return
        setFailureTitle(searchFailure(error).title)
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No pudimos cargar los hospedajes.',
        )
        setViewState('error')
      }
      return
    }

    try {
      if (!accessToken) {
        throw new Error('Tu sesión no está disponible. Inicia sesión de nuevo.')
      }

      const validatedForm = await validateFlightForm()
      setViewState('loading')
      if (!current()) return
      setLastFlightSearch(validatedForm)

      const response = await withSearchTimeout(
        flightsService.search(
          {
            origin: validatedForm.origin,
            destination: validatedForm.destination,
            departureDate: validatedForm.departureDate,
            returnDate: validatedForm.returnDate || undefined,
            adults: validatedForm.adults,
            children: validatedForm.children,
            infantsWithoutSeat: validatedForm.infantsWithoutSeat,
            cabinClass: validatedForm.cabinClass,
            max: 20,
          },
          accessToken,
        ),
        45000,
      )

      if (!current()) return
      setFlights(
        sortFlightOffers(response.data ?? []).map((flight) => ({
          ...flight,
          proposed: false,
        })),
      )
      setViewState('results')
    } catch (error) {
      if (!current()) return
      setFailureTitle(searchFailure(error).title)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No pudimos cargar los vuelos.',
      )
      setViewState('error')
    }
  }

  const handleTabChange = (tab: SearchTab) => {
    if (tab === activeTab) return
    requestVersion.current++
    navigate(
      travelPath('/search/flights-hotels', currentGroup?.id, { mode: tab }),
      { state: { group: currentGroup } },
    )
  }

  const toggleFlight = async (flight: Flight) => {
    if (flight.proposed || pendingSaves.current.has('flight:' + flight.id))
      return
    if (!canPropose || !currentGroup?.id || !accessToken) {
      setOperationError(
        disabledReason || 'Inicia sesión para guardar la propuesta.',
      )
      return
    }
    const issue = flightProposalIssue(flight)
    if (issue) {
      setOperationError(issue)
      return
    }
    pendingSaves.current.add('flight:' + flight.id)
    setOperationError(null)
    setHistoryWarning(false)
    try {
      setFlights((prev) =>
        prev.map((item) =>
          item.id === flight.id ? { ...item, saving: true } : item,
        ),
      )

      const outboundRoute = getPrimaryRoute(flight)
      const title =
        `${flight.airline ?? 'Vuelo'} ${flight.flightNumber ?? ''} ${outboundRoute.origin ?? ''} → ${outboundRoute.destination ?? ''}`.trim()
      const description = [
        flight.fareBrand ? `Tarifa ${flight.fareBrand}` : null,
        `${flight.passengers.adults} adulto(s)`,
        flight.passengers.children
          ? `${flight.passengers.children} niño(s)`
          : null,
        flight.passengers.infantsWithoutSeat
          ? `${flight.passengers.infantsWithoutSeat} infante(s) sin asiento`
          : null,
      ]
        .filter(Boolean)
        .join(' · ')

      await proposalsService.saveFlightProposal(
        {
          grupoId: String(currentGroup.id),
          fuente: 'duffel',
          titulo: title,
          descripcion: description,
          payload: {
            provider: 'duffel',
            offerId: flight.id,
            liveMode: flight.liveMode,
            search: lastFlightSearch,
            passengers: flight.passengers,
            normalizedOffer: flight,
            imageUrl: getFlightImageUrl(flight),
          },
          vuelo: {
            aerolinea: flight.airline ?? 'Aerolínea no disponible',
            numeroVuelo: flight.flightNumber,
            origenCodigo: flight.origin ?? '',
            origenNombre: flight.originName,
            destinoCodigo: flight.destination ?? '',
            destinoNombre: flight.destinationName,
            salida: flight.departureAt!,
            llegada: flight.arrivalAt!,
            duracion: flight.duration,
            precio: flight.price!,
            moneda: flight.currency!,
            escalas: flight.stops,
            payload: {
              raw: flight.raw,
              normalizedOffer: flight,
              outboundSlice: flight.outboundSlice,
              returnSlice: flight.returnSlice,
              imageUrl: getFlightImageUrl(flight),
            },
          },
        },
        accessToken,
      )

      await searchHistoryService
        .save(
          {
            grupoId: String(currentGroup.id),
            tipo: 'vuelo',
            fuente: 'duffel',
            titulo: title,
            descripcion: description,
            searchPayload: lastFlightSearch,
            resultPayload: {
              provider: 'duffel',
              offerId: flight.id,
              liveMode: flight.liveMode,
              passengers: flight.passengers,
              normalizedOffer: flight,
              imageUrl: getFlightImageUrl(flight),
            },
          },
          accessToken,
        )
        .catch((error) => {
          setHistoryWarning(true)
          console.error(
            'No se pudo registrar historial de búsqueda de vuelo:',
            error,
          )
        })

      setFlights((prev) =>
        prev.map((item) =>
          item.id === flight.id
            ? { ...item, proposed: true, saving: false }
            : item,
        ),
      )
    } catch (error) {
      setFlights((prev) =>
        prev.map((item) =>
          item.id === flight.id ? { ...item, saving: false } : item,
        ),
      )
      setOperationError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la propuesta de vuelo.',
      )
    } finally {
      pendingSaves.current.delete('flight:' + flight.id)
    }
  }

  const toggleHotel = async (hotel: Hotel) => {
    if (hotel.proposed || pendingSaves.current.has('hotel:' + hotel.id)) return
    if (!canPropose || !currentGroup?.id || !accessToken) {
      setOperationError(
        disabledReason || 'Inicia sesión para guardar la propuesta.',
      )
      return
    }
    const issue = hotelProposalIssue(hotel)
    if (issue) {
      setOperationError(issue)
      return
    }
    pendingSaves.current.add('hotel:' + hotel.id)
    setOperationError(null)
    setHistoryWarning(false)
    setPrebookWarning(false)
    try {
      setHotels((prev) =>
        prev.map((item) =>
          item.id === hotel.id ? { ...item, saving: true } : item,
        ),
      )

      const prebookResponse = hotel.offerId
        ? await withSearchTimeout(
            hotelsService.prebook(hotel.offerId, accessToken),
            20000,
          ).catch(() => null)
        : null

      const title = `${hotel.name} · ${hotel.roomName ?? 'Habitación disponible'}`
      const description = [
        hotel.address,
        `${hotel.nights} noche(s)`,
        `${lastHotelSearch?.adults ?? hotelForm.adults} adulto(s)`,
        (lastHotelSearch?.children ?? hotelForm.children) > 0
          ? `${lastHotelSearch?.children ?? hotelForm.children} niño(s)`
          : null,
        `${lastHotelSearch?.rooms ?? hotelForm.rooms} habitación(es)`,
        hotel.boardName,
      ]
        .filter(Boolean)
        .join(' · ')

      await proposalsService.saveHotelProposal(
        {
          grupoId: String(currentGroup.id),
          fuente: 'liteapi',
          titulo: title,
          descripcion: description,
          payload: {
            provider: 'liteapi',
            search: lastHotelSearch,
            normalizedOffer: hotel,
            offerId: hotel.offerId,
            prebook: prebookResponse?.data ?? null,
            googlePlaceId: hotel.googlePlaceId,
            photoUrl: hotel.photoUrl,
            reservaSimulada: {
              status: 'PENDING_GROUP_APPROVAL',
              paymentStatus: 'not_started',
            },
          },
          hospedaje: {
            nombre: hotel.name,
            proveedor: hotel.supplier ?? 'liteapi',
            referenciaExterna: hotel.offerId ?? hotel.hotelId,
            direccion: hotel.address,
            latitud: hotel.latitude,
            longitud: hotel.longitude,
            checkIn: hotel.checkIn,
            checkOut: hotel.checkOut,
            precioTotal: hotel.price,
            moneda: hotel.currency!,
            calificacion: hotel.rating,
            liteapiHotelId: hotel.hotelId,
            liteapiOfferId: hotel.offerId,
            liteapiPrebookId: prebookResponse?.data?.prebookId
              ? String(prebookResponse.data.prebookId)
              : null,
            googlePlaceId: hotel.googlePlaceId,
            fotoUrl: hotel.photoUrl,
            reservaEstado: 'pendiente',
            reservaSimuladaPayload: {
              status: 'PENDING_GROUP_APPROVAL',
              paymentStatus: 'not_started',
              source: 'liteapi_sandbox_search',
            },
            payload: {
              raw: hotel.raw,
              normalizedOffer: hotel,
              prebook: prebookResponse?.data ?? null,
              photoUrl: hotel.photoUrl,
              googlePlaceId: hotel.googlePlaceId,
              rooms: hotel.rooms,
            },
          },
        },
        accessToken,
      )

      if (hotel.offerId && !prebookResponse) setPrebookWarning(true)
      await searchHistoryService
        .save(
          {
            grupoId: String(currentGroup.id),
            tipo: 'hospedaje',
            fuente: 'liteapi',
            titulo: title,
            descripcion: description,
            searchPayload: lastHotelSearch,
            resultPayload: {
              provider: 'liteapi',
              offerId: hotel.offerId,
              prebook: prebookResponse?.data ?? null,
              normalizedOffer: hotel,
              googlePlaceId: hotel.googlePlaceId,
              photoUrl: hotel.photoUrl,
            },
          },
          accessToken,
        )
        .catch((error) => {
          setHistoryWarning(true)
          console.error(
            'No se pudo registrar historial de búsqueda de hospedaje:',
            error,
          )
        })

      setHotels((prev) =>
        prev.map((item) =>
          item.id === hotel.id
            ? { ...item, proposed: true, saving: false }
            : item,
        ),
      )
    } catch (error) {
      setHotels((prev) =>
        prev.map((item) =>
          item.id === hotel.id ? { ...item, saving: false } : item,
        ),
      )
      setOperationError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la propuesta de hospedaje.',
      )
    } finally {
      pendingSaves.current.delete('hotel:' + hotel.id)
    }
  }

  const visibleFlights = useMemo(
    () => filterFlights(flights, filters, sort),
    [flights, filters, sort],
  )
  const visibleHotels = useMemo(
    () => filterHotels(hotels, filters, sort),
    [hotels, filters, sort],
  )
  const offers = activeTab === 'flights' ? flights : hotels
  const units = currencies(offers)
  const resultCount =
    activeTab === 'flights' ? visibleFlights.length : visibleHotels.length
  const savedCount =
    flights.filter((f) => f.proposed).length +
    hotels.filter((h) => h.proposed).length
  const validation =
    activeTab === 'flights' ? flightValidationMessage : hotelValidationMessage
  const openCompare = () => {
    setSelectedHotel(null)
    navigate(travelPath('/dashboard', currentGroup?.id, { tab: 'comparar' }), {
      state: {
        group: currentGroup,
        groupId: currentGroup?.id,
        activeTab: 'comparar',
      },
    })
  }
  const summary =
    activeTab === 'flights' && lastFlightSearch
      ? `${lastFlightSearch.origin} → ${lastFlightSearch.destination} · ${lastFlightSearch.departureDate} — ${lastFlightSearch.returnDate} · ${lastFlightSearch.adults + lastFlightSearch.children + lastFlightSearch.infantsWithoutSeat} pasajero(s)`
      : activeTab === 'hotels' && lastHotelSearch
        ? `${lastHotelSearch.destination} · ${lastHotelSearch.checkIn} — ${lastHotelSearch.checkOut} · ${lastHotelSearch.adults + lastHotelSearch.children} huésped(es) · ${lastHotelSearch.rooms} habitación(es)`
        : ''
  const focusForm = () => {
    document
      .getElementById('atlas-search-form')
      ?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      })
    document
      .getElementById(
        activeTab === 'flights' ? 'atlas-origin' : 'atlas-hotel-destination',
      )
      ?.focus()
  }

  return (
    <div className="atlas-search-page">
      <header className="atlas-search-heading">
        <div>
          <p className="atlas-eyebrow">
            EXPLORAR / {activeTab === 'flights' ? 'EL TRAYECTO' : 'LA ESTANCIA'}
          </p>
          <h1>
            {activeTab === 'flights' ? (
              <>
                El viaje comienza
                <br />
                <em>antes de llegar.</em>
              </>
            ) : (
              <>
                Encuentra un lugar
                <br />
                <em>para hacer recuerdos.</em>
              </>
            )}
          </h1>
          <p>
            {currentGroup
              ? `Opciones para ${currentGroup.nombre}. Explora, compara y decide con tu grupo.`
              : 'Explora opciones. Elige un viaje para guardarlas como propuestas.'}
          </p>
        </div>
        <div className="atlas-search-heading-note">
          <span>
            {activeTab === 'flights' ? '01 / VUELOS' : '02 / HOTELES'}
          </span>
          <p>
            {activeTab === 'flights'
              ? 'Elige cómo llegar.\nEl resto de la historia es tuyo.'
              : 'Una buena estancia\ntambién es parte del viaje.'}
          </p>
          <small>
            {activeTab === 'flights'
              ? 'Búsqueda con Duffel'
              : 'Búsqueda con LiteAPI'}
          </small>
        </div>
      </header>
      <div
        className="atlas-search-mode"
        role="group"
        aria-label="Tipo de búsqueda"
      >
        <button
          type="button"
          aria-pressed={activeTab === 'flights'}
          onClick={() => handleTabChange('flights')}
        >
          Vuelos
        </button>
        <button
          type="button"
          aria-pressed={activeTab === 'hotels'}
          onClick={() => handleTabChange('hotels')}
        >
          Hoteles
        </button>
        <p>Proponer una opción no reserva ni cobra.</p>
      </div>
      {readOnly && (
        <p className="atlas-search-notice" role="status">
          Este viaje está en modo lectura o sus fechas ya pasaron. Puedes
          consultar sus propuestas desde el itinerario y el comparador.
        </p>
      )}
      {!online && (
        <p className="atlas-search-notice" role="status">
          Sin conexión. Puedes ajustar el formulario; reconecta para buscar y
          guardar propuestas.
        </p>
      )}
      <form
        id="atlas-search-form"
        className="atlas-search-form"
        onSubmit={(e) => {
          e.preventDefault()
          void handleSearch()
        }}
        aria-label={
          activeTab === 'flights' ? 'Buscar vuelos' : 'Buscar hoteles'
        }
        aria-busy={viewState === 'loading'}
      >
        <fieldset disabled={viewState === 'loading'}>
          <legend className="sr-only">
            {activeTab === 'flights'
              ? 'Datos del vuelo'
              : 'Datos de la estancia'}
          </legend>
          <SearchForms
            kind={activeTab}
            flight={flightForm}
            hotel={hotelForm}
            startWindow={startDateWindow}
            returnWindow={flightReturnWindow}
            checkoutWindow={hotelCheckoutWindow}
            airportOptions={airportOptions}
            airportLoading={airportLoading}
            airportErrors={airportErrors}
            onFlightChange={handleFlightFieldChange}
            onHotelChange={handleHotelFieldChange}
            onAirportBlur={(field) => void normalizeAirportField(field)}
          />
        </fieldset>
        <div className="atlas-search-submit">
          <p id="atlas-search-validation" aria-live="polite">
            {readOnly
              ? 'Las búsquedas de este viaje están deshabilitadas.'
              : validation ||
                'Fechas y viajeros listos. Los precios se consultan al buscar.'}
          </p>
          <button
            className="atlas-button atlas-button-primary"
            type="submit"
            disabled={isSearchDisabled}
            aria-describedby="atlas-search-validation"
          >
            {viewState === 'loading'
              ? `Buscando ${activeTab === 'flights' ? 'vuelos' : 'hoteles'}…`
              : `Buscar ${activeTab === 'flights' ? 'vuelos' : 'hoteles'}`}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </form>
      {operationError && (
        <div className="atlas-search-operation-error" role="alert">
          <p>No se guardó la propuesta: {operationError}</p>
          <button
            className="atlas-text-link"
            type="button"
            onClick={() => setOperationError(null)}
          >
            Cerrar aviso
          </button>
        </div>
      )}
      {prebookWarning && (
        <p className="atlas-search-notice" role="status">
          La propuesta se guardó para revisión, pero no se pudo verificar la
          pre-reserva con el proveedor. No hay reserva confirmada.
        </p>
      )}
      {historyWarning && (
        <p className="atlas-search-notice" role="status">
          La propuesta sí quedó guardada, pero no se pudo registrar en el
          historial de búsqueda. Puedes consultarla en el comparador.
        </p>
      )}
      {savedCount > 0 && (
        <aside
          className="atlas-saved-strip"
          aria-label="Alternativas guardadas"
        >
          <div>
            <strong>
              {savedCount} alternativa(s) guardada(s) en esta búsqueda
            </strong>
            <p>Ya son propuestas del viaje para comparar, comentar y votar.</p>
          </div>
          <button
            className="atlas-button atlas-button-secondary"
            onClick={openCompare}
          >
            Comparar propuestas ↗
          </button>
        </aside>
      )}
      <section
        className="atlas-search-output"
        aria-label="Resultados de búsqueda"
      >
        {viewState === 'initial' && (
          <div className="atlas-search-intro">
            <p className="atlas-eyebrow">UN VIAJE, MUCHAS POSIBILIDADES</p>
            <h2>
              {activeTab === 'flights'
                ? 'La mejor ruta empieza con una búsqueda.'
                : 'Elige dónde despertar.'}
            </h2>
            <p>
              {activeTab === 'flights'
                ? 'Ajusta origen, destino y viajeros para ver horarios y tarifas del proveedor.'
                : 'Selecciona destino, fechas y huéspedes para consultar estancias y habitaciones.'}
            </p>
            <span className="atlas-search-intro-mark" aria-hidden="true">
              I.
            </span>
          </div>
        )}
        {viewState === 'loading' && <SearchSkeleton kind={activeTab} />}
        {viewState === 'error' && (
          <div className="atlas-search-state atlas-search-error" role="alert">
            <p className="atlas-eyebrow">BÚSQUEDA NO COMPLETADA</p>
            <h2>{failureTitle || 'No pudimos consultar las opciones'}</h2>
            <p>{errorMessage}</p>
            <button
              className="atlas-button atlas-button-primary"
              disabled={isSearchDisabled}
              onClick={() => void handleSearch()}
            >
              Reintentar búsqueda
            </button>
            <button
              className="atlas-button atlas-button-quiet"
              onClick={focusForm}
            >
              Revisar formulario
            </button>
          </div>
        )}
        {viewState === 'results' && (
          <>
            <header className="atlas-results-heading">
              <div>
                <p className="atlas-eyebrow">
                  {activeTab === 'flights'
                    ? 'OPCIONES PARA LLEGAR'
                    : 'OPCIONES PARA QUEDARTE'}
                </p>
                <h2>
                  {offers.length === 0
                    ? 'Sin opciones para esta búsqueda'
                    : `${resultCount} ${activeTab === 'flights' ? 'vuelo(s)' : 'hotel(es)'} para explorar`}
                </h2>
                <p>{summary}</p>
              </div>
              <button className="atlas-text-link" onClick={focusForm}>
                Editar búsqueda ↗
              </button>
            </header>
            {offers.length > 0 ? (
              <div className="atlas-search-results-layout">
                <SearchFilters
                  kind={activeTab}
                  filters={filters}
                  onChange={setFilters}
                  onReset={() => {
                    setFilters({ ...EMPTY_FILTERS })
                    setSort('recommended')
                  }}
                  units={units}
                  airlines={[
                    ...new Set(
                      flights
                        .map((f) => f.airline)
                        .filter((airline): airline is string =>
                          Boolean(airline),
                        ),
                    ),
                  ].sort()}
                  sort={sort}
                  onSort={setSort}
                />
                <div className="atlas-results-list">
                  <p className="atlas-results-caption" role="status">
                    {resultCount} de {offers.length} opciones recibidas.{' '}
                    {activeTab === 'flights'
                      ? 'Precios totales para los pasajeros consultados.'
                      : 'Precios y condiciones tal como los informa el proveedor.'}
                  </p>
                  {resultCount === 0 ? (
                    <div className="atlas-search-state">
                      <h3>Ninguna opción coincide con estos filtros</h3>
                      <p>
                        La búsqueda sí devolvió resultados. Prueba una selección
                        más amplia.
                      </p>
                      <button
                        className="atlas-button atlas-button-secondary"
                        onClick={() => setFilters({ ...EMPTY_FILTERS })}
                      >
                        Quitar filtros
                      </button>
                    </div>
                  ) : activeTab === 'flights' ? (
                    visibleFlights.map((flight) => (
                      <FlightResult
                        key={flight.id}
                        flight={flight}
                        canPropose={canPropose}
                        disabledReason={disabledReason}
                        onPropose={() => void toggleFlight(flight)}
                        onCompare={openCompare}
                      />
                    ))
                  ) : (
                    visibleHotels.map((hotel) => (
                      <HotelResult
                        key={hotel.id}
                        hotel={hotel}
                        canPropose={canPropose}
                        disabledReason={disabledReason}
                        onPropose={() => void toggleHotel(hotel)}
                        onCompare={openCompare}
                        onDetails={() => setSelectedHotel(hotel)}
                      />
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="atlas-search-state">
                <h3>
                  {activeTab === 'flights'
                    ? 'No se recibieron vuelos'
                    : 'No se recibieron hoteles'}
                </h3>
                <p>
                  Prueba otras fechas o ajusta el destino y los viajeros. Amplía
                  el destino o prueba otro intervalo para consultar nuevas
                  opciones.
                </p>
                <button
                  className="atlas-button atlas-button-secondary"
                  onClick={focusForm}
                >
                  Modificar búsqueda
                </button>
              </div>
            )}
          </>
        )}
      </section>
      <footer className="atlas-search-footer">
        <p>
          La disponibilidad y las tarifas pueden cambiar. Guardar una propuesta
          permite revisarla con tu grupo; no confirma una compra o reserva.
        </p>
        <p>
          Las compras y reservas en esta versión son <strong>simuladas</strong>.
          Las ofertas de prueba de Duffel se identifican en cada resultado.
        </p>
      </footer>
      {selectedHotel && (
        <HotelDetails
          hotel={selectedHotel}
          canPropose={canPropose}
          disabledReason={disabledReason}
          onClose={() => setSelectedHotel(null)}
          onPropose={() => void toggleHotel(selectedHotel)}
          onCompare={openCompare}
        />
      )}
    </div>
  )
}

const FlightHotelSearchPage = () => {
  const { localUser } = useAuth()
  const { search } = useLocation()
  const { group, groupId, loading, error, retry } = useSearchTrip()
  const navigate = useNavigate()
  return (
    <SearchIntegratedShell
      group={group}
      user={{
        name: localUser?.nombre || localUser?.email || 'Usuario',
        role: group?.myRole === 'admin' ? 'Organizador' : 'Viajero',
        initials: (localUser?.nombre || localUser?.email || 'U')
          .slice(0, 2)
          .toUpperCase(),
        color: '#4B2FA3',
      }}
    >
      {loading ? (
        <div className="atlas-search-page">
          <SearchSkeleton kind="flights" />
        </div>
      ) : error ? (
        <div className="atlas-search-page atlas-search-state" role="alert">
          <p className="atlas-eyebrow">CONTEXTO DEL VIAJE</p>
          <h1>No pudimos verificar el viaje</h1>
          <p>{error}</p>
          <button className="atlas-button atlas-button-primary" onClick={retry}>
            Reintentar
          </button>
          <button
            className="atlas-button atlas-button-quiet"
            onClick={() => navigate('/my-trips')}
          >
            Ir a Mis viajes
          </button>
        </div>
      ) : (
        <SearchExperience
          key={`${groupId || 'sin-grupo'}:${new URLSearchParams(search).get('mode') || 'flights'}`}
          currentGroup={group}
        />
      )}
    </SearchIntegratedShell>
  )
}

export default FlightHotelSearchPage
