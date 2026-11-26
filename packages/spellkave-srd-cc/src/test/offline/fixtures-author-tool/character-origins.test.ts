// O1/O2 offline proof, read through the author-facing query tool
// (`ledger/character-origins.md`): O1's 4 shipped Background
// `entity_definitions` rows, tagged `srd.background` + `srd.background.<slug>`,
// naming the real capability/entity ids they grant; O2's 9 shipped Species
// `entity_definitions` rows, tagged `srd.species` + `srd.species.<slug>` +
// `srd.creature_size.<category>`, plus the def-level `srd/size` +
// `srd/speed-walk` structural facts (`species-units.ts`'s own module header).
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { describe, expect, it } from "vitest";

import { buildBackgroundUnits } from "../../../chapters/character-origins/background-units";
import { generateCharacterOrigins } from "../../../chapters/character-origins/index";
import {
	buildSpeciesUnits,
	CREATURE_SIZE_TAG_PREFIX,
	SPECIES_CLASS_TAG,
	SPECIES_TAG_PREFIX,
} from "../../../chapters/character-origins/species-units";
import {
	buildTraitUnits,
	TRAIT_CLASS_TAG,
	TRAIT_TAG_PREFIX,
} from "../../../chapters/character-origins/trait-units";
import { FIXTURES_DIR } from "../../../pipeline";
import { buildTools, type QueryDetailResult, type QueryListResult, query } from "./harness";

describe("fixtures/ Character Origins Backgrounds", () => {
	it("emits exactly the 4 shipped background entity_definitions rows", async () => {
		const tools = buildTools();
		const list = (await query(tools, {
			kind: "entity_definitions",
			bundle: "srd",
		})) as QueryListResult;
		const backgroundIds = list.items
			.map((item) => item.id)
			.filter((id) => id.includes("/background/"));
		expect(backgroundIds.sort()).toEqual(
			buildBackgroundUnits()
				.map((unit) => unit.entityId)
				.sort(),
		);
	});

	it("tags every background with srd.background + srd.background.<slug>; description is flavor, not grants", async () => {
		const tools = buildTools();
		for (const unit of buildBackgroundUnits()) {
			const detail = (await query(tools, {
				kind: "entity_definitions",
				id: unit.entityId,
				refs: "none",
			})) as QueryDetailResult;
			expect(detail.found, `expected ${unit.entityId} to be found`).toBe(true);
			const row = detail.row as Record<string, unknown>;
			expect(row.display_name).toBe(unit.displayName);
			const description = String(row.description);
			expect(description.length).toBeGreaterThan(40);
			expect(description).not.toContain("pk='");
			expect(description).not.toContain(unit.skillCapabilityIds[0]);
			expect(description).not.toContain(unit.featEntityId);

			const tagList = (await query(tools, {
				kind: "entity_definition_tag",
				bundle: "srd",
			})) as QueryListResult;
			const tagsForBackground = tagList.items
				.map((item) => item.id)
				.filter((id) => id.startsWith(`${unit.entityId}::`))
				.map((id) => id.slice(`${unit.entityId}::`.length));
			expect(new Set(tagsForBackground)).toEqual(
				new Set(["srd.background", `srd.background.${unit.slug}`]),
			);
		}
	});
});

describe("fixtures/ Character Origins Species", () => {
	it("emits exactly the 9 shipped species entity_definitions rows", async () => {
		const tools = buildTools();
		const list = (await query(tools, {
			kind: "entity_definitions",
			bundle: "srd",
		})) as QueryListResult;
		const speciesIds = list.items.map((item) => item.id).filter((id) => id.includes("/species/"));
		expect(speciesIds.sort()).toEqual(
			buildSpeciesUnits()
				.map((unit) => unit.entityId)
				.sort(),
		);
	});

	it("tags every species with srd.species + srd.species.<slug> + srd.creature_size.<category> (both categories for the 2 choice-size species)", async () => {
		const tools = buildTools();
		for (const unit of buildSpeciesUnits()) {
			const detail = (await query(tools, {
				kind: "entity_definitions",
				id: unit.entityId,
				refs: "none",
			})) as QueryDetailResult;
			expect(detail.found, `expected ${unit.entityId} to be found`).toBe(true);
			const row = detail.row as Record<string, unknown>;
			expect(row.display_name).toBe(unit.displayName);
			const description = String(row.description);
			expect(description.length).toBeGreaterThan(40);
			expect(description).not.toContain("pk='");
			expect(description).not.toContain(unit.markdownAnchor);

			const tagList = (await query(tools, {
				kind: "entity_definition_tag",
				bundle: "srd",
			})) as QueryListResult;
			const tagsForSpecies = tagList.items
				.map((item) => item.id)
				.filter((id) => id.startsWith(`${unit.entityId}::`))
				.map((id) => id.slice(`${unit.entityId}::`.length));
			const expectedSizeTags = unit.sizeCategories.map(
				(category) => `${CREATURE_SIZE_TAG_PREFIX}.${category.toLowerCase()}`,
			);
			expect(new Set(tagsForSpecies)).toEqual(
				new Set([SPECIES_CLASS_TAG, `${SPECIES_TAG_PREFIX}.${unit.slug}`, ...expectedSizeTags]),
			);
		}
	});

	// The 45s bound: a FULL `generateCharacterOrigins` render (every species
	// fragment through its own throwaway workspace) inside one `it()` body —
	// ~3.1s standalone, measured at ~6.6s and timing out against the 5s default
	// once the suite stopped serializing (`package.json`'s `test:srd-coverage`
	// dropped `--no-file-parallelism`). Generous runaway-guard, never a tuned
	// performance bound — `armor-units.test.ts`'s own raised bound carries the
	// full reasoning.
	it("seeds each species' def-level srd/size rank and srd/speed-walk cell count via entity_definition_initial_state", async () => {
		// `entity_definition_initial_state` is a write-only row kind — not
		// reachable through `spellkave_query` (no natural/composite key
		// registered for it, `crates/spellkave-schema/src/row_kinds.rs`) — so
		// this reads the GENERATED fragment text directly, mirroring
		// `src/test/offline/pipeline.test.ts`'s own `renderAll()`-backed
		// approach rather than the query tool every other assertion in this
		// file uses.
		// `target` (mirrors `chapters/index.ts`'s own `committedFixturesTarget()`
		// wiring): the entity defs' srd/speed-walk seed references a row
		// `playing-the-game`'s chapter generation authors — MF-VAL-253 needs the
		// already-committed fixtures target to resolve a cross-chapter
		// reference (`buildSpeciesFragment`'s own header in `index.ts`).
		const { speciesToml } = await generateCharacterOrigins(createLocalAuthorTarget(FIXTURES_DIR));
		for (const unit of buildSpeciesUnits()) {
			const sizeBlock = new RegExp(
				`entity_def_id = "${unit.entityId}"\\nstate_id = "srd/size"\\nvalue_bool = true\\nvalue_int = ${unit.defaultSizeRank}\\n`,
			);
			const speedBlock = new RegExp(
				`entity_def_id = "${unit.entityId}"\\nstate_id = "srd/speed-walk"\\nvalue_bool = true\\nvalue_int = ${unit.speedCells}\\n`,
			);
			expect(speciesToml).toMatch(sizeBlock);
			expect(speciesToml).toMatch(speedBlock);
		}
	}, 45_000);
});

describe("fixtures/ Character Origins Traits", () => {
	it("emits exactly the 33 shipped trait entity_definitions rows", async () => {
		const tools = buildTools();
		const list = (await query(tools, {
			kind: "entity_definitions",
			bundle: "srd",
		})) as QueryListResult;
		const traitIds = list.items.map((item) => item.id).filter((id) => id.includes("/trait/"));
		expect(traitIds.sort()).toEqual(
			buildTraitUnits()
				.map((unit) => unit.entityId)
				.sort(),
		);
	});

	it("tags every trait with srd.trait + srd.trait.<slug> + a reference to its owning species' srd.species.<slug> tag, description citing provenance", async () => {
		const tools = buildTools();
		for (const unit of buildTraitUnits()) {
			const detail = (await query(tools, {
				kind: "entity_definitions",
				id: unit.entityId,
				refs: "none",
			})) as QueryDetailResult;
			expect(detail.found, `expected ${unit.entityId} to be found`).toBe(true);
			const row = detail.row as Record<string, unknown>;
			expect(row.display_name).toBe(unit.displayName);
			const description = String(row.description);
			expect(description.length).toBeGreaterThan(0);
			expect(description).not.toContain(`${unit.displayName} — a `);
			expect(description).not.toContain("pk=");
			expect(description).not.toContain("Source:");

			const tagList = (await query(tools, {
				kind: "entity_definition_tag",
				bundle: "srd",
			})) as QueryListResult;
			const tagsForTrait = tagList.items
				.map((item) => item.id)
				.filter((id) => id.startsWith(`${unit.entityId}::`))
				.map((id) => id.slice(`${unit.entityId}::`.length));
			expect(new Set(tagsForTrait)).toEqual(
				new Set([
					TRAIT_CLASS_TAG,
					`${TRAIT_TAG_PREFIX}.${unit.slug}`,
					unit.speciesTag,
					...unit.extraTags,
				]),
			);
		}
	});

	it("classifies exactly 5 mechanized traits, 2 documented-unapplied, and 26 deferred-with-owner", () => {
		const units = buildTraitUnits();
		expect(units).toHaveLength(33);
		expect(units.filter((unit) => unit.rootCause === "mechanized")).toHaveLength(5);
		expect(units.filter((unit) => unit.rootCause === "documented_unapplied")).toHaveLength(2);
		expect(
			units.filter(
				(unit) => unit.rootCause !== "mechanized" && unit.rootCause !== "documented_unapplied",
			),
		).toHaveLength(26);
	});
});
