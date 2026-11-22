import { useEffect, useState } from "react";
import type { Group } from "../../../types/groups";
import type { GoogleLatLngLiteral } from "../../../services/maps";
import { mapsService } from "../../../services/maps";
import { groupsService } from "../../../services/groups";
import { withSearchTimeout } from "../search-data";
import { coordinates } from "./geo-data";
export function useGeoContext(group: Group | null, token: string | null) {
  const [retry, setRetry] = useState(0);
  const [context, setContext] = useState<{
    position: GoogleLatLngLiteral | null;
    label: string;
    loading: boolean;
    error: string | null;
    source: string;
  }>({
    position: null,
    label: "",
    loading: true,
    error: null,
    source: "destino_viaje",
  });
  useEffect(() => {
    let active = true;
    const load = async () => {
      const label = group?.destino_formatted_address || group?.destino || "";
      let position = coordinates({
          latitude: group?.destino_latitud,
          longitude: group?.destino_longitud,
        }),
        name = label,
        source = "destino_viaje",
        error: string | null = null;
      setContext({ position, label, loading: true, error: null, source });
      if (token && group?.id)
        try {
          const response = await withSearchTimeout(
            groupsService.getTravelContext(String(group.id), token),
            10000,
          );
          const start = response.data?.startLocation;
          if (start) {
            const startPosition = coordinates(start);
            const startName = start.formattedAddress || start.label;
            if (startPosition || startName) {
              // No atribuir las coordenadas del destino a un hospedaje sin ubicación válida.
              position = startPosition;
              name = startName || "Punto de partida del viaje";
              source = start.source;
            }
          }
        } catch {
          error =
            "No se pudo actualizar el punto de partida. Se conserva el destino verificado del viaje.";
        }
      if (!position && name && token)
        try {
          const response = await withSearchTimeout(
            mapsService.searchDestination(name, token),
            10000,
          );
          position = coordinates(response.data);
          if (!position)
            error = "No se recibieron coordenadas para esta ubicación.";
        } catch {
          error =
            "No se pudo resolver la ubicación. Puedes buscar lugares por texto o indicar otro origen.";
        }
      if (active)
        setContext({ position, label: name, loading: false, error, source });
    };
    void load();
    return () => {
      active = false;
    };
  }, [group, token, retry]);
  return { ...context, retry: () => setRetry((n) => n + 1) };
}
