import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectManifest, loadFlattened } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";

import { SRD_DOCS_PAGE, srdRootMetadata } from "../../compendium-metadata";
import {
	catalogueEntriesFromManifest,
	docsLinkTargetsFromManifest,
	tagPathSlug,
} from "../../docs/catalogue";
import { FIXTURES_DIR } from "../../pipeline";

function entries(section: string, manifest: Record<string, unknown>) {
	return catalogueEntriesFromManifest(manifest).get(section) ?? [];
}

describe("SRD docs catalogue", () => {
	it("authors reader references from exact attachment provenance rather than display titles", () => {
		const payload = JSON.stringify({
			text: "Not consulted for association.",
			source: "cache/markdown/monsters-A-Z.md:1095-1179",
			license: "CC-BY-4.0",
		});
		const catalogue = catalogueEntriesFromManifest({
			entity_definitions: [
				{
					entity_def_id: "srd/creature/barbed-devil",
					display_name: "A deliberately unrelated title",
				},
			],
			metadata_attachments: [
				{
					target_kind: "entity_definition",
					target_ref: "srd/creature/barbed-devil",
					namespace: "srd.text",
					payload_json: payload,
				},
			],
		});
		expect(catalogue.get("monsters")?.[0]?.reader_page_id).toBe("monsters-a-z-barbed-devil");
		const page = srdRootMetadata(catalogue)
			.docs.sections.find((section) => section.id === "monsters")
			?.pages?.find((candidate) => candidate.id === "monsters-a-z-barbed-devil");
		expect(page).toMatchObject({
			featured_reference: {
				kind: "entity_definition",
				ref: "srd/creature/barbed-devil",
			},
		});
	});

	it("does not choose a featured reader reference when provenance is shared", () => {
		const source = "cache/markdown/monsters-A-Z.md:1095-1179";
		const catalogue = catalogueEntriesFromManifest({
			entity_definitions: [
				{ entity_def_id: "srd/creature/barbed-devil" },
				{ entity_def_id: "srd/creature/basilisk" },
			],
			metadata_attachments: [
				...["srd/creature/barbed-devil", "srd/creature/basilisk"].map((ref) => ({
					target_kind: "entity_definition",
					target_ref: ref,
					namespace: "srd.text",
					payload_json: JSON.stringify({ text: "Duplicate titles do not matter.", source }),
				})),
			],
		});
		expect(catalogue.get("monsters")?.map((entry) => entry.reader_page_id)).toEqual([
			undefined,
			undefined,
		]);
	});

	// Runtime description cleanup (leading markup stripped, a plain monster
	// summary passed straight through) moved to the website projection
	// (sk-jay0.3.5.54 step 2): this generator no longer reads
	// `entity_definitions.description` into a catalogue row at all — the
	// website reads the entity's own manifest row directly instead. Coverage
	// for the cleanup rule now lives in
	// `apps/website/src/compendium/project-metadata-docs.test.ts`
	// ("derives spell facts and a cleaned description from an entity's own
	// tags").
	it("never carries a description on an entity_definition catalogue row (sk-jay0.3.5.54)", () => {
		const monsters = entries("monsters", {
			entity_definitions: [
				{
					entity_def_id: "srd/creature/bearded-devil",
					description: "Medium Fiend (Devil), Lawful Evil **AC** 13 <br> **HP** 58",
				},
				{ entity_def_id: "srd/creature/black-dragon-wyrmling", description: "Dragon (Chromatic)" },
			],
		});
		for (const entry of monsters) expect(entry.description).toBeUndefined();
	});

	it("authors frozen legacy prose-link winners from typed source rows", () => {
		const links = docsLinkTargetsFromManifest({
			entity_definitions: [
				{ entity_def_id: "srd/spell/fireball", display_name: "Fireball" },
				{ entity_def_id: "srd/class-feature/bard/spellcasting", display_name: "Spellcasting" },
				{ entity_def_id: "srd/class-feature/wizard/spellcasting", display_name: "Spellcasting" },
			],
			resource_definitions: [
				{ resource_definition_id: "srd/dex", display_name: "Dexterity" },
				{ resource_definition_id: "srd/heroic_inspiration", display_name: "Heroic Inspiration" },
			],
		});
		expect(links).toEqual([
			{
				label: "Spellcasting",
				kind: "entity_definition",
				ref: "srd/class-feature/bard/spellcasting",
			},
			{ label: "Dexterity", kind: "resource_definition", ref: "srd/dex" },
			{ label: "Fireball", kind: "entity_definition", ref: "srd/spell/fireball" },
		]);
	});

	it("admits short labels and skills as lookup-only targets (sk-jay0.1.76.19.20)", () => {
		const links = docsLinkTargetsFromManifest({
			entity_definitions: [
				{ entity_def_id: "srd/species/elf", display_name: "Elf" },
				{ entity_def_id: "srd/spell/aid", display_name: "Aid" },
				{ entity_def_id: "srd/spell/fireball", display_name: "Fireball" },
			],
			capability_definitions: [
				{ capability_id: "srd/skill/stealth", display_name: "Skill: Stealth" },
				{ capability_id: "srd/skill/stealth", display_name: "Skill: Stealth" },
				{ capability_id: "srd/proficiency/lute", display_name: "Lute" },
			],
			capability_definition_tag: [
				{ capability_id: "srd/skill/stealth", tag: "srd.skill" },
				{ capability_id: "srd/proficiency/lute", tag: "srd.proficiency" },
			],
		});
		expect(links).toEqual([
			{
				label: "Skill: Stealth",
				kind: "capability_definition",
				ref: "srd/skill/stealth",
				autolink: false,
			},
			{ label: "Fireball", kind: "entity_definition", ref: "srd/spell/fireball" },
			{ label: "Aid", kind: "entity_definition", ref: "srd/spell/aid" },
			{ label: "Elf", kind: "entity_definition", ref: "srd/species/elf", autolink: false },
		]);
	});

	it("retains authored ability search semantics without UI inference", () => {
		const abilities = entries("playing-the-game", {
			resource_definitions: [
				{ resource_definition_id: "srd/str" },
				{ resource_definition_id: "srd/dex" },
				{ resource_definition_id: "srd/heroic_inspiration" },
			],
		});
		expect(abilities).toEqual([
			{ kind: "resource_definition", ref: "srd/str", family: "ability", slug: "str" },
			{ kind: "resource_definition", ref: "srd/dex", family: "ability", slug: "dex" },
			{
				kind: "resource_definition",
				ref: "srd/heroic_inspiration",
				family: "resource",
				slug: "heroic-inspiration",
			},
		]);
	});

	it("keeps served class-feature winners short and disambiguates every other owner", () => {
		const classes = entries("classes", {
			entity_definitions: [
				{ entity_def_id: "srd/class-feature/barbarian/extra-attack" },
				{ entity_def_id: "srd/class-feature/fighter/extra-attack" },
				{ entity_def_id: "srd/class-feature/paladin/extra-attack" },
				{ entity_def_id: "srd/class-feature/druid/circle-of-the-land/spell-list" },
				{ entity_def_id: "srd/class-feature/ranger/spell-list" },
			],
		});
		expect(classes).toEqual([
			{
				kind: "entity_definition",
				ref: "srd/class-feature/barbarian/extra-attack",
				family: "class-feature",
				slug: "extra-attack",
			},
			{
				kind: "entity_definition",
				ref: "srd/class-feature/fighter/extra-attack",
				family: "class-feature",
				slug: "fighter-extra-attack",
			},
			{
				kind: "entity_definition",
				ref: "srd/class-feature/paladin/extra-attack",
				family: "class-feature",
				slug: "paladin-extra-attack",
			},
			{
				kind: "entity_definition",
				ref: "srd/class-feature/druid/circle-of-the-land/spell-list",
				family: "class-feature",
				slug: "spell-list",
			},
			{
				kind: "entity_definition",
				ref: "srd/class-feature/ranger/spell-list",
				family: "class-feature",
				slug: "ranger-spell-list",
			},
		]);
	});

	it("includes all authored resources and keeps resource route collisions distinct", () => {
		expect(
			entries("playing-the-game", {
				resource_definitions: [
					{ resource_definition_id: "srd/str" },
					{ resource_definition_id: "srd/heroic_inspiration" },
				],
			}),
		).toEqual([
			{ kind: "resource_definition", ref: "srd/str", family: "ability", slug: "str" },
			{
				kind: "resource_definition",
				ref: "srd/heroic_inspiration",
				family: "resource",
				slug: "heroic-inspiration",
			},
		]);
		expect(
			entries("magic-items", {
				resource_definitions: [
					{ resource_definition_id: "srd/magic_item/wand-of-fireballs/charges" },
					{ resource_definition_id: "srd/magic_item/wand-of-magic-missiles/charges" },
				],
			}),
		).toEqual([
			{
				kind: "resource_definition",
				ref: "srd/magic_item/wand-of-fireballs/charges",
				family: "resource",
				slug: "magic-item-wand-of-fireballs-charges",
			},
			{
				kind: "resource_definition",
				ref: "srd/magic_item/wand-of-magic-missiles/charges",
				family: "resource",
				slug: "magic-item-wand-of-magic-missiles-charges",
			},
		]);
	});

	it("rejects a newly colliding class feature without an explicit compatibility winner", () => {
		expect(() =>
			catalogueEntriesFromManifest({
				entity_definitions: [
					{ entity_def_id: "srd/class-feature/bard/new-shared-feature" },
					{ entity_def_id: "srd/class-feature/wizard/new-shared-feature" },
				],
			}),
		).toThrow("has no declared legacy winner");
	});

	it("emits route-safe single-segment slugs", () => {
		const catalogue = catalogueEntriesFromManifest({
			entity_definitions: [{ entity_def_id: "srd/item/gold-piece" }],
			resource_definitions: [{ resource_definition_id: "srd/heroic_inspiration" }],
		});
		for (const entry of [...catalogue.values()].flat()) {
			expect(entry.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
		}
	});

	it("keeps an existing subject route when a resource would otherwise share it", () => {
		const classes = entries("classes", {
			entity_definitions: [
				{ entity_def_id: "srd/class-feature/paladin/channel-divinity-uses" },
				{ entity_def_id: "srd/class-feature/cleric/channel-divinity-uses" },
			],
			resource_definitions: [{ resource_definition_id: "srd/paladin/channel-divinity-uses" }],
		});
		expect(classes.map((entry) => entry.slug)).toEqual([
			"paladin-channel-divinity-uses",
			"channel-divinity-uses",
			"resource-channel-divinity-uses",
		]);
	});

	// Spell/creature/magic-item facts moved to the website projection
	// (sk-jay0.3.5.54 step 2): every one of those facts restates a tag the
	// entity already carries, so the website derives the value from the
	// entity's own `entity_definition_tag` rows instead of this generator
	// copying it onto the catalogue row — see `sections.toml`'s
	// `fact_namespaces`/`fact_value_overrides` and
	// `apps/website/src/compendium/project-metadata-docs.test.ts`'s
	// "derives spell facts and a cleaned description from an entity's own
	// tags" for the projection-side coverage. Equipment/feat/class facts have
	// no tag counterpart and stay authored here, unaffected.
	it("never carries facts on a spell, monster, or magic-item catalogue row (sk-jay0.3.5.54)", () => {
		const catalogue = catalogueEntriesFromManifest({
			entity_definitions: [
				{ entity_def_id: "srd/spell/acid-splash" },
				{ entity_def_id: "srd/creature/goblin-warrior" },
				{ entity_def_id: "srd/magic_item/adamantine-armor-plate" },
			],
		});
		expect((catalogue.get("spells") ?? [])[0]?.facts).toBeUndefined();
		expect((catalogue.get("monsters") ?? [])[0]?.facts).toBeUndefined();
		expect((catalogue.get("magic-items") ?? [])[0]?.facts).toBeUndefined();
	});

	it("authors only the equipment facts that no tag can restate", () => {
		const entries = catalogueEntriesFromManifest({
			entity_definitions: [{ entity_def_id: "srd/weapon/longsword" }],
		}).get("equipment");
		const facts = entries?.[0]?.facts ?? [];
		// Cost and Damage exist nowhere in the manifest (sk-jay0.3.5.62), so they
		// stay authored here.
		expect(facts).toEqual(
			expect.arrayContaining([
				{ label: "Cost", value: "15 GP" },
				{ label: "Damage", value: "1d8 slashing" },
			]),
		);
		// Category is restated by srd.weapon.category.martial, so the reader derives
		// it and this emission must not carry a second copy.
		expect(facts.some((fact) => fact.label === "Category")).toBe(false);
	});

	// Every tag value now routes to the single `tags` section id
	// (sk-jay0.3.5.66) with a multi-segment `tagPathSlug` route mirroring its
	// namespace, regardless of the entity family the tag happens to describe
	// (monster/spell/magic-item/…). The per-namespace `[[tag_sections]]`
	// table that used to scatter these into `monsters`/`spells`/… is retired
	// (see `sections.toml`'s and `docs/catalogue.ts`'s own headers) — these
	// tests replace the old one-test-per-destination-section coverage below.
	it("routes a tag value under the tags section with a multi-segment slug (sk-jay0.3.5.66)", () => {
		const tags = entries("tags", {
			tag_value_definitions: [
				{
					bundle_id: "srd",
					prefix: "srd.creature_type",
					tag: "srd.creature_type.dragon",
					description:
						"Dragons are scaly beings of ancient origin, such as red dragons and wyverns.",
				},
			],
		});
		expect(tags).toEqual([
			{
				kind: "tag_value_definition",
				ref: "srd.creature_type.dragon",
				family: "tag",
				slug: "creature-type/dragon",
				title: "Dragon",
			},
		]);
	});

	it("keeps a hyphenated tag id segment (e.g. chaotic-evil) as one path segment, not split further", () => {
		const tags = entries("tags", {
			tag_value_definitions: [
				{
					bundle_id: "srd",
					prefix: "srd.alignment",
					tag: "srd.alignment.chaotic-evil",
					description: "Chaotic Evil creatures act with arbitrary violence.",
				},
			],
		});
		expect(tags).toEqual([
			{
				kind: "tag_value_definition",
				ref: "srd.alignment.chaotic-evil",
				family: "tag",
				slug: "alignment/chaotic-evil",
				title: "Chaotic Evil",
			},
		]);
	});

	it("hyphenates an underscore WITHIN a segment rather than flattening across segments", () => {
		const tags = entries("tags", {
			tag_value_definitions: [
				{
					bundle_id: "srd",
					prefix: "srd",
					tag: "srd.travel_pace.fast",
					description: "Fast Travel Pace.",
				},
			],
		});
		expect(tags).toEqual([
			{
				kind: "tag_value_definition",
				ref: "srd.travel_pace.fast",
				family: "tag",
				slug: "travel-pace/fast",
				title: "Fast",
			},
		]);
	});

	it("routes a four-segment tag id to a three-segment slug (drops the leading srd bundle segment)", () => {
		const tags = entries("tags", {
			tag_value_definitions: [
				{
					bundle_id: "srd",
					prefix: "srd.spell.school",
					tag: "srd.spell.school.evocation",
					description: "Evocation spells manipulate energy or create it from nothing.",
				},
			],
		});
		expect(tags).toEqual([
			{
				kind: "tag_value_definition",
				ref: "srd.spell.school.evocation",
				family: "tag",
				slug: "spell/school/evocation",
				title: "Evocation",
			},
		]);
	});

	it("routes a bare two-segment root tag value (e.g. srd.feat itself) to a single-segment slug", () => {
		const tags = entries("tags", {
			tag_value_definitions: [
				{
					bundle_id: "srd",
					prefix: "srd",
					tag: "srd.feat.general",
					description: "Identifies a feat entity definition as a General feat.",
				},
			],
		});
		expect(tags).toEqual([
			{
				kind: "tag_value_definition",
				ref: "srd.feat.general",
				family: "tag",
				slug: "feat/general",
				title: "General",
			},
		]);
	});

	it("routes a namespace tag (e.g. srd.cr itself) beside its own value tags without collision (sk-jay0.3.5.50)", () => {
		const tags = entries("tags", {
			tag_value_definitions: [
				{ bundle_id: "srd", prefix: "srd", tag: "srd.cr", description: "The CR group tag." },
				{ bundle_id: "srd", prefix: "srd.cr", tag: "srd.cr.2", description: "Challenge rating 2." },
			],
		});
		expect(tags.map((entry) => ({ ref: entry.ref, slug: entry.slug }))).toEqual([
			{ ref: "srd.cr", slug: "cr" },
			{ ref: "srd.cr.2", slug: "cr/2" },
		]);
		expect(tags.every((entry) => entry.family === "tag")).toBe(true);
	});

	it("routes any root tag namespace to the tags section — there is no longer an 'unmapped' fallback (sk-jay0.3.5.66)", () => {
		// Before sk-jay0.3.5.66, a namespace absent from the retired
		// `[[tag_sections]]` table got no catalogue entry at all (see git
		// history for the "emits no catalogue entry for a tag value under an
		// unmapped namespace" case this replaces). Placement is no longer a
		// per-namespace lookup, so every real namespace routes the same way.
		const tags = entries("tags", {
			tag_value_definitions: [
				{ bundle_id: "srd", prefix: "srd", tag: "srd.creature", description: "A creature entity." },
				{
					bundle_id: "srd",
					prefix: "srd.previously_unmapped",
					tag: "srd.previously_unmapped.value",
					description: "A namespace the retired [[tag_sections]] table never listed.",
				},
			],
		});
		expect(tags).toEqual([
			{
				kind: "tag_value_definition",
				ref: "srd.creature",
				family: "tag",
				slug: "creature",
				title: "Creature",
			},
			{
				kind: "tag_value_definition",
				ref: "srd.previously_unmapped.value",
				family: "tag",
				slug: "previously-unmapped/value",
				title: "Value",
			},
		]);
	});

	it("routes adventure/runtime identity tags to the tags section like any other tag (srd.dm_npc, sk-jay0.3.5.76)", () => {
		// Retired sk-jay0.3.5.50's `no_page_namespaces` carve-out: the owner
		// ruled these get tag pages like every other tag, exact match or nested
		// leaf alike.
		const catalogue = catalogueEntriesFromManifest({
			tag_value_definitions: [
				{
					bundle_id: "srd",
					prefix: "srd",
					tag: "srd.dm_npc.aldwin",
					description: "Identifies an entity instance as Aldwin.",
				},
				{
					bundle_id: "srd",
					prefix: "srd",
					tag: "srd.dm_npc",
					description: "The dm_npc namespace's own bare identity tag, if it existed.",
				},
			],
		});
		const entries = [...catalogue.values()].flat();
		expect(entries.map((entry) => entry.ref)).toEqual(["srd.dm_npc.aldwin", "srd.dm_npc"]);
		expect([...catalogue.keys()]).toEqual(["tags"]);
	});

	it("labels srd.cr tag values as fractional or whole challenge ratings (sk-jay0.3.5.50)", () => {
		const tags = entries("tags", {
			tag_value_definitions: [
				{ bundle_id: "srd", prefix: "srd.cr", tag: "srd.cr.2", description: "Challenge rating 2." },
				{
					bundle_id: "srd",
					prefix: "srd.cr",
					tag: "srd.cr.1-2",
					description: "Challenge rating 1/2.",
				},
			],
		});
		expect(tags.map((entry) => entry.title)).toEqual(["CR 2", "CR 1/2"]);
		// The fractional notation's "1-2" is one dot-segment already, not a
		// sub-segment boundary, so it stays one path segment unsplit.
		expect(tags.map((entry) => entry.slug)).toEqual(["cr/2", "cr/1-2"]);
	});

	it("routes every real SRD tag value, adventure/runtime identity vocabulary included (sk-jay0.3.5.76)", () => {
		const flattened = loadFlattened(FIXTURES_DIR);
		const committed = inspectManifest(flattened).manifest as Record<string, unknown>;
		const tagRows = Array.isArray(committed.tag_value_definitions)
			? (committed.tag_value_definitions as Array<Record<string, unknown>>)
			: [];
		expect(tagRows.length).toBeGreaterThan(0);
		// The former `no_page_namespaces` carve-out (srd.dm_npc, srd.faction,
		// srd.party) is retired: every tag row routes, with none left unrouted.
		const catalogue = catalogueEntriesFromManifest(committed);
		const routedTagEntries = [...catalogue.values()]
			.flat()
			.filter((entry) => entry.kind === "tag_value_definition");
		expect(routedTagEntries).toHaveLength(tagRows.length);
		// Every routed tag lands in exactly one section — the single `tags`
		// section id, now that placement is no longer per-namespace.
		const seenRefs = new Set(routedTagEntries.map((entry) => entry.ref));
		expect(seenRefs.size).toBe(routedTagEntries.length);
		expect(
			[...catalogue.keys()].filter((section) =>
				(catalogue.get(section) ?? []).some((entry) => entry.kind === "tag_value_definition"),
			),
		).toEqual(["tags"]);
	});

	it("rejects colliding tag value slugs within the tags section", () => {
		expect(() =>
			catalogueEntriesFromManifest({
				tag_value_definitions: [
					{
						bundle_id: "srd",
						prefix: "srd.creature_type",
						tag: "srd.creature_type.dragon",
						description: "First.",
					},
					{
						bundle_id: "srd",
						prefix: "srd.creature_type",
						// Same slug as the row above; only the case differs, deliberately
						// colliding once `tagPathSlug` lowercases.
						tag: "srd.creature_type.DRAGON",
						description: "Second, deliberately colliding after slug flattening.",
					},
				],
			}),
		).toThrow(/duplicate 'creature-type\/dragon' route/);
	});

	it("carries the canonical SRD attribution in authored root metadata", () => {
		const noticePath = join(dirname(fileURLToPath(import.meta.url)), "../../../cache/NOTICE.md");
		const artLicensePath = join(
			dirname(fileURLToPath(import.meta.url)),
			"../../../assets/srd-art/LICENSE",
		);
		const notice = readFileSync(noticePath, "utf8");
		const artLicense = readFileSync(artLicensePath, "utf8").replace(/\r?\n+$/u, "");
		expect(SRD_DOCS_PAGE.attributions).toEqual([
			{
				body: notice.replace(/^# Attribution\n\n/, "").replace(/\n+$/u, ""),
				source: {
					path: "packages/spellkave-srd-cc/cache/NOTICE.md",
					anchor: "Attribution",
					license: "CC-BY-4.0",
				},
			},
			{
				body: artLicense,
				source: {
					path: "packages/spellkave-srd-cc/assets/srd-art/LICENSE",
					anchor: "SRD catalogue sprites",
					license: "CC-BY-4.0",
				},
			},
		]);
	});
});

describe("tagPathSlug (sk-jay0.3.5.66)", () => {
	it("maps a bare two-segment id to a single path segment", () => {
		expect(tagPathSlug("srd.monster")).toBe("monster");
	});

	it("maps a three-segment id to a two-segment path, underscores hyphenated within a segment", () => {
		expect(tagPathSlug("srd.subclass.path_of_the_berserker")).toBe(
			"subclass/path-of-the-berserker",
		);
	});

	it("maps a four-segment id to a three-segment path", () => {
		expect(tagPathSlug("srd.spell.range.self")).toBe("spell/range/self");
	});

	it("lowercases and hyphenates underscores without merging across a segment boundary", () => {
		expect(tagPathSlug("srd.creature_type.dragon")).toBe("creature-type/dragon");
	});
});
