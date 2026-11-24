// Read-only fixture consumers need this location without importing the compiler.
// Keep this leaf free of chapter and tool imports; pipeline re-exports the path.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
