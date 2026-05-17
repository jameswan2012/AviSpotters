"use client";

import { useEffect } from "react";

export function PresencePing({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let timer: number | null = null;
    let stopped = false;

    const ping = async () => {
      try {
        // This endpoint is lightweight and will also refresh lastSeenAt on server.
        await fetch("/api/auth/me", { method: "GET", cache: "no-store" });
      } catch {
        // ignore
      }
    };

    const start = () => {
      if (stopped) return;
      if (timer != null) window.clearInterval(timer);
      void ping();
      timer = window.setInterval(() => void ping(), 120_000);
    };

    const onVis = () => {
      if (document.visibilityState === "visible") start();
    };

    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVis);
      if (timer != null) window.clearInterval(timer);
    };
  }, [enabled]);

  return null;
}

