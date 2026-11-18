"use client";
import { useSyncExternalStore } from "react";
import { KEYS, useLocal, writeStore, readLocal } from "./store";

// Coffre : jeton GitHub + clés API chiffrés (AES-GCM, clé dérivée de ta phrase secrète par PBKDF2).
// Sur disque (localStorage) il n'y a que le texte chiffré. Une fois déverrouillés, les secrets
// n'existent qu'en mémoire de l'onglet : fermer ou recharger l'onglet reverrouille.

export type Secrets = { ghToken: string; keys: Record<string, string> };
type Session = { pass: string; secrets: Secrets };

const enc = new TextEncoder();
const dec = new TextDecoder();
const toB64 = (u: Uint8Array) => { let s = ""; u.forEach((b) => (s += String.fromCharCode(b))); return btoa(s); };
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(pass: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 310_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function seal(secrets: Secrets, pass: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(secrets))));
  return JSON.stringify({ v: 1, s: toB64(salt), i: toB64(iv), c: toB64(ct) });
}

async function open(blob: string, pass: string): Promise<Secrets> {
  const { s, i, c } = JSON.parse(blob);
  const key = await deriveKey(pass, fromB64(s));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(i) as BufferSource }, key, fromB64(c) as BufferSource);
  const o = JSON.parse(dec.decode(pt)) as Partial<Secrets>;
  return { ghToken: o.ghToken ?? "", keys: o.keys ?? {} };
}

// ───────── session en mémoire ─────────

let session: Session | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const useSession = () =>
  useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => session, () => null);

export type VaultState = "none" | "locked" | "unlocked";

export function useVault(): { state: VaultState; secrets: Secrets | null } {
  const raw = useLocal(KEYS.vault);
  const s = useSession();
  return { state: s ? "unlocked" : raw ? "locked" : "none", secrets: s?.secrets ?? null };
}

export async function createVault(pass: string, secrets: Secrets) {
  writeStore(KEYS.vault, await seal(secrets, pass));
  session = { pass, secrets };
  emit();
}

export async function unlockVault(pass: string) {
  const blob = readLocal(KEYS.vault);
  if (!blob) throw new Error("Aucun coffre dans ce navigateur.");
  try {
    session = { pass, secrets: await open(blob, pass) };
  } catch {
    throw new Error("Phrase secrète incorrecte.");
  }
  emit();
}

export async function updateSecrets(secrets: Secrets) {
  if (!session) throw new Error("Coffre verrouillé.");
  writeStore(KEYS.vault, await seal(secrets, session.pass));
  session = { ...session, secrets };
  emit();
}

export function lockVault() { session = null; emit(); }

/** Oublie ce navigateur : coffre, réglages et statuts supprimés. */
export function wipeVault() {
  session = null;
  for (const k of [KEYS.vault, KEYS.owner, KEYS.ai, KEYS.advice]) writeStore(k, null);
  emit();
}
