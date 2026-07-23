"use client";

import { ChevronRight, Pencil, Trash2, X } from "lucide-react";
import {
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

export type EntityManagerItem = {
  id: string;
  name: string;
  description?: string | null;
  tags?: string[] | null;
};

function pluralize(label: string) {
  if (label.toLowerCase().endsWith("s")) return label;
  return label + "s";
}

type EntityManagerProps = {
  entityLabel: string;
  entities: EntityManagerItem[];
  pendingAction: string | null;
  loading?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
  onAdd: (input: {
    name: string;
    description: string;
    tags: string[];
  }) => void | Promise<void>;
  onUpdate: (input: {
    entityId: string;
    name: string;
    description: string;
    tags: string[];
  }) => void | Promise<void>;
  onDelete: (entityId: string) => void | Promise<void>;
  onSelect?: (entityId: string) => void;
  onValidationError?: (message: string) => void;
};

function TagsInput({
  tags,
  onChange,
  disabled,
  placeholder = "Tags (optional)",
  id,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const value = raw.trim();
    if (!value) return;
    const exists = tags.some(
      (tag) => tag.toLowerCase() === value.toLowerCase(),
    );
    if (exists) {
      setDraft("");
      return;
    }
    onChange([...tags, value]);
    setDraft("");
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag(draft);
      return;
    }
    if (event.key === "Backspace" && !draft && tags.length > 0) {
      event.preventDefault();
      removeTag(tags.length - 1);
    }
  }

  function handleRemoveClick(
    event: MouseEvent<HTMLButtonElement>,
    index: number,
  ) {
    event.preventDefault();
    event.stopPropagation();
    removeTag(index);
  }

  return (
    <div
      className={`flex min-h-10 min-w-0 flex-1 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-muted px-2 py-1.5 transition-shadow focus-within:border-ring focus-within:bg-card focus-within:ring-2 focus-within:ring-ring/30 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      {tags.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className="group/tag relative inline-flex max-w-full items-center rounded-md bg-card px-2 py-0.5 text-xs font-medium text-foreground ring-1 ring-border"
        >
          <span className="truncate pr-0 transition-[padding] group-hover/tag:pr-4">
            {tag}
          </span>
          <button
            type="button"
            className="absolute right-0.5 top-1/2 inline-flex h-4 w-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/tag:opacity-100 disabled:cursor-not-allowed"
            onClick={(event) => handleRemoveClick(event, index)}
            disabled={disabled}
            aria-label={`Remove tag ${tag}`}
            tabIndex={-1}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        id={id}
        className="min-w-28 flex-1 bg-transparent px-1 py-0.5 text-sm text-foreground outline-none placeholder:text-placeholder-foreground disabled:cursor-not-allowed"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(draft)}
        placeholder={tags.length === 0 ? placeholder : "Add tag…"}
        disabled={disabled}
        aria-label="Tags"
      />
    </div>
  );
}

export function EntityManager({
  entityLabel,
  entities,
  pendingAction,
  loading = false,
  disabled = false,
  emptyMessage,
  onAdd,
  onUpdate,
  onDelete,
  onSelect,
  onValidationError,
}: EntityManagerProps) {
  const [newEntityName, setNewEntityName] = useState("");
  const [newEntityDescription, setNewEntityDescription] = useState("");
  const [newEntityTags, setNewEntityTags] = useState<string[]>([]);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);

  const isBusy = disabled || pendingAction !== null;

  const inputCls =
    "h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none transition-shadow placeholder:text-placeholder-foreground focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/30";
  const btnOutlineCls =
    "inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";
  const btnPrimaryCls =
    "inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!newEntityName.trim()) {
      onValidationError?.(`Enter a ${entityLabel.toLowerCase()} name`);
      return;
    }
    try {
      await onAdd({
        name: newEntityName.trim(),
        description: newEntityDescription.trim(),
        tags: newEntityTags,
      });
      setNewEntityName("");
      setNewEntityDescription("");
      setNewEntityTags([]);
    } catch {
      // Parent reports the error.
    }
  }

  function startEdit(entity: EntityManagerItem) {
    setEditingEntityId(entity.id);
    setEditName(entity.name);
    setEditDescription(entity.description ?? "");
    setEditTags(entity.tags ?? []);
  }

  function cancelEdit() {
    setEditingEntityId(null);
    setEditName("");
    setEditDescription("");
    setEditTags([]);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!editingEntityId) return;
    if (!editName.trim()) {
      onValidationError?.(`Enter a ${entityLabel.toLowerCase()} name`);
      return;
    }
    try {
      await onUpdate({
        entityId: editingEntityId,
        name: editName.trim(),
        description: editDescription.trim(),
        tags: editTags,
      });
      cancelEdit();
    } catch {
      // Parent reports the error.
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-foreground">
          Add {entityLabel.toLowerCase()}
        </p>
        <form className="flex flex-col gap-2" onSubmit={(e) => void handleAdd(e)}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              id="entity-name"
              className={`${inputCls} sm:w-44 sm:shrink-0`}
              value={newEntityName}
              onChange={(event) => setNewEntityName(event.target.value)}
              placeholder={`${entityLabel} name`}
              disabled={isBusy}
            />
            <input
              id="entity-description"
              className={`${inputCls} min-w-0 flex-1`}
              value={newEntityDescription}
              onChange={(event) => setNewEntityDescription(event.target.value)}
              placeholder="Description (optional)"
              disabled={isBusy}
            />
            <button
              type="submit"
              className={`${btnPrimaryCls} shrink-0`}
              disabled={isBusy || !newEntityName.trim()}
            >
              {pendingAction === "add-entity" ? "Adding…" : "Add"}
            </button>
          </div>
          <TagsInput
            id="entity-tags"
            tags={newEntityTags}
            onChange={setNewEntityTags}
            disabled={isBusy}
          />
        </form>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          {pluralize(entityLabel)}
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : entities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {emptyMessage ??
                `No ${entityLabel.toLowerCase()}s yet. Add one above.`}
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {entities.map((entity, index) => {
              const editing = editingEntityId === entity.id;
              const tags = entity.tags ?? [];

              if (editing) {
                return (
                  <li
                    key={entity.id}
                    className={`px-4 py-3 ${index !== 0 ? "border-t border-border" : ""}`}
                  >
                    <form
                      className="space-y-2"
                      onSubmit={(event) => void handleSave(event)}
                    >
                      <input
                        className={inputCls}
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        placeholder="Name"
                        disabled={isBusy}
                        aria-label="Entity name"
                        autoFocus
                      />
                      <TagsInput
                        tags={editTags}
                        onChange={setEditTags}
                        disabled={isBusy}
                      />
                      <input
                        className={inputCls}
                        value={editDescription}
                        onChange={(event) =>
                          setEditDescription(event.target.value)
                        }
                        placeholder="Description (optional)"
                        disabled={isBusy}
                        aria-label="Entity description"
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          className={btnPrimaryCls}
                          disabled={isBusy || !editName.trim()}
                        >
                          {pendingAction === `edit-entity:${entity.id}`
                            ? "Saving…"
                            : "Save"}
                        </button>
                        <button
                          type="button"
                          className={btnOutlineCls}
                          disabled={isBusy}
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </li>
                );
              }

              return (
                <li
                  key={entity.id}
                  className={`flex items-center gap-2 ${
                    index !== 0 ? "border-t border-border" : ""
                  }`}
                >
                  {onSelect ? (
                    <button
                      type="button"
                      className="min-w-0 flex-1 cursor-pointer px-4 py-3.5 text-left transition-colors hover:bg-muted/60"
                      onClick={() => onSelect(entity.id)}
                    >
                      <p className="text-sm font-medium text-foreground">
                        {entity.name}
                      </p>
                      {entity.description ? (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {entity.description}
                        </p>
                      ) : null}
                      {tags.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </button>
                  ) : (
                    <div className="min-w-0 flex-1 px-4 py-3.5">
                      <p className="text-sm font-medium text-foreground">
                        {entity.name}
                      </p>
                      {entity.description ? (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {entity.description}
                        </p>
                      ) : null}
                      {tags.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                  <div className="flex shrink-0 items-center gap-1 pr-3">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => startEdit(entity)}
                      disabled={isBusy}
                      aria-label={`Edit ${entity.name}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => void onDelete(entity.id)}
                      disabled={isBusy}
                      aria-label={`Delete ${entity.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                    {onSelect ? (
                      <ChevronRight
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
