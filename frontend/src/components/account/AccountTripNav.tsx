import { useNavigate } from "react-router-dom";
import type { Group } from "../../types/groups";
import { TripNavigation } from "../trip/TripNavigation";
import { travelPath } from "../../pages/Search/search-data";
export function AccountTripNav({
  group,
  activeTab = "",
}: {
  group: Group;
  activeTab?: string;
}) {
  const navigate = useNavigate(),
    go = (path: string) => navigate(travelPath(path, group.id));
  return (
    <TripNavigation
      activeTab={activeTab}
      tripName={group.nombre}
      isReadOnly={["cerrado", "archivado", "finalizado"].includes(group.estado)}
      isAdmin={group.myRole === "admin"}
      onTabChange={(tab) =>
        navigate(travelPath("/dashboard", group.id, { tab }))
      }
      onPeople={() => go("/grouppanel")}
      onSettings={() => go("/group-settings")}
      onSubgroups={() =>
        navigate(travelPath("/dashboard", group.id, { tab: "inicio" }), {
          state: { groupId: group.id, dashboardView: "subgrupos" },
        })
      }
    />
  );
}
