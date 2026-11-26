import { readFileSync } from "node:fs";
import path from "node:path";
import { loadBundleChainDetailed, splitIncludedManifestMetadata } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";

import {
	HEROIC_INSPIRATION_SOURCE,
	readHeroicInspirationProvenanceText,
} from "../../chapters/playing-the-game/heroic-inspiration-units";
import { SRD_DOCS_PAGE, srdRootMetadata } from "../../compendium-metadata";
import { catalogueEntriesFromManifest, docsLinkTargetsFromManifest } from "../../docs/catalogue";
import { readResourceFlavor } from "../../flavor/read";
import { CACHE_MARKDOWN_DIR } from "../../markdown/paths";
import {
	extractPlayingTheGameReaderPageBody,
	readAbilityDescriptionsTable,
	readD20TestsReaderFragmentMetadata,
	readPlayingTheGameReaderPages,
	readSixAbilitiesReaderFragmentMetadata,
} from "../../markdown/playing-the-game";

function sourceBody(title: string, nextTitle: string): string {
	const source = readFileSync(path.join(CACHE_MARKDOWN_DIR, "playing-the-game.md"), "utf8");
	const heading = (value: string): number => {
		const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const matches = [...source.matchAll(new RegExp(`^## ${escaped}\\r?$`, "gm"))];
		expect(matches).toHaveLength(1);
		const offset = matches[0]?.index;
		if (offset === undefined) throw new Error(`Missing source heading: ${value}`);
		return offset;
	};
	const start = heading(title);
	const end = heading(nextTitle);
	const body = source.slice(start + `## ${title}`.length, end).replace(/^\r?\n+|\r?\n+$/g, "");
	expect(body).not.toHaveLength(0);
	return body;
}

describe("Playing the Game reader pages", () => {
	const pages = readPlayingTheGameReaderPages();

	it("extracts the initial reader pages in source order without rewriting their bodies", () => {
		expect(pages.map((page) => [page.id, page.title])).toEqual([
			["rhythm-of-play", "Rhythm of Play"],
			["the-six-abilities", "The Six Abilities"],
			["d20-tests", "D20 Tests"],
		]);
		expect(pages[0]?.body).toBe(sourceBody("Rhythm of Play", "The Six Abilities"));
		expect(pages[1]?.body).toBe(sourceBody("The Six Abilities", "D20 Tests"));
		expect(pages[2]?.body).toBe(sourceBody("D20 Tests", "Proficiency"));
		expect(pages[2]?.body).toContain("**4: Roll 1d20.**");
		expect(pages[2]?.body).toContain("**5: Add Modifiers.**");
		expect(pages[2]?.body).toContain("**6: Compare the Total to a Target Number.**");
		for (const subsection of [
			"### Ability Checks",
			"### Saving Throws",
			"### Attack Rolls",
			"### Advantage/Disadvantage",
			"> **Heroic Inspiration**",
		]) {
			expect(pages[2]?.body).toContain(subsection);
		}
		expect(pages[2]?.source).toEqual({
			path: "packages/spellkave-srd-cc/cache/markdown/playing-the-game.md",
			anchor: "Playing the Game > D20 Tests",
			license: "CC-BY-4.0",
		});
	});

	it("keeps the source tables and provenance with the Six Abilities page", () => {
		const abilities = pages[1];
		expect(abilities?.body).toContain("**Ability Scores**");
		expect(abilities?.body).toContain("**Ability Modifiers**");
		expect(abilities?.body).toContain("<table>");
		expect(abilities?.source).toEqual({
			path: "packages/spellkave-srd-cc/cache/markdown/playing-the-game.md",
			anchor: "Playing the Game > The Six Abilities",
			license: "CC-BY-4.0",
		});
	});

	it("addresses reader prose from its authored fragments", () => {
		const section = SRD_DOCS_PAGE.sections.find((candidate) => candidate.id === "playing-the-game");
		expect(section?.pages?.slice(0, 3)).toEqual([
			{
				id: "rhythm-of-play",
				title: "Rhythm of Play",
				content: {
					source_path: "base/playing-the-game/playing-the-game.toml",
					namespace: "docs",
					id: "playing-the-game-rhythm-of-play",
				},
			},
			{
				id: "the-six-abilities",
				title: "The Six Abilities",
				content: {
					source_path: "base/playing-the-game/abilities.toml",
					namespace: "docs",
					id: "the-six-abilities",
				},
			},
			{
				id: "d20-tests",
				title: "D20 Tests",
				content: {
					source_path: "base/playing-the-game/d20-tests.toml",
					namespace: "docs",
					id: "d20-tests",
				},
			},
		]);
		expect(section?.pages?.map((page) => page.id)).toEqual([
			"rhythm-of-play",
			"the-six-abilities",
			"d20-tests",
			"proficiency",
			"actions",
			"social-interaction",
			"exploration",
			"combat",
			"damage-and-healing",
		]);
		expect(
			SRD_DOCS_PAGE.sections.filter((candidate) => "pages" in candidate).length,
		).toBeGreaterThan(1);
	});

	// sk-content: needs the held SRD flavor texts (PROVENANCE.md).
	it.skip("replaces only the source Ability Descriptions table with ordered compact resources", () => {
		const article = readSixAbilitiesReaderFragmentMetadata();
		const source = pages[1]?.body;
		if (source === undefined) throw new Error("Six Abilities source page is missing.");
		const table = readAbilityDescriptionsTable(source);
		const directives = ["str", "dex", "con", "int", "wis", "cha"]
			.map((ref) => `::resource{ref="srd/${ref}" view="compact"}`)
			.join("\n");
		expect(article.body).toContain(directives);
		expect(article.body.replace(directives, table.tableHtml)).toBe(source);
		expect(table).toMatchObject({
			nameLabel: "Ability",
			descriptionLabel: "Score Measures …",
			rows: [
				{ name: "Strength", description: "Physical might" },
				{ name: "Dexterity", description: "Agility, reflexes, and balance" },
				{ name: "Constitution", description: "Health and stamina" },
				{ name: "Intelligence", description: "Reasoning and memory" },
				{ name: "Wisdom", description: "Perceptiveness and mental fortitude" },
				{ name: "Charisma", description: "Confidence, poise, and charm" },
			],
		});
		const root = path.join(import.meta.dirname, "../../../fixtures/manifest.toml");
		const detailed = loadBundleChainDetailed({
			rootManifestPath: root,
			resolveDependency: () => undefined,
		});
		const resources = Array.isArray(detailed.manifest.resource_definitions)
			? detailed.manifest.resource_definitions
			: [];
		const byId = new Map(
			resources.flatMap((resource) => {
				if (resource === null || typeof resource !== "object" || Array.isArray(resource)) return [];
				const row = resource as Record<string, unknown>;
				return typeof row.resource_definition_id === "string"
					? [[row.resource_definition_id, row]]
					: [];
			}),
		);
		expect(
			["str", "dex", "con", "int", "wis", "cha"].map((id) => {
				const resource = byId.get(`srd/${id}`);
				return {
					name: resource?.display_name,
					description: resource?.description,
				};
			}),
		).toEqual(
			["str", "dex", "con", "int", "wis", "cha"].map((id) => ({
				name: {
					str: "Strength",
					dex: "Dexterity",
					con: "Constitution",
					int: "Intelligence",
					wis: "Wisdom",
					cha: "Charisma",
				}[id],
				description: readResourceFlavor(id).body,
			})),
		);
		expect(article.source).toEqual(pages[1]?.source);
	});

	it("adds Heroic Inspiration only after the verbatim D20 source, with a sourced resource attachment", () => {
		const source = pages[2]?.body;
		if (source === undefined) throw new Error("D20 Tests source page is missing.");
		const article = readD20TestsReaderFragmentMetadata();
		const directive = '::resource{ref="srd/heroic_inspiration" view="compact"}';
		expect(article.body).toBe(`${source}\n\n${directive}`);
		expect(article.body.replace(`\n\n${directive}`, "")).toBe(source);
		expect(readHeroicInspirationProvenanceText()).toBe(
			source.slice(source.indexOf("> **Heroic Inspiration**")).trim(),
		);

		const root = path.join(import.meta.dirname, "../../../fixtures/manifest.toml");
		const detailed = loadBundleChainDetailed({
			rootManifestPath: root,
			resolveDependency: () => undefined,
		});
		const attachments = Array.isArray(detailed.manifest.metadata_attachments)
			? detailed.manifest.metadata_attachments
			: [];
		expect(
			attachments.find(
				(row) =>
					row !== null &&
					typeof row === "object" &&
					(row as Record<string, unknown>).target_ref === "srd/heroic_inspiration" &&
					(row as Record<string, unknown>).namespace === "srd.text",
			),
		).toMatchObject({
			target_kind: "resource_definition",
			payload_json: expect.stringContaining(HEROIC_INSPIRATION_SOURCE),
		});
	});

	it("retains the reader articles in their authored include metadata envelopes without runtime rows", () => {
		const root = path.join(import.meta.dirname, "../../../fixtures/manifest.toml");
		const detailed = loadBundleChainDetailed({
			rootManifestPath: root,
			resolveDependency: () => undefined,
		});
		const srdSource = detailed.sources.find((source) => source.bundleIds.includes("srd"));
		expect(srdSource).toBeDefined();
		const fragment = srdSource?.fragments.find(
			(candidate) => candidate.path === "base/playing-the-game/abilities.toml",
		);
		expect(fragment?.metadata).toEqual({
			docs: { "the-six-abilities": readSixAbilitiesReaderFragmentMetadata() },
		});
		const d20 = srdSource?.fragments.find(
			(candidate) => candidate.path === "base/playing-the-game/d20-tests.toml",
		);
		expect(d20?.metadata).toEqual({ docs: { "d20-tests": readD20TestsReaderFragmentMetadata() } });
		const d20Toml = readFileSync(
			path.join(import.meta.dirname, "../../../fixtures/base/playing-the-game/d20-tests.toml"),
			"utf8",
		);
		expect(splitIncludedManifestMetadata(d20Toml).rowsToml.trim()).toBe("");
		expect(srdSource?.metadata).toEqual(
			srdRootMetadata(
				catalogueEntriesFromManifest(detailed.manifest),
				docsLinkTargetsFromManifest(detailed.manifest),
			),
		);
	});

	it("rejects missing and duplicate level-two source headings", () => {
		expect(() => extractPlayingTheGameReaderPageBody("## One\nBody\n", "One", "Two")).toThrow(
			"heading '## Two' not found",
		);
		expect(() =>
			extractPlayingTheGameReaderPageBody(
				"## One\nBody\n## Two\nNext\n## Two\nAgain\n",
				"One",
				"Two",
			),
		).toThrow("heading '## Two' ambiguous");
	});
});
