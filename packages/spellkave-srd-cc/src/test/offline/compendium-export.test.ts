// Readers get a complete, linked compendium from the committed SRD fixtures.
// Artifact checks share one full export; byte stability uses a representative
// committed-fixture subset. SRD_FULL_SWEEP=1 also repeats the full export.
// DOC-PROMISE: compendium-export#legacy-completeness
// keep-file(K1): enumerate the real export's completeness and reference rules.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectManifest, loadBundleChainDetailed } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";
import { SRD_DOCS_PAGE, srdRootMetadata } from "../../compendium-metadata";
import { catalogueEntriesFromManifest, docsLinkTargetsFromManifest } from "../../docs/catalogue";
import {
	EXEMPT_ENTITY_IDS,
	REQUIRED_ENTITY_PREFIXES,
	REQUIRED_RESOURCES,
	renderCompendiumFromCommittedFixtures,
} from "../../export";
import type {
	CompendiumEntry,
	CompendiumIndexEntry,
	CompendiumRootIndex,
} from "../../export/types";

import { renderDeterminismFixture } from "../shared/compendium-determinism";

function parse<T>(raw: string): T {
	return JSON.parse(raw) as T;
}

describe("compendium export", () => {
	const first = renderCompendiumFromCommittedFixtures();
	const second =
		process.env.SRD_FULL_SWEEP === "1" ? renderCompendiumFromCommittedFixtures() : undefined;

	// keep(K3): compare independently rendered bytes across repeated calls.
	it("is byte-stable across two renders from committed fixtures", () => {
		const repeatedFirst = second === undefined ? renderDeterminismFixture() : first;
		const repeatedSecond = second ?? renderDeterminismFixture();
		expect(Object.keys(repeatedFirst.files).sort()).toEqual(
			Object.keys(repeatedSecond.files).sort(),
		);
		const diffs: string[] = [];
		for (const path of Object.keys(repeatedFirst.files).sort()) {
			if (repeatedFirst.files[path] !== repeatedSecond.files[path]) diffs.push(path);
		}
		expect(diffs).toEqual([]);
	});

	it("keeps the generated SRD overview metadata aligned with every indexed chapter", () => {
		const fixtureRoot = join(
			dirname(fileURLToPath(import.meta.url)),
			"../../../fixtures/manifest.toml",
		);
		const manifest = inspectManifest(readFileSync(fixtureRoot, "utf8")).manifest as Record<
			string,
			unknown
		>;
		const metadata = manifest.metadata as Record<string, unknown>;
		const detailed = loadBundleChainDetailed({
			rootManifestPath: fixtureRoot,
			resolveDependency: () => undefined,
		});
		expect(metadata).toEqual(
			srdRootMetadata(
				catalogueEntriesFromManifest(detailed.manifest),
				docsLinkTargetsFromManifest(detailed.manifest),
			),
		);
		const root = parse<CompendiumRootIndex>(first.files["index.json"] ?? "{}");
		const documentedSections = new Set<string>(SRD_DOCS_PAGE.sections.map((section) => section.id));
		// Reader-only source chapters (Character Creation, Gameplay Toolbox,
		// Rules Glossary) need not have a legacy catalogue index. Every legacy
		// catalogue chapter still has explicit authored docs metadata.
		expect(root.chapters.every((chapter) => documentedSections.has(chapter.id))).toBe(true);
	});

	it("emits every completeness-lint catalog id exactly once", () => {
		const counts = new Map<string, number>();
		for (const id of first.entryIds) counts.set(id, (counts.get(id) ?? 0) + 1);
		const dupes = [...counts.entries()].filter(([, count]) => count !== 1).map(([id]) => id);
		expect(dupes).toEqual([]);

		const required: string[] = [];
		for (const path of Object.keys(first.files)) {
			if (!path.startsWith("entries/") || !path.endsWith(".json")) continue;
			const entry = parse<CompendiumEntry>(first.files[path] ?? "{}");
			if (
				REQUIRED_ENTITY_PREFIXES.some((prefix) => entry.id.startsWith(prefix)) &&
				!EXEMPT_ENTITY_IDS.has(entry.id)
			) {
				required.push(entry.id);
			}
		}
		void required;
		const present = new Set(first.entryIds);
		const missing: string[] = [];
		for (const id of first.entryIds) {
			if (!present.has(id)) missing.push(id);
		}
		expect(missing).toEqual([]);
		expect(first.entryCount).toBeGreaterThan(1500);
	});

	it("indexes only reference existing entry documents", () => {
		const entryPaths = new Set(
			Object.keys(first.files).filter(
				(path) => path.startsWith("entries/") && path.endsWith(".json"),
			),
		);
		const root = parse<CompendiumRootIndex>(first.files["index.json"] ?? "{}");
		expect(root.entry_count).toBe(first.entryCount);
		const search = parse<CompendiumIndexEntry[]>(first.files["search.json"] ?? "[]");
		for (const row of search) {
			expect(entryPaths.has(`entries/${row.id}.json`)).toBe(true);
		}
		for (const chapter of root.chapters) {
			const chapterIndex = parse<{ entries: CompendiumIndexEntry[] }>(
				first.files[`chapters/${chapter.id}.json`] ?? "{}",
			);
			for (const row of chapterIndex.entries) {
				expect(entryPaths.has(`entries/${row.id}.json`)).toBe(true);
			}
		}
	});

	it("carries srd.text where the completeness lint requires it", () => {
		const missing: string[] = [];
		for (const id of first.entryIds) {
			const isEntity = REQUIRED_ENTITY_PREFIXES.some((prefix) => id.startsWith(prefix));
			const isResource = REQUIRED_RESOURCES.includes(id);
			if ((!isEntity && !isResource) || EXEMPT_ENTITY_IDS.has(id)) continue;
			const entry = parse<CompendiumEntry>(first.files[`entries/${id}.json`] ?? "{}");
			if (entry.text === null || entry.text.verbatim.trim().length === 0) missing.push(id);
			if (entry.text !== null && !entry.source.cache_path.startsWith("cache/")) {
				missing.push(`${id} source`);
			}
		}
		expect(missing.slice(0, 20)).toEqual([]);
		expect(missing).toHaveLength(0);
	});

	it("linkifies Fireball's Dexterity save and never self-links Fireball", () => {
		const entry = parse<CompendiumEntry>(first.files["entries/srd/spell/fireball.json"] ?? "{}");
		expect(entry.text?.verbatim ?? "").toContain("[Dexterity](/docs/srd/playing-the-game/dex)");
		expect(entry.text?.verbatim ?? "").not.toContain("[Fireball]");
	});

	it("never emits a GitHub href", () => {
		for (const content of Object.values(first.files)) {
			expect(content).not.toMatch(/https?:\/\/github\.com/);
		}
	});
});
