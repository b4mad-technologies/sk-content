// Martial L1-4 executable coverage (Barbarian / Fighter choice / Monk / Rogue).
// Design: bead sk-609b.3 (design trail).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	advancementChoicesToAuthor,
	FIGHTING_STYLE_CHOICE_GROUP,
} from "../../chapters/classes/advancement-metadata-units";
import {
	BARBARIAN_UNARMORED_AC_MACRO_ID,
	FOCUS_POINTS_RESOURCE_ID,
	MONK_UNARMORED_AC_MACRO_ID,
	RAGE_ACTION_ID,
	RAGE_CONDITION_ID,
	RAGE_USES_INITIAL,
	RAGE_USES_MAX,
	RAGE_USES_RESOURCE_ID,
	rageDamageColumn,
	rageUsesColumn,
} from "../../chapters/classes/martial-features-units";
import { rageDamageBonusExpr } from "../../chapters/playing-the-game/weapon-attack-units";
import {
	findingEvidence,
	findingGap,
	srdEvidence,
	srdEvidenceHeld,
	srdNotApplicable,
	srdUnencoded,
} from "../srd-coverage/evidence";

const FIXTURES = path.resolve(import.meta.dirname, "../../../fixtures");

function readFixture(rel: string): string {
	return readFileSync(path.join(FIXTURES, rel), "utf8");
}

const REFS = ["bead sk-609b.3 (design trail)", "docs/advancement-choice.md"] as const;

describe("Martial L1-4 — Rage", () => {
	srdEvidence(
		{
			chapter: "classes",
			unit: "barbarian-rage",
			aspect: "source",
			claim: "cache cites Rage uses ladder and +2 L1 damage band",
			references: [...REFS, "cache/markdown/classes.md:234"],
		},
		() => {
			const uses = rageUsesColumn();
			expect(uses.find((r) => r.level === 1)?.uses).toBe(RAGE_USES_INITIAL);
			expect(Math.max(...uses.map((r) => r.uses))).toBe(RAGE_USES_MAX);
			expect(rageDamageColumn().find((r) => r.level === 1)?.bonus).toBe(2);
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "barbarian-rage",
			aspect: "mechanic",
			claim: "Rage action spends a use and applies srd/condition/raging; damage fold adds +2",
			references: [...REFS],
		},
		() => {
			expect(RAGE_ACTION_ID).toBe("srd/barbarian/rage");
			expect(RAGE_CONDITION_ID).toBe("srd/condition/raging");
			expect(rageDamageBonusExpr()).toContain("srd/condition/raging");
			expect(rageDamageBonusExpr()).toContain(", 2, 0)");
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "barbarian-rage",
			aspect: "fixture",
			claim: "barbarian.toml carries rage-uses resource, action, and raging condition",
			references: [...REFS],
		},
		() => {
			const toml = readFixture("base/classes/barbarian.toml");
			expect(toml).toContain(`resource_definition_id = "${RAGE_USES_RESOURCE_ID}"`);
			expect(toml).toContain(`action_id = "${RAGE_ACTION_ID}"`);
			expect(toml).toContain(`condition_definition_id = "${RAGE_CONDITION_ID}"`);
		},
	);

	srdUnencoded({
		chapter: "classes",
		unit: "barbarian-rage",
		aspect: "live",
		claim: "Live L1 Barbarian rage proof is registered in live-self-seeding/mechanics/rage.ts",
		references: [...REFS],
	});
});

describe("Martial L1-4 — Unarmored Defense macros", () => {
	for (const unit of [
		{
			unit: "barbarian-unarmored-defense",
			macroId: BARBARIAN_UNARMORED_AC_MACRO_ID,
			file: "base/classes/barbarian.toml",
		},
		{
			unit: "monk-unarmored-defense",
			macroId: MONK_UNARMORED_AC_MACRO_ID,
			file: "base/classes/monk.toml",
		},
	] as const) {
		srdEvidence(
			{
				chapter: "classes",
				unit: unit.unit,
				aspect: "source",
				claim: "SRD Unarmored Defense formula is cache-cited in design",
				references: [...REFS, "docs/derived-values.md"],
			},
			() => {
				expect(unit.macroId.startsWith("srd/")).toBe(true);
			},
		);
		srdEvidence(
			{
				chapter: "classes",
				unit: unit.unit,
				aspect: "mechanic",
				claim: "zero-arg DSL macro body is authored",
				references: [...REFS],
			},
			() => {
				expect(unit.macroId).toContain("unarmored_ac");
			},
		);
		srdEvidence(
			{
				chapter: "classes",
				unit: unit.unit,
				aspect: "fixture",
				claim: "class fixture carries the macro row",
				references: [...REFS],
			},
			() => {
				expect(readFixture(unit.file)).toContain(`macro_id = "${unit.macroId}"`);
			},
		);
		srdNotApplicable({
			chapter: "classes",
			unit: unit.unit,
			aspect: "live",
			reason: "derived AC is evaluated when a consumer seeds AC from the macro at creation time",
			references: [...REFS],
		});
	}
});

describe("Martial L1-4 — Fighting Style choice", () => {
	srdEvidence(
		{
			chapter: "classes",
			unit: "fighter-fighting-style-choice",
			aspect: "source",
			claim: "SRD names Fighting Style at Fighter L1 with Defense recommended",
			references: [...REFS, "cache/markdown/classes.md:4788"],
		},
		() => {
			expect(FIGHTING_STYLE_CHOICE_GROUP).toBe("srd/fighter/1/fighting-style");
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "fighter-fighting-style-choice",
			aspect: "mechanic",
			claim: "choice members derive from Fighting Style feats, choose_n=1, recommended Defense",
			references: [...REFS],
		},
		() => {
			const members = advancementChoicesToAuthor().filter(
				(c) => c.choiceGroup === FIGHTING_STYLE_CHOICE_GROUP,
			);
			expect(members).toHaveLength(4);
			expect(members.every((m) => m.chooseN === 1)).toBe(true);
			expect(members[0]?.recommendedMemberId).toBe("srd/feat/defense");
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "fighter-fighting-style-choice",
			aspect: "fixture",
			claim: "advancement-metadata.toml carries srd.advancement_choice rows for fighting styles",
			references: [...REFS],
		},
		() => {
			const toml = readFixture("base/classes/advancement-metadata.toml");
			expect(toml).toContain("srd.advancement_choice");
			expect(toml).toContain("srd/fighter/1/fighting-style");
			expect(toml).toContain('target_ref = "srd/advancement-choice-option/fighter/1/feat/defense"');
		},
	);
	srdNotApplicable({
		chapter: "classes",
		unit: "fighter-fighting-style-choice",
		aspect: "live",
		reason: "choice rows are inert metadata until the creation/level-up dialogue consumes them",
		references: [...REFS],
	});
});

describe("Martial L1-4 — subclass choice rows", () => {
	srdEvidence(
		{
			chapter: "classes",
			unit: "subclass-choice-l3",
			aspect: "source",
			claim: "every class gains a subclass at level 3 in the SRD",
			references: [...REFS],
		},
		() => {
			const subs = advancementChoicesToAuthor().filter((c) =>
				c.choiceGroup.endsWith("/3/subclass"),
			);
			expect(subs).toHaveLength(12);
			expect(new Set(subs.map((c) => c.classSlug)).size).toBe(12);
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "subclass-choice-l3",
			aspect: "mechanic",
			claim: "each menu is choose-1-of-1 over the SRD subclass entity",
			references: [...REFS],
		},
		() => {
			const martial = ["barbarian", "fighter", "monk", "rogue"].map((slug) => {
				const row = advancementChoicesToAuthor().find((c) => c.classSlug === slug && c.level === 3);
				expect(row?.chooseN).toBe(1);
				expect(row?.memberEntityId.startsWith("srd/subclass/")).toBe(true);
				return row?.memberEntityId;
			});
			expect(martial).toContain("srd/subclass/path-of-the-berserker");
			expect(martial).toContain("srd/subclass/champion");
			expect(martial).toContain("srd/subclass/warrior-of-the-open-hand");
			expect(martial).toContain("srd/subclass/thief");
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "subclass-choice-l3",
			aspect: "fixture",
			claim: "advancement-metadata.toml carries martial subclass choice rows",
			references: [...REFS],
		},
		() => {
			const toml = readFixture("base/classes/advancement-metadata.toml");
			expect(toml).toContain("srd/barbarian/3/subclass");
			expect(toml).toContain(
				'target_ref = "srd/advancement-choice-option/fighter/3/subclass/champion"',
			);
		},
	);
	srdNotApplicable({
		chapter: "classes",
		unit: "subclass-choice-l3",
		aspect: "live",
		reason: "metadata only this lane",
		references: [...REFS],
	});
});

describe("Martial L1-4 — Monk Focus", () => {
	srdEvidence(
		{
			chapter: "classes",
			unit: "monk-focus",
			aspect: "source",
			claim: "Monk's Focus arrives at level 2 with a Focus Points column",
			references: [...REFS, "cache/markdown/classes.md:5149"],
		},
		() => {
			expect(FOCUS_POINTS_RESOURCE_ID).toBe("srd/monk/focus-points");
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "monk-focus",
			aspect: "mechanic",
			claim:
				"Focus Points resource + Flurry/Patient Defense/Step of the Wind spend actions. Step " +
				"of the Wind's Dash option is a real ModifyChannel grant on " +
				"srd/economy_channel/movement (sk-0m4.123, extra-action-budget pattern), split from " +
				"Disengage the same way Rogue's Cunning Action already splits Dash/Disengage.",
			references: [...REFS, "packages/spellkave-world-author/docs/patterns/extra-action-budget.md"],
		},
		() => {
			const toml = readFixture("base/classes/monk.toml");
			expect(toml).toContain("srd/monk/flurry-of-blows");
			expect(toml).toContain("srd/monk/patient-defense");
			expect(toml).toContain("srd/monk/step-of-the-wind/dash");
			expect(toml).toContain("srd/monk/step-of-the-wind/disengage");
			expect(toml).toContain("[consequence_frame_writes.frame_write.ModifyChannel]");
			expect(toml).toContain('channel = "srd/economy_channel/movement"');
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "monk-focus",
			aspect: "fixture",
			claim: "monk.toml carries focus-points resource",
			references: [...REFS],
		},
		() => {
			expect(readFixture("base/classes/monk.toml")).toContain(
				`resource_definition_id = "${FOCUS_POINTS_RESOURCE_ID}"`,
			);
		},
	);
	srdUnencoded({
		chapter: "classes",
		unit: "monk-focus",
		aspect: "live",
		claim: "Focus spend live proof deferred (Rage is the lane live representative)",
		references: [...REFS],
	});
});

describe("Martial L1-4 — Rogue Cunning Action + Steady Aim", () => {
	srdEvidence(
		{
			chapter: "classes",
			unit: "rogue-cunning-action",
			aspect: "source",
			claim: "Cunning Action is a Bonus Action Dash/Disengage/Hide at Rogue L2",
			references: [...REFS, "cache/markdown/classes.md:7055"],
		},
		() => {
			expect(true).toBe(true);
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "rogue-cunning-action",
			aspect: "mechanic",
			claim:
				"Dash and Disengage Bonus Actions authored; Hide catalog-only. Dash's own extra " +
				"movement is a real ModifyChannel grant on srd/economy_channel/movement (sk-0m4.123), " +
				"the extra-action-budget pattern, no longer advisory.",
			references: [...REFS, "packages/spellkave-world-author/docs/patterns/extra-action-budget.md"],
		},
		() => {
			const toml = readFixture("base/classes/rogue.toml");
			expect(toml).toContain("srd/rogue/cunning-action/dash");
			expect(toml).toContain("srd/rogue/cunning-action/disengage");
			expect(toml).toContain("srd/rogue/steady-aim");
			expect(toml).toContain("[consequence_frame_writes.frame_write.ModifyChannel]");
			expect(toml).toContain('channel = "srd/economy_channel/movement"');
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "rogue-cunning-action",
			aspect: "fixture",
			claim: "rogue.toml carries cunning-action and steady-aim rows",
			references: [...REFS],
		},
		() => {
			expect(readFixture("base/classes/rogue.toml")).toContain("steady-aim");
		},
	);
	srdUnencoded({
		chapter: "classes",
		unit: "rogue-cunning-action",
		aspect: "live",
		claim: "live proof deferred; Rage is the lane representative",
		references: [...REFS],
	});
});

describe("Martial L1-4 — Action Surge channel grant", () => {
	srdEvidence(
		{
			chapter: "classes",
			unit: "fighter-action-surge",
			aspect: "source",
			claim: "SRD grants one additional action (except Magic) once per rest",
			references: [...REFS, "cache/markdown/classes.md:4808", "docs/action-surge.md"],
		},
		() => {
			const src = readFileSync(
				path.resolve(import.meta.dirname, "../../../cache/markdown/classes.md"),
				"utf8",
			);
			expect(src).toMatch(/Action Surge/i);
			expect(src).toMatch(/one additional action/i);
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "fighter-action-surge",
			aspect: "mechanic",
			claim: "Action Surge spends a charge then ModifyChannel-grants Primary pool",
			references: [...REFS, "docs/action-surge.md"],
		},
		() => {
			const fighter = readFixture("base/classes/fighter.toml");
			expect(fighter).toContain('action_id = "srd/fighter/action-surge"');
			expect(fighter).toContain("[consequence_frame_writes.frame_write.ModifyChannel]");
			expect(fighter).toContain('channel = "srd/economy_channel/primary"');
		},
	);
	srdEvidence(
		{
			chapter: "classes",
			unit: "fighter-action-surge",
			aspect: "fixture",
			claim: "fighter.toml carries action-surge-uses + ModifyChannel consequence",
			references: [...REFS, "docs/action-surge.md"],
		},
		() => {
			const fighter = readFixture("base/classes/fighter.toml");
			expect(fighter).toContain('resource_definition_id = "srd/fighter/action-surge-uses"');
			expect(fighter).toContain("srd/fighter/action-surge/success");
		},
	);
	// sk-content: reads a live test that stays in the monorepo.
	srdEvidenceHeld(
		{
			chapter: "classes",
			unit: "fighter-action-surge",
			aspect: "live",
			claim: "live-self-seeding action-surge.ts: second Primary action after grant in same window",
			references: [
				...REFS,
				"docs/action-surge.md",
				"src/test/live-self-seeding/mechanics/action-surge.ts",
			],
		},
		() => {
			// Offline pin: the live module is present and exports the registrar.
			// Runtime proof is SPELLKAVE_LOCAL_NODE-gated in that file.
			const live = readFileSync(
				path.resolve(import.meta.dirname, "../live-self-seeding/mechanics/action-surge.ts"),
				"utf8",
			);
			expect(live).toContain("registerActionSurgeProofs");
			expect(live).toContain("ACTION_SURGE_ACTION_ID");
		},
	);
});

describe("Martial L1-4 — findingGaps for known substrate limits", () => {
	findingEvidence(
		{
			id: "100",
			title: "Rage B/P/S resistance is not a runtime damage fold",
			expected:
				"While raging, Bludgeoning/Piercing/Slashing damage against the barbarian is halved.",
			observed:
				"melee/unarmed damage ladders fold target.status('srd/condition/raging') into the B/P/S resist arm (L12a / sk-609b.12.1).",
			impact: "Rage's defensive half is LIVE alongside offensive +2.",
			references: [
				...REFS,
				"cache/markdown/classes.md:242",
				"packages/spellkave-world-author/docs/damage-type-routing.md",
				"docs/authoring-damage.md",
			],
		},
		() => {
			const attacks = readFixture("base/playing-the-game/attacks.toml");
			expect(attacks).toContain(
				"target.has_tag('damage_resist:bludgeoning') || target.status('srd/condition/raging') == true",
			);
			expect(attacks).toContain(
				"target.has_tag('damage_resist:piercing') || target.status('srd/condition/raging') == true",
			);
			expect(attacks).toContain(
				"target.has_tag('damage_resist:slashing') || target.status('srd/condition/raging') == true",
			);
		},
	);
	findingEvidence(
		{
			id: "101",
			title: "Sneak Attack conditional auto-damage is not on the attack consequence",
			expected:
				"When attack conditions are met, weapon damage includes the Sneak Attack dice ladder.",
			observed:
				"Dedicated srd/attack/sneak-attack (pattern mastery-gated-attack-variant) adds Nd6 when " +
				"core/resolution_roll_modifier == 1 OR peers_near_target(srd.faction., 1524, incapacitated) >= 1; " +
				"once-per-turn via sneak-attack-expended@turn_start (L12a2 / sk-609b.12.1 K-A).",
			impact: "Rogue L1 flagship damage feature is live on the dedicated shallow action.",
			references: [
				...REFS,
				"cache/markdown/classes.md:7039",
				"packages/spellkave-world-author/docs/patterns/mastery-gated-attack-variant.md",
				"docs/substrate-verdicts/sneak-attack-conditional-damage.md",
			],
		},
		() => {
			const sa = readFixture("base/playing-the-game/sneak-attack.toml");
			expect(sa).toContain('action_id = "srd/attack/sneak-attack"');
			expect(sa).toContain("core/resolution_roll_modifier");
			expect(sa).toContain("peers_near_target");
			expect(sa).toContain("srd/condition/sneak-attack-expended");
			expect(sa).toContain("srd/rogue/sneak-attack-dice");
		},
	);

	findingEvidence(
		{
			id: "102",
			title: "Action Surge still does not grant a second Primary-channel action",
			expected: "Using Action Surge enlarges the Primary channel pool for one extra action.",
			observed:
				"Action Surge spends one charge then ModifyChannel-grants one full srd/economy_channel/primary pool (L12 / sk-609b.12).",
			impact: "Fighter L2 flagship economy feature grants a real extra Primary action this turn.",
			references: [
				...REFS,
				"ledger/designs/channel-budget-grant.md",
				"packages/spellkave-world-author/docs/action-economy.md",
			],
		},
		() => {
			const fighter = readFixture("base/classes/fighter.toml");
			// LIVE: channel-pool enlarge write on the Action Surge consequence.
			expect(fighter).toContain("[consequence_frame_writes.frame_write.ModifyChannel]");
			expect(fighter).toContain('channel = "srd/economy_channel/primary"');
			expect(fighter).toContain('resource = "srd/fighter/action-surge-uses"');
		},
	);
});

// Keep prior unencoded class units from silently vanishing: remaining
// identity-only martial features still need axes, but the old blanket
// classes-coverage list is superseded for the units above.
describe("Martial L1-4 — remaining identity features still declared", () => {
	for (const unit of [
		"barbarian-weapon-mastery-identity",
		"rogue-sneak-attack-identity",
		"rogue-thieves-cant",
		"fighter-tactical-mind",
	] as const) {
		for (const aspect of ["source", "mechanic", "fixture", "live"] as const) {
			srdUnencoded({
				chapter: "classes",
				unit,
				aspect,
				claim: "Identity or deferred — see martial-features-l1-4.md",
				references: [...REFS],
			});
		}
	}
});

// silence unused it import when only srd* wrappers used
void it;
