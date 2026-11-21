import fs from "fs";
import path from "path";
import { DEFAULT_PARAMS, Params } from "./params";

/**
 * Prosty magazyn parametrów: plik JSON (data/params.json) z historią zmian.
 * Na środowiskach tylko do odczytu (np. serverless) działa w pamięci.
 * W produkcji: baza danych + audyt + role (np. Azure AD / Keycloak).
 */
const DIR = path.join(process.cwd(), "data");
const FILE = path.join(DIR, "params.json");
const HIST = path.join(DIR, "params-history.json");

let memory: Params | null = null;
let memoryHistory: { at: string; by: string; version: number; changes: string[] }[] = [];

function merge<T>(def: T, val: unknown): T {
  if (Array.isArray(def)) return (Array.isArray(val) ? val : def) as T;
  if (def && typeof def === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(def as object)) out[k] = merge((def as Record<string, unknown>)[k], (val as Record<string, unknown> | undefined)?.[k]);
    return out as T;
  }
  return (val === undefined || val === null ? def : val) as T;
}

export function getParams(): Params {
  if (memory) return memory;
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
    memory = merge(DEFAULT_PARAMS, raw);
  } catch {
    memory = structuredClone(DEFAULT_PARAMS);
  }
  return memory!;
}

function diff(a: unknown, b: unknown, prefix = ""): string[] {
  if (typeof a !== "object" || a === null || Array.isArray(a)) {
    return JSON.stringify(a) !== JSON.stringify(b) ? [`${prefix}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`] : [];
  }
  return Object.keys(a as object).flatMap((k) =>
    ["version", "updatedAt", "updatedBy"].includes(k) ? [] : diff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)?.[k], prefix ? `${prefix}.${k}` : k)
  );
}

export function saveParams(next: Params, by: string) {
  const prev = getParams();
  const merged = merge(DEFAULT_PARAMS, next);
  merged.version = prev.version + 1;
  merged.updatedAt = new Date().toISOString();
  merged.updatedBy = by;
  const changes = diff(prev, merged);
  memory = merged;
  const entry = { at: merged.updatedAt, by, version: merged.version, changes };
  memoryHistory = [entry, ...getHistory()].slice(0, 100);
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(merged, null, 2));
    fs.writeFileSync(HIST, JSON.stringify(memoryHistory, null, 2));
  } catch {
    /* środowisko tylko do odczytu – zostaje w pamięci */
  }
  return { params: merged, changes };
}

export function getHistory() {
  if (memoryHistory.length) return memoryHistory;
  try {
    memoryHistory = JSON.parse(fs.readFileSync(HIST, "utf8"));
  } catch {
    memoryHistory = [];
  }
  return memoryHistory;
}

export function resetParams(by: string) {
  return saveParams(structuredClone({ ...DEFAULT_PARAMS, version: getParams().version }), by);
}
