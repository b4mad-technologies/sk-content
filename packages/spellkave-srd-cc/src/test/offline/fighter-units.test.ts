// K2 offline proof (`ledger/classes.md`): the 19 Fighter + 6 Champion
// feature identities, the `srd.class_feature` tag catalog, Second Wind's own
// resource/gate/heal shape, and exhaustive deferred-group coverage (every
// real, non-mechanized feature slug accounted for exactly once).
import { describe, expect, it } from "vitest";

import {
	buildChampionFeatureUnits,
	buildFeatureTagValueUnits,
	buildFighterFeatureUnits,
	CHAMPION_SUBCLASS_TAG,
	CLASS_FEATURE_TAG_PREFIX,
	deferredFeatureGroups,
	FIGHTER_CLASS_TAG,
	SECOND_WIND_USES_INITIAL,
	SECOND_WIND_USES_MAX,
	SECOND_WIND_USES_RESOURCE_ID,
	secondWindGatePredicateSource,
	secondWindHealDeltaSource,
	secondWindUsesColumn,
} from "../../chapters/classes/fighter-units";
import { readClassFeatureItems, readClassFeaturesByPkPrefix } from "../../open5e/class-feature";

describe("buildFighterFeatureUnits", () => {
	it("builds exactly 19 Fighter-own feature identities, none of them Champion's", () => {
		const units = buildFighterFeatureUnits();
		expect(units).toHaveLength(19);
		for (const unit of units) {
			expect(unit.entityId).toBe(`srd/class-feature/fighter/${unit.slug}`);
			expect(unit.sourcePk.startsWith("srd-2024_fighter_")).toBe(true);
			expect(unit.sourcePk.startsWith("srd-2024_fighter_champion_")).toBe(false);
			expect(unit.tags).toContain(CLASS_FEATURE_TAG_PREFIX);
			expect(unit.tags).toContain(`${CLASS_FEATURE_TAG_PREFIX}.${unit.slug}`);
			expect(unit.tags).toContain(FIGHTER_CLASS_TAG);
			expect(unit.tags).not.toContain(CHAMPION_SUBCLASS_TAG);
			expect(unit.description.length).toBeGreaterThan(0);
			expect(unit.anchor.startsWith("classes.md:")).toBe(true);
		}
	});

	it("prose feature identities are a short line, not SRD dice", () => {
		const tactical = buildFighterFeatureUnits().find((unit) => unit.slug === "tactical-mind");
		if (tactical === undefined) throw new Error("test setup: no tactical-mind unit.");
		expect(tactical.description).toBe("Tactical Mind — a Fighter class feature.");
		expect(tactical.description).not.toMatch(/\d+d\d+/);
	});

	it("carries the correctly-spelled 'Studied Attacks' display name, bypassing ClassFeature.json's own typo'd name field", () => {
		const unit = buildFighterFeatureUnits().find((u) => u.slug === "studied-attacks");
		expect(unit?.displayName).toBe("Studied Attacks");
		// The pinned data quirk (ledger/classes.md): the RAW cache row's own
		// `name` field IS misspelled — proving this reader never touches it.
		const raw = readClassFeaturesByPkPrefix("srd-2024_fighter").find(
			(r) => r.pk === "srd-2024_fighter_studied-attacks",
		);
		expect(raw?.name).toBe("Studdied Attacks");
	});

	it("ClassFeature.json still carries exactly 19 Fighter-own rows (ledger staleness guard)", () => {
		const rows = readClassFeaturesByPkPrefix("srd-2024_fighter").filter(
			(r) => !r.pk.startsWith("srd-2024_fighter_champion_"),
		);
		expect(rows).toHaveLength(19);
	});
});

describe("buildChampionFeatureUnits", () => {
	it("builds exactly 6 Champion feature identities, tagged with both srd.class.fighter and srd.subclass.champion", () => {
		const units = buildChampionFeatureUnits();
		expect(units).toHaveLength(6);
		for (const unit of units) {
			expect(unit.entityId).toBe(`srd/class-feature/fighter/champion/${unit.slug}`);
			expect(unit.sourcePk.startsWith("srd-2024_fighter_champion_")).toBe(true);
			expect(unit.tags).toContain(FIGHTER_CLASS_TAG);
			expect(unit.tags).toContain(CHAMPION_SUBCLASS_TAG);
		}
	});
});

describe("buildFeatureTagValueUnits", () => {
	it("emits the umbrella srd.class_feature row plus 25 srd.class_feature.<slug> rows (19 + 6) — 26 total", () => {
		const units = buildFeatureTagValueUnits();
		expect(units).toHaveLength(26);
		const umbrella = units.find((u) => u.tag === CLASS_FEATURE_TAG_PREFIX);
		expect(umbrella?.prefix).toBe("srd");
		const values = units.filter((u) => u.tag !== CLASS_FEATURE_TAG_PREFIX);
		expect(values).toHaveLength(25);
		for (const row of values) {
			expect(row.prefix).toBe(CLASS_FEATURE_TAG_PREFIX);
			expect(row.tag.startsWith(`${CLASS_FEATURE_TAG_PREFIX}.`)).toBe(true);
		}
		// No slug collisions across the 19 + 6 (every tag unique).
		expect(new Set(values.map((v) => v.tag)).size).toBe(25);
	});
});

describe("Second Wind — resource bounds cross-checked against ClassFeatureItem.json's own column", () => {
	it("secondWindUsesColumn() reads the real per-level ladder (2 at 1-3, 3 at 4-9, 4 at 10-20)", () => {
		const column = secondWindUsesColumn();
		expect(column).toHaveLength(20);
		const byLevel = new Map(column.map((row) => [row.level, row.uses]));
		expect(byLevel.get(1)).toBe(2);
		expect(byLevel.get(3)).toBe(2);
		expect(byLevel.get(4)).toBe(3);
		expect(byLevel.get(9)).toBe(3);
		expect(byLevel.get(10)).toBe(4);
		expect(byLevel.get(20)).toBe(4);
	});

	it("SECOND_WIND_USES_MAX is the column's own ceiling; SECOND_WIND_USES_INITIAL is the level-1 value", () => {
		const column = secondWindUsesColumn();
		const max = Math.max(...column.map((row) => row.uses));
		const level1 = column.find((row) => row.level === 1)?.uses;
		expect(SECOND_WIND_USES_MAX).toBe(max);
		expect(SECOND_WIND_USES_INITIAL).toBe(level1);
	});

	it("ClassFeatureItem.json's second-wind-uses column still carries exactly 20 rows (ledger staleness guard)", () => {
		expect(readClassFeatureItems("srd-2024_fighter_second-wind-uses")).toHaveLength(20);
	});
});

describe("Second Wind — gate predicate and heal delta", () => {
	it("gate predicate reads the real resource id with a >= 1 threshold", () => {
		expect(secondWindGatePredicateSource()).toBe(
			`actor.stat('${SECOND_WIND_USES_RESOURCE_ID}') >= 1`,
		);
	});

	it("heal delta composes a positive 1d10 + level magnitude, never negated (a heal, not damage)", () => {
		const delta = secondWindHealDeltaSource();
		expect(delta).toContain("1d10");
		expect(delta).toContain("actor.stat('srd/level')");
		expect(delta.startsWith("max(0,")).toBe(true);
		expect(delta.startsWith("0 -")).toBe(false);
	});
});

describe("deferredFeatureGroups — exhaustive real-feature coverage", () => {
	it("every real (prose) Fighter/Champion feature is accounted for EXACTLY ONCE across Second Wind, Tactical Mind, Action Surge, or a deferred group", () => {
		const allFighter = buildFighterFeatureUnits().map((u) => u.slug);
		const allChampion = buildChampionFeatureUnits().map((u) => u.slug);
		// The 4 structural/table-data rows carry no independent mechanization
		// story of their own (core-traits/proficiency-bonus already covered by
		// K1; second-wind-uses IS Second Wind's own resource; weapon-mastery-count
		// is the table-data half of weapon-mastery, grouped with it below).
		const structural = ["core-traits", "proficiency-bonus", "second-wind-uses"];
		const namedElsewhere = ["second-wind", "tactical-mind", "action-surge"];
		const deferredSlugs = deferredFeatureGroups().flatMap((group) => [...group.slugs]);
		// weapon-mastery-count rides along with weapon-mastery's own deferred group.
		const accounted = new Set([
			...structural,
			...namedElsewhere,
			...deferredSlugs,
			"weapon-mastery-count",
		]);
		const everySlug = [...allFighter, ...allChampion];
		for (const slug of everySlug) {
			expect(accounted.has(slug), `slug '${slug}' is not accounted for anywhere`).toBe(true);
		}
		// No duplicates within the deferred groups themselves.
		expect(new Set(deferredSlugs).size).toBe(deferredSlugs.length);
		// Every accounted slug is a REAL slug (no stale group entry pointing at
		// a feature that no longer exists).
		for (const slug of accounted) {
			expect(
				everySlug.includes(slug),
				`accounted slug '${slug}' does not exist in the source`,
			).toBe(true);
		}
	});

	it("every deferred group names a non-empty owner", () => {
		for (const group of deferredFeatureGroups()) {
			expect(group.slugs.length).toBeGreaterThan(0);
			expect(group.owner.length).toBeGreaterThan(0);
		}
	});
});
