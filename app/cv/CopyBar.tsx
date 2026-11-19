"use client";

import { useRef, useState } from "react";

type Props = { label: string; done?: string; onCopy: () => Promise<boolean>; ghost?: boolean; disabled?: boolean };

/** Bouton qui copie, affiche « Copié ✓ » 2 s, ou « Copie impossible » si le navigateur refuse. */
export function CopyButton({ label, done = "Copié ✓", onCopy, ghost = true, disabled }: Props) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const click = async () => {
    const ok = await onCopy();
    setState(ok ? "ok" : "fail");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  };
  return (
    <button type="button" className={ghost ? "cta ghost" : "cta"} onClick={click} disabled={disabled} aria-live="polite">
      {state === "ok" ? done : state === "fail" ? "Copie impossible" : label}
    </button>
  );
}
