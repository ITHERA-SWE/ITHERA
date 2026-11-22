import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, FC, ReactNode, SetStateAction } from "react";
import { useAuth } from "../../context/useAuth";
import { useSocket } from "../../hooks/useSocket";
import { useGroupRealtimeRefresh } from "../../hooks/useGroupRealtimeRefresh";
import {
  budgetService,
  type BudgetCategory,
  type BudgetSplitType,
} from "../../services/budget";
import {
  documentsService,
  type DocumentMetadataInput,
  type TripDocument,
  type TripDocumentCategory,
} from "../../services/documents";
import {
  contextLinksService,
  type ContextEntityRef,
  type ContextEntitySummary,
  type ContextLink,
  type ContextLinkOptions,
} from "../../services/context-links";
import { ExpenseDraftForm } from "../budget/ExpenseDraftForm";
import {
  AccountConfirmDialog as ConfirmDialog,
  AccountDialog,
} from "../account/AccountDialog";
import { useNetworkMonitor } from "../../hooks/useNetworkMonitor";
import {
  canDeleteTripDocument,
  documentKind,
  validDocumentFile,
  safeDocumentUrl,
  documentSize as formatBytes,
  documentDate as formatDate,
} from "../account/account-data";
import "../account/accounts-editorial.css";

const ACCEPTED_FILES = ".pdf,.txt,.png,.jpg,.jpeg,.webp";

const CATEGORY_OPTIONS: Array<{ value: TripDocumentCategory; label: string }> =
  [
    { value: "vuelo", label: "Vuelos" },
    { value: "hospedaje", label: "Hospedajes" },
    { value: "gasto", label: "Gastos" },
    { value: "actividad", label: "Actividades" },
    { value: "otro", label: "Otros" },
  ];

const categoryLabel = (value: string): string =>
  CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? "Otros";

interface Props {
  groupId: string | null;
  members?: Array<{
    usuario_id?: string | number;
    id?: string | number;
    nombre?: string;
    email?: string;
  }>;
  currentUser?: {
    id_usuario?: string | number;
    nombre?: string | null;
    email?: string | null;
  } | null;
  onOpenBudget?: () => void;
  onOpenItinerary?: () => void;
  onOpenSubgroups?: () => void;
  isReadOnly?: boolean;
}

type VaultActionModalState =
  | { target: "upload"; mode: "expense" | "activity" }
  | { target: "document"; docId: string; mode: "expense" | "activity" }
  | null;

type VaultActionTab = "associate" | "create";

const EMPTY_LINK_OPTIONS: ContextLinkOptions = {
  expenses: [],
  documents: [],
  activities: [],
  subgroupActivities: [],
};

const VAULT_CACHE_TTL_MS = 2 * 60 * 1000;
const vaultDataCache = new Map<
  string,
  {
    items: TripDocument[];
    links: ContextLink[];
    options: ContextLinkOptions;
    savedAt: number;
  }
>();

function getVaultCache(groupId: string) {
  const cached = vaultDataCache.get(groupId);
  if (!cached) return null;
  if (Date.now() - cached.savedAt > VAULT_CACHE_TTL_MS) {
    vaultDataCache.delete(groupId);
    return null;
  }
  return cached;
}

function VaultSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="rounded-2xl border border-[#E2E8F0] bg-[#FCFDFE] px-4 py-4"
        >
          <div className="h-4 w-56 animate-pulse rounded-full bg-[#E8EEF7]" />
          <div className="mt-3 flex gap-2">
            <div className="h-7 w-20 animate-pulse rounded-full bg-[#F1F5F9]" />
            <div className="h-7 w-16 animate-pulse rounded-full bg-[#F1F5F9]" />
            <div className="h-7 w-28 animate-pulse rounded-full bg-[#F1F5F9]" />
          </div>
          <div className="mt-4 h-10 animate-pulse rounded-xl bg-[#F8FAFC]" />
        </div>
      ))}
    </div>
  );
}

const entityKey = (entity: ContextEntityRef): string =>
  `${entity.type}:${entity.id}`;

const parseEntityKey = (value: string): ContextEntityRef => {
  const [type, ...idParts] = value.split(":");
  return {
    type: type as ContextEntityRef["type"],
    id: idParts.join(":"),
  };
};

const otherEntityForDocument = (
  link: ContextLink,
  documentId: string,
): ContextEntitySummary | null => {
  if (link.entityA.type === "document" && link.entityA.id === documentId)
    return link.entityB;
  if (link.entityB.type === "document" && link.entityB.id === documentId)
    return link.entityA;
  return null;
};

const isVaultContextType = (type: ContextEntityRef["type"]): boolean =>
  type === "expense" || type === "activity" || type === "subgroup_activity";

const todayValue = () => new Date().toISOString().split("T")[0];

function ActionModal({
  open,
  error,
  busy = false,
  title,
  subtitle,
  confirmLabel,
  confirmDisabled = false,
  panelClassName = "max-w-lg",
  onClose,
  onConfirm,
  children,
}: {
  open: boolean;
  error?: string | null;
  busy?: boolean;
  title: string;
  subtitle: string;
  confirmLabel: string;
  confirmDisabled?: boolean;
  panelClassName?: string;
  onClose: () => void;
  onConfirm: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <AccountDialog title={title} onClose={onClose} busy={busy}>
      <div className={`atlas-vault-action ${panelClassName}`}>
        <p className="atlas-account-caption">{subtitle}</p>
        {error && (
          <p role="alert" className="atlas-account-notice is-error">
            {error}
          </p>
        )}
        <fieldset disabled={busy}>{children}</fieldset>
        <div className="atlas-account-dialog-actions">
          <button
            className="atlas-account-button"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="atlas-account-button is-primary"
            onClick={onConfirm}
            disabled={confirmDisabled || busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </AccountDialog>
  );
}

const DocumentVaultWorkspace: FC<Props> = ({
  groupId,
  members = [],
  currentUser = null,
  onOpenBudget,
  onOpenItinerary,
  onOpenSubgroups,
  isReadOnly = false,
}) => {
  const { accessToken, sessionUser, localUser } = useAuth();
  const authOwner = sessionUser?.id || localUser?.auth_user_id || null;
  const vaultKey = String(authOwner || "") + ":" + String(groupId);
  const online = useNetworkMonitor();
  const alive = useRef(true),
    mutationLocks = useRef(new Set<string>());
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [documentQuery, setDocumentQuery] = useState("");
  const { socket } = useSocket(accessToken);
  const [items, setItems] = useState<TripDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // Lock síncrono para evitar subidas duplicadas: el estado isUploading se
  // actualiza de forma asíncrona, así que un doble clic rápido podía disparar
  // handleUpload dos veces antes de re-renderizar y subir el documento dos veces.
  const uploadingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<TripDocumentCategory>("otro");
  const [activeFilter, setActiveFilter] = useState<
    "todos" | TripDocumentCategory
  >("todos");
  const [notes, setNotes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [contextLinks, setContextLinks] = useState<ContextLink[]>([]);
  const [linkOptions, setLinkOptions] =
    useState<ContextLinkOptions>(EMPTY_LINK_OPTIONS);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [selectedActivityKeys, setSelectedActivityKeys] = useState<string[]>(
    [],
  );
  const [editingExpenseIds, setEditingExpenseIds] = useState<string[]>([]);
  const [editingActivityKeys, setEditingActivityKeys] = useState<string[]>([]);
  const [savingLinksDocId, setSavingLinksDocId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<VaultActionModalState>(null);
  const [documentPendingDelete, setDocumentPendingDelete] =
    useState<TripDocument | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(
    null,
  );
  const [expenseFilter, setExpenseFilter] = useState("");
  const [draftExpenseDescription, setDraftExpenseDescription] = useState("");
  const [draftExpenseAmount, setDraftExpenseAmount] = useState("");
  const [draftExpenseCategory, setDraftExpenseCategory] =
    useState<BudgetCategory>("otro");
  const [draftExpenseDate, setDraftExpenseDate] = useState(todayValue());
  const [draftExpensePaidBy, setDraftExpensePaidBy] = useState("");
  const [draftExpenseSplitType, setDraftExpenseSplitType] =
    useState<BudgetSplitType>("equitativa");
  const [draftExpenseSplitAmounts, setDraftExpenseSplitAmounts] = useState<
    Record<string, string>
  >({});
  const [draftExpenseMemberIds, setDraftExpenseMemberIds] = useState<string[]>(
    [],
  );
  const [expenseModalTab, setExpenseModalTab] =
    useState<VaultActionTab>("associate");
  const lastVaultCacheKeyRef = useRef<string | null>(null);
  const itemsLengthRef = useRef(0);

  useEffect(() => {
    itemsLengthRef.current = items.length;
  }, [items.length]);

  const memberOptions = useMemo(
    () =>
      members
        .map((member) => {
          const id = String(member.usuario_id ?? member.id ?? "");
          return {
            id,
            label: member.nombre || member.email || `Usuario ${id}`,
          };
        })
        .filter((member) => member.id.length > 0),
    [members],
  );
  const memberOptionsSafe = useMemo(() => {
    if (memberOptions.length > 0) return memberOptions;
    const fallbackId =
      currentUser?.id_usuario != null ? String(currentUser.id_usuario) : "";
    if (!fallbackId) return [];
    return [
      {
        id: fallbackId,
        label:
          currentUser?.nombre || currentUser?.email || `Usuario ${fallbackId}`,
      },
    ];
  }, [
    currentUser?.email,
    currentUser?.id_usuario,
    currentUser?.nombre,
    memberOptions,
  ]);

  const defaultExpensePayer = useMemo(() => {
    const currentUserId =
      currentUser?.id_usuario != null ? String(currentUser.id_usuario) : "";
    if (
      currentUserId &&
      memberOptionsSafe.some((member) => member.id === currentUserId)
    ) {
      return currentUserId;
    }
    return memberOptionsSafe[0]?.id ?? "";
  }, [currentUser?.id_usuario, memberOptionsSafe]);

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (activeFilter === "todos" || item.category === activeFilter) &&
          `${item.file_name} ${item.metadata?.notes || ""}`
            .toLocaleLowerCase("es-MX")
            .includes(documentQuery.toLocaleLowerCase("es-MX")),
      ),
    [activeFilter, items, documentQuery],
  );

  useEffect(() => {
    if (!draftExpensePaidBy) setDraftExpensePaidBy(defaultExpensePayer);
    if (draftExpenseMemberIds.length === 0 && memberOptionsSafe.length > 0) {
      setDraftExpenseMemberIds(memberOptionsSafe.map((member) => member.id));
    }
  }, [
    defaultExpensePayer,
    draftExpenseMemberIds.length,
    draftExpensePaidBy,
    memberOptionsSafe,
  ]);

  const loadContextLinks = useCallback(async () => {
    if (!groupId || !accessToken) {
      setContextLinks([]);
      setLinkOptions(EMPTY_LINK_OPTIONS);
      return;
    }

    const [linksResponse, optionsResponse] = await Promise.all([
      contextLinksService.list(groupId, accessToken),
      contextLinksService.options(groupId, accessToken),
    ]);
    if (!alive.current) return;
    setContextLinks(linksResponse.links);
    setLinkOptions(optionsResponse.options);

    const cached = getVaultCache(vaultKey);
    if (cached) {
      vaultDataCache.set(vaultKey, {
        ...cached,
        links: linksResponse.links,
        options: optionsResponse.options,
        savedAt: Date.now(),
      });
    }
  }, [accessToken, groupId, vaultKey]);

  const getLinksForDocument = (documentId: string) =>
    contextLinks
      .map((link) => otherEntityForDocument(link, documentId))
      .filter(
        (entity): entity is ContextEntitySummary =>
          entity !== null && isVaultContextType(entity.type),
      );

  const syncDocumentLinks = async (
    documentId: string,
    expenseIds: string[],
    activityKeys: string[],
  ) => {
    if (!groupId || !accessToken) return;

    const desiredEntities: ContextEntityRef[] = [
      ...expenseIds.map((id) => ({ type: "expense" as const, id })),
      ...activityKeys.map(parseEntityKey),
    ];

    const desiredKeys = new Set(desiredEntities.map(entityKey));
    const currentResponse = await contextLinksService.list(
      groupId,
      accessToken,
      {
        type: "document",
        id: documentId,
      },
    );
    const currentRelevant = currentResponse.links
      .map((link) => ({
        link,
        entity: otherEntityForDocument(link, documentId),
      }))
      .filter(
        (item): item is { link: ContextLink; entity: ContextEntitySummary } =>
          item.entity !== null && isVaultContextType(item.entity.type),
      );

    await Promise.all([
      ...currentRelevant
        .filter(({ entity }) => !desiredKeys.has(entityKey(entity)))
        .map(({ link }) =>
          contextLinksService.remove(groupId, link.id, accessToken),
        ),
      ...desiredEntities
        .filter(
          (entity) =>
            !currentRelevant.some(
              (item) => entityKey(item.entity) === entityKey(entity),
            ),
        )
        .map((entity) =>
          contextLinksService.create(
            groupId,
            {
              source: { type: "document", id: documentId },
              target: entity,
            },
            accessToken,
          ),
        ),
    ]);
  };

  const resetLinkSelection = () => {
    setSelectedExpenseIds([]);
    setSelectedActivityKeys([]);
  };

  const resetUploadDraft = () => {
    setUploadFile(null);
    setNotes("");
    resetLinkSelection();
    setActionModal(null);
    setShowUploadModal(false);
  };

  const resetExpenseDraft = () => {
    setExpenseFilter("");
    setDraftExpenseDescription("");
    setDraftExpenseAmount("");
    setDraftExpenseCategory("otro");
    setDraftExpenseDate(todayValue());
    setDraftExpensePaidBy(defaultExpensePayer);
    setDraftExpenseSplitType("equitativa");
    setDraftExpenseSplitAmounts({});
    setDraftExpenseMemberIds(memberOptionsSafe.map((member) => member.id));
  };

  const toggleValue = (
    value: string,
    setter: Dispatch<SetStateAction<string[]>>,
  ) => {
    setter((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const toggleDraftExpenseMember = (memberId: string) => {
    setDraftExpenseMemberIds((prev) => {
      const next = prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId];
      if (next.length === 0) return prev;
      if (!next.includes(draftExpensePaidBy))
        setDraftExpensePaidBy(next[0] ?? "");
      return next;
    });
  };

  const setDraftExpenseSplitAmount = (memberId: string, value: string) => {
    setDraftExpenseSplitAmounts((prev) => ({
      ...prev,
      [memberId]: value,
    }));
  };

  const draftExpenseSplitError = useMemo(() => {
    const totalAmount = parseFloat(draftExpenseAmount) || 0;
    if (draftExpenseSplitType !== "personalizada" || totalAmount <= 0)
      return null;
    const splitSum = memberOptionsSafe
      .filter((member) => draftExpenseMemberIds.includes(member.id))
      .reduce(
        (sum, member) =>
          sum + (parseFloat(draftExpenseSplitAmounts[member.id] ?? "0") || 0),
        0,
      );
    return Math.abs(splitSum - totalAmount) > 0.01
      ? "La division personalizada debe sumar el monto total."
      : null;
  }, [
    draftExpenseAmount,
    draftExpenseMemberIds,
    draftExpenseSplitAmounts,
    draftExpenseSplitType,
    memberOptionsSafe,
  ]);

  const startEditLinks = (item: TripDocument) => {
    const linked = getLinksForDocument(item.id);
    setEditingExpenseIds(
      linked
        .filter((entity) => entity.type === "expense")
        .map((entity) => entity.id),
    );
    setEditingActivityKeys(
      linked
        .filter(
          (entity) =>
            entity.type === "activity" || entity.type === "subgroup_activity",
        )
        .map(entityKey),
    );
  };

  const saveEditedLinks = async (documentId: string) => {
    if (isReadOnly || !online) return;
    if (!groupId || !accessToken) return;
    if (mutationLocks.current.has("links")) return;
    mutationLocks.current.add("links");
    setSavingLinksDocId(documentId);
    setError(null);
    try {
      await syncDocumentLinks(
        documentId,
        editingExpenseIds,
        editingActivityKeys,
      );
      if (!alive.current) return;
      await loadContextLinks();
      if (!alive.current) return;
      setEditingExpenseIds([]);
      setEditingActivityKeys([]);
      setActionModal(null);
    } catch (err) {
      if (!alive.current) return;
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar las asociaciones",
      );
    } finally {
      mutationLocks.current.delete("links");
      if (alive.current) {
        setSavingLinksDocId(null);
      }
    }
  };

  const openDocumentAction = (
    item: TripDocument,
    mode: "expense" | "activity",
  ) => {
    if (isReadOnly || !online) return;
    startEditLinks(item);
    resetExpenseDraft();
    setActionModal({ target: "document", docId: item.id, mode });
  };

  const load = useCallback(
    async (silent = false) => {
      if (!groupId || !accessToken) return;

      const cacheKey = vaultKey;
      const cached = getVaultCache(cacheKey);
      if (cached && !silent) {
        setItems(cached.items);
        setContextLinks(cached.links);
        setLinkOptions(cached.options);
      }

      const hasVisibleData =
        (cached?.items.length ?? itemsLengthRef.current) > 0;
      if (!silent && !hasVisibleData) setIsLoading(true);
      setError(null);
      try {
        const [documents, linksResponse, optionsResponse] = await Promise.all([
          documentsService.list(groupId, accessToken),
          contextLinksService.list(groupId, accessToken),
          contextLinksService.options(groupId, accessToken),
        ]);
        if (!alive.current) return;
        vaultDataCache.set(cacheKey, {
          items: documents,
          links: linksResponse.links,
          options: optionsResponse.options,
          savedAt: Date.now(),
        });
        setItems(documents);
        setContextLinks(linksResponse.links);
        setLinkOptions(optionsResponse.options);
      } catch (err) {
        if (!alive.current) return;
        if (alive.current) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los documentos",
          );
        }
      } finally {
        if (alive.current) {
          setIsLoading(false);
        }
      }
    },
    [accessToken, groupId, vaultKey],
  );

  useEffect(() => {
    const cacheKey = groupId ? vaultKey : null;
    if (cacheKey !== lastVaultCacheKeyRef.current) {
      lastVaultCacheKeyRef.current = cacheKey;
      setItems([]);
      setContextLinks([]);
      setLinkOptions(EMPTY_LINK_OPTIONS);
    }
    void load();
  }, [groupId, accessToken, load, vaultKey]);

  useGroupRealtimeRefresh({
    socket,
    groupId,
    events: ["dashboard_updated"],
    debounceMs: 250,
    onRefresh: async (payload) => {
      const tipo = String(payload.tipo ?? "");
      if (
        tipo.includes("documento") ||
        tipo.includes("gasto") ||
        tipo.includes("actividad")
      ) {
        await load(true);
      }
    },
  });

  const handleUpload = async (file: File | null) => {
    if (isReadOnly || !online) return;
    if (uploadingRef.current) return;
    if (!file || !groupId || !accessToken) return;
    const fileError = validDocumentFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }
    if (!notes.trim()) {
      setError("La nota es obligatoria para subir el documento a la boveda.");
      return;
    }
    if (
      (draftExpenseDescription.trim() || draftExpenseAmount.trim()) &&
      !draftExpenseDescription.trim()
    ) {
      setError("La descripcion del gasto es obligatoria.");
      return;
    }
    if (
      (draftExpenseDescription.trim() || draftExpenseAmount.trim()) &&
      (!Number.isFinite(Number(draftExpenseAmount)) ||
        Number(draftExpenseAmount) <= 0)
    ) {
      setError("El monto del gasto debe ser mayor a 0.");
      return;
    }
    if (
      (draftExpenseDescription.trim() || draftExpenseAmount.trim()) &&
      !draftExpensePaidBy
    ) {
      setError("Selecciona quien pagara el gasto.");
      return;
    }
    if (
      (draftExpenseDescription.trim() || draftExpenseAmount.trim()) &&
      draftExpenseMemberIds.length === 0
    ) {
      setError("Selecciona al menos una persona para el gasto.");
      return;
    }
    if (
      (draftExpenseDescription.trim() || draftExpenseAmount.trim()) &&
      draftExpenseSplitError
    ) {
      setError(draftExpenseSplitError);
      return;
    }
    uploadingRef.current = true;
    setIsUploading(true);
    setError(null);
    let confirmedUpload: TripDocument | null = null;
    try {
      const metadata: DocumentMetadataInput = {
        linked_entity_type: null,
        linked_entity_id: null,
        person_reference: null,
        person_references: [],
        expense_reason: null,
        expense_amount: null,
        notes: notes || null,
      };

      const created = await documentsService.upload(
        groupId,
        file,
        category,
        metadata,
        accessToken,
      );
      confirmedUpload = created;
      const nextExpenseIds = [...selectedExpenseIds];
      const nextActivityKeys = [...selectedActivityKeys];
      if (draftExpenseDescription.trim() && Number(draftExpenseAmount) > 0) {
        const response = await budgetService.createExpense(
          groupId,
          {
            paid_by_user_id: draftExpensePaidBy,
            amount: Number(draftExpenseAmount),
            description: draftExpenseDescription.trim(),
            category: draftExpenseCategory,
            split_type: draftExpenseSplitType,
            member_ids: draftExpenseMemberIds,
            split_amounts:
              draftExpenseSplitType === "personalizada"
                ? Object.fromEntries(
                    draftExpenseMemberIds.map((memberId) => [
                      memberId,
                      parseFloat(draftExpenseSplitAmounts[memberId] ?? "0") ||
                        0,
                    ]),
                  )
                : undefined,
            expense_date: draftExpenseDate || null,
          },
          accessToken,
        );
        const createdExpense = [...response.expenses].sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        )[0];
        if (createdExpense) {
          nextExpenseIds.push(createdExpense.id);
        }
      }
      await syncDocumentLinks(
        created.id,
        Array.from(new Set(nextExpenseIds)),
        Array.from(new Set(nextActivityKeys)),
      );
      await loadContextLinks();
      if (!alive.current) return;
      setItems((prev) => {
        const nextItems = [created, ...prev];
        if (groupId) {
          const cached = getVaultCache(vaultKey);
          vaultDataCache.set(vaultKey, {
            items: nextItems,
            links: cached?.links ?? contextLinks,
            options: cached?.options ?? linkOptions,
            savedAt: Date.now(),
          });
        }
        return nextItems;
      });
      resetExpenseDraft();
      resetUploadDraft();
    } catch (err) {
      if (!alive.current) return;
      if (confirmedUpload) {
        const confirmed = confirmedUpload;
        setItems((prev) => [
          confirmed,
          ...prev.filter((item) => item.id !== confirmed.id),
        ]);
        resetUploadDraft();
        setError(
          "El archivo ya fue guardado, pero no se pudieron confirmar todas sus asociaciones. Puedes revisarlas desde la lista.",
        );
      } else
        setError(
          err instanceof Error ? err.message : "No se pudo subir el documento",
        );
    } finally {
      uploadingRef.current = false;
      if (alive.current) setIsUploading(false);
    }
  };

  const requestDeleteDocument = (document: TripDocument) => {
    if (!canDeleteTripDocument(document, authOwner, isReadOnly) || !online)
      return;
    setError(null);
    setDocumentPendingDelete(document);
  };

  const confirmDeleteDocument = async () => {
    if (isReadOnly || !online) return;
    if (
      !groupId ||
      !accessToken ||
      !documentPendingDelete ||
      !canDeleteTripDocument(documentPendingDelete, authOwner, isReadOnly) ||
      mutationLocks.current.has("delete")
    )
      return;
    mutationLocks.current.add("delete");
    const docId = documentPendingDelete.id;
    setError(null);
    setDeletingDocumentId(docId);
    try {
      await documentsService.remove(groupId, docId, accessToken);
      if (!alive.current) return;
      setItems((prev) => {
        const nextItems = prev.filter((item) => item.id !== docId);
        if (groupId) {
          const cached = getVaultCache(vaultKey);
          vaultDataCache.set(vaultKey, {
            items: nextItems,
            links: (cached?.links ?? contextLinks).filter(
              (link) => otherEntityForDocument(link, docId) === null,
            ),
            options: cached?.options ?? linkOptions,
            savedAt: Date.now(),
          });
        }
        return nextItems;
      });
      setContextLinks((prev) =>
        prev.filter((link) => otherEntityForDocument(link, docId) === null),
      );
      setDocumentPendingDelete(null);
    } catch (err) {
      if (!alive.current) return;
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar el documento",
      );
    } finally {
      mutationLocks.current.delete("delete");
      if (alive.current) setDeletingDocumentId(null);
    }
  };

  const createExpenseForDocument = async (documentId: string) => {
    if (isReadOnly || !online) return;
    if (!groupId || !accessToken) return;
    const amount = Number(draftExpenseAmount);
    const payerId =
      currentUser?.id_usuario != null ? String(currentUser.id_usuario) : "";
    const effectivePayerId = draftExpensePaidBy || payerId;
    if (!effectivePayerId) {
      setError("No se encontro tu usuario para registrar el gasto.");
      return;
    }
    if (!draftExpenseDescription.trim()) {
      setError("La descripcion del gasto es obligatoria.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("El monto del gasto debe ser mayor a 0.");
      return;
    }
    if (!draftExpensePaidBy) {
      setError("Selecciona quien pagara el gasto.");
      return;
    }
    if (draftExpenseMemberIds.length === 0) {
      setError("Selecciona al menos una persona para el gasto.");
      return;
    }
    if (draftExpenseSplitError) {
      setError(draftExpenseSplitError);
      return;
    }

    if (mutationLocks.current.has("links")) return;
    mutationLocks.current.add("links");
    setSavingLinksDocId(documentId);
    try {
      setError(null);
      const response = await budgetService.createExpense(
        groupId,
        {
          paid_by_user_id: effectivePayerId,
          amount,
          description: draftExpenseDescription.trim(),
          category: draftExpenseCategory,
          split_type: draftExpenseSplitType,
          member_ids: draftExpenseMemberIds,
          split_amounts:
            draftExpenseSplitType === "personalizada"
              ? Object.fromEntries(
                  draftExpenseMemberIds.map((memberId) => [
                    memberId,
                    parseFloat(draftExpenseSplitAmounts[memberId] ?? "0") || 0,
                  ]),
                )
              : undefined,
          expense_date: draftExpenseDate || null,
        },
        accessToken,
      );
      const createdExpense = [...response.expenses].sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime(),
      )[0];
      if (!createdExpense)
        throw new Error("No se pudo ubicar el gasto creado.");
      await contextLinksService.create(
        groupId,
        {
          source: { type: "document", id: documentId },
          target: { type: "expense", id: createdExpense.id },
        },
        accessToken,
      );
      if (!alive.current) return;
      resetExpenseDraft();
      setActionModal(null);
      await load();
    } catch (err) {
      if (!alive.current) return;
      setError(
        err instanceof Error ? err.message : "No se pudo crear el gasto",
      );
    } finally {
      mutationLocks.current.delete("links");
      if (alive.current) setSavingLinksDocId(null);
    }
  };

  return (
    <div className="atlas-vault">
      <header className="atlas-account-heading">
        <div>
          <p className="atlas-account-eyebrow">EL VIAJE / ARCHIVOS</p>
          <h1>
            Lo que necesitas.
            <br />
            <em>Siempre en el plan.</em>
          </h1>
          <p>
            Boletos, reservas y documentos compartidos, con sus notas y
            asociaciones existentes.
          </p>
        </div>
        <div className="atlas-account-heading-actions">
          {!isReadOnly && (
            <button
              className="atlas-account-button is-primary"
              disabled={!online || isUploading}
              onClick={() => {
                setError(null);
                setShowUploadModal(true);
              }}
            >
              Subir documento ↗
            </button>
          )}
          <button
            className="atlas-account-button"
            disabled={!online || isLoading}
            onClick={() => void load()}
          >
            {isLoading ? "Actualizando…" : "Actualizar archivos"}
          </button>
        </div>
      </header>
      {!online && (
        <div className="atlas-account-notice" role="status">
          Sin conexión. Puedes consultar los archivos cargados; abrir sus
          enlaces y guardar cambios requieren acceso al servicio.
        </div>
      )}
      {isReadOnly && (
        <div className="atlas-account-notice" role="status">
          Viaje en modo lectura. Puedes abrir los documentos existentes, sin
          subir, relacionar ni eliminar archivos.
        </div>
      )}
      {error && (
        <div className="atlas-account-notice is-error" role="alert">
          {error}
        </div>
      )}
      <div className="atlas-vault-tools">
        <div role="group" aria-label="Categorías de documentos">
          {[{ value: "todos", label: "Todos" }, ...CATEGORY_OPTIONS].map(
            (option) => (
              <button
                key={option.value}
                aria-pressed={activeFilter === option.value}
                onClick={() =>
                  setActiveFilter(option.value as typeof activeFilter)
                }
              >
                {option.label}
              </button>
            ),
          )}
        </div>
        <label htmlFor="atlas-document-query">
          Buscar archivo
          <input
            id="atlas-document-query"
            type="search"
            value={documentQuery}
            onChange={(e) => setDocumentQuery(e.target.value)}
            placeholder="Nombre o nota"
          />
        </label>
        <span role="status">{filteredItems.length} documento(s)</span>
      </div>
      {isLoading && items.length === 0 ? (
        <VaultSkeleton />
      ) : filteredItems.length === 0 ? (
        <section className="atlas-vault-empty">
          <span aria-hidden="true">↗</span>
          <h2>
            {error
              ? "No se pudo cargar la colección."
              : items.length
                ? "No hay archivos con esta selección."
                : "Un lugar para los detalles del viaje."}
          </h2>
          <p>
            {error
              ? "Reintenta actualizar los archivos."
              : items.length
                ? "Cambia la categoría o la búsqueda para ver los demás documentos."
                : "Los documentos que compartas aparecerán aquí con su información real y sus vínculos al viaje."}
          </p>
          {!isReadOnly && !error && (
            <button
              className="atlas-account-button"
              disabled={!online}
              onClick={() => {
                setError(null);
                setShowUploadModal(true);
              }}
            >
              Subir primer documento
            </button>
          )}
        </section>
      ) : (
        <div className="atlas-vault-list" aria-label="Documentos compartidos">
          {filteredItems.map((item) => {
            const linked = getLinksForDocument(item.id),
              url = safeDocumentUrl(item.file_url);
            const author =
              String(item.user_id) === String(authOwner)
                ? localUser?.nombre
                : null;
            return (
              <article key={item.id} className="atlas-document-row">
                <span className="atlas-document-type" aria-hidden="true">
                  {documentKind(item.mime_type, item.file_name)}
                </span>
                <div className="atlas-document-info">
                  <h2>
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer">
                        {item.file_name}
                      </a>
                    ) : (
                      item.file_name
                    )}
                  </h2>
                  <p>
                    {categoryLabel(item.category)} ·{" "}
                    {formatBytes(item.file_size)} ·{" "}
                    {formatDate(item.created_at)}
                  </p>
                  {author && <p>Compartido por {author}</p>}
                  {item.metadata?.generatedBy === "checkout_simulation" && (
                    <span className="atlas-document-protected">
                      Comprobante de operación simulada
                    </span>
                  )}
                  {item.metadata?.immutable === true && (
                    <span className="atlas-document-protected">
                      Documento protegido contra eliminación
                    </span>
                  )}
                  {item.metadata?.notes && (
                    <p className="atlas-document-note">
                      {String(item.metadata.notes)}
                    </p>
                  )}
                  {typeof item.metadata?.folio === "string" && (
                    <p>Folio: {item.metadata.folio}</p>
                  )}
                  {typeof item.metadata?.receipt_folio === "string" && (
                    <p>Folio: {item.metadata.receipt_folio}</p>
                  )}
                  {linked.length > 0 ? (
                    <ul className="atlas-document-links">
                      {linked.map((entity) => (
                        <li key={entityKey(entity)}>
                          <button
                            className="atlas-account-link"
                            onClick={() =>
                              entity.type === "expense"
                                ? onOpenBudget?.()
                                : entity.type === "subgroup_activity"
                                  ? onOpenSubgroups?.()
                                  : onOpenItinerary?.()
                            }
                          >
                            {entity.type === "expense"
                              ? "Gasto"
                              : entity.type === "subgroup_activity"
                                ? "Subgrupo"
                                : "Actividad"}{" "}
                            · {entity.label} ↗
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <small>No hay asociaciones confirmadas.</small>
                  )}
                </div>
                <div className="atlas-document-actions">
                  {url ? (
                    <a
                      className="atlas-account-link"
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir / descargar ↗
                    </a>
                  ) : (
                    <small>Enlace no disponible</small>
                  )}
                  {!isReadOnly && (
                    <>
                      <button
                        className="atlas-account-link"
                        disabled={!online}
                        onClick={() => {
                          setExpenseModalTab("associate");
                          openDocumentAction(item, "expense");
                        }}
                      >
                        Elegir gasto
                      </button>
                      <button
                        className="atlas-account-link"
                        disabled={!online}
                        onClick={() => openDocumentAction(item, "activity")}
                      >
                        Elegir actividad
                      </button>
                      {canDeleteTripDocument(item, authOwner, isReadOnly) && (
                        <button
                          className="atlas-account-link is-danger"
                          disabled={!online || deletingDocumentId !== null}
                          onClick={() => requestDeleteDocument(item)}
                        >
                          Eliminar documento
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={documentPendingDelete !== null}
        title="Eliminar documento"
        description="Esta acción es irreversible. El documento se eliminará de la bóveda del viaje solo si confirmas la operación."
        details={
          <>
            {documentPendingDelete?.file_name ?? "Documento seleccionado"}
            {error && (
              <p className="atlas-account-notice is-error" role="alert">
                {error}
              </p>
            )}
          </>
        }
        confirmLabel="Eliminar documento"
        cancelLabel="Conservar"
        variant="danger"
        loading={
          documentPendingDelete !== null &&
          deletingDocumentId === documentPendingDelete.id
        }
        onCancel={() => {
          if (deletingDocumentId === null) setDocumentPendingDelete(null);
        }}
        onConfirm={() => {
          void confirmDeleteDocument();
        }}
      />

      <ActionModal
        error={error}
        busy={isUploading || savingLinksDocId !== null}
        open={showUploadModal && !actionModal && !isReadOnly}
        title="Subir documento"
        subtitle="Guarda un archivo del viaje con una nota clara. Si quieres, después lo relacionas con un gasto o una actividad existente."
        confirmLabel={isUploading ? "Subiendo..." : "Subir a boveda"}
        confirmDisabled={!online || isUploading || !uploadFile || !notes.trim()}
        panelClassName="max-w-xl"
        onClose={() => {
          if (isUploading) return;
          resetUploadDraft();
        }}
        onConfirm={() => void handleUpload(uploadFile)}
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-dashed border-[#C9D8F5] bg-[#F8FBFF] px-4 py-4">
            <label className="mb-2 block font-body text-xs font-semibold uppercase tracking-wide text-[#7A8799]">
              Archivo
            </label>
            <input
              id="atlas-upload-file"
              aria-label="Archivo del viaje"
              type="file"
              accept={ACCEPTED_FILES}
              onChange={(event) =>
                setUploadFile(event.target.files?.[0] ?? null)
              }
              className="w-full rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 font-body text-sm text-[#3D4A5C] outline-none focus:border-[#1E6FD9]"
            />
            <p className="mt-2 font-body text-xs text-[#7A8799]">
              PDF, TXT, PNG, JPG o WEBP · máximo 10 MB.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="max-w-[220px]">
              <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wide text-[#7A8799]">
                Categoría
              </label>
              <select
                aria-label="Categoría del documento"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as TripDocumentCategory)
                }
                className="w-full rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 font-body text-sm outline-none focus:border-[#1E6FD9]"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wide text-[#7A8799]">
                Nota
              </label>
              <textarea
                aria-label="Nota del documento"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ej. Boleto de ferry, reservación del hotel o recibo de la comida del primer día."
                rows={4}
                className="w-full resize-none rounded-xl border border-[#D7DEEA] bg-white px-3 py-3 font-body text-sm outline-none focus:border-[#1E6FD9]"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-body text-sm font-semibold text-[#1E0A4E]">
                  Vincular este comprobante con una actividad o gasto
                </p>
                <p className="mt-1 font-body text-xs text-[#64748B]">
                  Relaciona este comprobante con un gasto (taxi, entradas,
                  comida) o una actividad (tour, cena, traslado).
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpenseModalTab("associate");
                    setActionModal({ target: "upload", mode: "expense" });
                  }}
                  className="rounded-xl border border-[#D7DEEA] bg-white px-3 py-2 font-body text-xs font-semibold text-[#1E6FD9]"
                >
                  Elegir gasto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionModal({ target: "upload", mode: "activity" });
                  }}
                  className="rounded-xl border border-[#D7DEEA] bg-white px-3 py-2 font-body text-xs font-semibold text-[#7A4FD6]"
                >
                  Elegir actividad
                </button>
              </div>
            </div>

            {selectedExpenseIds.length > 0 ||
            selectedActivityKeys.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedExpenseIds.map((expenseId) => {
                  const expense = linkOptions.expenses.find(
                    (item) => item.id === expenseId,
                  );
                  if (!expense) return null;
                  return (
                    <span
                      key={expenseId}
                      className="rounded-full border border-[#CFE0FF] bg-[#EEF4FF] px-3 py-1.5 font-body text-xs font-semibold text-[#1E6FD9]"
                    >
                      Gasto: {expense.label}
                    </span>
                  );
                })}
                {selectedActivityKeys.map((activityKey) => {
                  const activity = [
                    ...linkOptions.activities,
                    ...linkOptions.subgroupActivities,
                  ].find((item) => entityKey(item) === activityKey);
                  if (!activity) return null;
                  return (
                    <span
                      key={activityKey}
                      className="rounded-full border border-[#D8C8FF] bg-[#F3EEFF] px-3 py-1.5 font-body text-xs font-semibold text-[#5B35B1]"
                    >
                      {activity.type === "subgroup_activity"
                        ? "Subgrupo"
                        : "Actividad"}
                      : {activity.label}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 font-body text-xs text-[#7A8799]">
                Sin relaciones seleccionadas por ahora.
              </p>
            )}
          </div>
        </div>
      </ActionModal>

      <ActionModal
        error={error}
        busy={isUploading || savingLinksDocId !== null}
        open={actionModal?.mode === "expense" && !isReadOnly}
        title="Vincular este comprobante con una actividad o gasto"
        subtitle="Elige o crea el gasto de este comprobante, por ejemplo taxi, entradas o comida."
        confirmLabel={
          expenseModalTab === "associate"
            ? actionModal?.target === "document" && savingLinksDocId
              ? "Guardando..."
              : "Guardar seleccion"
            : actionModal?.target === "document"
              ? "Crear y asociar"
              : "Guardar gasto"
        }
        confirmDisabled={
          !online ||
          (actionModal?.target === "document" && savingLinksDocId != null)
        }
        onClose={() => setActionModal(null)}
        onConfirm={() => {
          if (expenseModalTab === "associate") {
            if (actionModal?.target === "document")
              void saveEditedLinks(actionModal.docId);
            else setActionModal(null);
            return;
          }
          if (actionModal?.target === "document")
            void createExpenseForDocument(actionModal.docId);
          else setActionModal(null);
        }}
      >
        <div className="mb-4 inline-flex rounded-lg border border-[#D7DEEA] bg-[#F8FAFC] p-1">
          <button
            type="button"
            onClick={() => setExpenseModalTab("associate")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${expenseModalTab === "associate" ? "bg-[#1E6FD9] text-white" : "text-[#475569]"}`}
          >
            Asociar
          </button>
          <button
            type="button"
            onClick={() => setExpenseModalTab("create")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${expenseModalTab === "create" ? "bg-[#1E6FD9] text-white" : "text-[#475569]"}`}
          >
            Crear
          </button>
        </div>
        {expenseModalTab === "associate" ? (
          <div className="space-y-3">
            <input
              value={expenseFilter}
              onChange={(event) => setExpenseFilter(event.target.value)}
              placeholder="Filtrar gastos"
              className="w-full rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 font-body text-sm outline-none focus:border-[#1E6FD9]"
            />
            <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
              {linkOptions.expenses
                .filter((expense) => {
                  const filter = expenseFilter.trim().toLowerCase();
                  if (!filter) return true;
                  return `${expense.label} ${expense.subtitle ?? ""}`
                    .toLowerCase()
                    .includes(filter);
                })
                .map((expense) => {
                  const selected =
                    actionModal?.target === "document"
                      ? editingExpenseIds.includes(expense.id)
                      : selectedExpenseIds.includes(expense.id);
                  return (
                    <button
                      key={expense.id}
                      type="button"
                      onClick={() =>
                        actionModal?.target === "document"
                          ? toggleValue(expense.id, setEditingExpenseIds)
                          : toggleValue(expense.id, setSelectedExpenseIds)
                      }
                      className={`max-w-full rounded-full border px-3 py-1.5 font-body text-xs font-semibold ${selected ? "border-[#1E6FD9] bg-[#1E6FD9] text-white" : "border-[#D7DEEA] bg-white text-[#3D4A5C]"}`}
                    >
                      <span className="inline-block max-w-[220px] truncate align-bottom">
                        {expense.label}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        ) : (
          <ExpenseDraftForm
            amount={draftExpenseAmount}
            description={draftExpenseDescription}
            date={draftExpenseDate}
            category={draftExpenseCategory}
            paidBy={draftExpensePaidBy}
            splitType={draftExpenseSplitType}
            splitAmounts={draftExpenseSplitAmounts}
            selectedMemberIds={draftExpenseMemberIds}
            members={memberOptionsSafe}
            onAmountChange={setDraftExpenseAmount}
            onDescriptionChange={setDraftExpenseDescription}
            onDateChange={setDraftExpenseDate}
            onCategoryChange={setDraftExpenseCategory}
            onPaidByChange={setDraftExpensePaidBy}
            onSplitTypeChange={setDraftExpenseSplitType}
            onSplitAmountChange={setDraftExpenseSplitAmount}
            onToggleMember={toggleDraftExpenseMember}
          />
        )}
      </ActionModal>

      <ActionModal
        error={error}
        busy={isUploading || savingLinksDocId !== null}
        open={actionModal?.mode === "activity" && !isReadOnly}
        title="Vincular este comprobante con una actividad o gasto"
        subtitle="Elige la actividad relacionada con este comprobante, por ejemplo tour, cena o traslado."
        confirmLabel={
          actionModal?.target === "document" && savingLinksDocId
            ? "Guardando..."
            : "Guardar seleccion"
        }
        confirmDisabled={
          !online ||
          (actionModal?.target === "document" && savingLinksDocId != null)
        }
        onClose={() => setActionModal(null)}
        onConfirm={() => {
          if (actionModal?.target === "document")
            void saveEditedLinks(actionModal.docId);
          else setActionModal(null);
        }}
      >
        <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
          {[...linkOptions.activities, ...linkOptions.subgroupActivities].map(
            (activity) => {
              const key = entityKey(activity);
              const selected =
                actionModal?.target === "document"
                  ? editingActivityKeys.includes(key)
                  : selectedActivityKeys.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    actionModal?.target === "document"
                      ? toggleValue(key, setEditingActivityKeys)
                      : toggleValue(key, setSelectedActivityKeys)
                  }
                  className={`max-w-full rounded-full border px-3 py-1.5 font-body text-xs font-semibold ${selected ? "border-[#7A4FD6] bg-[#7A4FD6] text-white" : "border-[#D7DEEA] bg-white text-[#3D4A5C]"}`}
                >
                  <span className="mr-1 text-[10px] opacity-75">
                    {activity.type === "subgroup_activity"
                      ? "Subgrupo"
                      : "Itinerario"}
                  </span>
                  <span className="inline-block max-w-[190px] truncate align-bottom">
                    {activity.label}
                  </span>
                </button>
              );
            },
          )}
        </div>
      </ActionModal>
    </div>
  );
};

export const DocumentVaultPanel: FC<Props> = (props) => {
  const { sessionUser, localUser } = useAuth();
  return (
    <DocumentVaultWorkspace
      key={
        String(props.groupId) +
        ":" +
        String(sessionUser?.id || localUser?.auth_user_id || "")
      }
      {...props}
    />
  );
};
