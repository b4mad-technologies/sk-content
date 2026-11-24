// Shared path resolution for the open5e cache readers in this directory.
// Cache files are synced by `src/sync-cache.ts` (never read the forks
// directly — see `../sources.ts`'s license boundary).
import path from "node:path";
import { fileURLToPath } from "node:url";

const thisDir = path.dirname(fileURLToPath(import.meta.url));

/** `packages/spellkave-srd-cc/cache/open5e/` — the committed CC-BY-4.0 subset. */
export const CACHE_OPEN5E_DIR = path.resolve(thisDir, "../../cache/open5e");

/**
 * `packages/spellkave-srd-cc/cache/open5e-core/` — the committed subset of
 * the SECOND open5e-api directory (`open5e/core`, `../sources.ts`'s
 * `OPEN5E_CORE_DIR`). Consumer-gated per file (`src/sync-cache.ts`'s
 * `OPEN5E_CORE_FILES`); first and, as of this writing, only file:
 * `Language.json` (Character Creation chapter, C2 — `ledger/
 * character-creation.md`). Deliberately a SEPARATE constant from
 * `CACHE_OPEN5E_DIR` above: the two forks' pk namespaces are not guaranteed
 * disjoint, and readers must stay explicit about which cache directory they
 * read.
 */
export const CACHE_OPEN5E_CORE_DIR = path.resolve(thisDir, "../../cache/open5e-core");
