import { useEffect, useId, useState, type ReactNode } from "react";
import {
  mapsService,
  type PlaceAutocompleteResult,
  type GoogleLatLngLiteral,
} from "../../../services/maps";
import { withSearchTimeout } from "../search-data";
export function GeoInput({
  id,
  label,
  value,
  onChange,
  onSelect,
  token,
  position,
  disabled = false,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: PlaceAutocompleteResult) => void;
  token: string | null;
  position: GoogleLatLngLiteral | null;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [options, setOptions] = useState<PlaceAutocompleteResult[]>([]),
    [focused, setFocused] = useState(false),
    [index, setIndex] = useState(-1),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(false);
  const listId = useId();
  useEffect(() => {
    let active = true;
    // Reinicia las sugerencias del proveedor al cambiar la consulta; no deriva datos de interfaz.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptions([]);
    setIndex(-1);
    setError(false);
    setLoading(false);
    if (!token || value.trim().length < 3) return;
    const timer = setTimeout(() => {
      setLoading(true);
      void withSearchTimeout(
        mapsService.autocompletePlaces(value.trim(), token, {
          latitude: position?.lat,
          longitude: position?.lng,
          radius: 12000,
        }),
        10000,
      )
        .then((r) => {
          if (active) setOptions((r.data ?? []).slice(0, 5));
        })
        .catch(() => {
          if (active) setError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [token, value, position?.lat, position?.lng]);
  const choose = (option: PlaceAutocompleteResult) => {
    setFocused(false);
    setOptions([]);
    onSelect(option);
  };
  const expanded = focused && options.length > 0;
  return (
    <div
      className="atlas-geo-input"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setFocused(false);
      }}
    >
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={expanded}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={
          expanded && index >= 0 ? `${listId}-${index}` : undefined
        }
        onChange={(e) => {
          onChange(e.target.value);
          setFocused(true);
        }}
        onFocus={() => setFocused(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setFocused(false);
          }
          if (expanded && ["ArrowDown", "ArrowUp"].includes(e.key)) {
            e.preventDefault();
            setIndex(
              (i) =>
                (i +
                  (e.key === "ArrowDown" ? 1 : options.length - 1) +
                  options.length) %
                options.length,
            );
          }
          if (expanded && e.key === "Enter" && index >= 0) {
            e.preventDefault();
            choose(options[index]);
          }
        }}
      />
      {loading && focused && <small role="status">Buscando sugerencias…</small>}
      {error && focused && (
        <small>
          Sugerencias no disponibles. Puedes continuar escribiendo la dirección
          y buscar.
        </small>
      )}
      {expanded && (
        <ul id={listId} role="listbox" aria-label={`Sugerencias de ${label}`}>
          {options.map((s, i) => (
            <li
              id={`${listId}-${i}`}
              key={s.placeId}
              role="option"
              aria-selected={i === index}
            >
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
              >
                <strong>{s.mainText || s.description}</strong>
                {s.secondaryText && <small>{s.secondaryText}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export function GeoNotice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`atlas-geo-notice ${error ? "is-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function PlacePhoto({
  src,
  name,
}: {
  src?: string | null;
  name?: string | null;
}) {
  const [failed, setFailed] = useState<string | null>(null),
    [loaded, setLoaded] = useState<string | null>(null);
  return (
    <div className="atlas-place-photo">
      {src && failed !== src ? (
        <>
          <img
            src={src}
            alt={name || "Fotografía del lugar"}
            loading="lazy"
            onError={() => setFailed(src)}
            onLoad={() => setLoaded(src)}
          />
          {loaded !== src && (
            <span className="atlas-photo-loading" role="status">
              Cargando fotografía…
            </span>
          )}
        </>
      ) : (
        <span className="atlas-place-photo-fallback">
          <span aria-hidden="true">⌖</span>Sin fotografía disponible
        </span>
      )}
    </div>
  );
}
