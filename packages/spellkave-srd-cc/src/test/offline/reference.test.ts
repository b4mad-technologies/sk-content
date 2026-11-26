import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

import * as worldAuthor from "@spellkave/world-author";
import { describe, expect, it } from "vitest";

import { FIXTURES_DIR } from "../../pipeline";
import { findingEvidence } from "../srd-coverage/evidence";

const FINDING_DETAILS = "ledger/archive/findings-details.md";

function baseMarkdownPaths(): string[] {
	const paths: string[] = [];
	const visit = (dir: string): void => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const abs = join(dir, entry.name);
			if (entry.isDirectory()) {
				visit(abs);
				continue;
			}
			if (!entry.name.endsWith(".md")) continue;
			paths.push(relative(FIXTURES_DIR, abs).replaceAll("\\", "/"));
		}
	};
	visit(join(FIXTURES_DIR, "base"));
	return paths.sort();
}

describe("human-readable fixture reference", () => {
	findingEvidence(
		{
			id: "91",
			title: "World-author directly exposes the canonical manifest inspector",
			expected:
				"The authoring-domain owner exports inspectManifest directly for consumers that need canonical TOML projection.",
			observed:
				"Runtime inspection finds inspectManifest on @spellkave/world-author without a companion compatibility hop.",
			impact:
				"Content packages reuse the canonical parser while depending on the domain owner rather than a host facade.",
			references: [FINDING_DETAILS],
		},
		() => {
			expect(worldAuthor).toHaveProperty("inspectManifest");
		},
	);

	it("does not keep sibling Markdown beside base TOML", () => {
		expect(baseMarkdownPaths()).toEqual([]);
	});
});
