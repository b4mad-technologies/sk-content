// Offline proof for the Character Creation chapter's Ability-Score
// Generation catalog (C3, `ledger/character-creation.md`): the Point Costs
// and Standard Array by Class tables rendered into shared `srd.character_creation*` tag
// metadata (never per-row fixture rows), plus the background-adjustment
// procedure and the already-live Modifiers-table provenance unit.
import { describe, expect, it } from "vitest";

import {
	buildCreationTablesTagValueUnits,
	CREATION_TABLES_BACKGROUND_ADJUSTMENT_TAG,
	CREATION_TABLES_CLASS_TAG,
	CREATION_TABLES_POINT_COST_TAG,
	CREATION_TABLES_STANDARD_ARRAY_TAG,
	CREATION_TABLES_TAG_PREFIX,
	creationTablesBackgroundAdjustmentTagDescription,
	creationTablesClassTagDescription,
	creationTablesModifiersProvenanceUnit,
	creationTablesPointCostTagDescription,
	creationTablesStandardArrayTagDescription,
	standardArrayForClass,
} from "../../chapters/character-creation/creation-tables-units";
import { ABILITY_MODIFIERS_RULE_PK } from "../../chapters/playing-the-game/modifier-units";
import { readStandardArrayByClassTable } from "../../markdown/character-creation";

describe("CREATION_TABLES_TAG_PREFIX", () => {
	it("is the declared srd.character_creation family prefix", () => {
		expect(CREATION_TABLES_TAG_PREFIX).toBe("srd.character_creation");
	});
});

describe("standardArrayForClass", () => {
	it("returns the Fighter row (Str 15, Dex 14, Con 13, Int 8, Wis 10, Cha 12) against the parsed table", () => {
		const fighter = standardArrayForClass("Fighter");
		const parsed = readStandardArrayByClassTable().find((row) => row.className === "Fighter");
		expect(parsed).toBeDefined();
		expect(fighter).toEqual(parsed);
		expect(fighter).toMatchObject({ str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 12 });
	});

	it("throws for a class not on the Standard Array by Class table", () => {
		expect(() => standardArrayForClass("Artificer")).toThrow(/no Standard Array by Class row/);
	});
});

describe("buildCreationTablesTagValueUnits", () => {
	it("emits exactly 4 rows: the class row plus point_cost, standard_array, background_adjustment", () => {
		const definitions = buildCreationTablesTagValueUnits();
		expect(definitions.map((d) => d.tag)).toEqual([
			CREATION_TABLES_CLASS_TAG,
			CREATION_TABLES_POINT_COST_TAG,
			CREATION_TABLES_STANDARD_ARRAY_TAG,
			CREATION_TABLES_BACKGROUND_ADJUSTMENT_TAG,
		]);
	});

	it("carries the class-level srd.character_creation row under the bare srd prefix, not its own family prefix", () => {
		const classDefinition = buildCreationTablesTagValueUnits().find(
			(d) => d.tag === CREATION_TABLES_CLASS_TAG,
		);
		expect(classDefinition).toMatchObject({
			tag: "srd.character_creation",
			prefix: "srd",
			description: creationTablesClassTagDescription(),
		});
	});

	it("qualifies every sub-tag under the exact srd.character_creation family prefix", () => {
		for (const tag of [
			CREATION_TABLES_POINT_COST_TAG,
			CREATION_TABLES_STANDARD_ARRAY_TAG,
			CREATION_TABLES_BACKGROUND_ADJUSTMENT_TAG,
		]) {
			const definition = buildCreationTablesTagValueUnits().find((d) => d.tag === tag);
			expect(definition?.prefix).toBe(CREATION_TABLES_TAG_PREFIX);
		}
	});
});

describe("creationTablesPointCostTagDescription", () => {
	it("is a short identity without compiler provenance", () => {
		const description = creationTablesPointCostTagDescription();
		expect(description).toBe("Ability Score Point Costs — the Point Cost generation table.");
		expect(description).not.toContain("Source:");
	});
});

describe("creationTablesStandardArrayTagDescription", () => {
	it("is a short identity without compiler provenance", () => {
		const description = creationTablesStandardArrayTagDescription();
		expect(description).toBe(
			"Standard Array by Class — suggested ability-score placement per class.",
		);
		expect(description).not.toContain("Source:");
	});
});

describe("creationTablesBackgroundAdjustmentTagDescription", () => {
	it("is a short identity without compiler provenance", () => {
		const description = creationTablesBackgroundAdjustmentTagDescription();
		expect(description).toBe(
			"Background ability-score adjustment — apply the +2 and +1 from the chosen origin.",
		);
		expect(description).not.toContain("Source:");
	});
});

describe("creationTablesModifiersProvenanceUnit", () => {
	it("is a provenance-only unit pointing at the already-live srd/ability_modifier macro, not a new row", () => {
		const unit = creationTablesModifiersProvenanceUnit();
		expect(unit.kind).toBe("provenance_only");
		expect(unit.sourcePk).toContain(ABILITY_MODIFIERS_RULE_PK);
		expect(unit.sourcePk).toContain("srd/ability_modifier");
	});
});
