// pattern: none — filesystem paths for authoring assets and fixtures
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** packages/spellkave-adventure-kavemouth */
export const PACKAGE_ROOT = join(HERE, "../..");

/** fixtures/ */
export const FIXTURE_ROOT = join(PACKAGE_ROOT, "fixtures");

export const RENDERS_ROOT = join(FIXTURE_ROOT, "renders");

