import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { COMPENDIUM_DIST_DIR, renderCompendiumFromCommittedFixtures } from "./from-fixtures";
import type { RenderedCompendiumExport } from "./types";

export function writeCompendiumExport(
	rendered: RenderedCompendiumExport,
	root = COMPENDIUM_DIST_DIR,
): void {
	rmSync(root, { recursive: true, force: true });
	for (const [relPath, content] of Object.entries(rendered.files)) {
		const abs = join(root, relPath);
		mkdirSync(dirname(abs), { recursive: true });
		writeFileSync(abs, content, "utf8");
	}
}

export function exportCommittedFixtures(root = COMPENDIUM_DIST_DIR): RenderedCompendiumExport {
	const rendered = renderCompendiumFromCommittedFixtures();
	writeCompendiumExport(rendered, root);
	return rendered;
}
