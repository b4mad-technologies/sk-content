// Shared path resolution for the markdown chapter readers in this directory.
// Cache files are synced by `src/sync-cache.ts` (never read the fork
// directly — see `../sources.ts`'s license boundary).
import path from "node:path";
import { fileURLToPath } from "node:url";

const thisDir = path.dirname(fileURLToPath(import.meta.url));

/** `packages/spellkave-srd-cc/cache/markdown/` — the committed CC-BY-4.0 chapter prose. */
export const CACHE_MARKDOWN_DIR = path.resolve(thisDir, "../../cache/markdown");
