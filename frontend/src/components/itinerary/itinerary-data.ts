import type { Activity } from '../ui/DayView/DayView'

// Los días del viaje son fechas civiles; no se convierten a la zona del equipo.
export function itineraryDate(
  start: string | null | undefined,
  day: number,
): string | null {
  const key = start?.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (!key || !Number.isSafeInteger(day) || day < 1) return null
  const date = new Date(key + 'T12:00:00Z')
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== key
  )
    return null
  date.setUTCDate(date.getUTCDate() + day - 1)
  return date.toISOString().slice(0, 10)
}
export function calendarLabel(key?: string | null, weekday = false) {
  if (!key) return ''
  const date = new Date(key + 'T12:00:00Z')
  if (!Number.isFinite(date.getTime())) return ''
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    ...(weekday ? { weekday: 'short' as const } : { year: 'numeric' as const }),
    timeZone: 'UTC',
  }).format(date)
}
export function validCoordinates(
  activity: Pick<Activity, 'latitude' | 'longitude'>,
) {
  const { latitude: lat, longitude: lng } = activity
  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180
  )
}
function labelMinutes(label?: string) {
  const m = label?.match(
    /^(\d{1,2}):([0-5]\d)\s*(am|pm|a\.?\s*m\.?|p\.?\s*m\.?)?/i,
  )
  if (!m) return null
  let h = Number(m[1])
  const meridian = m[3]?.replace(/[.\s]/g, '').toLowerCase()
  if (meridian && (h < 1 || h > 12)) return null
  if (meridian === 'pm' && h < 12) h += 12
  if (meridian === 'am' && h === 12) h = 0
  return h < 24 ? h * 60 + Number(m[2]) : null
}
export function clock(value?: string | null, subgroup = false): string | null {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
    !Number.isFinite(new Date(value).getTime())
  )
    return null
  // Subgrupos ya utiliza America/Mexico_City en sus contratos de presentación.
  if (subgroup || /(?:Z|[+-]\d{2}:\d{2})$/i.test(value))
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'America/Mexico_City',
    }).format(new Date(value))
  return value.match(/T([0-2]\d:[0-5]\d)/)?.[1] ?? null
}
export function activityClock(activity: Activity) {
  const start = clock(activity.startsAt, activity.kind === 'subgroup-slot')
  const minutes = labelMinutes(activity.time)
  const label =
    minutes == null
      ? null
      : `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  return label ?? start
}
export function timeRange(activity: Activity) {
  const start = activityClock(activity),
    end = clock(activity.endsAt, activity.kind === 'subgroup-slot')
  return {
    start,
    end:
      end &&
      (!activity.startsAt ||
        Date.parse(activity.endsAt || '') !== Date.parse(activity.startsAt))
        ? end
        : null,
  }
}
export function orderedActivities(activities: Activity[]) {
  return [...activities].sort((a, b) => {
    const minutes = (p: Activity) =>
      labelMinutes(activityClock(p) ?? '') ?? Infinity
    const x = minutes(a),
      y = minutes(b)
    return x === y ? 0 : x - y
  })
}
// Guía visual, no nueva validación ni resolución automática. El servidor decide al guardar.
export function scheduleConflicts(activities: Activity[]) {
  const ids = new Set<string>()
  const period = (a: Activity) => {
    const s = a.startsAt ? Date.parse(a.startsAt) : NaN,
      e = a.endsAt ? Date.parse(a.endsAt) : NaN
    const start = Number.isFinite(s) ? s : labelMinutes(a.time)
    return {
      start,
      end: Number.isFinite(e) && Number.isFinite(s) && e > s ? e : null,
      absolute: Number.isFinite(s),
    }
  }
  for (let i = 0; i < activities.length; i++)
    for (let j = i + 1; j < activities.length; j++) {
      const a = period(activities[i]),
        b = period(activities[j])
      if (a.start == null || b.start == null) continue
      const sameClock =
        activityClock(activities[i]) &&
        activityClock(activities[i]) === activityClock(activities[j])
      const overlap =
        a.absolute === b.absolute &&
        a.end != null &&
        b.end != null &&
        a.start < b.end &&
        b.start < a.end
      if (sameClock || overlap) {
        ids.add(activities[i].id)
        ids.add(activities[j].id)
      }
    }
  return ids
}
export function activityPermissions(
  a: Activity,
  userId?: string | number | null,
  role?: string | null,
  now = Date.now(),
) {
  const owner = Boolean(
    userId != null &&
    a.createdBy != null &&
    String(userId) === String(a.createdBy),
  )
  const admin = role === 'admin' || role === 'organizador'
  const expired =
    a.status === 'pendiente' &&
    Boolean(a.startsAt) &&
    Date.parse(a.startsAt!) < now
  return {
    edit: a.kind !== 'subgroup-slot' && (expired ? admin : owner),
    delete: a.kind !== 'subgroup-slot' && !expired && (owner || admin),
    expired,
  }
}
export function mapUrl(a: Activity, route = false) {
  if (!validCoordinates(a)) return null
  const destination = encodeURIComponent(`${a.latitude},${a.longitude}`)
  return route
    ? `https://www.google.com/maps/dir/?api=1&destination=${destination}`
    : `https://www.google.com/maps/search/?api=1&query=${destination}`
}
export function activityTimestamp(
  date: string,
  time: string,
  original?: string | null,
) {
  if (!itineraryDate(date, 1) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    return null
  if (
    original &&
    clock(original) === time &&
    dateInItineraryZone(original) === date
  )
    return original
  const zone = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    timeZoneName: 'longOffset',
  })
    .formatToParts(new Date(`${date}T12:00:00Z`))
    .find((p) => p.type === 'timeZoneName')?.value
  const offset = zone === 'GMT' ? '+00:00' : zone?.replace('GMT', '')
  if (!offset || !/^[-+]\d{2}:\d{2}$/.test(offset)) return null
  return `${date}T${time}:00${offset}`
}
export function dateInItineraryZone(value: string) {
  if (!Number.isFinite(Date.parse(value))) return null
  if (!/(Z|[-+]\d{2}:\d{2})$/i.test(value)) return value.slice(0, 10)
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value))
  const parts = Object.fromEntries(p.map((x) => [x.type, x.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
