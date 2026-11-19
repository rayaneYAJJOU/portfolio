"use client";

import { useState } from "react";
import { unlockVault } from "../../lib/vault";

export function UnlockBar() {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const go = async () => {
    setErr("");
    try { await unlockVault(pass); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };
  return (
    <div className="panel viewBar unlock">
      <input type="password" placeholder="Phrase secrète" value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} aria-label="Phrase secrète" />
      <button className="cta" onClick={go} disabled={!pass}>Déverrouiller</button>
      {err ? <span className="hint small">{err}</span> : null}
    </div>
  );
}
