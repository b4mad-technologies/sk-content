// Offline proof for dm-generic-advancement-metadata M1/M4
// (`ledger/designs/dm-generic-advancement-metadata.md`) —
// `src/chapters/classes/advancement-metadata-units.ts`. Pins the GROUNDED
// numbers this module's own generic scan produces (never hand-typed): every
// number here was independently verified against `cache/markdown/classes.md`
// + `cache/open5e/ClassFeature.json` before being pinned — see the design
// note's own §2/§4/§4a for the reasoning these numbers back.
import { describe, expect, it } from "vitest";
import {
	ADVANCEMENT_CHOICE_NAMESPACE,
	ADVANCEMENT_GRANT_NAMESPACE,
	AUTHORED_LEVEL_CEILING,
	advancementChoicesToAuthor,
	advancementGrantsToAuthor,
	advancementMetadataGapsByClass,
	advancementMetadataUpdates,
	buildAdvancementMetadataFragment,
	FIGHTING_STYLE_CHOICE_GROUP,
	FIGHTING_STYLE_RECOMMENDED_MEMBER_ID,
	HEADING_ALIAS_BY_SLUG,
	scanClassFeatureLevels,
} from "../../chapters/classes/advancement-metadata-units";

describe("scanClassFeatureLevels: generic cache-grounded scan, all 12 classes", () => {
	it("resolves 173 of 185 real base-class-own features to a stated level, never guessing the other 12 (M4's alias map resolved 14 of M1's original 26 gaps)", () => {
		const { candidates, gaps } = scanClassFeatureLevels();
		expect(candidates).toHaveLength(173);
		expect(gaps).toHaveLength(12);
	});

	it("every gap is a real title-casing/heading-text mismatch, never silently dropped", () => {
		const { gaps } = scanClassFeatureLevels();
		for (const gap of gaps) {
			expect(gap.reason).toContain("no '#### Level");
		}
	});

	it("every HEADING_ALIAS_BY_SLUG entry actually resolves — no stale alias pointing at a reworded heading", () => {
		const { candidates, gaps } = scanClassFeatureLevels();
		const resolvedSlugs = new Set(candidates.map((c) => c.featureSlug));
		const gappedSlugs = new Set(gaps.map((g) => g.featureSlug));
		for (const slug of Object.keys(HEADING_ALIAS_BY_SLUG)) {
			expect(resolvedSlugs.has(slug), `alias '${slug}' should resolve a candidate`).toBe(true);
			expect(gappedSlugs.has(slug), `alias '${slug}' should not still be a gap`).toBe(false);
		}
	});

	it("the remaining 12 gaps are exactly the genuinely headingless/ambiguous features (spell-list tables, option-list sub-catalogs, one column-data row, one duplicate-heading-text collision)", () => {
		const byClass = advancementMetadataGapsByClass();
		const gapSlugsByClass = new Map(
			[...byClass.entries()].map(([classSlug, gaps]) => [
				classSlug,
				gaps.map((g) => g.featureSlug).sort(),
			]),
		);
		expect(gapSlugsByClass).toEqual(
			new Map([
				["barbarian", ["improved-brutal-strike-enhanced"]],
				["bard", ["bard-spell-list"]],
				["cleric", ["cleric-spell-list"]],
				["druid", ["druid-spell-list", "wild-shape-uses"]],
				["paladin", ["spell-list"]],
				["ranger", ["spell-list"]],
				["sorcerer", ["metamagic-options", "sorcerer-spell-list"]],
				["warlock", ["eldritch-invocation-options", "warlock-spell-list"]],
				["wizard", ["wizard-spell-list"]],
			]),
		);
	});
});

describe("advancementGrantsToAuthor: martial L1-4 ceiling, all 12 classes scope", () => {
	it(`authors exactly 82 grant rows — every real feature at level <= ${AUTHORED_LEVEL_CEILING} (32/21/16/13 at levels 1–4)`, () => {
		const grants = advancementGrantsToAuthor();
		expect(grants).toHaveLength(82);
		const byLevel = new Map<number, number>();
		for (const grant of grants) byLevel.set(grant.level, (byLevel.get(grant.level) ?? 0) + 1);
		expect(byLevel).toEqual(
			new Map([
				[1, 32],
				[2, 21],
				[3, 16],
				[4, 13],
			]),
		);
	});

	it("never authors a row above the level ceiling", () => {
		for (const grant of advancementGrantsToAuthor()) {
			expect(grant.level).toBeLessThanOrEqual(AUTHORED_LEVEL_CEILING);
		}
	});

	it("sorts deterministically by class slug, then level, then feature slug", () => {
		const grants = advancementGrantsToAuthor();
		expect(grants[0]?.classSlug).toBe("barbarian");
		const sorted = [...grants].sort((a, b) => {
			if (a.classSlug !== b.classSlug) return a.classSlug.localeCompare(b.classSlug);
			if (a.level !== b.level) return a.level - b.level;
			return a.featureSlug.localeCompare(b.featureSlug);
		});
		expect(grants).toEqual(sorted);
	});

	it("Fighter level 1: Fighting Style, Second Wind, Weapon Mastery", () => {
		const fighterL1 = advancementGrantsToAuthor().filter(
			(g) => g.classSlug === "fighter" && g.level === 1,
		);
		expect(fighterL1.map((g) => g.entityId).sort()).toEqual([
			"srd/class-feature/fighter/fighting-style",
			"srd/class-feature/fighter/second-wind",
			"srd/class-feature/fighter/weapon-mastery",
		]);
	});

	it("Fighter level 2: Action Surge (mechanized) AND Tactical Mind (identity-only) — Q3's own 'honest even if identity-only' ruling, not just the mechanized one", () => {
		const fighterL2 = advancementGrantsToAuthor().filter(
			(g) => g.classSlug === "fighter" && g.level === 2,
		);
		expect(fighterL2.map((g) => g.entityId).sort()).toEqual([
			"srd/class-feature/fighter/action-surge",
			"srd/class-feature/fighter/tactical-mind",
		]);
	});

	it("Fighter level 3: the class' own 'choose a subclass' identity feature — base-class-owned, not a subclass-owned row", () => {
		const fighterL3 = advancementGrantsToAuthor().filter(
			(g) => g.classSlug === "fighter" && g.level === 3,
		);
		expect(fighterL3.map((g) => g.entityId).sort()).toEqual([
			"srd/class-feature/fighter/fighter-subclass",
		]);
	});

	it("Barbarian level 1: Rage, Unarmored Defense, Weapon Mastery", () => {
		const barbarianL1 = advancementGrantsToAuthor().filter(
			(g) => g.classSlug === "barbarian" && g.level === 1,
		);
		expect(barbarianL1.map((g) => g.entityId).sort()).toEqual([
			"srd/class-feature/barbarian/rage",
			"srd/class-feature/barbarian/unarmored-defense",
			"srd/class-feature/barbarian/weapon-mastery",
		]);
	});

	it("every caster class' own level-1 grants include Spellcasting", () => {
		const casters = ["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "wizard"] as const;
		for (const classSlug of casters) {
			const ids = advancementGrantsToAuthor()
				.filter((g) => g.classSlug === classSlug)
				.map((g) => g.entityId);
			expect(ids, `${classSlug} should grant Spellcasting at level 1`).toContain(
				`srd/class-feature/${classSlug}/spellcasting`,
			);
		}
	});

	it("Rogue level 1: the alias-resolved Thieves' Cant lands alongside Expertise, Sneak Attack, Weapon Mastery", () => {
		const rogueL1 = advancementGrantsToAuthor().filter(
			(g) => g.classSlug === "rogue" && g.level === 1,
		);
		expect(rogueL1.map((g) => g.entityId).sort()).toEqual([
			"srd/class-feature/rogue/expertise",
			"srd/class-feature/rogue/sneak-attack",
			"srd/class-feature/rogue/thieves-cant",
			"srd/class-feature/rogue/weapon-mastery",
		]);
	});

	it("Monk level 2: the alias-resolved Monk's Focus lands alongside Unarmored Movement, Uncanny Metabolism", () => {
		const monkL2 = advancementGrantsToAuthor().filter(
			(g) => g.classSlug === "monk" && g.level === 2,
		);
		expect(monkL2.map((g) => g.entityId).sort()).toEqual([
			"srd/class-feature/monk/monks-focus",
			"srd/class-feature/monk/unarmored-movement",
			"srd/class-feature/monk/uncanny-metabolism",
		]);
	});

	it("Paladin level 2: the alias-resolved Paladin's Smite lands alongside Fighting Style", () => {
		const paladinL2 = advancementGrantsToAuthor().filter(
			(g) => g.classSlug === "paladin" && g.level === 2,
		);
		expect(paladinL2.map((g) => g.entityId).sort()).toEqual([
			"srd/class-feature/paladin/fighting-style",
			"srd/class-feature/paladin/paladins-smite",
		]);
	});

	it("Sorcerer level 2: the alias-resolved Font of Magic lands alongside Metamagic", () => {
		const sorcererL2 = advancementGrantsToAuthor().filter(
			(g) => g.classSlug === "sorcerer" && g.level === 2,
		);
		expect(sorcererL2.map((g) => g.entityId).sort()).toEqual([
			"srd/class-feature/sorcerer/font-of-magic",
			"srd/class-feature/sorcerer/metamagic",
		]);
	});

	it("Bard level 2: the alias-resolved Jack of All Trades lands alongside Expertise", () => {
		const bardL2 = advancementGrantsToAuthor().filter(
			(g) => g.classSlug === "bard" && g.level === 2,
		);
		expect(bardL2.map((g) => g.entityId).sort()).toEqual([
			"srd/class-feature/bard/expertise",
			"srd/class-feature/bard/jack-of-all-trades",
		]);
	});

	it("Cleric level 3: the alias-resolved Cleric Subclass — the ONLY class whose 'choose a subclass' pk was pluralized", () => {
		const clericL3 = advancementGrantsToAuthor().filter(
			(g) => g.classSlug === "cleric" && g.level === 3,
		);
		expect(clericL3.map((g) => g.entityId).sort()).toEqual([
			"srd/class-feature/cleric/cleric-subclasses",
		]);
	});

	it("every class' own level-3 grants include its 'choose a subclass' identity feature", () => {
		const allClasses = [
			"barbarian",
			"bard",
			"cleric",
			"druid",
			"fighter",
			"monk",
			"paladin",
			"ranger",
			"rogue",
			"sorcerer",
			"warlock",
			"wizard",
		] as const;
		for (const classSlug of allClasses) {
			const l3Ids = advancementGrantsToAuthor()
				.filter((g) => g.classSlug === classSlug && g.level === 3)
				.map((g) => g.entityId);
			const subclassSlug = classSlug === "cleric" ? "cleric-subclasses" : `${classSlug}-subclass`;
			expect(
				l3Ids,
				`${classSlug} should grant its own subclass-choice identity at level 3`,
			).toContain(`srd/class-feature/${classSlug}/${subclassSlug}`);
		}
	});

	it("no subclass feature ever appears (base-class-own only, per this module's own scope decision)", () => {
		for (const grant of advancementGrantsToAuthor()) {
			expect(grant.entityId.split("/")).toHaveLength(4); // srd/class-feature/<classSlug>/<featureSlug>, never a 5th champion/subclass segment
		}
	});
});

describe("advancementMetadataGapsByClass: reported, never guessed", () => {
	it("groups the 12 remaining scan gaps by class, none of them level-1/2/3-shaped names a future ceiling raise should have caught instead", () => {
		const byClass = advancementMetadataGapsByClass();
		let total = 0;
		for (const gaps of byClass.values()) total += gaps.length;
		expect(total).toBe(12);
		// Sanity: every gap name reads as a higher-level/reference-table/ambiguous feature, never a plausible level<=3 identity feature this scan should have caught.
		for (const gaps of byClass.values()) {
			for (const gap of gaps) {
				expect(gap.featureDisplayName).not.toBe("Spellcasting");
			}
		}
	});
});

describe("advancementMetadataUpdates: typed authoring inputs", () => {
	it("carries both namespace registrations plus 82 grant + choice attachments (slice 2 menus)", () => {
		const updates = advancementMetadataUpdates();
		const namespaces = updates.filter((update) => update.target === "namespace");
		const attachments = updates.filter((update) => typeof update.target === "object");
		expect(namespaces).toHaveLength(2);
		expect(namespaces.map((update) => update.key)).toEqual([
			ADVANCEMENT_GRANT_NAMESPACE,
			ADVANCEMENT_CHOICE_NAMESPACE,
		]);
		for (const namespace of namespaces) {
			expect((namespace.value as { on_demand?: boolean }).on_demand).toBe(true);
		}
		const choiceCount = advancementChoicesToAuthor().length;
		expect(attachments).toHaveLength(82 + choiceCount);
		const grants = attachments.filter((update) => update.key === ADVANCEMENT_GRANT_NAMESPACE);
		const choices = attachments.filter((update) => update.key === ADVANCEMENT_CHOICE_NAMESPACE);
		expect(grants).toHaveLength(82);
		expect(choices).toHaveLength(choiceCount);
		expect(choiceCount).toBeGreaterThan(16);
		for (const update of attachments) {
			expect(["entity_definition", "capability_definition"]).toContain(
				typeof update.target === "object" ? update.target.kind : undefined,
			);
			const payload = update.value as { class: string; level: number };
			expect(typeof payload.class).toBe("string");
			expect(typeof payload.level).toBe("number");
		}
	});
});

describe("advancementChoicesToAuthor: Fighting Style + subclass menus", () => {
	it("Fighter L1 Fighting Style has 4 members, recommended Defense", () => {
		const fs = advancementChoicesToAuthor().filter(
			(c) => c.choiceGroup === FIGHTING_STYLE_CHOICE_GROUP,
		);
		expect(fs).toHaveLength(4);
		expect(fs.every((c) => c.recommendedMemberId === FIGHTING_STYLE_RECOMMENDED_MEMBER_ID)).toBe(
			true,
		);
		expect(fs.map((c) => c.memberEntityId).sort()).toEqual([
			"srd/feat/archery",
			"srd/feat/defense",
			"srd/feat/great-weapon-fighting",
			"srd/feat/two-weapon-fighting",
		]);
	});

	it("every class has exactly one L3 subclass choice member", () => {
		const subs = advancementChoicesToAuthor().filter((c) => c.choiceGroup.endsWith("/3/subclass"));
		expect(subs).toHaveLength(12);
		expect(new Set(subs.map((c) => c.classSlug)).size).toBe(12);
	});
});

describe("buildAdvancementMetadataFragment: rendered TOML", () => {
	it("registers both namespaces, cites Second Wind, and ships real choice rows", async () => {
		const fragment = await buildAdvancementMetadataFragment();
		expect(fragment.toml).toContain(`namespace = "${ADVANCEMENT_GRANT_NAMESPACE}"`);
		expect(fragment.toml).toContain(`namespace = "${ADVANCEMENT_CHOICE_NAMESPACE}"`);
		expect(fragment.toml).toContain('target_ref = "srd/class-feature/fighter/second-wind"');
		expect(fragment.toml).toContain(`"choice_group":"${FIGHTING_STYLE_CHOICE_GROUP}"`);
		expect(fragment.toml).toContain(
			'target_ref = "srd/advancement-choice-option/fighter/1/feat/defense"',
		);
		expect(fragment.toml).toContain("classes.md:4794");
	});

	it("carries 2 namespace units + grant/choice attachment units — never silently dropping a row from provenance", async () => {
		const fragment = await buildAdvancementMetadataFragment();
		const namespaceUnits = fragment.units.filter((u) => u.kind === "metadata_namespaces");
		const attachmentUnits = fragment.units.filter((u) => u.kind === "metadata_attachments");
		expect(namespaceUnits).toHaveLength(2);
		expect(attachmentUnits).toHaveLength(82 + advancementChoicesToAuthor().length);
	});

	it("ships L4 ASI-or-feat choice rows for every class", async () => {
		const fragment = await buildAdvancementMetadataFragment();
		expect(fragment.toml).toContain("srd/fighter/4/asi-or-feat");
		expect(fragment.toml).toContain(
			'target_ref = "srd/advancement-choice-option/fighter/4/feat/ability-score-improvement"',
		);
	});
});
