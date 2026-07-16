"use client";

import { useState, useEffect, useCallback } from "react";

// SCAFFOLDING — client-only vote-start alerts.
//
// This is the MVP of "tell me when a vote is happening": it asks for browser
// notification permission and fires a LOCAL notification when the page detects
// a live vote (see the poller in LobbyCam). It needs no backend, so it works
// today — but it only fires while the user has the tab open.
//
// The full system (push when the tab is closed, email, SMS, per-representative
// targeting) is battle plan Tasks 15/28/29/32 and needs a server + database.
// That's tracked as deferred in PROGRESS.md.

export type AlertPermission = "unsupported" | "default" | "granted" | "denied";

const STORAGE_KEY = "lobbycam:voteAlerts";

export function readAlertOptIn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "on";
}

export default function VoteAlertButton() {
  const [perm, setPerm] = useState<AlertPermission>("default");
  const [optedIn, setOptedIn] = useState(false);

  useEffect(() => {
    // Client-only initialization: Notification permission and localStorage
    // don't exist during SSR, so this must run after mount to avoid a
    // hydration mismatch.
    /* eslint-disable react-hooks/set-state-in-effect -- intentional client-only init, see comment */
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPerm("unsupported");
      return;
    }
    setPerm(Notification.permission as AlertPermission);
    setOptedIn(readAlertOptIn());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const enable = useCallback(async () => {
    if (!("Notification" in window)) return;
    const result = (await Notification.requestPermission()) as AlertPermission;
    setPerm(result);
    if (result === "granted") {
      window.localStorage.setItem(STORAGE_KEY, "on");
      setOptedIn(true);
      new Notification("LOBBY CAM alerts on", {
        body: "You'll be notified here when a floor vote is underway.",
      });
    }
  }, []);

  const disable = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, "off");
    setOptedIn(false);
  }, []);

  if (perm === "unsupported") return null;

  const active = perm === "granted" && optedIn;

  return (
    <button
      onClick={active ? disable : enable}
      className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide px-2 py-1"
      style={{
        fontSize: 10,
        cursor: "pointer",
        border: `1px solid ${active ? "var(--red)" : "var(--rule)"}`,
        background: active ? "rgba(200,16,46,0.06)" : "var(--white-warm)",
        color: active ? "var(--red)" : "var(--muted-dark)",
        letterSpacing: "0.06em",
      }}
      title={
        perm === "denied"
          ? "Notifications are blocked in your browser settings"
          : active
            ? "You'll get a browser alert when a vote starts. Click to turn off."
            : "Get a browser alert when a floor vote starts"
      }
      aria-pressed={active}
    >
      <span aria-hidden="true">{active ? "🔔" : "🔕"}</span>
      {perm === "denied" ? "Alerts blocked" : active ? "Vote alerts on" : "Alert me on votes"}
    </button>
  );
}
