"use client";

import { useMemo } from "react";

function offsetLabel(date: Date) {
  const minutes = -date.getTimezoneOffset();
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${hh}:${mm}`;
}

export function TimeWithTimezone({ iso }: { iso: string | null | undefined }) {
  const text = useMemo(() => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return `${d.toLocaleString()} (${offsetLabel(d)})`;
  }, [iso]);

  return <>{text}</>;
}
