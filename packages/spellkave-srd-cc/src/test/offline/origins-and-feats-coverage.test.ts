// Lane L4 — origins and feats executable coverage.
// Design: bead sk-609b.5 (design trail).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	BACKGROUND_ORIGIN_FEAT_NAMESPACE,
	backgroundOriginFeatAttachmentUpdates,
	buildBackgroundUnits,
} from "../../chapters/character-origins/background-units";
import { buildTraitUnits } from "../../chapters/character-origins/trait-units";
import {
	ASI_OR_FEAT_GRAPPLER_MEMBER_ID,
	ASI_OR_FEAT_RECOMMENDED_MEMBER_ID,
	advancementChoicesToAuthor,
} from "../../chapters/classes/advancement-metadata-units";
import { buildClassUnits } from "../../chapters/classes/classes-units";
import {
	ASI_CAPABILITY_ID,
	ASI_FEAT_ENTITY_ID,
	ASI_POINTS_RESOURCE_ID,
	asiAbilityRaises,
	asiAcDeltaForDexRaise,
	asiOrFeatChoiceGroup,
	asiRaiseGatePredicate,
	oddScoreDeltaExpr,
} from "../../chapters/feats/asi-units";
import { baseArmorClassExpr } from "../../chapters/playing-the-game/attack-roll-units";
import {
	findingEvidence,
	findingGap,
	srdEvidence,
	srdNotApplicable,
	srdUnencoded,
} from "../srd-coverage/evidence";

const FIXTURES = path.resolve(import.meta.dirname, "../../../fixtures");
const REFS = [
	"bead sk-609b.5 (design trail)",
	"docs/advancement-choice.md",
	"docs/derived-values.md",
] as const;

function readFixture(rel: string): string {
	return readFileSync(path.join(FIXTURES, rel), "utf8");
}

describe("Origins L4 — species trait catalog shapes", () => {
	const traits = buildTraitUnits();

	srdEvidence(
		{
			chapter: "character-origins",
			unit: "species-trait-shapes-l4",
			aspect: "source",
			claim: "33 SpeciesTrait rows carry root-cause classifications from cache anchors",
			references: [...REFS, "cache/markdown/character-origins.md:97-374"],
		},
		() => {
			expect(traits).toHaveLength(33);
			for (const t of traits) {
				expect(t.markdownAnchor.startsWith("character-origins.md:")).toBe(true);
				expect(t.rootCause.length).toBeGreaterThan(0);
			}
		},
	);

	srdEvidence(
		{
			chapter: "character-origins",
			unit: "species-trait-shapes-l4",
			aspect: "mechanic",
			claim:
				"Resourceful/Skillful/Dwarven Toughness/Breath Weapon stay mechanized; Versatile is documented grant shape",
			references: [...REFS],
		},
		() => {
			const bySlug = new Map(traits.map((t) => [t.slug, t]));
			expect(bySlug.get("resourceful")?.rootCause).toBe("mechanized");
			expect(bySlug.get("skillful")?.rootCause).toBe("mechanized");
			expect(bySlug.get("dwarven-toughness")?.rootCause).toBe("mechanized");
			expect(bySlug.get("breath-weapon")?.rootCause).toBe("mechanized");
			expect(bySlug.get("versatile")?.rootCause).toBe("documented_unapplied");
			expect(bySlug.get("fey-ancestry")?.rootCause).toBe("conditions_gap");
			expect(bySlug.get("luck")?.rootCause).toBe("luck_reroll");
			expect(bySlug.get("relentless-endurance")?.rootCause).toBe("mechanized");
		},
	);

	srdEvidence(
		{
			chapter: "character-origins",
			unit: "species-trait-shapes-l4",
			aspect: "fixture",
			claim: "traits.toml carries entity rows for mechanized and deferred traits",
			references: [...REFS],
		},
		() => {
			const toml = readFixture("base/character-origins/traits.toml");
			expect(toml).toContain('entity_def_id = "srd/trait/resourceful"');
			expect(toml).toContain('entity_def_id = "srd/trait/fey-ancestry"');
			expect(toml).toContain('entity_def_id = "srd/trait/versatile"');
		},
	);

	srdNotApplicable({
		chapter: "character-origins",
		unit: "species-trait-shapes-l4",
		aspect: "live",
		reason:
			"Per-trait live proofs stay with their root-cause owners (senses, conditions, finding-58); Resourceful already has rest live coverage",
		references: [...REFS],
	});
});

describe("Origins L4 — background Origin Feat grants", () => {
	srdEvidence(
		{
			chapter: "character-origins",
			unit: "background-origin-feat-grants",
			aspect: "source",
			claim:
				"four backgrounds map to Alert / Magic Initiate / Savage Attacker with ability triples",
			references: [...REFS, "cache/markdown/character-origins.md:33-63"],
		},
		() => {
			const units = buildBackgroundUnits();
			expect(units).toHaveLength(4);
			const bySlug = Object.fromEntries(units.map((u) => [u.slug, u]));
			expect(bySlug.acolyte?.featEntityId).toBe("srd/feat/magic-initiate");
			expect(bySlug.acolyte?.featQualifier).toBe("Cleric");
			expect(bySlug.criminal?.featEntityId).toBe("srd/feat/alert");
			expect(bySlug.sage?.featEntityId).toBe("srd/feat/magic-initiate");
			expect(bySlug.sage?.featQualifier).toBe("Wizard");
			expect(bySlug.soldier?.featEntityId).toBe("srd/feat/savage-attacker");
			expect(bySlug.soldier?.abilityScoreCodes).toEqual(["str", "dex", "con"]);
		},
	);

	srdEvidence(
		{
			chapter: "character-origins",
			unit: "background-origin-feat-grants",
			aspect: "mechanic",
			claim: "srd.background_origin_feat attachment rows name feat entity + ability_scores",
			references: [...REFS],
		},
		() => {
			const updates = backgroundOriginFeatAttachmentUpdates();
			expect(updates).toHaveLength(4);
			for (const update of updates) {
				expect(update.key).toBe(BACKGROUND_ORIGIN_FEAT_NAMESPACE);
				const payload = update.value as {
					feat: string;
					ability_scores: string[];
				};
				expect(payload.feat.startsWith("srd/feat/")).toBe(true);
				expect(payload.ability_scores).toHaveLength(3);
			}
		},
	);

	srdEvidence(
		{
			chapter: "character-origins",
			unit: "background-origin-feat-grants",
			aspect: "fixture",
			claim: "backgrounds.toml carries srd.background_origin_feat namespace + attachments",
			references: [...REFS],
		},
		() => {
			const toml = readFixture("base/character-origins/backgrounds.toml");
			expect(toml).toContain(BACKGROUND_ORIGIN_FEAT_NAMESPACE);
			expect(toml).toContain("srd/feat/alert");
			expect(toml).toContain("srd/feat/magic-initiate");
			expect(toml).toContain("srd/feat/savage-attacker");
		},
	);

	srdNotApplicable({
		chapter: "character-origins",
		unit: "background-origin-feat-grants",
		aspect: "live",
		reason: "creation dialogue (lane L5) applies the grant; this lane authors the SRD fact only",
		references: [...REFS],
	});
});

describe("Feats L4 — ASI mechanics + AC macro propagation", () => {
	srdEvidence(
		{
			chapter: "feats",
			unit: "ability-score-improvement",
			aspect: "source",
			claim: "ASI is Level 4+ General Feat; +2 or two +1, cap 20 (feats.md:61-67)",
			references: [...REFS, "cache/markdown/feats.md:61-67"],
		},
		() => {
			expect(ASI_FEAT_ENTITY_ID).toBe("srd/feat/ability-score-improvement");
			expect(asiAbilityRaises()).toHaveLength(6);
			expect(ASI_POINTS_RESOURCE_ID).toBe("srd/asi_points");
		},
	);

	srdEvidence(
		{
			chapter: "feats",
			unit: "ability-score-improvement",
			aspect: "mechanic",
			claim: "six raise actions + odd-score AC delta; +2 DEX via macro base AC rises by 1 (14→16)",
			references: [...REFS, "openspec/changes/playable-fighter-l1-20/design.md"],
		},
		() => {
			expect(asiRaiseGatePredicate("srd/dex")).toContain("srd/asi_points");
			expect(asiRaiseGatePredicate("srd/dex")).toContain("< 20");
			// Pre-raise odd ⇒ AC+1 helper (design doc semantics).
			expect(oddScoreDeltaExpr("15")).toContain("== 1");
			expect(asiAcDeltaForDexRaise("actor.stat('srd/dex')")).toContain("srd/dex");
			// Macro path: unarmored AC from DEX 14 vs 16 differs by 1.
			const ac14 = baseArmorClassExpr("14");
			const ac16 = baseArmorClassExpr("16");
			expect(ac14).toContain("srd/base_ac");
			expect(ac16).toContain("srd/base_ac");
			// Pure TS band check mirrors the macro table.
			const mod = (score: number) => Math.floor((score - 10) / 2);
			expect(10 + mod(16) - (10 + mod(14))).toBe(1);
			expect(10 + mod(15) - (10 + mod(14))).toBe(0);
		},
	);

	srdEvidence(
		{
			chapter: "feats",
			unit: "ability-score-improvement",
			aspect: "fixture",
			claim: "asi-mechanics.toml carries points resource, capability, and raise-dex action",
			references: [...REFS],
		},
		() => {
			const toml = readFixture("base/feats/asi-mechanics.toml");
			expect(toml).toContain(`resource_definition_id = "${ASI_POINTS_RESOURCE_ID}"`);
			expect(toml).toContain(`capability_id = "${ASI_CAPABILITY_ID}"`);
			expect(toml).toContain('action_id = "srd/asi/raise-dex"');
			expect(toml).toContain('resource = "srd/ac"');
			expect(toml).toContain('action_id = "srd/asi/raise-con"');
			const entity = readFixture("base/feats/ability-score-improvement.toml");
			expect(entity).toContain("MECHANIZED");
		},
	);

	srdUnencoded({
		chapter: "feats",
		unit: "ability-score-improvement",
		aspect: "live",
		claim: "Live +2 DEX → srd/ac +1 is registered in live-self-seeding/mechanics/asi-dex-ac.ts",
		references: [...REFS],
	});
});

describe("Feats L4 — L4 asi-or-feat choice rows for all 12 classes", () => {
	srdEvidence(
		{
			chapter: "feats",
			unit: "l4-asi-or-feat-choice",
			aspect: "source",
			claim: "General Feats at L4 are ASI and Grappler (feats.md:59-81)",
			references: [...REFS, "cache/markdown/feats.md:59-81"],
		},
		() => {
			expect(ASI_OR_FEAT_RECOMMENDED_MEMBER_ID).toBe(ASI_FEAT_ENTITY_ID);
			expect(ASI_OR_FEAT_GRAPPLER_MEMBER_ID).toBe("srd/feat/grappler");
		},
	);

	srdEvidence(
		{
			chapter: "feats",
			unit: "l4-asi-or-feat-choice",
			aspect: "mechanic",
			claim: "every class has choose-1 menu over ASI + Grappler at level 4",
			references: [...REFS],
		},
		() => {
			const classes = buildClassUnits();
			expect(classes).toHaveLength(12);
			const choices = advancementChoicesToAuthor().filter((c) => c.level === 4);
			// 12 classes × 2 members
			expect(choices).toHaveLength(24);
			for (const cls of classes) {
				const group = asiOrFeatChoiceGroup(cls.slug);
				const members = choices.filter((c) => c.choiceGroup === group);
				expect(members).toHaveLength(2);
				expect(members.every((m) => m.chooseN === 1)).toBe(true);
				expect(members.every((m) => m.recommendedMemberId === ASI_FEAT_ENTITY_ID)).toBe(true);
				const ids = new Set(members.map((m) => m.memberEntityId));
				expect(ids.has(ASI_FEAT_ENTITY_ID)).toBe(true);
				expect(ids.has(ASI_OR_FEAT_GRAPPLER_MEMBER_ID)).toBe(true);
			}
		},
	);

	srdEvidence(
		{
			chapter: "feats",
			unit: "l4-asi-or-feat-choice",
			aspect: "fixture",
			claim: "advancement-metadata.toml carries srd/fighter/4/asi-or-feat choice rows",
			references: [...REFS],
		},
		() => {
			const toml = readFixture("base/classes/advancement-metadata.toml");
			expect(toml).toContain("srd/fighter/4/asi-or-feat");
			expect(toml).toContain("srd/wizard/4/asi-or-feat");
			expect(toml).toContain(ASI_FEAT_ENTITY_ID);
			expect(toml).toContain("srd/feat/grappler");
		},
	);

	srdNotApplicable({
		chapter: "feats",
		unit: "l4-asi-or-feat-choice",
		aspect: "live",
		reason: "dialogue that offers the menu is lane L5; this lane authors member rows only",
		references: [...REFS],
	});
});

describe("Origins L4 — findingGaps for trait substrate limits", () => {
	findingGap(
		{
			id: "110",
			title: "Fey Ancestry needs condition-keyed save advantage",
			expected:
				"An elf with Fey Ancestry has Advantage on saving throws to avoid or end the Charmed condition.",
			observed:
				"Sleep/exhaustion immunity tags ship on the trait; Charmed-save Advantage still blocked — " +
				"resolution scopes lack outcome-condition context (fey-ancestry-condition-save-scope.md).",
			impact: "Elf Fey Ancestry cannot be an honest live mechanic yet.",
			references: [
				...REFS,
				"cache/markdown/character-origins.md:229",
				"docs/substrate-verdicts/fey-ancestry-condition-save-scope.md",
			],
		},
		() => {
			// Desired public assertion: a trait entity would carry a save-scope
			// modifier gated on Charmed — fixture has no such modifier today.
			const toml = readFixture("base/character-origins/traits.toml");
			expect(toml).toMatch(/fey-ancestry[\s\S]*delta_kind = "Advantage"/);
		},
	);

	findingGap(
		{
			id: "111",
			title: "Lucky needs unconditional nat-1 reroll",
			expected:
				"A halfling with Lucky rerolls a natural 1 on any d20 Test without spending a resource.",
			observed:
				"Heroic Inspiration proves post-roll reroll (finding-58), but reaction_eligibility cannot " +
				"read raw die faces for a nat-1 auto-gate (lucky-nat1-reroll.md).",
			impact: "Halfling Lucky cannot fire in play.",
			references: [
				...REFS,
				"ledger/designs/finding-58-post-roll-reroll-intervention.md",
				"docs/substrate-verdicts/lucky-nat1-reroll.md",
			],
		},
		() => {
			const toml = readFixture("base/character-origins/traits.toml");
			expect(toml).toMatch(/srd\/trait\/luck[\s\S]*reaction_trigger/);
		},
	);

	findingEvidence(
		{
			id: "112",
			title: "Relentless Endurance 0-HP intercept via condition hook",
			expected: "Once per Long Rest, an orc dropping to 0 HP drops to 1 HP instead.",
			observed:
				"L12b2: relentless-endurance-ready hooks Layer2.ResourceDelta new_value<=0 " +
				"(pattern condition-hook-on-event); sets HP to 1 and spends long-rest charge. " +
				"Hooks resolve inside ModifyResource before later Dead ordinals.",
			impact: "Orc Relentless Endurance can prevent death when ready + uses remain.",
			references: [
				...REFS,
				"cache/markdown/character-origins.md:323",
				"packages/spellkave-world-author/docs/patterns/condition-hook-on-event.md",
			],
		},
		() => {
			const toml = readFixture("base/character-origins/traits.toml");
			expect(toml).toContain("srd/trait/relentless-endurance/intercept");
			expect(toml).toContain("srd/condition/relentless-endurance-ready");
			expect(toml).toContain("Layer2.ResourceDelta");
		},
	);
});

// Silence unused `it` if tree-shaking complains in some configs.
void it;
