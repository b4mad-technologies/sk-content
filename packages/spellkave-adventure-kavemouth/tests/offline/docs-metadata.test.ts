import { readFileSync } from "node:fs";
import path from "node:path";
import { inspectManifest, loadBundleChainDetailed, loadFlattened } from "@spellkave/world-author";
import { parse as parseToml } from "smol-toml";
import { describe, expect, it } from "vitest";

import { buildKavemouthRootMetadata, catalogueSourcePaths } from "../../author/docs.ts";
import { ADVENTURE_FRAGMENT_PATHS } from "../../author/layout.ts";

const fixtureRoot = path.join(import.meta.dirname, "../../fixtures");
const descriptor = parseToml(
	readFileSync(path.join(import.meta.dirname, "../../adventures/kavemouth.toml"), "utf8"),
) as { name: string; description: string };

function authoredRows(): Record<string, Array<Record<string, unknown>>> {
	const manifest = inspectManifest(loadFlattened(fixtureRoot, "adventure.manifest.toml"))
		.manifest as Record<string, unknown>;
	return Object.fromEntries(
		Object.entries(manifest).filter((entry): entry is [string, Array<Record<string, unknown>>] =>
			Array.isArray(entry[1]),
		),
	);
}

const sourcePaths = () =>
	catalogueSourcePaths(
		Object.fromEntries(
			ADVENTURE_FRAGMENT_PATHS.map((fragment) => [
				fragment,
				readFileSync(path.join(fixtureRoot, fragment), "utf8"),
			]),
		),
	);

describe("kavemouth docs metadata", () => {
	it("publishes the exact authored catalogue and virtual document inventory", () => {
		const rootManifestPath = path.join(fixtureRoot, "adventure.manifest.toml");
		const loaded = loadBundleChainDetailed({
			rootManifestPath,
			resolveDependency: (bundleId) =>
				bundleId === "srd"
					? path.join(import.meta.dirname, "../../../spellkave-srd-cc/fixtures/manifest.toml")
					: bundleId === "dm"
						? path.join(import.meta.dirname, "../../../spellkave-srd-cc/fixtures/dm/manifest.toml")
						: undefined,
		});
		const root = loaded.sources.find((source) => source.manifestPath === rootManifestPath);
		const expected = buildKavemouthRootMetadata(authoredRows(), descriptor, sourcePaths());
		expect(root?.metadata).toEqual(expected);

		const sections = expected.docs.sections;
		const catalogue = sections
			.flatMap((section) => ("catalogue" in section ? section.catalogue : []))
			.filter((row): row is NonNullable<typeof row> => row !== undefined);
		const documents = sections
			.flatMap((section) => ("documents" in section ? section.documents : []))
			.filter((row): row is NonNullable<typeof row> => row !== undefined);
		// 104 -> 105 (sk-jay0.3.4.18): the telepathy stone joined the items
		// catalogue via its srd.item.gear tag.
		// 105 -> 108 (sk-jay0.1.23.36.22.2): the loft chest + its 2 potions of
		// healing each catalogue as their own entity item row.
		// The authored L1 rogue and unplaced candidate blueprint are catalogue
		// subjects; spawned live vessels remain outside authored instance rows.
		// sk-jay0.3.29 removes two cellar rats, two wolves and one stirge.
		// 105 -> 106 (sk-jay0.1.76.9): the operator_offstage place graph.
		expect(catalogue).toHaveLength(106);
		expect(documents).toHaveLength(13);
		expect(
			new Set([
				...catalogue.map((row) => `${row.family}/${row.slug}`),
				...documents.map((row) => `${row.family}/${row.slug}`),
			]).size,
			// +3 (sk-jay0.1.23.36.22.2): the loft chest + its 2 potions.
			// +1 (sk-jay0.1.76.9): the operator_offstage place graph.
		).toBe(119);
		expect(catalogue.filter((row) => row.kind === "entity" && row.family === "cast")).toHaveLength(
			69,
		);
		expect(
			catalogue
				.filter((row) => row.kind === "entity_definition" && row.family === "cast")
				.map((row) => row.ref),
		).toEqual(["kavemouth/adventure/candidate", "kavemouth/adventure/rogue-companion"]);
		// Rogue and its kit are now unplaced blueprints; live instances have no authored key.
		expect(catalogue.filter((row) => row.kind === "entity" && row.family === "item")).toHaveLength(
			10,
		);
		expect(
			catalogue
				.filter(
					(row) =>
						row.kind === "entity" &&
						row.family === "item" &&
						row.ref.startsWith("kavemouth/adventure/npc/rogue_companion_1/item/"),
				)
				.map((row) => row.ref),
		).toEqual([]);
		// The rogue now instantiates the starter-kit definitions. Only the
		// unplaced telepathy-stone definition remains a definition catalog subject.
		expect(
			catalogue
				.filter((row) => row.kind === "entity_definition" && row.family === "item")
				.map((row) => row.ref)
				.sort(),
		).toEqual([
			"kavemouth/adventure/item/telepathy_stone",
			"kavemouth/item/field_kit",
			"kavemouth/item/rations",
			"kavemouth/item/rogue-field-kit",
			"kavemouth/item/torch",
		]);
		expect(catalogue.filter((row) => row.kind === "place_graph")).toHaveLength(19);
		expect(catalogue.filter((row) => row.kind === "session_definition")).toHaveLength(1);
		expect(
			catalogue
				.filter((row) => row.tags?.includes("quest-item"))
				.map((row) => row.ref)
				.sort(),
		).toEqual([
			"kavemouth/adventure/item/cult_relic_1",
			"kavemouth/adventure/item/moonpetal_1",
			"kavemouth/adventure/item/tomb_key_1",
		]);
		for (const document of documents) {
			expect(document.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
			expect(document.slug).toMatch(/^[A-Za-z0-9_-]+$/);
		}
		const questDocuments = documents.filter(
			(document) => "tags" in document && "relations" in document,
		);
		const firstQuest = questDocuments.find((row) => row.id === "quest-q1");
		expect(firstQuest?.tags).toEqual(["quest.rung.I"]);
		expect(questDocuments.find((row) => row.id === "quest-q12")?.tags).toEqual([
			"quest.rung.finale",
		]);
		expect(firstQuest?.relations).toEqual(
			expect.arrayContaining([
				{ kind: "entity", ref: "kavemouth/adventure/npc/aldwin_1" },
				{ kind: "entity_definition", ref: "srd/creature/giant-rat" },
			]),
		);
		expect(catalogue.every((row) => row.source.path.startsWith("fixtures/adventure/"))).toBe(true);
		expect(firstQuest?.body).toContain('"giver_key": "kavemouth/adventure/npc/aldwin_1"');
		expect(firstQuest?.body).toContain('"reward_xp": 100');
		expect(firstQuest?.body).toContain('"terminal"');
		expect(firstQuest?.body).toContain('"kill_xp_creatures"');
		expect(firstQuest?.body).toContain("- Rung: I");
		expect(firstQuest?.body).toContain("- Giver: Aldwin");
		expect(firstQuest?.body).toContain("<details><summary>Technical details</summary>");
	});

	it("requires presentation metadata for each exact unnamed session identity", () => {
		const rows = authoredRows();
		expect(() =>
			buildKavemouthRootMetadata(
				{
					...rows,
					session_definitions: [
						...(rows.session_definitions ?? []),
						{ session_def_id: "kavemouth/adventure/session/new" },
					],
				},
				descriptor,
				sourcePaths(),
			),
		).toThrow("session 'kavemouth/adventure/session/new' needs explicit presentation metadata");
	});

	it("retains typed subjects and ships no third-party map layers", () => {
		const metadata = buildKavemouthRootMetadata(authoredRows(), descriptor, sourcePaths());
		const pilot = metadata.docs.sections[0]?.pages?.[0];
		expect(pilot?.body).not.toContain("srd/armor/shield");
		expect(pilot?.body).toContain(
			'::subject{kind="entity" ref="kavemouth/adventure/innkeeper_1" view="compact"}',
		);
		const rows = authoredRows();
		// No backdrop map layers ship yet; first-party maps follow.
		expect(metadata.docs.attributions).toHaveLength(1);
		expect(rows.map_layers ?? []).toHaveLength(0);
	});

	it("derives the SRD-subjects art page from every kavemouth.art.image attachment the adventure does not own", () => {
		const rows = authoredRows();
		const artAttachments = (rows.metadata_attachments ?? []).filter(
			(row) => row.namespace === "kavemouth.art.image" && row.target_kind === "entity_definition",
		);
		const ownedTargets = new Set(
			artAttachments
				.map((row) => row.target_ref as string)
				.filter((ref) => ref.startsWith("kavemouth/")),
		);
		expect([...ownedTargets].sort()).toEqual([
			"kavemouth/adventure/item/cult_relic",
			"kavemouth/adventure/item/moonpetal",
			"kavemouth/adventure/item/tomb_key",
			"kavemouth/item/rations",
			"kavemouth/item/torch",
		]);
		const srdTargets = [
			...new Set(
				artAttachments
					.map((row) => row.target_ref as string)
					.filter((ref) => !ref.startsWith("kavemouth/")),
			),
		].sort();
		expect(srdTargets).toHaveLength(30);

		const metadata = buildKavemouthRootMetadata(rows, descriptor, sourcePaths());
		const srdSubjectsPage = metadata.docs.sections[0]?.pages?.[1];
		expect(srdSubjectsPage?.id).toBe("srd-subjects");
		expect(srdSubjectsPage?.body).toBe(
			[
				"These are SRD subjects — creatures and gear the adventure does not own — " +
					"shown here with the art this adventure gives them. Their own SRD page " +
					"carries none of it; it lives only on this page.",
				...srdTargets.map((ref) => `::subject{kind="entity_definition" ref="${ref}" view="full"}`),
			].join("\n\n"),
		);
	});
});
