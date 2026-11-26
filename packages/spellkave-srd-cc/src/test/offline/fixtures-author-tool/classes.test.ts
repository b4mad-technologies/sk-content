// K1 offline proof, read through the author-facing query tool (`ledger/
// classes.md`): the 12 base-class `entity_definitions` rows, tagged
// `srd.class` + `srd.class.<slug>`, each seeded with `srd/hit-die` +
// `srd/hp_per_level` via `entity_definition_initial_state`; the 12
// subclass rows, tagged `srd.subclass` + `srd.subclass.<slug>` +
// their parent's own `srd.class.<slug>` linkage tag.
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { describe, expect, it } from "vitest";
import {
	buildClassUnits,
	buildSubclassUnits,
	CLASS_CLASS_TAG,
	CLASS_TAG_PREFIX,
	HIT_DIE_RESOURCE_ID,
	SUBCLASS_CLASS_TAG,
	SUBCLASS_TAG_PREFIX,
} from "../../../chapters/classes/classes-units";
import {
	ACTION_SURGE_NICHE_ID,
	SECOND_WIND_NICHE_ID,
} from "../../../chapters/classes/fighter-units";
import { buildClassAndSubclassEntityFragments } from "../../../chapters/classes/index";
import { FIXTURES_DIR } from "../../../pipeline";
import { buildTools, type QueryDetailResult, type QueryListResult, query } from "./harness";

describe("fixtures/ Classes base classes", () => {
	it("emits exactly the 12 shipped class entity_definitions rows", async () => {
		const tools = buildTools();
		const list = (await query(tools, {
			kind: "entity_definitions",
			bundle: "srd",
		})) as QueryListResult;
		const classIds = list.items.map((item) => item.id).filter((id) => id.includes("/class/"));
		expect(classIds.sort()).toEqual(
			buildClassUnits()
				.map((unit) => unit.entityId)
				.sort(),
		);
	});

	it("tags every class with srd.class + srd.class.<slug>, description player-facing only (provenance lives on the srd.text attachment — sk-jay0.3.5.95)", async () => {
		const tools = buildTools();
		for (const unit of buildClassUnits()) {
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
			expect(description).not.toContain("Primary Ability:");
			// Developer detail has its own durable homes, never the description.
			expect(description).not.toContain(unit.sourcePk);
			expect(description).not.toContain("Source: cache/");

			const tagList = (await query(tools, {
				kind: "entity_definition_tag",
				bundle: "srd",
			})) as QueryListResult;
			const tagsForClass = tagList.items
				.map((item) => item.id)
				.filter((id) => id.startsWith(`${unit.entityId}::`))
				.map((id) => id.slice(`${unit.entityId}::`.length));
			expect(new Set(tagsForClass)).toEqual(
				new Set([CLASS_CLASS_TAG, `${CLASS_TAG_PREFIX}.${unit.slug}`]),
			);
		}
	});

	it("seeds each base class' def-level srd/hit-die + srd/hp_per_level via entity_definition_initial_state", async () => {
		// `entity_definition_initial_state` is a write-only row kind (mirrors
		// `character-origins.test.ts`'s own species srd/size/srd/speed-walk
		// assertion) — read the GENERATED fragment text directly.
		// `target` (mirrors `chapters/index.ts`'s own `committedFixturesTarget()`
		// wiring): the class entity defs' srd/hp_per_level seed references a row
		// `character-creation`'s chapter generation authors — MF-VAL-253 needs
		// the already-committed fixtures target to resolve a cross-chapter
		// reference (`classes/index.ts`'s own `buildClassAndSubclassEntity
		// Fragments` header). Called DIRECTLY (K3, this file's own header note
		// on `classes/index.ts`'s exported function): the full `generateClasses()`
		// now also runs K2+K3's own much heavier content — calling only the K1
		// fragment this test actually needs keeps this test's own synchronous
		// cost small, avoiding a long CPU-bound stretch that risks starving
		// vitest's worker RPC heartbeat under `--no-file-parallelism` (the same
		// #2123 finding `pipeline.test.ts`'s own header names).
		const { fragmentsByEntityId } = await buildClassAndSubclassEntityFragments(
			createLocalAuthorTarget(FIXTURES_DIR),
		);
		for (const unit of buildClassUnits()) {
			const entityToml = fragmentsByEntityId.get(unit.entityId);
			expect(entityToml, `expected a fragment for ${unit.entityId}`).toBeDefined();
			const hitDieBlock = new RegExp(
				`entity_def_id = "${unit.entityId}"\\nstate_id = "${HIT_DIE_RESOURCE_ID}"\\nvalue_bool = true\\nvalue_int = ${unit.hitDieSize}\\n`,
			);
			const hpPerLevelBlock = new RegExp(
				`entity_def_id = "${unit.entityId}"\\nstate_id = "srd/hp_per_level"\\nvalue_bool = true\\nvalue_int = ${unit.hpPerLevel}\\n`,
			);
			expect(entityToml).toMatch(hitDieBlock);
			expect(entityToml).toMatch(hpPerLevelBlock);
		}
	});
});

describe("fixtures/ Classes subclasses", () => {
	it("emits exactly the 12 shipped subclass entity_definitions rows", async () => {
		const tools = buildTools();
		const list = (await query(tools, {
			kind: "entity_definitions",
			bundle: "srd",
		})) as QueryListResult;
		// Real subclass entity_definitions only — not L5d choice-option wrappers
		// that embed "/subclass/" in their path under advancement-choice-option/.
		const subclassIds = list.items
			.map((item) => item.id)
			.filter((id) => id.startsWith("srd/subclass/"));
		expect(subclassIds.sort()).toEqual(
			buildSubclassUnits()
				.map((unit) => unit.entityId)
				.sort(),
		);
	});

	it("tags every subclass with srd.subclass + srd.subclass.<slug> + its parent's own srd.class.<slug> linkage tag", async () => {
		const tools = buildTools();
		for (const unit of buildSubclassUnits()) {
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
			expect(description).not.toContain(`_${unit.flavorText}_`);
			// Developer detail has its own durable homes, never the description.
			expect(description).not.toContain(unit.sourcePk);
			expect(description).not.toContain(`srd/class/${unit.parentSlug}`);

			const tagList = (await query(tools, {
				kind: "entity_definition_tag",
				bundle: "srd",
			})) as QueryListResult;
			const tagsForSubclass = tagList.items
				.map((item) => item.id)
				.filter((id) => id.startsWith(`${unit.entityId}::`))
				.map((id) => id.slice(`${unit.entityId}::`.length));
			expect(new Set(tagsForSubclass)).toEqual(
				new Set([SUBCLASS_CLASS_TAG, `${SUBCLASS_TAG_PREFIX}.${unit.slug}`, unit.parentClassTag]),
			);
		}
	});

	it("carries NO entity_definition_initial_state row for any subclass (die-inheritance quirk guard)", async () => {
		// `buildClassAndSubclassEntityFragments` directly — same K3 cost note
		// as the base-class test above.
		const { fragmentsByEntityId } = await buildClassAndSubclassEntityFragments(
			createLocalAuthorTarget(FIXTURES_DIR),
		);
		for (const unit of buildSubclassUnits()) {
			const entityToml = fragmentsByEntityId.get(unit.entityId);
			expect(entityToml, `expected a fragment for ${unit.entityId}`).toBeDefined();
			expect(entityToml).not.toContain(`entity_def_id = "${unit.entityId}"\nstate_id =`);
		}
	});
});

describe("fixtures/ Fighter class features are actor-carried (sk-0m4.69)", () => {
	for (const nicheId of [SECOND_WIND_NICHE_ID, ACTION_SURGE_NICHE_ID] as const) {
		it(`${nicheId} is provider="actor" with a trivial predicate — no place node required`, async () => {
			const tools = buildTools();
			const detail = (await query(tools, {
				kind: "niche_definitions",
				id: nicheId,
				refs: "none",
			})) as QueryDetailResult;
			expect(detail.found, `expected ${nicheId} to be found`).toBe(true);
			const row = detail.row as Record<string, unknown>;
			expect(row.provider).toBe("actor");
			expect(row.predicate_source).toBe("");
		});
	}
});
