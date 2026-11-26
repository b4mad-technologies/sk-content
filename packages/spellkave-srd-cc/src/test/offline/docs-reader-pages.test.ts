// embedded-manifest: {"category": "exact_parser_oracle", "rationale": "the docs provenance regression parses one minimal root envelope to prove metadata paths never become loader includes"}
import { readFileSync } from "node:fs";
import path from "node:path";
import { splitIncludedManifestMetadata } from "@spellkave/tool-authoring";
import { inspectManifest, loadBundleChainDetailed } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";

import { BUNDLE_ROW } from "../../bundle-row";
import { renderManifestRoot } from "../../chapters/verb-runner";
import {
	readCompactSubjectCollections,
	readerMetadataPathForId,
	renderSrdReaderMetadataFragments,
	SRD_ROOT_METADATA,
	srdRootMetadata,
} from "../../compendium-metadata";
import { catalogueEntriesFromManifest, docsLinkTargetsFromManifest } from "../../docs/catalogue";
import {
	markdownForMetadata,
	readSrdMarkdownDocumentPages,
	SRD_MARKDOWN_DOCUMENTS,
} from "../../markdown/docs-reader-pages";
import { CACHE_MARKDOWN_DIR } from "../../markdown/paths";
import { readSpells } from "../../open5e/spell";
import { committedManifestIncludePaths, manifestIncludePaths } from "../../pipeline";

function boundaryTrim(value: string): string {
	return value.replace(/^\r?\n+|\r?\n+$/g, "");
}

/** Independent source oracle: terminal catalogues split at their H4 entries. */
function expectedBodiesByAnchor(
	source: string,
	document: (typeof SRD_MARKDOWN_DOCUMENTS)[number],
): Map<string, string> {
	const h1 = [...source.matchAll(/^\uFEFF?# (.+)\r?$/gm)];
	const h2 = [...source.matchAll(/^## (.+)\r?$/gm)];
	const result = new Map<string, string>();
	const h1End = (h1[0]?.index ?? 0) + (h1[0]?.[0].length ?? 0);
	const preamble = boundaryTrim(source.slice(h1End, h2[0]?.index));
	if (preamble.length > 0) result.set(document.title, markdownForMetadata(preamble));
	for (const [index, heading] of h2.entries()) {
		const title = heading[1];
		const start = (heading.index ?? 0) + heading[0].length;
		if (title === document.tailCatalogue) {
			const h4 = [...source.slice(start).matchAll(/^#### (.+)\r?$/gm)]
				.map((match) => ({
					title: match[1],
					index: start + (match.index ?? 0),
					length: match[0].length,
				}))
				.filter(
					(child) =>
						document.id !== "spells" ||
						/^\r?\n\r?\n(?:_Level \d|_[^\r\n]* Cantrip \()/.test(
							source.slice(child.index + child.length),
						),
				);
			const cataloguePreamble = boundaryTrim(source.slice(start, h4[0]?.index));
			if (cataloguePreamble.length > 0) {
				result.set(`${document.title} > ${title}`, markdownForMetadata(cataloguePreamble));
			}
			for (const [childIndex, child] of h4.entries()) {
				result.set(
					`${document.title} > ${title} > ${child.title}`,
					markdownForMetadata(
						boundaryTrim(
							source.slice(child.index + child.length, h4[childIndex + 1]?.index ?? source.length),
						),
					),
				);
			}
			break;
		}
		result.set(
			`${document.title} > ${title}`,
			markdownForMetadata(boundaryTrim(source.slice(start, h2[index + 1]?.index ?? source.length))),
		);
	}
	return result;
}

describe("SRD docs reader pages", () => {
	it("covers every cached source H2 body exactly once, retaining preambles and hard breaks", () => {
		for (const document of SRD_MARKDOWN_DOCUMENTS) {
			const source = readFileSync(
				path.join(
					CACHE_MARKDOWN_DIR,
					document.path.slice("packages/spellkave-srd-cc/cache/markdown/".length),
				),
				"utf8",
			);
			const h1 = [...source.matchAll(/^\uFEFF?# (.+)\r?$/gm)];
			const h2 = [...source.matchAll(/^## (.+)\r?$/gm)];
			expect(h1).toHaveLength(1);
			expect(h1[0]?.[1]).toBe(document.title);
			expect(h2.length).toBeGreaterThan(0);

			const pages = readSrdMarkdownDocumentPages(document);
			const bodiesByAnchor = new Map(pages.map((page) => [page.source.anchor, page.body]));
			expect(bodiesByAnchor).toEqual(expectedBodiesByAnchor(source, document));
			expect(new Set(pages.map((page) => page.id)).size).toBe(pages.length);
		}
	});

	it("adds only root metadata to the generated root manifest", async () => {
		const rootPath = path.join(import.meta.dirname, "../../../fixtures/manifest.toml");
		const current = inspectManifest(readFileSync(rootPath, "utf8")).manifest as Record<
			string,
			unknown
		>;
		const includePaths = Array.isArray(current.include)
			? current.include.map((include) =>
					include !== null && typeof include === "object" && "path" in include
						? String(include.path)
						: "",
				)
			: [];
		expect(includePaths.length).toBeGreaterThan(0);
		expect(includePaths.every((includePath) => includePath.length > 0)).toBe(true);
		const withoutDocs = inspectManifest(
			await renderManifestRoot(BUNDLE_ROW, includePaths, undefined, undefined, "srd"),
		).manifest as Record<string, unknown>;
		const { metadata: currentMetadata, ...currentRows } = current;
		const { metadata: noDocsMetadata, ...noDocsRows } = withoutDocs;
		const detailed = loadBundleChainDetailed({
			rootManifestPath: rootPath,
			resolveDependency: () => undefined,
		});
		expect(currentMetadata).toEqual(
			srdRootMetadata(
				catalogueEntriesFromManifest(detailed.manifest),
				docsLinkTargetsFromManifest(detailed.manifest),
			),
		);
		expect(noDocsMetadata).toEqual({});
		expect(currentRows).toEqual(noDocsRows);
	});

	it("authors a nonempty string route id for every reader page", () => {
		for (const section of SRD_ROOT_METADATA.docs.sections) {
			if (!("pages" in section) || section.pages === undefined) continue;
			for (const page of section.pages) {
				expect(page.id).toEqual(expect.any(String));
				expect(page.id.length).toBeGreaterThan(0);
			}
		}
	});

	it("keeps embedded spell stat blocks with their owning spell and chunks terminal catalogues", () => {
		const spells = SRD_MARKDOWN_DOCUMENTS.find((document) => document.id === "spells");
		const magicItems = SRD_MARKDOWN_DOCUMENTS.find((document) => document.id === "magic-items");
		const glossary = SRD_MARKDOWN_DOCUMENTS.find((document) => document.id === "rules-glossary");
		expect(spells).toBeDefined();
		expect(magicItems).toBeDefined();
		expect(glossary).toBeDefined();
		const spellPages = readSrdMarkdownDocumentPages(spells!);
		expect(spellPages.find((page) => page.title === "Acid Arrow")?.body).not.toContain(
			"#### Acid Splash",
		);
		expect(spellPages.find((page) => page.title === "Acid Splash")?.body).toContain(
			"_Evocation Cantrip (Sorcerer, Wizard)_",
		);
		const spellTitles = spellPages
			.filter((page) => page.source.anchor.startsWith("Spells > Spell Descriptions > "))
			.map((page) => page.title)
			.sort((left, right) => left.localeCompare(right));
		expect(spellTitles).toEqual(
			readSpells()
				.map((spell) => spell.name)
				.sort((left, right) => left.localeCompare(right)),
		);
		expect(spellPages.find((page) => page.title === "Find Steed")?.body).toContain(
			"## Otherworldly Steed",
		);
		expect(spellPages.find((page) => page.title === "Giant Insect")?.body).toContain(
			"## Giant Insect",
		);
		expect(spellPages.find((page) => page.title === "Summon Dragon")?.body).toContain(
			"## Draconic Spirit",
		);
		expect(spellPages.some((page) => page.title === "Otherworldly Steed")).toBe(false);
		expect(
			readSrdMarkdownDocumentPages(magicItems!).some((page) => page.title === "Adamantine Armor"),
		).toBe(true);
		expect(
			readSrdMarkdownDocumentPages(glossary!).some((page) => page.title === "Ability Check"),
		).toBe(true);
	});

	it("keeps chapter prose in generated metadata-only includes", async () => {
		const fragments = await renderSrdReaderMetadataFragments();
		expect(Object.keys(fragments)).toEqual([
			...SRD_MARKDOWN_DOCUMENTS.map((document) => readerMetadataPathForId(document.id)),
		]);
		for (const [fragmentPath, fragmentToml] of Object.entries(fragments)) {
			const parsed = splitIncludedManifestMetadata(fragmentToml);
			expect(parsed.metadata).toHaveProperty("docs");
			expect(parsed.rowsToml).toBe("");
			expect(fragmentPath).toMatch(/^base\/[a-z0-9-]+\/[a-z0-9-]+\.toml$/);
		}
	});

	it("projects the Black Dragons collection to four ordered typed compact subjects", async () => {
		const authoredCollection = readCompactSubjectCollections().get("monsters-a-z-black-dragons");
		expect(authoredCollection).toMatchObject({
			intro: "Browse the related reference entries below.",
			subjects: [
				{ kind: "entity_definition", ref: "srd/creature/black-dragon-wyrmling", view: "compact" },
				{ kind: "entity_definition", ref: "srd/creature/young-black-dragon", view: "compact" },
				{ kind: "entity_definition", ref: "srd/creature/adult-black-dragon", view: "compact" },
				{ kind: "entity_definition", ref: "srd/creature/ancient-black-dragon", view: "compact" },
			],
		});
		const rootPath = path.join(import.meta.dirname, "../../../fixtures/manifest.toml");
		const detailed = loadBundleChainDetailed({
			rootManifestPath: rootPath,
			resolveDependency: () => undefined,
		});
		const fragments = await renderSrdReaderMetadataFragments(detailed.manifest);
		const fragment = fragments[readerMetadataPathForId("monsters-a-z")];
		expect(fragment).toBeDefined();
		const docs = splitIncludedManifestMetadata(fragment!).metadata.docs as Record<
			string,
			{ body?: string }
		>;
		expect(docs["monsters-a-z-black-dragons"]?.body).toBe(
			[
				"Browse the related reference entries below.",
				'::subject{kind="entity_definition" ref="srd/creature/black-dragon-wyrmling" view="compact"}',
				'::subject{kind="entity_definition" ref="srd/creature/young-black-dragon" view="compact"}',
				'::subject{kind="entity_definition" ref="srd/creature/adult-black-dragon" view="compact"}',
				'::subject{kind="entity_definition" ref="srd/creature/ancient-black-dragon" view="compact"}',
			].join("\n\n"),
		);
		expect(docs["monsters-a-z-black-dragons"]?.body).not.toContain("<table>");
	});

	it("does not mistake metadata provenance paths for include directives", () => {
		const paths = committedManifestIncludePaths();
		expect(paths.length).toBeGreaterThan(0);
		expect(paths.every((includePath) => includePath.endsWith(".toml"))).toBe(true);
		expect(paths).not.toContain("packages/spellkave-srd-cc/cache/markdown/playing-the-game.md");
		expect(
			manifestIncludePaths(`#:schema https://spellkave.dev/schema/world-manifest-1.0.0.json
schema_version = "1.0.0"
[metadata.docs.example.source]
path = "base/metadata-only.toml"
anchor = "Example"
license = "CC-BY-4.0"
[[include]]
path = "base/actual-include.toml"
`),
		).toEqual(["base/actual-include.toml"]);
	});
});
