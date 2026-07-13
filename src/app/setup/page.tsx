"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  APPOINTMENT_DAY_LABELS,
  APPOINTMENT_SLOT_DURATION_OPTIONS,
  APPOINTMENT_TIMEZONES,
} from "@/lib/appointment/constants";

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
};

type SetupClaims = {
  workspaceId: string;
  agentId: string;
  connectorKey: string;
};

const defaultConfig: ConnectorConfig = {
  entityLabel: "Doctor",
  timezone: "Asia/Kolkata",
  slotDurationMinutes: 30,
};

const inputClassName =
  "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
const timeInputClassName =
  "h-9 w-[7.75rem] shrink-0 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
const labelClassName =
  "mb-1.5 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";
const hintClassName = "mt-1 text-xs text-zinc-500";
const errorClassName = "mb-4 text-sm text-red-600 dark:text-red-400";
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
    workspaceId: claims.workspaceId,
    connectorKey: claims.connectorKey,
  }).toString();
}

function AppointmentSetupWizard() {
  const searchParams = useSearchParams();
  const agentIdParam = searchParams.get("agentId")?.trim() ?? "";
  const workspaceIdParam = searchParams.get("workspaceId")?.trim() ?? "";
  const connectorKeyParam = searchParams.get("connectorKey")?.trim() ?? "";

  const claims = useMemo((): SetupClaims | null => {
    if (!agentIdParam || !workspaceIdParam || !connectorKeyParam) {
      return null;
    }
    return {
      agentId: agentIdParam,
      workspaceId: workspaceIdParam,
      connectorKey: connectorKeyParam,
    };
  }, [agentIdParam, workspaceIdParam, connectorKeyParam]);

  const [step, setStep] = useState<Step>("config");
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [config, setConfig] = useState<ConnectorConfig>(defaultConfig);
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [newEntityName, setNewEntityName] = useState("");
  const [newEntityDescription, setNewEntityDescription] = useState("");
  const [expandedEntityId, setExpandedEntityId] = useState<string | null>(null);
  const [availabilityDrafts, setAvailabilityDrafts] = useState<
    Record<string, Record<number, AvailabilityRule[]>>
  >({});

  const agentId = claims?.agentId ?? "";

  const loadConnector = useCallback(async () => {
    if (!agentIdParam || !workspaceIdParam || !connectorKeyParam) {
      setLoading(false);
      setError("Missing setup params. Return to Agentblit and try again.");
      return;
    }

    const queryClaims: SetupClaims = {
      agentId: agentIdParam,
      workspaceId: workspaceIdParam,
      connectorKey: connectorKeyParam,
    };

    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/connectors/${encodeURIComponent(queryClaims.agentId)}?${setupQuery(queryClaims)}`,
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        connector?: {
          entityLabel: string;
          timezone: string;
          slotDurationMinutes: number;
          entities: EntityRow[];
        } | null;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load appointment connector");
      }

      if (data.connector) {
        setConfig({
          entityLabel: data.connector.entityLabel,
          timezone: data.connector.timezone,
          slotDurationMinutes: data.connector.slotDurationMinutes,
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
  }, [agentIdParam, workspaceIdParam, connectorKeyParam]);

  useEffect(() => {
    void loadConnector();
  }, [loadConnector]);

  const isBusy = pendingAction !== null;

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityLabel: config.entityLabel,
            timezone: config.timezone,
            slotDurationMinutes: config.slotDurationMinutes,
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

  async function handleConfigNext() {
    const saved = await saveConfig(false);
    if (saved) {
      setStep("entities");
    }
  }

  async function handleAddEntity() {
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
        { method: "DELETE" },
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
    try {
      const res = await fetch(
        `/api/connectors/${encodeURIComponent(agentId)}/entities/${encodeURIComponent(entityId)}/availability?${setupQuery(claims)}`,
        {
          method: "PUT",
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

  async function handleFinalize() {
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

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-zinc-500">Loading setup…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Appointment setup
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Configure bookable {config.entityLabel.toLowerCase()}s, availability,
          and slot duration for this agent.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["config", "entities", "availability"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStep(item)}
            className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors ${
              step === item
                ? "border-zinc-900 bg-zinc-100 text-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 dark:text-zinc-50"
                : "border-zinc-300 text-zinc-500 hover:text-zinc-900 dark:border-zinc-700 dark:hover:text-zinc-100"
            }`}
          >
            {item === "config"
              ? "1. Settings"
              : item === "entities"
                ? "2. Entities"
                : "3. Availability"}
          </button>
        ))}
      </div>

      {error ? <p className={errorClassName}>{error}</p> : null}

      {step === "config" ? (
        <div className="space-y-6">
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
              Timezone
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
              {APPOINTMENT_TIMEZONES.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
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

          <div className="flex justify-end pt-2">
            <button
              type="button"
              className={buttonPrimaryClassName}
              onClick={() => void handleConfigNext()}
              disabled={isBusy}
            >
              {pendingAction === "config" ? "Saving…" : "Continue"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "entities" ? (
        <div className="space-y-6">
          <div>
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
                type="button"
                className={`${buttonOutlineClassName} shrink-0`}
                onClick={() => void handleAddEntity()}
                disabled={isBusy}
              >
                {pendingAction === "add-entity" ? "Adding…" : "Add"}
              </button>
            </div>
          </div>

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
                    onClick={() => void handleDeleteEntity(entity.id)}
                    disabled={isBusy}
                    aria-label={`Delete ${entity.name}`}
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className={footerClassName}>
            <button
              type="button"
              className={buttonOutlineClassName}
              onClick={() => setStep("config")}
              disabled={isBusy}
            >
              Back
            </button>
            <button
              type="button"
              className={buttonPrimaryClassName}
              onClick={() => setStep("availability")}
              disabled={isBusy || entities.length === 0}
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {step === "availability" ? (
        <div className="space-y-6">
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
                      onClick={() =>
                        setExpandedEntityId(open ? null : entity.id)
                      }
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
                              className="flex h-9 items-center gap-3"
                            >
                              <label className="flex w-28 shrink-0 cursor-pointer items-center gap-2 text-sm text-zinc-900 dark:text-zinc-50">
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
                                <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
                                  {dayRules.map((rule, index) => (
                                    <div
                                      key={`${dayOfWeek}-${index}`}
                                      className="flex shrink-0 items-center gap-1.5"
                                    >
                                      {index > 0 ? (
                                        <span
                                          className="mx-0.5 h-4 w-px shrink-0 bg-zinc-300 dark:bg-zinc-700"
                                          aria-hidden
                                        />
                                      ) : null}
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
                                        onClick={() =>
                                          updateAvailabilityDraft(
                                            entity.id,
                                            dayOfWeek,
                                            (rules) =>
                                              rules.filter(
                                                (_, itemIndex) =>
                                                  itemIndex !== index,
                                              ),
                                          )
                                        }
                                        aria-label="Remove time window"
                                      >
                                        <TrashIcon className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    className="inline-flex h-8 shrink-0 cursor-pointer items-center rounded-md border border-zinc-300 px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                                    onClick={() =>
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
                                      )
                                    }
                                  >
                                    Add window
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}

                        <div className="pt-1">
                          <button
                            type="button"
                            className={buttonOutlineClassName}
                            onClick={() =>
                              void handleSaveAvailability(entity.id)
                            }
                            disabled={isBusy}
                          >
                            {pendingAction === `availability:${entity.id}`
                              ? "Saving…"
                              : "Save availability"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          <div className={footerClassName}>
            <button
              type="button"
              className={buttonOutlineClassName}
              onClick={() => setStep("entities")}
              disabled={isBusy}
            >
              Back
            </button>
            <button
              type="button"
              className={buttonPrimaryClassName}
              onClick={() => void handleFinalize()}
              disabled={isBusy}
            >
              {pendingAction === "finalize" ? "Saving…" : "Save and finish"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AppointmentSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-10">
          <p className="text-sm text-zinc-500">Loading setup…</p>
        </div>
      }
    >
      <AppointmentSetupWizard />
    </Suspense>
  );
}
