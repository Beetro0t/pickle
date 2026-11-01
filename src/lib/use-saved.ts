"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "pickleball-finder:saved";
const EVENT = "pickleball-finder:saved-changed";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  window.localStorage.setItem(KEY, JSON.stringify([...new Set(ids)]));
  window.dispatchEvent(new Event(EVENT));
}

export function useSaved() {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(read());
    setReady(true);
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = read();
    write(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((x) => x !== id));
  }, []);

  const clear = useCallback(() => write([]), []);

  return { ids, ready, toggle, remove, clear, isSaved: (id: string) => ids.includes(id) };
}
