import type { CabinClass } from '../../services/flights'
export interface FlightFormState {
  origin: string
  destination: string
  departureDate: string
  returnDate: string
  adults: number
  children: number
  infantsWithoutSeat: number
  cabinClass: CabinClass
}
export interface HotelFormState {
  destination: string
  checkIn: string
  checkOut: string
  adults: number
  children: number
  childrenAges: Array<number | null>
  rooms: number
  currency: string
}
export interface DateWindow {
  min: string
  max: string
}
