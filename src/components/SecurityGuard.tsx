"use client";

import { useEffect } from "react";

export function SecurityGuard({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const block =
        key === "f12" ||
        (e.ctrlKey && e.shiftKey && (key === "i" || key === "j" || key === "c")) ||
        (e.ctrlKey && key === "u");
      if (block) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [enabled]);

  return null;
}

