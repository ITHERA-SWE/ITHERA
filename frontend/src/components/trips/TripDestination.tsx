import { useEffect, useRef, useState } from "react";
import { GeoInput } from "../../pages/Search/exploration/GeoControls";
import {
  mapsService,
  type GeocodingResult,
  type PlaceAutocompleteResult,
} from "../../services/maps";
import { withSearchTimeout } from "../../pages/Search/search-data";
export function TripDestination({
  value,
  onChange,
  token,
  disabled,
  onBusy,
  error,
}: {
  value: string;
  onChange: (value: string, geo: GeocodingResult | null) => void;
  token: string | null;
  disabled: boolean;
  onBusy: (busy: boolean) => void;
  error?: string;
}) {
  const [message, setMessage] = useState(""),
    [selected, setSelected] = useState(false);
  const version = useRef(0),
    life = useRef(true);
  useEffect(() => {
    life.current = true;
    return () => {
      life.current = false;
    };
  }, []);
  const select = async (s: PlaceAutocompleteResult) => {
    if (!token || disabled) return;
    const request = ++version.current;
    onBusy(true);
    setMessage("Verificando destino…");
    try {
      const r = await withSearchTimeout(
        mapsService.getPlaceDetails(s.placeId, token),
        12000,
      );
      if (!life.current || request !== version.current) return;
      if (!r.data)
        throw new Error(
          "No se recibió el detalle del destino. Puedes indicar la ubicación por escrito.",
        );
      const p = r.data;
      onChange(p.formattedAddress || s.description, {
        formattedAddress: p.formattedAddress,
        latitude: p.latitude,
        longitude: p.longitude,
        placeId: p.id,
        photoName: p.photoName,
        photoUrl: p.photoUrl,
      });
      setSelected(true);
      setMessage("Destino seleccionado.");
    } catch (e) {
      if (life.current && request === version.current) {
        setSelected(false);
        setMessage(
          e instanceof Error ? e.message : "No se pudo consultar el destino.",
        );
      }
    } finally {
      if (life.current && request === version.current) onBusy(false);
    }
  };
  return (
    <div
      className="atlas-trip-destination"
      role="group"
      aria-label="Selección de destino"
      aria-describedby="trip-destination-hint"
    >
      <GeoInput
        id="trip-destination"
        label="Destino"
        value={value}
        onChange={(v) => {
          version.current++;
          onBusy(false);
          setSelected(false);
          setMessage("");
          onChange(v, null);
        }}
        onSelect={(s) => void select(s)}
        token={token}
        disabled={disabled}
        position={null}
        placeholder="Ciudad, región o dirección"
      />
      <small id="trip-destination-hint">
        Puedes elegir una sugerencia o escribir el destino. Las coordenadas y la
        foto se guardan solo si se reciben.
      </small>
      {message && (
        <p
          role="status"
          className={
            selected
              ? "atlas-destination-confirmed"
              : "atlas-destination-message"
          }
        >
          {message}
        </p>
      )}
      {error && (
        <p
          className="atlas-field-error"
          role="alert"
          id="trip-destination-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
