import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** packages/spellkave-srd-cc — fixtures/dm still render here until phase 3c. */
export const PACKAGE_ROOT = join(HERE, "../../../../../spellkave-srd-cc");

/** fixtures/dm */
export const FIXTURE_ROOT = join(PACKAGE_ROOT, "fixtures/dm");
