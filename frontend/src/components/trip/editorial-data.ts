import type { Activity } from '../ui/DayView/DayView'
import type { ItineraryDay } from '../../services/groups'

export function dayDateKey(
  start: string | null | undefined,
  number: number,
): string | null {
  const match = start?.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/)
  if (!match || !Number.isSafeInteger(number) || number < 1) return null
  const date = new Date(`${match[1]}T12:00:00Z`)
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== match[1]
  )
    return null
  date.setUTCDate(date.getUTCDate() + number - 1)
  if (!Number.isFinite(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

export function localDateKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function chooseOverviewDay(
  days: ItineraryDay[],
  selected: number | null,
  start?: string | null,
  today = localDateKey(),
): ItineraryDay | undefined {
  return (
    days.find((day) => day.dayNumber === selected) ??
    days.find((day) => (dayDateKey(start, day.dayNumber) ?? '') >= today) ??
    days[0]
  )
}

export function sortAgenda(activities: Activity[]): Activity[] {
  const minutes = (activity: Activity) => {
    const match = activity.time?.match(/^(\d{1,2}):(\d{2})/)
    if (match && Number(match[1]) < 24 && Number(match[2]) < 60)
      return Number(match[1]) * 60 + Number(match[2])
    const date = new Date(activity.startsAt ?? '')
    return Number.isFinite(date.getTime())
      ? date.getHours() * 60 + date.getMinutes()
      : Infinity
  }
  return [...activities].sort((a, b) => minutes(a) - minutes(b))
}

export function uniqueProposals(days: ItineraryDay[]): Activity[] {
  const seen = new Set<string>()
  return days
    .flatMap((day) => day.activities)
    .filter((activity) => {
      if (!activity.proposalId || activity.kind === 'subgroup-slot')
        return false
      if (seen.has(activity.proposalId)) return false
      seen.add(activity.proposalId)
      return true
    })
}

export function isExpiredProposal(
  activity: Activity,
  now = Date.now(),
): boolean {
  if (activity.status !== 'pendiente' || !activity.startsAt) return false
  const timestamp = new Date(activity.startsAt).getTime()
  return Number.isFinite(timestamp) && timestamp < now
}

export function pendingProposals(
  days: ItineraryDay[],
  now = Date.now(),
): Activity[] {
  return uniqueProposals(days).filter(
    (activity) =>
      activity.status === 'pendiente' && !isExpiredProposal(activity, now),
  )
}

export function formatEditorialDate(value?: string | null): string {
  const key = dayDateKey(value, 1)
  if (!key) return 'Fecha pendiente'
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${key}T12:00:00Z`))
}
