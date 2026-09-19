"use client";

import { useEffect, useState } from "react";

export type ClientSessionUser = {
  id: string;
  name: string;
  email: string;
  workspaceId: string;
  role: string;
};

export type ClientSessionState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: ClientSessionUser }
  | { status: "unauthenticated"; user: null };

const LOADING: ClientSessionState = { status: "loading", user: null };

let cached: ClientSessionState | undefined;
let inflight: Promise<ClientSessionState> | null = null;
const listeners = new Set<(state: ClientSessionState) => void>();

async function fetchSession(): Promise<ClientSessionState> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    const payload = (await res.json()) as {
      data?: { authenticated?: boolean; user?: ClientSessionUser | null };
    };
    if (res.ok && payload.data?.authenticated && payload.data.user) {
      return { status: "authenticated", user: payload.data.user };
    }
    return { status: "unauthenticated", user: null };
  } catch {
    return { status: "unauthenticated", user: null };
  }
}

function publish(state: ClientSessionState): void {
  cached = state;
  for (const listener of Array.from(listeners)) listener(state);
}

/**
 * Loads the session once per page load and caches it module-wide so that
 * navigating between tabs/pages never re-fetches (or flashes a fallback).
 * Set `force` to always hit the network in the background (self-heals stale
 * caches after login/logout without blocking the first paint).
 */
async function loadSession(force = false): Promise<ClientSessionState> {
  if (!force && cached) return cached;
  if (!inflight) {
    inflight = fetchSession()
      .then((state) => {
        publish(state);
        return state;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * Returns the session synchronously from the shared module cache (no loading
 * flash on navigation) and triggers a background revalidation to keep it
 * correct after login/logout.
 */
export function useClientSession(): ClientSessionState {
  const [state, setState] = useState<ClientSessionState>(
    cached ?? { status: "loading", user: null }
  );

  useEffect(() => {
    listeners.add(setState);
    if (cached) setState(cached);
    loadSession(true).then((next) => setState(next));
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}

/**
 * Drops the cached session immediately (e.g. after logout or login) so the
 * next navigation reflects the current cookie instead of a stale user.
 */
export function resetClientSession(): void {
  if (cached) {
    cached = undefined;
    for (const listener of Array.from(listeners)) listener(LOADING);
  }
}