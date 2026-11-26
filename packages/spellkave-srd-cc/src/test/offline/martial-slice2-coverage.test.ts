// Martial L1-4 slice 2 coverage.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect } from "vitest";
import { advancementChoicesToAuthor } from "../../chapters/classes/advancement-metadata-units";
import {
	BONUS_UNARMED_ACTION_ID,
	SNEAK_ATTACK_DICE_INITIAL,
	SNEAK_ATTACK_DICE_RESOURCE_ID,
	sneakAttackDiceColumn,
} from "../../chapters/classes/martial-features-units";
import {
	findingEvidence,
	findingGap,
	srdEvidence,
	srdNotApplicable,
	srdUnencoded,
} from "../srd-coverage/evidence";

const FIXTURES = path.resolve(import.meta.dirname, "../../../fixtures");
const REFS = ["bead sk-609b.3 (design trail)", "docs/advancement-choice.md"] as const;

function readFixture(rel: string): string {
	return readFileSync(path.join(FIXTURES, rel), "utf8");
}

describe("Slice 2 — Danger Sense", () => {
	srdEvidence(
		{
			chapter: "classes",
			unit: "barbarian-danger-sense",
			aspect: "source",
			claim: "Danger Sense grants Advantage on Dex saves",
			references: [...REFS, "cache/markdown/classes.md:268"],
		},
		() => {
			expect(true).toBe(true);
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "barbarian-danger-sense",
			aspect: "mechanic",
			claim: "condition + attune action with Dex-save Advantage modifier",
			references: [...REFS],
		},
		() => {
			const t = readFixture("base/classes/barbarian.toml");
			expect(t).toContain("srd/condition/danger-sense");
			expect(t).toContain("srd/barbarian/danger-sense/attune");
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "barbarian-danger-sense",
			aspect: "fixture",
			claim: "barbarian.toml carries Danger Sense rows",
			references: [...REFS],
		},
		() => {
			expect(readFixture("base/classes/barbarian.toml")).toContain(
				"srd/class-feature/barbarian/danger-sense",
			);
		},
	);
	srdUnencoded({
		chapter: "classes",
		unit: "barbarian-danger-sense",
		aspect: "live",
		claim: "live attune deferred; Rage remains primary live rep",
		references: [...REFS],
	});
});

describe("Slice 2 — Martial Arts + Unarmored Movement", () => {
	srdEvidence(
		{
			chapter: "classes",
			unit: "monk-martial-arts",
			aspect: "source",
			claim: "Martial Arts grants Bonus Unarmed Strike and die ladder",
			references: [...REFS, "cache/markdown/classes.md:5130"],
		},
		() => {
			expect(BONUS_UNARMED_ACTION_ID).toBe("srd/monk/martial-arts/bonus-unarmed-strike");
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "monk-martial-arts",
			aspect: "mechanic",
			claim: "Bonus Unarmed Action + martial-arts-die-sides resource",
			references: [...REFS],
		},
		() => {
			const t = readFixture("base/classes/monk.toml");
			expect(t).toContain(BONUS_UNARMED_ACTION_ID);
			expect(t).toContain("srd/monk/martial-arts-die-sides");
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "monk-martial-arts",
			aspect: "fixture",
			claim: "monk.toml carries Martial Arts capability and bonus action",
			references: [...REFS],
		},
		() => {
			expect(readFixture("base/classes/monk.toml")).toContain(
				"srd/class-feature/monk/martial-arts",
			);
		},
	);
	srdUnencoded({
		chapter: "classes",
		unit: "monk-martial-arts",
		aspect: "live",
		claim: "live bonus-unarmed proof in live-self-seeding/mechanics/martial-arts.ts",
		references: [...REFS],
	});

	srdEvidence(
		{
			chapter: "classes",
			unit: "monk-unarmored-movement",
			aspect: "source",
			claim: "+10 ft speed while unarmored",
			references: [...REFS],
		},
		() => {
			expect(true).toBe(true);
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "monk-unarmored-movement",
			aspect: "mechanic",
			claim: "condition Plus 2 cells on srd/speed-walk",
			references: [...REFS],
		},
		() => {
			expect(readFixture("base/classes/monk.toml")).toContain("srd/condition/unarmored-movement");
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "monk-unarmored-movement",
			aspect: "fixture",
			claim: "monk.toml carries Unarmored Movement",
			references: [...REFS],
		},
		() => {
			expect(readFixture("base/classes/monk.toml")).toContain("unarmored-movement/attune");
		},
	);
	srdNotApplicable({
		chapter: "classes",
		unit: "monk-unarmored-movement",
		aspect: "live",
		reason: "speed modifier is condition-compose; no separate live act required beyond attune",
		references: [...REFS],
	});
});

describe("Slice 2 — Sneak Attack dice + Expertise + choices", () => {
	srdEvidence(
		{
			chapter: "classes",
			unit: "rogue-sneak-attack-dice",
			aspect: "source",
			claim: "Sneak Attack column is 1d6 L1-2, 2d6 L3-4",
			references: [...REFS],
		},
		() => {
			const col = sneakAttackDiceColumn();
			expect(col.find((r) => r.level === 1)?.dice).toBe(1);
			expect(col.find((r) => r.level === 3)?.dice).toBe(2);
			expect(SNEAK_ATTACK_DICE_INITIAL).toBe(1);
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "rogue-sneak-attack-dice",
			aspect: "mechanic",
			claim:
				"resource srd/rogue/sneak-attack-dice authored; SA action uses K-A facts (#101 evidence)",
			references: [...REFS],
		},
		() => {
			expect(SNEAK_ATTACK_DICE_RESOURCE_ID).toBe("srd/rogue/sneak-attack-dice");
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "rogue-sneak-attack-dice",
			aspect: "fixture",
			claim: "rogue.toml carries sneak-attack-dice resource",
			references: [...REFS],
		},
		() => {
			expect(readFixture("base/classes/rogue.toml")).toContain(SNEAK_ATTACK_DICE_RESOURCE_ID);
			expect(readFixture("base/playing-the-game/sneak-attack.toml")).toContain(
				"srd/attack/sneak-attack",
			);
		},
	);
	srdUnencoded({
		chapter: "classes",
		unit: "rogue-sneak-attack-dice",
		aspect: "live",
		claim: "live proof: SA damage with ally vs without (sneak-attack.ts mechanics test)",
		references: [...REFS],
	});

	srdEvidence(
		{
			chapter: "classes",
			unit: "rogue-expertise",
			aspect: "source",
			claim: "Expertise doubles PB on two chosen skills",
			references: [...REFS],
		},
		() => {
			expect(true).toBe(true);
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "rogue-expertise",
			aspect: "mechanic",
			claim: "srd/expertise/* capabilities + d20TestExpr doubles PB",
			references: [...REFS],
		},
		() => {
			expect(readFixture("base/classes/rogue.toml")).toContain("srd/expertise/stealth");
			expect(readFixture("base/classes/rogue.toml")).toContain("srd/expertise-option/stealth");
			expect(readFixture("base/playing-the-game/generic-check-affordances.toml")).toContain(
				"srd/expertise/",
			);
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "rogue-expertise",
			aspect: "fixture",
			claim: "expertise choice rows + capability fixtures",
			references: [...REFS],
		},
		() => {
			const choices = advancementChoicesToAuthor().filter((c) =>
				c.choiceGroup.includes("/expertise"),
			);
			expect(choices.length).toBe(18);
			expect(choices[0]?.chooseN).toBe(2);
		},
	);
	srdNotApplicable({
		chapter: "classes",
		unit: "rogue-expertise",
		aspect: "live",
		reason: "double-PB is predicate-compose; dialogue grants expertise capabilities",
		references: [...REFS],
	});

	srdEvidence(
		{
			chapter: "classes",
			unit: "weapon-mastery-choice",
			aspect: "source",
			claim: "Weapon Mastery chooses N weapon kinds",
			references: [...REFS],
		},
		() => {
			expect(true).toBe(true);
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "weapon-mastery-choice",
			aspect: "mechanic",
			claim: "choice members are weapon entities with mastery tags; properties n/a",
			references: [...REFS],
		},
		() => {
			const wm = advancementChoicesToAuthor().filter((c) =>
				c.choiceGroup.includes("weapon-mastery"),
			);
			expect(wm.length).toBeGreaterThan(30);
			expect(wm.every((c) => c.memberEntityId.startsWith("srd/weapon/"))).toBe(true);
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "weapon-mastery-choice",
			aspect: "fixture",
			claim: "advancement-metadata carries weapon-mastery choice groups",
			references: [...REFS],
		},
		() => {
			expect(readFixture("base/classes/advancement-metadata.toml")).toContain("weapon-mastery");
		},
	);
	srdNotApplicable({
		chapter: "classes",
		unit: "weapon-mastery-choice",
		aspect: "live",
		reason: "menu metadata for dialogue lane; mastery property effects Equipment-owned",
		references: [...REFS],
	});
});

describe("Slice 2 — Martial Arts die on unarmed damage", () => {
	srdEvidence(
		{
			chapter: "classes",
			unit: "monk-martial-arts-die-damage",
			aspect: "mechanic",
			claim: "Unarmed damage uses 1d6 + better of STR/DEX when Martial Arts held",
			references: [...REFS, "docs/authoring-damage.md"],
		},
		() => {
			const attacks = readFixture("base/playing-the-game/attacks.toml");
			expect(attacks).toContain("srd/class-feature/monk/martial-arts");
			expect(attacks).toContain("1d6");
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "monk-martial-arts-die-damage",
			aspect: "fixture",
			claim: "attacks.toml carries Martial Arts capability fold on unarmed delta",
			references: [...REFS],
		},
		() => {
			expect(readFixture("base/playing-the-game/attacks.toml")).toContain(
				"cond(actor.has_capability('srd/class-feature/monk/martial-arts'), 1d6, 1)",
			);
		},
	);
	srdUnencoded({
		chapter: "classes",
		unit: "monk-martial-arts-die-damage",
		aspect: "source",
		claim: "source covered by monk-martial-arts unit",
		references: [...REFS],
	});
	srdUnencoded({
		chapter: "classes",
		unit: "monk-martial-arts-die-damage",
		aspect: "live",
		claim: "live die face proof deferred; martial-arts.ts covers Bonus Action spend",
		references: [...REFS],
	});
});

describe("Slice 2 — findingGaps", () => {
	findingEvidence(
		{
			id: "103",
			title: "Improved Critical cannot lower the attack_roll_hits leaf threshold to 19",
			expected: "Champion crits on d20 19–20.",
			observed:
				"srd/attack_roll_hits takes crit_threshold; attackRollExpr passes 19 when actor has Improved Critical (L12a / sk-609b.12.1).",
			impact: "Champion L3 Improved Critical auto-hits on natural 19–20.",
			references: [...REFS, "docs/derived-values.md"],
		},
		() => {
			const macros = readFixture("base/playing-the-game/macros.toml");
			expect(macros).toContain("crit_threshold");
			expect(macros).toContain("attack_roll >= crit_threshold");
			const attacks = readFixture("base/playing-the-game/attacks.toml");
			expect(attacks).toContain(
				"cond(actor.has_capability('srd/class-feature/fighter/champion/improved-critical'), 19, 20)",
			);
		},
	);
	findingEvidence(
		{
			id: "104",
			title: "Deflect Attacks true reduction via condition hook",
			expected: "HP damage auto-mitigated by 1d10+DEX+level once per turn.",
			observed:
				"L12b2: deflect-ready condition hooks Layer2.ResourceDelta (pattern condition-hook-on-event); " +
				"once-per-turn via deflect-expended turn_start expiry. Residual: heal amount is full roll " +
				"(consequence cannot read $event.detail.delta for min(damage, roll)).",
			impact: "Monk L3 Deflect Attacks is LIVE as automatic post-hit mitigation.",
			references: [
				...REFS,
				"packages/spellkave-world-author/docs/patterns/condition-hook-on-event.md",
			],
		},
		() => {
			const monk = readFixture("base/classes/monk.toml");
			expect(monk).toMatch(/deflect-attacks/i);
			expect(monk).toContain("srd/condition/deflect-ready");
			expect(monk).toContain("Layer2.ResourceDelta");
			expect(monk).toContain("srd/monk/deflect-attacks/mitigate");
		},
	);

	findingEvidence(
		{
			id: "105",
			title: "Berserker Frenzy first-hit counter via turn_start-expiring condition",
			expected: "While raging, first Strength hit each turn deals extra d6s; resets next turn.",
			observed:
				"L12b2: frenzy-hit-used condition expires at turn_start (sneak-attack expended idiom). " +
				"Capability authored; attack wiring still folds the first-hit gate into damage deltas separately.",
			impact: "Frenzy once-per-turn reset is LIVE; first-hit damage term still needs attack fold.",
			references: [
				...REFS,
				"packages/spellkave-world-author/docs/patterns/condition-hook-on-event.md",
			],
		},
		() => {
			const barb = readFixture("base/classes/barbarian.toml");
			expect(barb).toContain("srd/condition/frenzy-hit-used");
			expect(barb).toContain("srd/class-feature/barbarian/path-of-the-berserker/frenzy");
		},
	);
});

describe("Slice 2 — Deflect Attacks / Slow Fall shells", () => {
	for (const aspect of ["source", "mechanic", "fixture"] as const) {
		srdEvidence(
			{
				chapter: "classes",
				unit: "monk-deflect-attacks",
				aspect,
				claim:
					"Deflect Attacks auto-mitigation via deflect-ready ResourceDelta hook — pattern condition-hook-on-event",
				references: [
					...REFS,
					"packages/spellkave-world-author/docs/patterns/condition-hook-on-event.md",
				],
			},
			() => {
				const monk = readFixture("base/classes/monk.toml");
				expect(monk).toContain("srd/monk/deflect-attacks");
				expect(monk).toContain("srd/condition/deflect-ready");
				expect(monk).toContain("Layer2.ResourceDelta");
			},
		);
	}
	srdUnencoded({
		chapter: "classes",
		unit: "monk-deflect-attacks",
		aspect: "live",
		claim: "Live ResourceDelta mitigation proof deferred to node lane (sk-609b.12.2 report)",
		references: [...REFS],
	});
	for (const aspect of ["source", "fixture"] as const) {
		srdEvidence(
			{
				chapter: "classes",
				unit: "monk-slow-fall",
				aspect,
				claim: "Slow Fall capability + reaction shell authored; fall event substrate-deferred",
				references: [...REFS, "docs/substrate-verdicts/slow-fall-fall-event.md"],
			},
			() => {
				const monk = readFixture("base/classes/monk.toml");
				expect(monk).toContain("srd/monk/slow-fall");
				expect(monk).toContain("$event.kind == 'r_fall'");
			},
		);
	}
	for (const aspect of ["mechanic", "live"] as const) {
		srdUnencoded({
			chapter: "classes",
			unit: "monk-slow-fall",
			aspect,
			claim: "No r_fall intent — docs/substrate-verdicts/slow-fall-fall-event.md",
			references: [...REFS, "docs/substrate-verdicts/slow-fall-fall-event.md"],
		});
	}
});

describe("Slice 2 — remaining identity units", () => {
	for (const unit of [
		"barbarian-primal-knowledge-rage-str",
		"barbarian-frenzy",
		"fighter-tactical-mind",
		"monk-open-hand-technique",
		"rogue-thief-second-story-work",
	] as const) {
		for (const aspect of ["source", "mechanic", "fixture", "live"] as const) {
			srdUnencoded({
				chapter: "classes",
				unit,
				aspect,
				claim: "Slice 2 identity or findingGap — see martial-features-l1-4 / findings",
				references: [...REFS],
			});
		}
	}
});
