import { useEffect, useRef, useState } from "react";
import type { Group } from "../../../types/groups";
import type { PlaceResult, ComputeRouteResult } from "../../../services/maps";
import { groupsService } from "../../../services/groups";
import { EditorialDialog } from "../../../components/collaboration/EditorialDialog";
import {
  activityTimestamp,
  calendarLabel,
  itineraryDate,
  dateInItineraryZone,
} from "../../../components/itinerary/itinerary-data";
import { withSearchTimeout } from "../search-data";
import { GeoNotice } from "./GeoControls";
import { validateTimeAgainstOpeningHours } from "./geo-data";
export function PlaceProposal({
  place,
  group,
  token,
  online,
  route,
  onClose,
  onSaved,
}: {
  place: PlaceResult;
  group: Group;
  token: string;
  online: boolean;
  route: ComputeRouteResult | null;
  onClose: () => void;
  onSaved: (day: number) => void;
}) {
  const [days, setDays] = useState<Array<{ day: number; date: string }>>([]),
    [day, setDay] = useState(""),
    [time, setTime] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const lock = useRef(false),
    life = useRef(true),
    saved = useRef(new Set<string>());
  useEffect(() => {
    life.current = true;
    return () => {
      life.current = false;
    };
  }, []);
  const today = dateInItineraryZone(new Date().toISOString()) ?? "";
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void withSearchTimeout(
      groupsService.getItinerary(String(group.id), token),
      12000,
    )
      .then((r) => {
        if (!active) return;
        const values = r.days.flatMap((d) => {
          const date = itineraryDate(group.fecha_inicio, d.dayNumber);
          return date ? [{ day: d.dayNumber, date }] : [];
        });
        setDays(values);
        setDay(
          String(
            values.find((d) => d.date >= today)?.day ?? values[0]?.day ?? "",
          ),
        );
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "No se pudo verificar el calendario del viaje.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [group.id, group.fecha_inicio, token, today, retry]);
  const selected = days.find((d) => String(d.day) === day),
    hours = validateTimeAgainstOpeningHours(
      place,
      selected?.date ?? null,
      time,
    );
  const readOnly =
    ["finalizado", "cerrado", "archivado"].includes(group.estado ?? "") ||
    Boolean(group.modulo_itinerario_bloqueado);
  const timestamp = selected && activityTimestamp(selected.date, time);
  const past = Boolean(
    selected &&
    (selected.date < today ||
      (timestamp && Date.parse(timestamp) <= Date.now())),
  );
  const disabled =
    !online ||
    readOnly ||
    loading ||
    saving ||
    !selected ||
    past ||
    !/^([01]\d|2[0-3]):(00|30)$/.test(time) ||
    hours.status === "invalid" ||
    !place.name?.trim();
  const submit = async () => {
    if (disabled || lock.current || !selected) return;
    const signature = `${selected.date}|${time}`;
    if (saved.current.has(signature)) {
      setError(
        "Esta propuesta ya se envió. Consulta el itinerario antes de repetirla.",
      );
      return;
    }
    const timestamp = activityTimestamp(selected.date, time);
    if (!timestamp) {
      setError("No se pudo preparar una fecha y hora válidas.");
      return;
    }
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      await groupsService.createActivity(
        String(group.id),
        {
          titulo: place.name!.trim(),
          descripcion: place.editorialSummary || null,
          ubicacion: place.formattedAddress,
          latitud: place.latitude,
          longitud: place.longitude,
          fecha_inicio: timestamp,
          fecha_fin: timestamp,
          referencia_externa: place.id,
          fuente: "google_maps",
          payload: {
            place,
            route,
            googlePlaceId: place.id,
            photoName: place.photoName ?? null,
            photoUrl: place.photoUrl ?? null,
            imageUrl: place.photoUrl ?? null,
            selectedDay: day,
            selectedTime: time,
          },
        },
        token,
      );
      saved.current.add(signature);
      if (life.current) onSaved(selected.day);
    } catch (e) {
      if (life.current)
        setError(
          e instanceof Error ? e.message : "No se pudo enviar la propuesta.",
        );
    } finally {
      lock.current = false;
      if (life.current) setSaving(false);
    }
  };
  return (
    <EditorialDialog
      title="Proponer lugar al itinerario"
      busy={saving}
      onClose={onClose}
    >
      <form
        className="atlas-geo-proposal"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <p className="atlas-eyebrow">UN LUGAR / UN PLAN PARA EL GRUPO</p>
        <h3>{place.name || "Lugar sin nombre informado"}</h3>
        {place.formattedAddress && <p>{place.formattedAddress}</p>}
        {loading && <p role="status">Verificando días del itinerario…</p>}
        {error && (
          <GeoNotice error>
            {error}
            {days.length === 0 && (
              <button type="button" onClick={() => setRetry((n) => n + 1)}>
                Reintentar calendario
              </button>
            )}
          </GeoNotice>
        )}
        <fieldset disabled={loading || saving || !online || readOnly}>
          <label htmlFor="atlas-place-day">
            Día del viaje
            <select
              id="atlas-place-day"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            >
              {!days.length && (
                <option value="">No se recibieron días válidos</option>
              )}
              {days.map((d) => (
                <option key={d.day} value={d.day} disabled={d.date < today}>
                  Día {d.day} · {calendarLabel(d.date)}
                  {d.date < today ? " · pasado" : ""}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="atlas-place-time">
            Hora de inicio
            <input
              id="atlas-place-time"
              type="time"
              step={1800}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
          <small>Intervalos de 30 minutos · America/Mexico_City.</small>
        </fieldset>
        {past && (
          <GeoNotice>
            Elige una fecha y hora futuras para proponer el lugar.
          </GeoNotice>
        )}
        {(hours.message || hours.rangesLabel) && (
          <GeoNotice error={hours.status === "invalid"}>
            {hours.rangesLabel && (
              <strong>
                Horario informado por Google: {hours.rangesLabel}.{" "}
              </strong>
            )}
            {hours.message}
          </GeoNotice>
        )}
        {(!online || readOnly) && (
          <GeoNotice>
            {readOnly
              ? "El viaje está en solo lectura o su itinerario está bloqueado."
              : "Sin conexión. El formulario se conserva para reintentar."}
          </GeoNotice>
        )}
        <p>
          Se enviará una propuesta real al itinerario. Su aprobación sigue las
          reglas del grupo; no realiza una compra ni una reserva.
        </p>
        <button
          className="atlas-button atlas-button-primary"
          disabled={disabled}
        >
          {saving ? "Enviando propuesta…" : "Enviar propuesta"}
        </button>
      </form>
    </EditorialDialog>
  );
}
