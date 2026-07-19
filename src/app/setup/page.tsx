"use client";

import {
  type FormEvent,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  APPOINTMENT_DAY_LABELS,
  APPOINTMENT_REMINDER_WINDOW_OPTIONS,
  APPOINTMENT_SLOT_DURATION_OPTIONS,
  APPOINTMENT_TIMEZONES,
} from "@/lib/appointment/constants";
import { authClient } from "@/lib/auth-client";

type Step = "config" | "entities" | "availability";

type AvailabilityRule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type EntityRow = {
  id: string;
  name: string;
  description?: string | null;
  availabilityRules: AvailabilityRule[];
};

type ConnectorConfig = {
  entityLabel: string;
  timezone: string;
  slotDurationMinutes: number;
  reminderWindowMinutes: number;
};

type SetupClaims = {
  agentId: string;
  connectorKey: string;
};

const STEPS: { id: Step; label: string }[] = [
  { id: "config", label: "Settings" },
  { id: "entities", label: "Entities" },
  { id: "availability", label: "Availability" },
];

const defaultConfig: ConnectorConfig = {
  entityLabel: "Doctor",
  timezone: "UTC",
  slotDurationMinutes: 30,
  reminderWindowMinutes: 10,
};

const inputClassName =
  "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
const timeInputClassName =
  "h-9 w-[7.75rem] shrink-0 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
const labelClassName =
  "mb-1.5 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";
const hintClassName = "mt-1 text-xs text-zinc-500";
const buttonPrimaryClassName =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";
const buttonOutlineClassName =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-300 bg-transparent px-4 text-sm font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100";
const iconButtonClassName =
  "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950/40";
const footerClassName = "flex items-center justify-between gap-3 pt-2";

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function emptyAvailabilityByDay(): Record<number, AvailabilityRule[]> {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

function rulesFromAvailabilityMap(
  map: Record<number, AvailabilityRule[]>,
): AvailabilityRule[] {
  return Object.values(map).flat();
}

function availabilityMapFromRules(
  rules: AvailabilityRule[],
): Record<number, AvailabilityRule[]> {
  const map = emptyAvailabilityByDay();
  for (const rule of rules) {
    map[rule.dayOfWeek] = [...(map[rule.dayOfWeek] ?? []), rule];
  }
  return map;
}

function setupQuery(claims: SetupClaims) {
  return new URLSearchParams({
    agentId: claims.agentId,
    connectorKey: claims.connectorKey,
  }).toString();
}

function SetupShell({
  step,
  onStepChange,
  error,
  children,
  loading = false,
}: {
  step: Step;
  onStepChange?: (step: Step) => void;
  error: string;
  children: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Appointment setup
        </h1>
        <p className="mt-1 text-sm leading-5 text-zinc-500">
          Configure bookable entities, availability, and slot duration for this
          agent.
        </p>
      </header>

      <nav aria-label="Setup steps" className="mb-6">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((item, index) => {
            const selected = step === item.id;
            const reachable = onStepChange && !loading;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={!reachable}
                  aria-current={selected ? "step" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    onStepChange?.(item.id);
                  }}
                  className={`inline-flex h-9 cursor-pointer items-center rounded-md border px-3 text-sm transition-colors disabled:cursor-default ${
                    selected
                      ? "border-zinc-900 bg-zinc-100 font-medium text-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 dark:text-zinc-50"
                      : "border-zinc-300 text-zinc-500 hover:text-zinc-900 disabled:hover:text-zinc-500 dark:border-zinc-700 dark:hover:text-zinc-100"
                  }`}
                >
                  <span className="tabular-nums">{index + 1}.</span>
                  <span className="ml-1">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div
        className="mb-4 min-h-5"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>

      <div className="relative">
        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-live="polite">
            <div className="h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-10 w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-56 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-10 w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-10 w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <p className="pt-2 text-sm text-zinc-500">Loading setup…</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function AppointmentSetupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentIdParam = searchParams.get("agentId")?.trim() ?? "";
  const connectorKeyParam = searchParams.get("connectorKey")?.trim() ?? "";

  const claims = useMemo((): SetupClaims | null => {
    if (!agentIdParam || !connectorKeyParam) {
      return null;
    }
    return {
      agentId: agentIdParam,
      connectorKey: connectorKeyParam,
    };
  }, [agentIdParam, connectorKeyParam]);

  const setupReturnPath = useMemo(() => {
    const params = new URLSearchParams();
    if (agentIdParam) params.set("agentId", agentIdParam);
    if (connectorKeyParam) params.set("connectorKey", connectorKeyParam);
    const query = params.toString();
    return query ? `/setup?${query}` : "/setup";
  }, [agentIdParam, connectorKeyParam]);

  const { data: session, isPending: sessionPending } = authClient.useSession();
  const isAuthenticated = Boolean(session?.user);

  const [step, setStep] = useState<Step>("config");
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [config, setConfig] = useState<ConnectorConfig>(defaultConfig);
  const [timezoneOptions, setTimezoneOptions] = useState<string[]>([
    ...APPOINTMENT_TIMEZONES,
  ]);
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [newEntityName, setNewEntityName] = useState("");
  const [newEntityDescription, setNewEntityDescription] = useState("");
  const [expandedEntityId, setExpandedEntityId] = useState<string | null>(null);
  const [availabilityDrafts, setAvailabilityDrafts] = useState<
    Record<string, Record<number, AvailabilityRule[]>>
  >({});
  const [savedAvailabilityId, setSavedAvailabilityId] = useState<string | null>(
    null,
  );

  const agentId = claims?.agentId ?? "";

  const loadConnector = useCallback(async () => {
    if (!agentIdParam || !connectorKeyParam) {
      setLoading(false);
      setError("Missing setup params. Return to Agentblit and try again.");
      return;
    }

    const queryClaims: SetupClaims = {
      agentId: agentIdParam,
      connectorKey: connectorKeyParam,
    };

    const browserTimezone =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone?.trim() || ""
        : "";
    if (browserTimezone) {
      setTimezoneOptions((current) =>
        current.includes(browserTimezone)
          ? current
          : [browserTimezone, ...current],
      );
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/connectors/${encodeURIComponent(queryClaims.agentId)}?${setupQuery(queryClaims)}`,
        { credentials: "include" },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        connector?: {
          entityLabel: string;
          timezone: string;
          slotDurationMinutes: number;
          reminderWindowMinutes: number;
          entities: EntityRow[];
        } | null;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load appointment connector");
      }

      if (data.connector) {
        const savedTimezone = data.connector.timezone;
        setTimezoneOptions((current) =>
          current.includes(savedTimezone)
            ? current
            : [savedTimezone, ...current],
        );
        setConfig({
          entityLabel: data.connector.entityLabel,
          timezone: savedTimezone,
          slotDurationMinutes: data.connector.slotDurationMinutes,
          reminderWindowMinutes:
            data.connector.reminderWindowMinutes ?? 10,
        });
        setEntities(data.connector.entities);
        setAvailabilityDrafts(
          Object.fromEntries(
            data.connector.entities.map((entity) => [
              entity.id,
              availabilityMapFromRules(entity.availabilityRules),
            ]),
          ),
        );
        if (data.connector.entities.length > 0) {
          setExpandedEntityId(data.connector.entities[0]?.id ?? null);
        }
      } else if (browserTimezone) {
        setConfig((current) => ({
          ...current,
          timezone: browserTimezone,
        }));
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load appointment connector",
      );
    } finally {
      setLoading(false);
    }
  }, [agentIdParam, connectorKeyParam]);

  useEffect(() => {
    if (sessionPending) return;
    if (!isAuthenticated) {
      router.replace(
        `/login?next=${encodeURIComponent(setupReturnPath)}`,
      );
      return;
    }
    queueMicrotask(() => {
      void loadConnector();
    });
  }, [
    sessionPending,
    isAuthenticated,
    loadConnector,
    router,
    setupReturnPath,
  ]);

  const isBusy = pendingAction !== null;

  async function switchAccount() {
    await authClient.signOut();
    router.replace(`/login?next=${encodeURIComponent(setupReturnPath)}`);
  }

  async function saveConfig(finalize = false) {
    if (!claims || !agentId) {
      setError("Missing setup params. Return to Agentblit and try again.");
      return false;
    }

    setPendingAction(finalize ? "finalize" : "config");
    setError("");
    try {
      const res = await fetch(
        `/api/connectors/${encodeURIComponent(agentId)}?${setupQuery(claims)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityLabel: config.entityLabel,
            timezone: config.timezone,
            slotDurationMinutes: config.slotDurationMinutes,
            reminderWindowMinutes: config.reminderWindowMinutes,
            finalize,
          }),
        },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to save appointment connector");
      }

      if (finalize) {
        window.location.href = `/api/setup/finish?${setupQuery(claims)}`;
      }
      return true;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save appointment connector",
      );
      return false;
    } finally {
      setPendingAction(null);
    }
  }

  async function handleConfigNext(event?: FormEvent) {
    event?.preventDefault();
    const saved = await saveConfig(false);
    if (saved) {
      setStep("entities");
    }
  }

  async function handleAddEntity(event?: FormEvent) {
    event?.preventDefault();
    if (!claims) {
      setError("Missing setup params. Return to Agentblit and try again.");
      return;
    }
    if (!newEntityName.trim()) {
      setError(`Enter a ${config.entityLabel.toLowerCase()} name`);
      return;
    }

    setPendingAction("add-entity");
    setError("");
    try {
      const res = await fetch(
        `/api/connectors/${encodeURIComponent(agentId)}/entities?${setupQuery(claims)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newEntityName.trim(),
            description: newEntityDescription.trim() || undefined,
          }),
        },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        entity?: EntityRow;
      };
      if (!res.ok || !data.ok || !data.entity) {
        throw new Error(data.error ?? "Failed to add entity");
      }

      setEntities((current) =>
        [...current, { ...data.entity!, availabilityRules: [] }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setAvailabilityDrafts((current) => ({
        ...current,
        [data.entity!.id]: emptyAvailabilityByDay(),
      }));
      setExpandedEntityId(data.entity.id);
      setNewEntityName("");
      setNewEntityDescription("");
    } catch (addError) {
      setError(
        addError instanceof Error ? addError.message : "Failed to add entity",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDeleteEntity(entityId: string) {
    if (!claims) {
      setError("Missing setup params. Return to Agentblit and try again.");
      return;
    }
    setPendingAction(`delete-entity:${entityId}`);
    setError("");
    try {
      const res = await fetch(
        `/api/connectors/${encodeURIComponent(agentId)}/entities/${encodeURIComponent(entityId)}?${setupQuery(claims)}`,
        { method: "DELETE", credentials: "include" },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to delete entity");
      }

      setEntities((current) => current.filter((entity) => entity.id !== entityId));
      setAvailabilityDrafts((current) => {
        const next = { ...current };
        delete next[entityId];
        return next;
      });
      if (expandedEntityId === entityId) {
        setExpandedEntityId(null);
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete entity",
      );
    } finally {
      setPendingAction(null);
    }
  }

  function updateAvailabilityDraft(
    entityId: string,
    dayOfWeek: number,
    updater: (rules: AvailabilityRule[]) => AvailabilityRule[],
  ) {
    setSavedAvailabilityId(null);
    setAvailabilityDrafts((current) => {
      const entityMap = current[entityId] ?? emptyAvailabilityByDay();
      return {
        ...current,
        [entityId]: {
          ...entityMap,
          [dayOfWeek]: updater(entityMap[dayOfWeek] ?? []),
        },
      };
    });
  }

  async function handleSaveAvailability(entityId: string) {
    if (!claims) {
      setError("Missing setup params. Return to Agentblit and try again.");
      return;
    }
    const draft = availabilityDrafts[entityId] ?? emptyAvailabilityByDay();
    const rules = rulesFromAvailabilityMap(draft);

    setPendingAction(`availability:${entityId}`);
    setError("");
    setSavedAvailabilityId(null);
    try {
      const res = await fetch(
        `/api/connectors/${encodeURIComponent(agentId)}/entities/${encodeURIComponent(entityId)}/availability?${setupQuery(claims)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rules }),
        },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        rules?: AvailabilityRule[];
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to save availability");
      }

      setEntities((current) =>
        current.map((entity) =>
          entity.id === entityId
            ? { ...entity, availabilityRules: data.rules ?? rules }
            : entity,
        ),
      );
      setSavedAvailabilityId(entityId);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save availability",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function handleFinalize(event?: FormEvent) {
    event?.preventDefault();
    if (entities.length === 0) {
      setError(`Add at least one ${config.entityLabel.toLowerCase()}`);
      setStep("entities");
      return;
    }

    const missingAvailability = entities.some(
      (entity) => (entity.availabilityRules?.length ?? 0) === 0,
    );
    if (missingAvailability) {
      setError("Configure availability for every entity before finishing");
      setStep("availability");
      return;
    }

    await saveConfig(true);
  }

  function goToStep(next: Step) {
    setError("");
    setStep(next);
  }

  const shellLoading = sessionPending || !isAuthenticated || loading;

  return (
    <SetupShell
      step={step}
      onStepChange={shellLoading ? undefined : goToStep}
      error={error}
      loading={shellLoading}
    >
      {isAuthenticated && step === "config" ? (
        <form
          className="flex flex-col space-y-6"
          onSubmit={(event) => void handleConfigNext(event)}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Signed in as{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {session?.user?.email}
              </span>
            </p>
            <button
              type="button"
              className={buttonOutlineClassName}
              onClick={() => void switchAccount()}
            >
              Switch
            </button>
          </div>

          <div>
            <label className={labelClassName} htmlFor="entity-label">
              Entity name
            </label>
            <input
              id="entity-label"
              className={inputClassName}
              value={config.entityLabel}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  entityLabel: event.target.value,
                }))
              }
              placeholder="Doctor"
            />
            <p className={hintClassName}>
              All entities in this connector share one type, such as Doctor or
              Teacher.
            </p>
          </div>

          <div>
            <label className={labelClassName} htmlFor="timezone">
              Business timezone
            </label>
            <select
              id="timezone"
              className={inputClassName}
              value={config.timezone}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))
              }
            >
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
            <p className={hintClassName}>
              Availability windows are interpreted in this timezone. Chat users
              can each use their own local timezone when booking.
            </p>
          </div>

          <div>
            <label className={labelClassName} htmlFor="slot-duration">
              Slot duration
            </label>
            <select
              id="slot-duration"
              className={inputClassName}
              value={config.slotDurationMinutes}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  slotDurationMinutes: Number(event.target.value),
                }))
              }
            >
              {APPOINTMENT_SLOT_DURATION_OPTIONS.map((option) => (
                <option key={option.minutes} value={option.minutes}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClassName} htmlFor="reminder-window">
              Reminder window
            </label>
            <select
              id="reminder-window"
              className={inputClassName}
              value={config.reminderWindowMinutes}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  reminderWindowMinutes: Number(event.target.value),
                }))
              }
            >
              {APPOINTMENT_REMINDER_WINDOW_OPTIONS.map((option) => (
                <option key={option.minutes} value={option.minutes}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className={hintClassName}>
              Send a reminder email to the booker this many minutes before each
              appointment starts.
            </p>
          </div>

          <div className={`${footerClassName} justify-end`}>
            <button
              type="submit"
              className={buttonPrimaryClassName}
              disabled={isBusy}
            >
              {pendingAction === "config" ? "Saving…" : "Continue"}
            </button>
          </div>
        </form>
      ) : null}

      {isAuthenticated && step === "entities" ? (
        <div className="flex flex-col space-y-6">
          <form
            className="space-y-1.5"
            onSubmit={(event) => void handleAddEntity(event)}
          >
            <label className={labelClassName} htmlFor="entity-name">
              Add {config.entityLabel.toLowerCase()}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="entity-name"
                className={`${inputClassName} w-44 shrink-0 sm:w-52`}
                value={newEntityName}
                onChange={(event) => setNewEntityName(event.target.value)}
                placeholder={`${config.entityLabel} 1`}
              />
              <input
                id="entity-description"
                className={`${inputClassName} min-w-0 flex-1`}
                value={newEntityDescription}
                onChange={(event) => setNewEntityDescription(event.target.value)}
                placeholder="Description (optional)"
              />
              <button
                type="submit"
                className={`${buttonOutlineClassName} shrink-0`}
                disabled={isBusy}
              >
                {pendingAction === "add-entity" ? "Adding…" : "Add"}
              </button>
            </div>
          </form>

          <div className="min-h-24">
            {entities.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No {config.entityLabel.toLowerCase()}s added yet.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-300 dark:divide-zinc-800 dark:border-zinc-700">
                {entities.map((entity) => (
                  <li
                    key={entity.id}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-zinc-900 dark:text-zinc-50">
                        {entity.name}
                      </p>
                      {entity.description ? (
                        <p className="truncate text-xs text-zinc-500">
                          {entity.description}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className={iconButtonClassName}
                      onClick={(event) => {
                        event.preventDefault();
                        void handleDeleteEntity(entity.id);
                      }}
                      disabled={isBusy}
                      aria-label={`Delete ${entity.name}`}
                    >
                      <TrashIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={footerClassName}>
            <button
              type="button"
              className={buttonOutlineClassName}
              onClick={(event) => {
                event.preventDefault();
                goToStep("config");
              }}
              disabled={isBusy}
            >
              Back
            </button>
            <button
              type="button"
              className={buttonPrimaryClassName}
              onClick={(event) => {
                event.preventDefault();
                goToStep("availability");
              }}
              disabled={isBusy || entities.length === 0}
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {isAuthenticated && step === "availability" ? (
        <form
          className="flex flex-col space-y-6"
          onSubmit={(event) => void handleFinalize(event)}
        >
          <div>
            {entities.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Add entities before configuring availability.
              </p>
            ) : (
              <div className="space-y-3">
                {entities.map((entity) => {
                  const open = expandedEntityId === entity.id;
                  const draft =
                    availabilityDrafts[entity.id] ?? emptyAvailabilityByDay();

                  return (
                    <div
                      key={entity.id}
                      className="overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700"
                    >
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                        aria-expanded={open}
                        onClick={(event) => {
                          event.preventDefault();
                          setExpandedEntityId(open ? null : entity.id);
                        }}
                      >
                        <span className="w-3 shrink-0 text-xs text-zinc-500">
                          {open ? "▾" : "▸"}
                        </span>
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          {entity.name}
                        </span>
                      </button>

                      {open ? (
                        <div className="space-y-3 border-t border-zinc-300 px-3 py-3 dark:border-zinc-700">
                          {APPOINTMENT_DAY_LABELS.map((label, dayOfWeek) => {
                            const dayRules = draft[dayOfWeek] ?? [];
                            const enabled = dayRules.length > 0;

                            return (
                              <div
                                key={label}
                                className="flex min-h-9 items-start gap-3"
                              >
                                <label className="flex h-9 w-28 shrink-0 cursor-pointer items-center gap-2 text-sm text-zinc-900 dark:text-zinc-50">
                                  <input
                                    type="checkbox"
                                    className="cursor-pointer"
                                    checked={enabled}
                                    onChange={(event) => {
                                      if (event.target.checked) {
                                        updateAvailabilityDraft(
                                          entity.id,
                                          dayOfWeek,
                                          () => [
                                            {
                                              dayOfWeek,
                                              startTime: "09:00",
                                              endTime: "18:00",
                                            },
                                          ],
                                        );
                                      } else {
                                        updateAvailabilityDraft(
                                          entity.id,
                                          dayOfWeek,
                                          () => [],
                                        );
                                      }
                                    }}
                                  />
                                  {label}
                                </label>

                                {enabled ? (
                                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                                    {dayRules.map((rule, index) => (
                                      <div
                                        key={`${dayOfWeek}-${index}`}
                                        className="flex flex-wrap items-center gap-1.5"
                                      >
                                        <input
                                          type="time"
                                          className={timeInputClassName}
                                          value={rule.startTime}
                                          onChange={(event) =>
                                            updateAvailabilityDraft(
                                              entity.id,
                                              dayOfWeek,
                                              (rules) =>
                                                rules.map((item, itemIndex) =>
                                                  itemIndex === index
                                                    ? {
                                                        ...item,
                                                        startTime:
                                                          event.target.value,
                                                      }
                                                    : item,
                                                ),
                                            )
                                          }
                                        />
                                        <span className="shrink-0 text-xs text-zinc-500">
                                          to
                                        </span>
                                        <input
                                          type="time"
                                          className={timeInputClassName}
                                          value={rule.endTime}
                                          onChange={(event) =>
                                            updateAvailabilityDraft(
                                              entity.id,
                                              dayOfWeek,
                                              (rules) =>
                                                rules.map((item, itemIndex) =>
                                                  itemIndex === index
                                                    ? {
                                                        ...item,
                                                        endTime:
                                                          event.target.value,
                                                      }
                                                    : item,
                                                ),
                                            )
                                          }
                                        />
                                        <button
                                          type="button"
                                          className={iconButtonClassName}
                                          onClick={(event) => {
                                            event.preventDefault();
                                            updateAvailabilityDraft(
                                              entity.id,
                                              dayOfWeek,
                                              (rules) =>
                                                rules.filter(
                                                  (_, itemIndex) =>
                                                    itemIndex !== index,
                                                ),
                                            );
                                          }}
                                          aria-label="Remove time window"
                                        >
                                          <TrashIcon className="h-3.5 w-3.5" />
                                        </button>
                                        {index === dayRules.length - 1 ? (
                                          <button
                                            type="button"
                                            className="inline-flex h-8 cursor-pointer items-center rounded-md border border-zinc-300 px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                                            onClick={(event) => {
                                              event.preventDefault();
                                              updateAvailabilityDraft(
                                                entity.id,
                                                dayOfWeek,
                                                (rules) => [
                                                  ...rules,
                                                  {
                                                    dayOfWeek,
                                                    startTime: "14:00",
                                                    endTime: "18:00",
                                                  },
                                                ],
                                              );
                                            }}
                                          >
                                            Add window
                                          </button>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="min-h-9 flex-1" aria-hidden />
                                )}
                              </div>
                            );
                          })}

                          <div className="flex min-h-10 items-center gap-3 pt-1">
                            <button
                              type="button"
                              className={buttonOutlineClassName}
                              onClick={(event) => {
                                event.preventDefault();
                                void handleSaveAvailability(entity.id);
                              }}
                              disabled={isBusy}
                            >
                              {pendingAction === `availability:${entity.id}`
                                ? "Saving…"
                                : "Save availability"}
                            </button>
                            <p className="text-xs text-zinc-500">
                              {savedAvailabilityId === entity.id
                                ? "Saved"
                                : "\u00a0"}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={footerClassName}>
            <button
              type="button"
              className={buttonOutlineClassName}
              onClick={(event) => {
                event.preventDefault();
                goToStep("entities");
              }}
              disabled={isBusy}
            >
              Back
            </button>
            <button
              type="submit"
              className={buttonPrimaryClassName}
              disabled={isBusy}
            >
              {pendingAction === "finalize" ? "Saving…" : "Save and finish"}
            </button>
          </div>
        </form>
      ) : null}
    </SetupShell>
  );
}

export default function AppointmentSetupPage() {
  return (
    <Suspense
      fallback={
        <SetupShell step="config" error="" loading>
          {null}
        </SetupShell>
      }
    >
      <AppointmentSetupWizard />
    </Suspense>
  );
}
