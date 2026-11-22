import { useNetworkMonitor } from "../../hooks/useNetworkMonitor";
import { AccountTripNav } from "../../components/account/AccountTripNav";
import { AccountAvatar } from "../../components/account/AccountAvatar";
import "../../components/account/accounts-editorial.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "../../components/layout/AppLayout";
import { InviteModal } from "../../components/InviteModal/InviteModal";
import { useAuth } from "../../context/useAuth";
import { useSocket } from "../../hooks/useSocket";
import {
  getCurrentGroup,
  groupsService,
  saveCurrentGroup,
  clearCurrentGroup,
} from "../../services/groups";
import {
  AccountConfirmDialog as ConfirmDialog,
  AccountDialog,
} from "../../components/account/AccountDialog";
import { ToastContainer } from "../../components/ui/Toast/ToastContainer";
import { useToast } from "../../hooks/useToast";
import type {
  Group,
  GroupInvitation,
  GroupJoinRequest,
  GroupMember,
  AdminDelegationRequest,
} from "../../types/groups";

type InviteMember = {
  id: number;
  initials: string;
  name: string;
  role: "Admin" | "Miembro";
};

type InviteSettingsState = {
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
};

type GroupPanelCache = {
  group: Group | null;
  members: GroupMember[];
  invitations: GroupInvitation[];
  joinRequests: GroupJoinRequest[];
  adminDelegations: AdminDelegationRequest[];
  inviteLink: string;
  qrBase64: string;
  inviteSettings: InviteSettingsState;
  savedAt: number;
};

type GroupPanelRealtimePayload = {
  grupoId?: string | number;
  groupId?: string | number;
  tipo?: string;
  metadata?: {
    targetUsuarioId?: string | number;
    memberId?: string | number;
    [key: string]: unknown;
  };
};

const GROUP_PANEL_CACHE_TTL_MS = 10 * 60 * 1000;
const getGroupPanelCacheKey = (groupId: string, userId: string) =>
  `ithera:group-panel:${userId}:${groupId}`;

function readGroupPanelCache(
  groupId: string,
  userId: string,
): GroupPanelCache | null {
  if (!groupId || typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(
      getGroupPanelCacheKey(groupId, userId),
    );
    if (!raw) return null;

    const parsed = JSON.parse(raw) as GroupPanelCache;
    if (
      !parsed ||
      Date.now() - Number(parsed.savedAt ?? 0) > GROUP_PANEL_CACHE_TTL_MS
    ) {
      window.sessionStorage.removeItem(getGroupPanelCacheKey(groupId, userId));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeGroupPanelCache(
  groupId: string,
  userId: string,
  snapshot: GroupPanelCache,
) {
  if (!groupId || typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      getGroupPanelCacheKey(groupId, userId),
      JSON.stringify({ ...snapshot, savedAt: Date.now() }),
    );
  } catch {
    // La caché es una mejora de UX; si el navegador la bloquea, el flujo sigue funcionando.
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "Sin fechas definidas";
  return `${start || "—"} → ${end || "—"}`;
}

function getDisplayRole(rol?: string) {
  return rol === "admin" ? "Organizador" : "Viajero";
}

function isClosedGroup(group?: Group | null) {
  return ["cerrado", "archivado", "finalizado"].includes(
    String(group?.estado ?? "").toLowerCase(),
  );
}

function GroupPanelWorkspace() {
  const alive = useRef(true);
  const actionLocks = useRef(new Set<string>());
  const online = useNetworkMonitor();
  const [adminDataError, setAdminDataError] = useState("");
  const [actionError, setActionError] = useState("");
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { accessToken, localUser } = useAuth();
  const { socket } = useSocket(accessToken);

  const initialCurrentGroup = useMemo(() => getCurrentGroup(), []);
  const groupId = searchParams.get("groupId") || initialCurrentGroup?.id || "";
  const initialGroup =
    initialCurrentGroup && String(initialCurrentGroup.id) === String(groupId)
      ? initialCurrentGroup
      : null;
  const cachedPanel = useMemo(
    () => readGroupPanelCache(groupId, String(localUser?.id_usuario ?? "")),
    [groupId, localUser?.id_usuario],
  );
  const realtimeRefreshTimerRef = useRef<number | null>(null);
  const latestPanelSnapshotRef = useRef<GroupPanelCache>(
    cachedPanel ?? {
      group: initialGroup,
      members: [],
      invitations: [],
      joinRequests: [],
      adminDelegations: [],
      inviteLink: "",
      qrBase64: "",
      inviteSettings: { expiresAt: null, maxUses: null, usedCount: 0 },
      savedAt: Date.now(),
    },
  );

  const [group, setGroup] = useState<Group | null>(
    cachedPanel?.group ?? initialGroup,
  );
  const [members, setMembers] = useState<GroupMember[]>(
    cachedPanel?.members ?? [],
  );
  const [invitations, setInvitations] = useState<GroupInvitation[]>(
    cachedPanel?.invitations ?? [],
  );
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>(
    cachedPanel?.joinRequests ?? [],
  );
  const [inviteLink, setInviteLink] = useState(cachedPanel?.inviteLink ?? "");
  const [qrBase64, setQrBase64] = useState(cachedPanel?.qrBase64 ?? "");
  const [inviteSettings, setInviteSettings] = useState<InviteSettingsState>(
    cachedPanel?.inviteSettings ?? {
      expiresAt: null,
      maxUses: null,
      usedCount: 0,
    },
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState<GroupMember | null>(
    null,
  );
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<GroupMember | null>(null);
  const [removeLoadingId, setRemoveLoadingId] = useState<string | null>(null);
  const [forcedNotice, setForcedNotice] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [adminDelegations, setAdminDelegations] = useState<
    AdminDelegationRequest[]
  >(cachedPanel?.adminDelegations ?? []);
  const [delegationActionLoading, setDelegationActionLoading] = useState<
    string | null
  >(null);
  const [joinRequestActionLoading, setJoinRequestActionLoading] = useState<
    string | null
  >(null);

  const currentMember = members.find(
    (member) => String(member.usuario_id) === String(localUser?.id_usuario),
  );

  const isAdmin = currentMember
    ? currentMember.rol === "admin"
    : group?.myRole === "admin";
  const isReadOnly = isClosedGroup(group);
  const canManageGroup = isAdmin && !isReadOnly;
  const isPrivateGroup = group?.es_publico !== true;
  const maxMembers = Number(group?.maximo_miembros ?? 0);
  const hasReachedCapacity = maxMembers > 0 && members.length >= maxMembers;
  const canInviteGroup = canManageGroup && !hasReachedCapacity;
  const incomingAdminDelegation = adminDelegations.find(
    (request) => String(request.to_user_id) === String(localUser?.id_usuario),
  );
  const outgoingAdminDelegation = adminDelegations.find(
    (request) => String(request.from_user_id) === String(localUser?.id_usuario),
  );

  const persistPanelCache = useCallback(
    (nextSnapshot: Partial<GroupPanelCache>) => {
      if (!groupId || !alive.current) return;

      const snapshot: GroupPanelCache = {
        ...latestPanelSnapshotRef.current,
        ...nextSnapshot,
        savedAt: Date.now(),
      };

      latestPanelSnapshotRef.current = snapshot;
      writeGroupPanelCache(
        groupId,
        String(localUser?.id_usuario ?? ""),
        snapshot,
      );
    },
    [groupId, localUser?.id_usuario],
  );
  const loadAdminData = useCallback(
    async (targetGroup: Group | null, targetMembers: GroupMember[]) => {
      if (!accessToken || !groupId) return;

      const memberRole = targetMembers.find(
        (member) => String(member.usuario_id) === String(localUser?.id_usuario),
      )?.rol;
      const effectiveMaxMembers = Number(targetGroup?.maximo_miembros ?? 0);
      const reachedCapacity =
        effectiveMaxMembers > 0 && targetMembers.length >= effectiveMaxMembers;
      const canManage =
        (memberRole === "admin" || targetGroup?.myRole === "admin") &&
        !isClosedGroup(targetGroup);

      if (!canManage) {
        const emptyInviteSettings = {
          expiresAt: null,
          maxUses: null,
          usedCount: 0,
        };
        setInviteLink("");
        setQrBase64("");
        setInviteSettings(emptyInviteSettings);
        setInvitations([]);
        setJoinRequests([]);
        persistPanelCache({
          group: targetGroup,
          members: targetMembers,
          invitations: [],
          joinRequests: [],
          inviteLink: "",
          qrBase64: "",
          inviteSettings: emptyInviteSettings,
        });
        return;
      }

      setAdminDataError("");
      const effectiveIsPrivate = targetGroup?.es_publico !== true;
      const [inviteRes, qrRes, invitationsRes, joinRequestsRes] =
        await Promise.all([
          reachedCapacity
            ? Promise.resolve({
                inviteLink: "",
                inviteSettings: {
                  expiresAt: null,
                  maxUses: null,
                  usedCount: 0,
                },
              })
            : groupsService.getInvite(groupId, accessToken),
          reachedCapacity
            ? Promise.resolve({ qrBase64: "" })
            : groupsService.getQr(groupId, accessToken),
          groupsService.getInvitations(groupId, accessToken),
          effectiveIsPrivate
            ? groupsService.getJoinRequests(groupId, accessToken)
            : Promise.resolve({ requests: [] }),
        ]);
      if (!alive.current) return;

      const nextInviteSettings = inviteRes.inviteSettings ?? {
        expiresAt: null,
        maxUses: null,
        usedCount: 0,
      };

      setInviteLink(inviteRes.inviteLink);
      setInviteSettings(nextInviteSettings);
      setQrBase64(qrRes.qrBase64);
      setInvitations(invitationsRes.invitations);
      setJoinRequests(joinRequestsRes.requests);
      persistPanelCache({
        group: targetGroup,
        members: targetMembers,
        invitations: invitationsRes.invitations,
        joinRequests: joinRequestsRes.requests,
        inviteLink: inviteRes.inviteLink,
        qrBase64: qrRes.qrBase64,
        inviteSettings: nextInviteSettings,
      });
    },
    [accessToken, groupId, localUser?.id_usuario, persistPanelCache],
  );

  const goToItinerary = () => {
    const targetGroup = group ?? getCurrentGroup();
    const targetGroupId = String(targetGroup?.id ?? groupId ?? "");
    if (!targetGroupId) {
      navigate("/my-trips");
      return;
    }
    navigate(`/dashboard?groupId=${encodeURIComponent(targetGroupId)}`, {
      state: {
        groupId: targetGroupId,
        switchingGroup: targetGroup ?? undefined,
      },
    });
  };

  const loadData = useCallback(
    async (options?: { showLoading?: boolean }) => {
      const showLoading = options?.showLoading ?? true;

      if (!accessToken || !groupId) {
        setLoading(false);
        setError("No se recibió un groupId válido");
        return;
      }

      try {
        if (showLoading) setLoading(true);
        setError("");

        const [groupRes, membersRes] = await Promise.all([
          groupsService.getGroupDetails(groupId, accessToken),
          groupsService.getMembers(groupId, accessToken),
        ]);
        if (!alive.current) return;

        const loadedCurrentMember = membersRes.members.find(
          (member) =>
            String(member.usuario_id) === String(localUser?.id_usuario),
        );

        if (!loadedCurrentMember) {
          clearCurrentGroup();
          navigate("/my-trips", { replace: true });
          return;
        }

        const loadedGroup = {
          ...groupRes.group,
          myRole: loadedCurrentMember.rol,
        };
        setGroup(loadedGroup);
        saveCurrentGroup(loadedGroup);
        setMembers(membersRes.members);

        try {
          const delegationRes = await groupsService.getAdminDelegations(
            groupId,
            accessToken,
          );
          if (!alive.current) return;
          const nextDelegations = delegationRes.requests ?? [];
          setAdminDelegations(nextDelegations);
          persistPanelCache({
            group: loadedGroup,
            members: membersRes.members,
            adminDelegations: nextDelegations,
          });
        } catch {
          if (!alive.current) return;
          setAdminDelegations([]);
          persistPanelCache({
            group: loadedGroup,
            members: membersRes.members,
            adminDelegations: [],
          });
        }

        void loadAdminData(loadedGroup, membersRes.members).catch(() => {
          if (!alive.current) return;
          setAdminDataError(
            "No se pudieron actualizar las invitaciones y solicitudes. Puedes reintentarlo.",
          );
          setInvitations([]);
          setJoinRequests([]);
        });
      } catch (err) {
        if (!alive.current) return;
        const message =
          err instanceof Error ? err.message : "No se pudo cargar el grupo";
        if (/no perteneces|permisos|forbidden|403/i.test(message)) {
          clearCurrentGroup();
          navigate("/my-trips", { replace: true });
          return;
        }
        setError(message);
      } finally {
        if (alive.current) {
          setLoading(false);
        }
      }
    },
    [
      accessToken,
      groupId,
      loadAdminData,
      localUser?.id_usuario,
      navigate,
      persistPanelCache,
    ],
  );

  useEffect(() => {
    void loadData({ showLoading: true });
  }, [cachedPanel, loadData]);

  const refreshMembersSnapshot = useCallback(async () => {
    if (!accessToken || !groupId) return;

    const [groupRes, membersRes] = await Promise.all([
      groupsService.getGroupDetails(groupId, accessToken),
      groupsService.getMembers(groupId, accessToken),
    ]);
    if (!alive.current) return;

    const loadedCurrentMember = membersRes.members.find(
      (member) => String(member.usuario_id) === String(localUser?.id_usuario),
    );

    if (!loadedCurrentMember) {
      clearCurrentGroup();
      navigate("/my-trips", { replace: true });
      return;
    }

    const loadedGroup = { ...groupRes.group, myRole: loadedCurrentMember.rol };
    setGroup(loadedGroup);
    saveCurrentGroup(loadedGroup);
    setMembers(membersRes.members);
    persistPanelCache({ group: loadedGroup, members: membersRes.members });

    try {
      const delegationRes = await groupsService.getAdminDelegations(
        groupId,
        accessToken,
      );
      if (!alive.current) return;
      const nextDelegations = delegationRes.requests ?? [];
      setAdminDelegations(nextDelegations);
      persistPanelCache({ adminDelegations: nextDelegations });
    } catch {
      if (!alive.current) return;
      setAdminDelegations([]);
      persistPanelCache({ adminDelegations: [] });
    }
  }, [
    accessToken,
    groupId,
    localUser?.id_usuario,
    navigate,
    persistPanelCache,
  ]);

  const refreshJoinRequestsSnapshot = useCallback(async () => {
    if (!accessToken || !groupId || !canManageGroup || !isPrivateGroup) return;

    const requestsRes = await groupsService.getJoinRequests(
      groupId,
      accessToken,
    );
    if (!alive.current) return;
    setJoinRequests(requestsRes.requests);
    persistPanelCache({ joinRequests: requestsRes.requests });
  }, [accessToken, canManageGroup, groupId, isPrivateGroup, persistPanelCache]);

  const refreshInvitationsSnapshot = useCallback(async () => {
    if (!accessToken || !groupId || !canManageGroup) return;

    const invitationsRes = await groupsService.getInvitations(
      groupId,
      accessToken,
    );
    if (!alive.current) return;
    setInvitations(invitationsRes.invitations);
    persistPanelCache({ invitations: invitationsRes.invitations });
  }, [accessToken, canManageGroup, groupId, persistPanelCache]);

  const refreshForRealtimePayload = useCallback(
    async (payload: GroupPanelRealtimePayload) => {
      const tipo = String(payload.tipo ?? "");

      if (tipo === "grupo_actualizado") {
        await refreshMembersSnapshot();
        return;
      }

      if (tipo === "miembro_unido" || tipo === "miembro_agregado") {
        await Promise.all([
          refreshMembersSnapshot(),
          refreshInvitationsSnapshot(),
        ]);
        return;
      }

      if (
        tipo === "miembro_eliminado" ||
        tipo === "miembro_actualizado" ||
        tipo === "rol_actualizado" ||
        tipo === "delegacion_admin_pendiente" ||
        tipo === "delegacion_admin_aceptada" ||
        tipo === "delegacion_admin_rechazada"
      ) {
        await refreshMembersSnapshot();
        return;
      }

      if (
        tipo === "solicitud_union_creada" ||
        tipo === "solicitud_union_resuelta" ||
        tipo === "solicitud_union_rechazada"
      ) {
        await refreshJoinRequestsSnapshot();
        return;
      }

      if (tipo === "solicitud_union_aprobada") {
        await Promise.all([
          refreshMembersSnapshot(),
          refreshJoinRequestsSnapshot(),
        ]);
        return;
      }

      if (tipo === "invitacion_enviada" || tipo === "invitacion_aceptada") {
        await refreshInvitationsSnapshot();
        return;
      }

      await loadData({ showLoading: false });
    },
    [
      loadData,
      refreshInvitationsSnapshot,
      refreshJoinRequestsSnapshot,
      refreshMembersSnapshot,
    ],
  );

  const scheduleRealtimeRefresh = useCallback(
    (payload: GroupPanelRealtimePayload) => {
      if (realtimeRefreshTimerRef.current !== null) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
      }

      realtimeRefreshTimerRef.current = window.setTimeout(() => {
        void refreshForRealtimePayload(payload).catch(() => {
          void loadData({ showLoading: false });
        });
      }, 180);
    },
    [loadData, refreshForRealtimePayload],
  );

  useEffect(() => {
    if (!socket || !groupId) return;

    const handleRealtime = (payload: GroupPanelRealtimePayload) => {
      const payloadGroupId = payload.grupoId ?? payload.groupId;
      if (
        payloadGroupId !== undefined &&
        String(payloadGroupId) !== String(groupId)
      )
        return;

      if (payload.tipo === "grupo_eliminado") {
        clearCurrentGroup();
        setForcedNotice({
          title: "Grupo eliminado",
          description:
            "Este grupo fue eliminado por el administrador. Te regresaremos a Mis viajes.",
        });
        return;
      }

      const targetUsuarioId = payload.metadata?.targetUsuarioId;
      const affectsCurrentUser =
        targetUsuarioId !== undefined &&
        String(targetUsuarioId) === String(localUser?.id_usuario);

      if (payload.tipo === "miembro_eliminado" && affectsCurrentUser) {
        clearCurrentGroup();
        setForcedNotice({
          title: "Fuiste removido del viaje",
          description:
            "Tu acceso a este viaje fue revocado. Te regresaremos a Mis viajes.",
        });
        return;
      }

      scheduleRealtimeRefresh(payload);
    };

    socket.emit("join_room", { tripId: groupId });
    socket.on("dashboard_updated", handleRealtime);
    socket.on("group_members_updated", handleRealtime);
    socket.on("group_deleted", handleRealtime);

    return () => {
      if (realtimeRefreshTimerRef.current !== null) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }

      socket.emit("leave_room", { tripId: groupId });
      socket.off("dashboard_updated", handleRealtime);
      socket.off("group_members_updated", handleRealtime);
      socket.off("group_deleted", handleRealtime);
    };
  }, [
    groupId,
    localUser?.id_usuario,
    navigate,
    scheduleRealtimeRefresh,
    socket,
  ]);

  const inviteMembers: InviteMember[] = useMemo(
    () =>
      members.map((member, index) => ({
        id: index + 1,
        initials: getInitials(member.nombre || member.email),
        name: member.nombre || member.email,
        role: member.rol === "admin" ? "Admin" : "Miembro",
      })),
    [members],
  );

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      if (!alive.current) return;
      setCopied(true);
      setTimeout(() => {
        if (alive.current) setCopied(false);
      }, 1800);
    } catch {
      toast.show(
        "No se pudo copiar el enlace. Puedes seleccionarlo y copiarlo manualmente.",
        "error",
      );
    }
  };

  const handleToggleRole = async (member: GroupMember) => {
    if (!accessToken || !group || !canManageGroup || !online) return;

    if (actionLocks.current.has("people")) return;
    actionLocks.current.add("people");
    setActionError("");
    try {
      setRoleChangeLoading(true);
      const nextRole = member.rol === "admin" ? "viajero" : "admin";

      const response = await groupsService.updateMemberRole(
        member.id,
        nextRole,
        accessToken,
      );
      if (!alive.current) return;

      if (nextRole === "admin" && response.member?.pendingDelegation) {
        const delegationRes = await groupsService.getAdminDelegations(
          group.id,
          accessToken,
        );
        if (!alive.current) return;
        const nextDelegations = delegationRes.requests ?? [];
        setAdminDelegations(nextDelegations);
        persistPanelCache({ adminDelegations: nextDelegations });
        toast.show(
          "Solicitud de administración enviada. El integrante debe aceptarla antes de que cambien los roles.",
          "info",
        );
      } else {
        const refreshed = await groupsService.getMembers(group.id, accessToken);
        if (!alive.current) return;
        setMembers(refreshed.members);
        persistPanelCache({ members: refreshed.members });
      }
      setRoleChangeTarget(null);
    } catch (err) {
      if (!alive.current) return;
      setActionError(
        err instanceof Error
          ? err.message
          : "No se pudo confirmar la operación.",
      );
      toast.show(
        err instanceof Error ? err.message : "No se pudo actualizar el rol",
        "error",
      );
    } finally {
      actionLocks.current.delete("people");
      if (alive.current) {
        setRoleChangeLoading(false);
      }
    }
  };

  const handleResolveJoinRequest = async (
    request: GroupJoinRequest,
    action: "approve" | "reject",
  ) => {
    if (!accessToken || !group || !canManageGroup || !online) return;

    const loadingKey = `${request.id}:${action}`;

    if (actionLocks.current.has("people")) return;
    actionLocks.current.add("people");
    setActionError("");
    try {
      setJoinRequestActionLoading(loadingKey);
      await groupsService.resolveJoinRequest(
        group.id,
        request.id,
        action,
        accessToken,
      );
      if (!alive.current) return;
      const [membersRes, requestsRes] = await Promise.all([
        groupsService.getMembers(group.id, accessToken),
        groupsService.getJoinRequests(group.id, accessToken),
      ]);
      if (!alive.current) return;
      setMembers(membersRes.members);
      setJoinRequests(requestsRes.requests);
      persistPanelCache({
        members: membersRes.members,
        joinRequests: requestsRes.requests,
      });
    } catch (err) {
      if (!alive.current) return;
      toast.show(
        err instanceof Error ? err.message : "No se pudo atender la solicitud",
        "error",
      );
    } finally {
      actionLocks.current.delete("people");
      if (alive.current) {
        setJoinRequestActionLoading(null);
      }
    }
  };

  const handleResolveAdminDelegation = async (
    request: AdminDelegationRequest,
    action: "accept" | "reject",
  ) => {
    if (
      !accessToken ||
      !group ||
      isReadOnly ||
      !online ||
      String(request.to_user_id) !== String(localUser?.id_usuario)
    )
      return;

    if (actionLocks.current.has("people")) return;
    actionLocks.current.add("people");
    setActionError("");
    try {
      setDelegationActionLoading(`${request.id}:${action}`);
      await groupsService.resolveAdminDelegation(
        group.id,
        request.id,
        action,
        accessToken,
      );
      if (!alive.current) return;

      const [membersRes, delegationRes, groupRes] = await Promise.all([
        groupsService.getMembers(group.id, accessToken),
        groupsService.getAdminDelegations(group.id, accessToken),
        groupsService.getGroupDetails(group.id, accessToken),
      ]);
      if (!alive.current) return;
      const nextDelegations = delegationRes.requests ?? [];
      setMembers(membersRes.members);
      setAdminDelegations(nextDelegations);
      setGroup(groupRes.group);
      saveCurrentGroup(groupRes.group);
      persistPanelCache({
        group: groupRes.group,
        members: membersRes.members,
        adminDelegations: nextDelegations,
      });
    } catch (err) {
      if (!alive.current) return;
      toast.show(
        err instanceof Error
          ? err.message
          : "No se pudo responder la solicitud de administración",
        "error",
      );
    } finally {
      actionLocks.current.delete("people");
      if (alive.current) {
        setDelegationActionLoading(null);
      }
    }
  };

  const handleRemove = async (member: GroupMember) => {
    if (!accessToken || !group || !canManageGroup || !online) return;

    if (actionLocks.current.has("people")) return;
    actionLocks.current.add("people");
    setActionError("");
    try {
      setRemoveLoadingId(member.id);
      await groupsService.removeMember(group.id, member.id, accessToken);
      if (!alive.current) return;

      const refreshed = await groupsService.getMembers(group.id, accessToken);
      if (!alive.current) return;
      setMembers(refreshed.members);
      persistPanelCache({ members: refreshed.members });
      setRemoveTarget(null);
      toast.show("Integrante expulsado correctamente.", "success");
    } catch (err) {
      if (!alive.current) return;
      setActionError(
        err instanceof Error
          ? err.message
          : "No se pudo confirmar la operación.",
      );
      toast.show(
        err instanceof Error ? err.message : "No se pudo eliminar al miembro",
        "error",
      );
    } finally {
      actionLocks.current.delete("people");
      if (alive.current) {
        setRemoveLoadingId(null);
      }
    }
  };

  const navUserName = localUser?.nombre || localUser?.email || "Usuario";
  const navInitials = getInitials(navUserName) || "U";

  if (loading) {
    return (
      <AppLayout
        editorial
        showTripSelector={false}
        showRightPanel={false}
        user={{
          name: navUserName,
          role: "",
          initials: navInitials,
          color: "#7A4FD6",
        }}
      >
        <div className="flex flex-1 items-center justify-center">
          <p className="font-body text-sm text-[#7A8799]">Cargando grupo...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !group) {
    return (
      <AppLayout
        editorial
        showTripSelector={false}
        showRightPanel={false}
        user={{
          name: navUserName,
          role: "",
          initials: navInitials,
          color: "#7A4FD6",
        }}
      >
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 text-center">
            <h2 className="mb-2 font-heading text-xl text-[#1E0A4E]">
              No se pudo abrir el grupo
            </h2>
            <p className="font-body text-sm text-red-500">
              {error || "Grupo no disponible"}
            </p>
            <button
              className="atlas-account-button"
              disabled={!online}
              onClick={() => void loadData()}
            >
              Reintentar Personas
            </button>
            <button
              onClick={() => navigate("/my-trips")}
              className="mt-4 rounded-xl bg-[#1E6FD9] px-4 py-3 text-sm text-white"
            >
              Volver a mis viajes
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const pendingInvitations = invitations.filter(
    (invitation) => invitation.estado === "pendiente",
  );

  return (
    <>
      <AppLayout
        editorial
        contextualNavigation={
          <AccountTripNav group={group} activeTab="personas" />
        }
        trip={{
          name: group.nombre,
          subtitle: group.destino || "Sin destino definido",
          dates: formatDateRange(group.fecha_inicio, group.fecha_fin),
          people: `${members.length}${
            group.maximo_miembros ? ` / ${group.maximo_miembros}` : ""
          } personas`,
        }}
        user={{
          name: navUserName,
          role: getDisplayRole(isAdmin ? "admin" : "viajero"),
          initials: navInitials,
          color: "#7A4FD6",
        }}
        showTripSelector={false}
        showRightPanel={false}
      >
        <div className="atlas-account-scroll">
          <div className="atlas-account-page atlas-people-page">
            <header className="atlas-account-heading">
              <div>
                <p className="atlas-account-eyebrow">EL VIAJE / PERSONAS</p>
                <h1>
                  Un viaje compartido.
                  <br />
                  <em>Un grupo por conocer.</em>
                </h1>
                <p>
                  {group.nombre}
                  {group.destino ? ` · ${group.destino}` : ""}
                </p>
                <p>{formatDateRange(group.fecha_inicio, group.fecha_fin)}</p>
              </div>
              <div className="atlas-account-heading-actions">
                {canInviteGroup && (
                  <button
                    className="atlas-account-button is-primary"
                    disabled={!online}
                    onClick={() => setIsInviteModalOpen(true)}
                  >
                    Invitar al viaje ↗
                  </button>
                )}
                <button
                  className="atlas-account-button"
                  onClick={goToItinerary}
                >
                  Ver itinerario
                </button>
              </div>
            </header>
            {!online && (
              <div className="atlas-account-notice" role="status">
                Sin conexión. Puedes consultar la información cargada; las
                acciones de gestión requieren reconectar.
              </div>
            )}
            {isReadOnly && (
              <div className="atlas-account-notice" role="status">
                Viaje cerrado · modo lectura. Las acciones de gestión,
                invitación y expulsión están deshabilitadas.
              </div>
            )}
            {adminDataError && (
              <div className="atlas-account-notice is-error" role="alert">
                {adminDataError}
                <button
                  className="atlas-account-link"
                  onClick={() => void loadAdminData(group, members)}
                >
                  Reintentar invitaciones
                </button>
              </div>
            )}
            {outgoingAdminDelegation && (
              <div className="atlas-account-notice" role="status">
                <strong>Delegación pendiente.</strong> Esperando a{" "}
                {outgoingAdminDelegation.to_nombre ||
                  outgoingAdminDelegation.to_email ||
                  "la persona invitada"}
                . Vence:{" "}
                {new Date(outgoingAdminDelegation.expires_at).toLocaleString(
                  "es-MX",
                )}
                .
              </div>
            )}
            {incomingAdminDelegation && (
              <section className="atlas-people-delegation">
                <p className="atlas-account-eyebrow">
                  TU PARTICIPACIÓN / ADMINISTRACIÓN
                </p>
                <h2>¿Aceptar la administración?</h2>
                <p>
                  {incomingAdminDelegation.from_nombre ||
                    incomingAdminDelegation.from_email ||
                    "El organizador"}{" "}
                  quiere transferirte el rol de organizador. Si aceptas, esa
                  persona pasará a viajero y tú podrás administrar el viaje.
                </p>
                <p>
                  Vence:{" "}
                  {new Date(incomingAdminDelegation.expires_at).toLocaleString(
                    "es-MX",
                  )}
                  .
                </p>
                <div className="atlas-account-dialog-actions">
                  <button
                    className="atlas-account-button"
                    disabled={
                      !online || isReadOnly || delegationActionLoading !== null
                    }
                    onClick={() =>
                      void handleResolveAdminDelegation(
                        incomingAdminDelegation,
                        "reject",
                      )
                    }
                  >
                    Rechazar
                  </button>
                  <button
                    className="atlas-account-button is-primary"
                    disabled={
                      !online || isReadOnly || delegationActionLoading !== null
                    }
                    onClick={() =>
                      void handleResolveAdminDelegation(
                        incomingAdminDelegation,
                        "accept",
                      )
                    }
                  >
                    {delegationActionLoading
                      ? "Procesando…"
                      : "Aceptar administración"}
                  </button>
                </div>
              </section>
            )}
            <div className="atlas-people-layout">
              <section
                className="atlas-people-directory"
                aria-labelledby="atlas-people-members"
              >
                <header>
                  <div>
                    <p className="atlas-account-eyebrow">
                      QUIÉNES VAN / {members.length} INTEGRANTE(S)
                    </p>
                    <h2 id="atlas-people-members">Las personas del viaje.</h2>
                  </div>
                  <span>
                    {group.es_publico
                      ? "Acceso por código"
                      : "Acceso con aprobación"}
                  </span>
                </header>
                <ul className="atlas-people-list">
                  {members.map((member) => {
                    const isSelf =
                      String(member.usuario_id) ===
                      String(localUser?.id_usuario);
                    const name =
                      member.nombre || member.email || "Nombre no informado";
                    return (
                      <li key={member.id}>
                        <AccountAvatar src={member.avatar_url} name={name} />
                        <div className="atlas-member-identity">
                          <strong>
                            {name}
                            {isSelf && <span> · tú</span>}
                          </strong>
                          {member.email && <p>{member.email}</p>}
                          <small>{getDisplayRole(member.rol)}</small>
                        </div>
                        {canManageGroup && !isSelf && (
                          <div className="atlas-member-actions">
                            <button
                              className="atlas-account-link"
                              disabled={!online || roleChangeLoading}
                              onClick={() => {
                                setActionError("");
                                setRoleChangeTarget(member);
                              }}
                            >
                              {member.rol === "admin"
                                ? "Cambiar a viajero"
                                : "Delegar administración"}
                            </button>
                            <button
                              className="atlas-account-link is-danger"
                              disabled={!online || removeLoadingId !== null}
                              onClick={() => {
                                setActionError("");
                                setRemoveTarget(member);
                              }}
                            >
                              Retirar del viaje
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
              {canManageGroup && (
                <aside className="atlas-people-access">
                  <p className="atlas-account-eyebrow">
                    ADMINISTRAR / ACCESO AL VIAJE
                  </p>
                  <h2>Una invitación al plan.</h2>
                  <p>
                    {members.length}
                    {group.maximo_miembros
                      ? ` de ${group.maximo_miembros}`
                      : ""}{" "}
                    integrantes actuales.
                  </p>
                  {hasReachedCapacity ? (
                    <div className="atlas-account-notice">
                      Capacidad máxima alcanzada. Puedes consultar las
                      invitaciones existentes; los nuevos accesos dependen del
                      cupo del viaje.
                    </div>
                  ) : (
                    <>
                      <p className="atlas-group-code">
                        <span>Código del viaje</span>
                        <strong>{group.codigo_invitacion}</strong>
                      </p>
                      {inviteLink && (
                        <div className="atlas-people-invite-preview">
                          <label htmlFor="atlas-group-link">
                            Enlace de invitación
                          </label>
                          <input
                            id="atlas-group-link"
                            readOnly
                            value={inviteLink}
                          />
                          <button
                            className="atlas-account-link"
                            onClick={() => void handleCopy()}
                          >
                            {copied ? "Enlace copiado" : "Copiar enlace"}
                          </button>
                        </div>
                      )}
                      {qrBase64 && (
                        <img
                          className="atlas-people-qr"
                          src={qrBase64}
                          alt="Código QR de invitación recibido del servidor"
                        />
                      )}
                      <button
                        className="atlas-account-button"
                        disabled={!online}
                        onClick={() => setIsInviteModalOpen(true)}
                      >
                        Administrar enlace y correos
                      </button>
                    </>
                  )}
                  {isPrivateGroup && (
                    <section className="atlas-people-requests">
                      <h3>Solicitudes de incorporación</h3>
                      {joinRequests.length === 0 ? (
                        <p>No hay solicitudes pendientes.</p>
                      ) : (
                        <ul>
                          {joinRequests.map((request) => (
                            <li key={request.id}>
                              <strong>
                                {request.nombre ||
                                  request.email ||
                                  "Nombre no informado"}
                              </strong>
                              {request.nombre && request.email && (
                                <p>{request.email}</p>
                              )}
                              <small>Solicitud pendiente</small>
                              <div className="atlas-account-dialog-actions">
                                <button
                                  className="atlas-account-button"
                                  disabled={
                                    !online || joinRequestActionLoading !== null
                                  }
                                  onClick={() =>
                                    void handleResolveJoinRequest(
                                      request,
                                      "reject",
                                    )
                                  }
                                >
                                  Rechazar
                                </button>
                                <button
                                  className="atlas-account-button is-primary"
                                  disabled={
                                    !online ||
                                    hasReachedCapacity ||
                                    joinRequestActionLoading !== null
                                  }
                                  onClick={() =>
                                    void handleResolveJoinRequest(
                                      request,
                                      "approve",
                                    )
                                  }
                                >
                                  {joinRequestActionLoading ===
                                  `${request.id}:approve`
                                    ? "Aprobando…"
                                    : "Aprobar"}
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  )}
                  <section className="atlas-people-invitations">
                    <h3>Invitaciones pendientes</h3>
                    {pendingInvitations.length === 0 ? (
                      <p>No hay invitaciones pendientes.</p>
                    ) : (
                      <ul>
                        {pendingInvitations.map((invitation) => (
                          <li key={invitation.id}>
                            <strong>{invitation.email}</strong>
                            <small>Pendiente de aceptar</small>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </aside>
              )}
            </div>
          </div>
        </div>
      </AppLayout>

      {canInviteGroup && (
        <InviteModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          inviteLink={inviteLink}
          qrBase64={qrBase64}
          inviteSettings={inviteSettings}
          groupId={group.id}
          accessToken={accessToken ?? ""}
          members={inviteMembers}
          onInviteSettingsUpdated={(settings) => {
            setInviteSettings(settings);
            persistPanelCache({ inviteSettings: settings });
          }}
          onInvitationsSent={async () => {
            if (!accessToken) return;

            const [membersRes, invitationsRes, joinRequestsRes] =
              await Promise.all([
                groupsService.getMembers(group.id, accessToken),
                groupsService.getInvitations(group.id, accessToken),
                isPrivateGroup
                  ? groupsService.getJoinRequests(group.id, accessToken)
                  : Promise.resolve({ requests: [] }),
              ]);

            setMembers(membersRes.members);
            setInvitations(invitationsRes.invitations);
            setJoinRequests(joinRequestsRes.requests);
            persistPanelCache({
              members: membersRes.members,
              invitations: invitationsRes.invitations,
              joinRequests: joinRequestsRes.requests,
            });
          }}
        />
      )}

      {canManageGroup && roleChangeTarget && (
        <AccountDialog
          title="Confirmar cambio de rol"
          busy={roleChangeLoading}
          onClose={() => setRoleChangeTarget(null)}
        >
          {actionError && (
            <p className="atlas-account-notice is-error" role="alert">
              {actionError}
            </p>
          )}
          <p>
            {roleChangeTarget.rol === "admin"
              ? `¿Confirmas que quieres cambiar a ${roleChangeTarget.nombre || roleChangeTarget.email} a viajero?`
              : `Se enviará una solicitud a ${roleChangeTarget.nombre || roleChangeTarget.email}. Los roles cambian únicamente cuando la persona acepta.`}
          </p>
          <p className="atlas-account-caption">
            La solicitud de administración expira en cinco minutos. Mientras
            esté pendiente, conservas tu rol actual.
          </p>
          <div className="atlas-account-dialog-actions">
            <button
              className="atlas-account-button"
              disabled={roleChangeLoading}
              onClick={() => setRoleChangeTarget(null)}
            >
              Cancelar
            </button>
            <button
              className="atlas-account-button is-primary"
              disabled={roleChangeLoading || !online}
              onClick={() => void handleToggleRole(roleChangeTarget)}
            >
              {roleChangeLoading
                ? "Procesando…"
                : roleChangeTarget.rol === "admin"
                  ? "Confirmar"
                  : "Enviar solicitud"}
            </button>
          </div>
        </AccountDialog>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      <ConfirmDialog
        open={removeTarget !== null}
        title="Expulsar integrante"
        description="Esta acción revocará su acceso al viaje y se notificará a los integrantes conectados."
        details={
          <>
            {removeTarget
              ? removeTarget.nombre || removeTarget.email
              : undefined}
            {actionError && (
              <p className="atlas-account-notice is-error" role="alert">
                {actionError}
              </p>
            )}
          </>
        }
        confirmLabel="Expulsar integrante"
        cancelLabel="Cancelar"
        variant="danger"
        loading={removeTarget ? removeLoadingId === removeTarget.id : false}
        onCancel={() => {
          if (removeLoadingId === null) setRemoveTarget(null);
        }}
        onConfirm={() => {
          if (removeTarget) void handleRemove(removeTarget);
        }}
      />

      <ConfirmDialog
        open={forcedNotice !== null}
        title={forcedNotice?.title ?? "Aviso del viaje"}
        description={
          forcedNotice?.description ?? "Te regresaremos a Mis viajes."
        }
        confirmLabel="Ir a Mis viajes"
        cancelLabel="Cerrar"
        variant="warning"
        onCancel={() => navigate("/my-trips")}
        onConfirm={() => navigate("/my-trips")}
      />
    </>
  );
}

export function GroupPanelPage() {
  const [params] = useSearchParams();
  const { localUser } = useAuth();
  return (
    <GroupPanelWorkspace
      key={
        String(params.get("groupId") || getCurrentGroup()?.id || "") +
        ":" +
        String(localUser?.id_usuario || "")
      }
    />
  );
}
export default GroupPanelPage;
