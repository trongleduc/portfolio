"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toList } from "@/lib/format";

type Entry = { id: string; is_hidden?: boolean; tech_stack?: string[]; start_date?: string | null; end_date?: string | null };

/** Form state for an entry: its columns plus the comma-separated tech stack being typed. */
export type EntryForm<T> = Partial<T> & { tech_stack_input?: string };

/**
 * List + add / edit / hide / delete state for one dated table (work_history,
 * education). Rows are written straight from the browser; RLS guards the writes.
 */
export function useEntryCrud<T extends Entry>({
  table,
  initial,
  empty,
  validate,
}: {
  table: string;
  initial: T[];
  empty: EntryForm<T>;
  /** Returns an error message, or null when the form can be saved. */
  validate: (form: EntryForm<T>) => string | null;
}) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<EntryForm<T> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const openEdit = (item: T) => {
    setError(null);
    setEditing({ ...item, tech_stack_input: toList(item.tech_stack).join(", ") });
  };

  const openNew = () => {
    setError(null);
    setEditing({ ...empty });
  };

  /** Saves the open form; resolves to the saved row, or null on failure. */
  const save = async (): Promise<T | null> => {
    if (!editing) return null;
    const invalid = validate(editing);
    if (invalid) {
      setError(invalid);
      return null;
    }
    setSaving(true);
    setError(null);
    const { tech_stack_input, id, ...rest } = editing;
    const payload = {
      ...rest,
      tech_stack: toList(tech_stack_input),
      start_date: rest.start_date || null,
      end_date: rest.end_date || null,
    };
    const res = id
      ? await supabase.from(table).update(payload).eq("id", id).select()
      : await supabase.from(table).insert([payload]).select();
    setSaving(false);
    if (res.error || !res.data?.[0]) {
      setError(res.error?.message ?? "Save failed.");
      return null;
    }
    const row = res.data[0] as T;
    setItems((list) => (id ? list.map((x) => (x.id === id ? row : x)) : [...list, row]));
    setEditing(null);
    return row;
  };

  const remove = async () => {
    if (!confirmId) return;
    const { error: err } = await supabase.from(table).delete().eq("id", confirmId);
    if (!err) setItems((list) => list.filter((x) => x.id !== confirmId));
    setConfirmId(null);
  };

  const toggleHide = async (item: T) => {
    const { data } = await supabase.from(table).update({ is_hidden: !item.is_hidden }).eq("id", item.id).select();
    if (data?.[0]) setItems((list) => list.map((x) => (x.id === item.id ? (data[0] as T) : x)));
  };

  return {
    items,
    editing,
    setEditing,
    saving,
    error,
    setError,
    confirmId,
    setConfirmId,
    openEdit,
    openNew,
    save,
    remove,
    toggleHide,
    cancel: () => setEditing(null),
  };
}
