import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { inspectManifest } from "@spellkave/world-author";
import { renderCompendiumExport } from "./render-export";
import type { RenderedCompendiumExport } from "./types";

const PKG_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
export const FIXTURES_DIR = join(PKG_ROOT, "fixtures");
export const COMPENDIUM_DIST_DIR = join(PKG_ROOT, "dist", "compendium");

function committedBaseTomlPaths(): string[] {
	const manifestPath = join(FIXTURES_DIR, "manifest.toml");
	if (!existsSync(manifestPath)) return [];
	const manifest = inspectManifest(readFileSync(manifestPath, "utf8")).manifest as Record<
		string,
		unknown
	>;
	return Array.isArray(manifest.include)
		? manifest.include.flatMap((include) => {
				if (include === null || typeof include !== "object" || !("path" in include)) return [];
				const relPath = String(include.path);
				return relPath.startsWith("base/") && relPath.endsWith(".toml") ? [relPath] : [];
			})
		: [];
}

/** Project the committed base fixtures (no chapter re-render). */
export function renderCompendiumFromCommittedFixtures(): RenderedCompendiumExport {
	const manifestToml = readFileSync(join(FIXTURES_DIR, "manifest.toml"), "utf8");
	const files: Record<string, string> = {};
	for (const relPath of committedBaseTomlPaths()) {
		const abs = join(FIXTURES_DIR, relPath);
		if (!existsSync(abs)) continue;
		files[relPath] = readFileSync(abs, "utf8");
	}
	return renderCompendiumExport(manifestToml, files);
}
