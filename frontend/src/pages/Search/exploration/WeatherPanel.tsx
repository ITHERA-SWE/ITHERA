import { useEffect, useState } from "react";
import {
  mapsService,
  type GoogleLatLngLiteral,
  type WeatherResult,
} from "../../../services/maps";
import { withSearchTimeout } from "../search-data";
import { calendarLabel } from "../../../components/itinerary/itinerary-data";
import {
  forecastForDate,
  hasForecastDate,
  numberText,
  safeUrl,
} from "./geo-data";
import { GeoNotice } from "./GeoControls";
function WeatherSymbol({
  icon,
  iconUrl,
  description,
  code,
}: {
  icon?: string | null;
  iconUrl?: string | null;
  description?: string | null;
  code?: number | null;
}) {
  const [failed, setFailed] = useState(false);
  return safeUrl(iconUrl) && !failed ? (
    <img
      src={iconUrl!}
      alt={description || "Condición informada"}
      onError={() => setFailed(true)}
    />
  ) : code != null &&
    code !== 0 &&
    description &&
    description !== "Sin dato" ? (
    <span aria-hidden="true">{icon || "—"}</span>
  ) : (
    <span aria-hidden="true">—</span>
  );
}
export function WeatherPanel({
  position,
  label,
  token,
  online,
  tripDate,
}: {
  position: GoogleLatLngLiteral | null;
  label: string;
  token: string | null;
  online: boolean;
  tripDate?: string | null;
}) {
  const [weather, setWeather] = useState<WeatherResult | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [date, setDate] = useState(tripDate?.slice(0, 10) || "");
  useEffect(() => {
    let active = true;
    // Descarta datos meteorológicos de la ubicación anterior al sincronizar el proveedor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeather(null);
    setError("");
    if (!position || !token) {
      setLoading(false);
      return;
    }
    if (!online) {
      setLoading(false);
      setError("Sin conexión. Reconecta para consultar el clima.");
      return;
    }
    setLoading(true);
    void withSearchTimeout(
      mapsService.getWeather(position.lat, position.lng, token),
      15000,
    )
      .then((r) => {
        if (active) {
          if (!r.data)
            throw new Error("El servicio no devolvió datos meteorológicos.");
          setWeather(r.data);
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "No se pudo consultar el clima.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [position, token, online, retry]);
  const days = (weather?.forecast ?? []).filter((d) => hasForecastDate(d.date)),
    selected = forecastForDate(days, date);
  return (
    <section
      className="atlas-weather-section"
      aria-labelledby="atlas-weather-title"
    >
      <header>
        <div>
          <p className="atlas-eyebrow">EL DESTINO / CLIMA</p>
          <h2 id="atlas-weather-title">
            El tiempo también forma parte del viaje.
          </h2>
          <p>
            {label || "Selecciona una ubicación"} · Datos del servicio
            meteorológico existente.
          </p>
        </div>
        <button
          className="atlas-text-link"
          disabled={loading || !position || !online}
          onClick={() => setRetry((n) => n + 1)}
        >
          Actualizar clima
        </button>
      </header>
      {!position && (
        <GeoNotice>
          El clima requiere coordenadas válidas. Verifica la ubicación del
          viaje.
        </GeoNotice>
      )}
      {loading && (
        <div className="atlas-weather-skeleton" role="status" aria-busy="true">
          Consultando condiciones y pronóstico…
        </div>
      )}
      {error && (
        <GeoNotice error>
          {error}{" "}
          <button
            className="atlas-text-link"
            disabled={!online || loading}
            onClick={() => setRetry((n) => n + 1)}
          >
            Reintentar clima
          </button>
        </GeoNotice>
      )}
      {weather && !loading && (
        <>
          <div className="atlas-weather-overview">
            <div className="atlas-weather-current">
              <p className="atlas-eyebrow">CONDICIONES ACTUALES INFORMADAS</p>
              <div>
                <WeatherSymbol
                  icon={weather.current?.icon}
                  iconUrl={weather.current?.iconUrl}
                  code={weather.current?.weatherCode}
                  description={weather.current?.description}
                />
                <strong>
                  {numberText(weather.current?.temperature, " °C")}
                </strong>
              </div>
              <p>{weather.current?.description || "Condición no informada"}</p>
              <small>La respuesta no incluye hora de observación.</small>
            </div>
            <dl className="atlas-weather-metrics">
              <div>
                <dt>Viento</dt>
                <dd>{numberText(weather.current?.windSpeed, " km/h")}</dd>
              </div>
              <div>
                <dt>Humedad</dt>
                <dd>{numberText(weather.current?.relativeHumidity, "%")}</dd>
              </div>
              <div>
                <dt>Probabilidad de lluvia del día</dt>
                <dd>
                  {numberText(weather.current?.precipitationProbability, "%")}
                </dd>
              </div>
            </dl>
          </div>
          <div className="atlas-forecast-heading">
            <h3>Pronóstico por fecha</h3>
            <label htmlFor="atlas-weather-date">
              Consultar una fecha
              <input
                id="atlas-weather-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          {date && !selected && (
            <GeoNotice>
              No hay un pronóstico recibido para {calendarLabel(date) || date}.{" "}
              {days.length
                ? `El rango disponible va del ${calendarLabel(days[0].date)} al ${calendarLabel(days[days.length - 1].date)}.`
                : "El servicio no devolvió fechas de pronóstico."}{" "}
              No se extrapolan condiciones para las fechas del viaje.
            </GeoNotice>
          )}
          {days.length === 0 ? (
            <p>No se recibió un pronóstico diario.</p>
          ) : (
            <ol className="atlas-weather-days">
              {days.map((day) => (
                <li
                  key={day.date}
                  className={date === day.date ? "is-selected" : ""}
                >
                  <button
                    onClick={() => setDate(day.date)}
                    aria-pressed={date === day.date}
                  >
                    <time dateTime={day.date}>{calendarLabel(day.date)}</time>
                    <WeatherSymbol
                      icon={day.icon}
                      iconUrl={day.iconUrl}
                      code={day.weatherCode}
                      description={day.description}
                    />
                    <p>{day.description || "Condición no informada"}</p>
                    <strong>
                      {numberText(day.min, " °C")} /{" "}
                      {numberText(day.max, " °C")}
                    </strong>
                    <small>
                      Lluvia: {numberText(day.precipitationProbability, "%")}
                    </small>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
