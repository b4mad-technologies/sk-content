// pattern: none — filesystem paths for authoring assets and fixtures
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** packages/spellkave-adventure-elven-mini */
export const PACKAGE_ROOT = join(HERE, "../..");

/** fixtures/ */
export const FIXTURE_ROOT = join(PACKAGE_ROOT, "fixtures");

export const RENDERS_ROOT = join(FIXTURE_ROOT, "renders");

/** Resolve CCC3 / Elven Tower map pack root (out-of-repo sibling). */
export function resolveCcc3MapsRoot(): string | null {
	if (process.env.CCC3_MAPS_ROOT) return process.env.CCC3_MAPS_ROOT;
	try {
		const common = execSync("git rev-parse --path-format=absolute --git-common-dir", {
			stdio: ["ignore", "pipe", "ignore"],
		})
			.toString()
			.trim();
		return join(dirname(common), "ccc3-maps");
	} catch {
		return null;
	}
}
