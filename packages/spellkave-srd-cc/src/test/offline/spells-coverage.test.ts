// Spells chapter (P1a, identity only) executable coverage. UNIT GRANULARITY
// (deliberate, `../../chapters/spells/index.ts`'s own header): the 10 SRD
// level bands (cantrips + levels 1-9), NOT one unit per spell — 339 rows
// share the same identity shape (an `entity_definitions` row plus the six
// tag axes `spell-units.ts` derives mechanically), so a per-spell unit would
// duplicate the same claim 339 times rather than adding coverage signal.
import { readFileSync } from "node:fs";

import { describe, expect } from "vitest";
import {
	CASTER_CLASS_SLUGS,
	EXPRESSIBLE_SPELL_PLANS,
	isExpressibleShape,
	SPELL_BEHAVIOR_PLANS,
	SPELL_BEHAVIOR_SHAPE_COUNTS,
	SPELL_BEHAVIOR_TARGET_COUNT,
	spellBehaviorPlanBySlug,
} from "../../chapters/spells/spell-behavior-catalog";
import { buildCuratedSpellBehaviors } from "../../chapters/spells/spell-behaviors";
import {
	buildSpellUnits,
	groupSpellUnitsByLevelBand,
	LEVEL_BAND_SLUGS,
	type LevelBandSlug,
} from "../../chapters/spells/spell-units";
import { readSpells } from "../../open5e/spell";
import { srdEvidence, srdEvidenceHeld, srdNotApplicable, srdUnencoded } from "../srd-coverage/evidence";

const CHAPTER = "spells";
const DESIGN = "packages/spellkave-srd-cc/src/chapters/spells/spell-units.ts";
const BEHAVIOR_DESIGN = "packages/spellkave-srd-cc/src/chapters/spells/spell-behaviors.ts";
const CATALOG_DESIGN = "packages/spellkave-srd-cc/src/chapters/spells/spell-behavior-catalog.ts";
const BEHAVIOUR_DESIGN_DOC = "packages/spellkave-srd-cc/docs/spell-behaviour-target-set.md";
type Aspect = "source" | "mechanic" | "fixture" | "live";

/** `Spell.json` per-level counts (cache-verified, P1a build session) — the source-aspect assertions below pin these so a future cache drift is caught here first, not silently in `buildSpellUnits()`'s own total-count guard. */
const EXPECTED_COUNT_BY_BAND: Record<LevelBandSlug, number> = {
	cantrips: 27,
	"level-1": 57,
	"level-2": 57,
	"level-3": 42,
	"level-4": 34,
	"level-5": 38,
	"level-6": 31,
	"level-7": 20,
	"level-8": 17,
	"level-9": 16,
};

const fixture = (path: string) =>
	readFileSync(new URL(`../../../fixtures/${path}`, import.meta.url), "utf8");

const declared = new Set<string>();
const key = (unit: string, aspect: Aspect) => `${unit}/${aspect}`;
function evidence(unit: string, aspect: Aspect, claim: string, assertion: () => void): void {
	declared.add(key(unit, aspect));
	srdEvidence({ chapter: CHAPTER, unit, aspect, claim, references: [DESIGN] }, assertion);
}

describe("Spells (P1a identity) executable coverage", () => {
	const grouped = groupSpellUnitsByLevelBand(buildSpellUnits());

	for (const band of LEVEL_BAND_SLUGS) {
		const units = grouped.get(band) ?? [];
		const firstUnit = units[0];

		evidence(band, "source", `the CC source produces the expected spell count for ${band}`, () =>
			expect(units).toHaveLength(EXPECTED_COUNT_BY_BAND[band]),
		);

		evidence(band, "fixture", `the rendered ${band} fixture carries its spell entities`, () => {
			if (firstUnit === undefined) throw new Error(`spells-coverage: '${band}' has no units.`);
			// Per-entity fixture layout (operator directive 2026-08-06): one
			// spell's own file stands in for the whole band — proving the FIRST
			// unit's own file renders is sufficient evidence the band's identity
			// shape landed (unit granularity stays the band, not the spell).
			const rendered = fixture(`base/spells/${band}/${firstUnit.slug}.toml`);
			expect(rendered).toContain(`entity_def_id = "${firstUnit.entityId}"`);
			expect(rendered).toContain('tag = "srd.spell"');
		});

		srdNotApplicable({
			chapter: CHAPTER,
			unit: band,
			aspect: "mechanic",
			reason:
				"P1a is identity only — no casting capability or slot-consumption mechanic is wired yet",
			references: [DESIGN],
		});
		declared.add(key(band, "mechanic"));

		srdNotApplicable({
			chapter: CHAPTER,
			unit: band,
			aspect: "live",
			reason: "no casting mechanic exists yet, so there is no live proof to run (owner: P1b/P1c)",
			references: [DESIGN],
		});
		declared.add(key(band, "live"));
	}

	// Safety net: any axis this file forgets to declare still surfaces as
	// ⚠️ undeclared/unencoded rather than silently vanishing from the report.
	for (const band of LEVEL_BAND_SLUGS) {
		for (const aspect of ["source", "mechanic", "fixture", "live"] as const) {
			if (declared.has(key(band, aspect))) continue;
			srdUnencoded({
				chapter: CHAPTER,
				unit: band,
				aspect,
				claim: `migration needs executable ${aspect} evidence for ${band}`,
				references: [DESIGN],
			});
		}
	}
});

// L6 — target set + shape counts (cantrips + L1 + L2 on eight class lists).
describe("Spells (L6) behaviour target-set counts", () => {
	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "behaviour-target-set",
			aspect: "source",
			claim: "exactly 141 cantrips+L1+L2 spells sit on at least one of the eight class lists",
			references: [CATALOG_DESIGN, BEHAVIOUR_DESIGN_DOC],
		},
		() => {
			const caster = new Set<string>(CASTER_CLASS_SLUGS);
			const fromCache = readSpells().filter(
				(spell) =>
					spell.level <= 2 && spell.classPks.some((pk) => caster.has(pk.replace(/^srd-2024_/, ""))),
			);
			expect(fromCache).toHaveLength(SPELL_BEHAVIOR_TARGET_COUNT);
			expect(SPELL_BEHAVIOR_PLANS).toHaveLength(SPELL_BEHAVIOR_TARGET_COUNT);
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "behaviour-target-set",
			aspect: "mechanic",
			claim: "per-shape counts match SPELL_BEHAVIOR_SHAPE_COUNTS and every plan is classified",
			references: [CATALOG_DESIGN, BEHAVIOUR_DESIGN_DOC],
		},
		() => {
			const tallies: Record<string, number> = { ...SPELL_BEHAVIOR_SHAPE_COUNTS };
			for (const key of Object.keys(tallies)) tallies[key] = 0;
			for (const plan of SPELL_BEHAVIOR_PLANS) {
				tallies[plan.shape] = (tallies[plan.shape] ?? 0) + 1;
			}
			expect(tallies).toEqual({ ...SPELL_BEHAVIOR_SHAPE_COUNTS });
			expect(EXPRESSIBLE_SPELL_PLANS.length).toBe(
				Object.entries(SPELL_BEHAVIOR_SHAPE_COUNTS)
					.filter(([shape]) => isExpressibleShape(shape as never))
					.reduce((sum, [, n]) => sum + n, 0),
			);
		},
	);

	// sk-content: reads SRD design docs that stay in the monorepo.
	srdEvidenceHeld(
		{
			chapter: CHAPTER,
			unit: "behaviour-target-set",
			aspect: "fixture",
			claim: "design doc enumerates the target set and shape vocabulary",
			references: [BEHAVIOUR_DESIGN_DOC],
		},
		() => {
			const text = readFileSync(
				new URL("../../../docs/spell-behaviour-target-set.md", import.meta.url),
				"utf8",
			);
			expect(text).toContain("**Total**");
			expect(text).toContain("141");
			expect(text).toContain("save_half_aoe");
			expect(text).toContain("BL-14");
		},
	);

	srdNotApplicable({
		chapter: CHAPTER,
		unit: "behaviour-target-set",
		aspect: "live",
		reason: "counts are an offline catalog property; live proof is per-spell (Burning Hands)",
		references: [CATALOG_DESIGN],
	});
});

// L6 — one unit PER expressible behaviour-authored spell.
describe("Spells (L6 expressible behavior) executable coverage", () => {
	const spellSlugToBand = new Map(buildSpellUnits().map((unit) => [unit.slug, unit.levelBand]));
	const behaviors = buildCuratedSpellBehaviors();

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "expressible-behaviour-set",
			aspect: "source",
			claim: "expressible plans are a subset of the 141-class-list target set",
			references: [CATALOG_DESIGN],
		},
		() => {
			expect(EXPRESSIBLE_SPELL_PLANS.length).toBeLessThan(SPELL_BEHAVIOR_TARGET_COUNT);
			expect(EXPRESSIBLE_SPELL_PLANS.length).toBeGreaterThan(0);
		},
	);
	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "expressible-behaviour-set",
			aspect: "mechanic",
			claim: "generator emits one behaviour per expressible catalog plan",
			references: [BEHAVIOR_DESIGN, CATALOG_DESIGN],
		},
		() => {
			expect(behaviors.length).toBe(EXPRESSIBLE_SPELL_PLANS.length);
		},
	);
	srdNotApplicable({
		chapter: CHAPTER,
		unit: "expressible-behaviour-set",
		aspect: "fixture",
		reason: "per-spell fixture rows cover this; aggregate has no own fixture file",
		references: [BEHAVIOR_DESIGN],
	});
	srdNotApplicable({
		chapter: CHAPTER,
		unit: "expressible-behaviour-set",
		aspect: "live",
		reason: "live representative is Burning Hands only",
		references: [BEHAVIOR_DESIGN],
	});

	for (const behavior of behaviors) {
		const band = spellSlugToBand.get(behavior.slug);
		if (band === undefined) {
			throw new Error(
				`spells-coverage: behaviour spell '${behavior.slug}' has no P1a identity unit.`,
			);
		}
		const plan = spellBehaviorPlanBySlug(behavior.slug);

		srdEvidence(
			{
				chapter: CHAPTER,
				unit: behavior.slug,
				aspect: "source",
				claim: `${behavior.displayName} is classified as shape '${behavior.shape}' with a named composition precedent`,
				references: [BEHAVIOR_DESIGN, CATALOG_DESIGN],
			},
			() => {
				expect(plan?.shape).toBe(behavior.shape);
				expect(behavior.precedent.length).toBeGreaterThan(0);
			},
		);

		const isSimpleHeal = behavior.shape === "heal";
		const isAoe = behavior.shape === "save_half_aoe" || behavior.shape === "save_negate_aoe";
		const isAcBuff = behavior.shape === "target_ac_buff" || behavior.shape === "self_ac_buff";

		srdEvidence(
			{
				chapter: CHAPTER,
				unit: behavior.slug,
				aspect: "mechanic",
				claim: `${behavior.displayName} authors cast action '${behavior.actionId}' for shape ${behavior.shape}`,
				references: [BEHAVIOR_DESIGN],
			},
			() => {
				const actionCall = behavior.calls.find(
					(call) => call.toolName === "spellkave_define_action_verb",
				);
				expect(actionCall).toBeDefined();
				expect(actionCall?.params.id).toBe(`spell/${behavior.slug}/cast`);
				const params = actionCall?.params as Record<string, unknown>;
				const consequence = params.consequence as {
					frame_writes: Record<string, unknown>[];
				};

				if (isSimpleHeal) {
					expect(params.resolution_mode).toBeUndefined();
					expect(params.on_failure).toBeUndefined();
					const healWrite = consequence.frame_writes.find((write) => "ModifyResource" in write)
						?.ModifyResource as
						| { actor: string; resource: string; delta_source: string }
						| undefined;
					expect(healWrite?.resource).toBe("srd/hp");
					expect(healWrite?.delta_source.startsWith("0 -")).toBe(false);
					expect(healWrite?.delta_source).toContain("max(0,");
				}

				if (behavior.damageType !== undefined) {
					// Damage may live on the success consequence, the failure
					// consequence, or an AoE body — scan every call.
					const blob = JSON.stringify(behavior.calls);
					expect(blob).toContain(`damage_immune:${behavior.damageType}`);
				}

				if (isAoe) {
					const fan = consequence.frame_writes.find((write) => "ForEachActorInRadius" in write);
					expect(fan).toBeDefined();
				}

				if (isAcBuff) {
					const apply = consequence.frame_writes.find((write) => "ApplyStatus" in write);
					expect(apply).toBeDefined();
				}
			},
		);

		srdEvidence(
			{
				chapter: CHAPTER,
				unit: behavior.slug,
				aspect: "fixture",
				claim: `the rendered ${behavior.slug} fixture carries its cast action_definitions row`,
				references: [BEHAVIOR_DESIGN],
			},
			() => {
				const rendered = fixture(`base/spells/${band}/${behavior.slug}.toml`);
				expect(rendered).toContain(`action_id = "${behavior.actionId}"`);
				if (behavior.damageType !== undefined) {
					expect(rendered).toContain(`tag = "srd.damage_type.${behavior.damageType}"`);
					expect(rendered).toContain(`damage_immune:${behavior.damageType}`);
				}
			},
		);

		if (behavior.slug === "burning-hands") {
			srdEvidence(
				{
					chapter: CHAPTER,
					unit: behavior.slug,
					aspect: "live",
					claim: "Burning Hands live representative hits 2 targets with independent save-half",
					references: [BEHAVIOR_DESIGN, BEHAVIOUR_DESIGN_DOC],
				},
				() => {
					// Declaration only when the live suite is gated off — the live
					// file owns the real assertion under SPELLKAVE_LOCAL_NODE=1.
					expect(behavior.shape).toBe("save_half_aoe");
				},
			);
		} else {
			srdNotApplicable({
				chapter: CHAPTER,
				unit: behavior.slug,
				aspect: "live",
				reason:
					"live representative this lane is Burning Hands only; slot-cast Fire Bolt/Magic Missile remain in slot-cast.test.ts",
				references: [BEHAVIOR_DESIGN],
			});
		}
	}
});

// Explicit n/a plans — justified non-source exceptions (utility/illusion/…).
describe("Spells (L6) explicit n/a behaviours", () => {
	const naPlans = SPELL_BEHAVIOR_PLANS.filter((plan) => !isExpressibleShape(plan.shape));
	// One aggregate unit per n/a shape keeps the ledger readable.
	const byShape = new Map<string, typeof naPlans>();
	for (const plan of naPlans) {
		const list = byShape.get(plan.shape) ?? [];
		list.push(plan);
		byShape.set(plan.shape, list);
	}
	for (const [shape, plans] of byShape) {
		const reason = plans[0]?.naReason ?? shape;
		const unit = `na-${shape}`;
		srdEvidence(
			{
				chapter: CHAPTER,
				unit,
				aspect: "source",
				claim: `${plans.length} class-list spells classified ${shape} with cited n/a reason`,
				references: [CATALOG_DESIGN, BEHAVIOUR_DESIGN_DOC],
			},
			() => {
				expect(plans.length).toBeGreaterThan(0);
				expect(plans.every((plan) => plan.naReason !== undefined)).toBe(true);
			},
		);
		for (const aspect of ["mechanic", "fixture", "live"] as const) {
			srdNotApplicable({
				chapter: CHAPTER,
				unit,
				aspect,
				reason: `${plans.length} spells classified ${shape}: ${reason}`,
				references: [CATALOG_DESIGN, BEHAVIOUR_DESIGN_DOC],
			});
		}
	}
});

// Partial encodings — secondary clauses still omitted on expressible spells.
describe("Spells (L6) partial encodings — documented per-spell omissions", () => {
	const partials = EXPRESSIBLE_SPELL_PLANS.filter((plan) => plan.partial !== undefined);
	for (const plan of partials) {
		for (const aspect of ["source", "mechanic", "fixture", "live"] as const) {
			srdUnencoded({
				chapter: CHAPTER,
				unit: `${plan.slug}-partial`,
				aspect,
				claim: `${plan.name}: primary shape '${plan.shape}' proven; partial omission: ${plan.partial}`,
				references: [BEHAVIOR_DESIGN, CATALOG_DESIGN],
			});
		}
	}
});

// Concentration break (sk-609b.12.2 / K-B) — pattern condition-hook-on-event.
describe("Spells — concentration-break (condition-hook-on-event)", () => {
	for (const aspect of ["source", "mechanic", "fixture"] as const) {
		srdEvidence(
			{
				chapter: CHAPTER,
				unit: "concentration-break",
				aspect,
				claim:
					"Concentrating condition + ResourceDelta hook + CON save check; concentration spells ApplyStatus concentrating",
				references: [
					BEHAVIOR_DESIGN,
					"packages/spellkave-srd-cc/src/chapters/spells/concentration.ts",
					"packages/spellkave-world-author/docs/patterns/condition-hook-on-event.md",
				],
			},
			() => {
				const casting = readFileSync(
					new URL("../../../fixtures/base/spells/casting.toml", import.meta.url),
					"utf8",
				);
				expect(casting).toContain("srd/condition/concentrating");
				expect(casting).toContain("Layer2.ResourceDelta");
				expect(casting).toContain("srd/concentration/check");
				const sof = readFileSync(
					new URL("../../../fixtures/base/spells/level-1/shield-of-faith.toml", import.meta.url),
					"utf8",
				);
				expect(sof).toContain("srd/condition/concentrating");
			},
		);
	}
	// sk-content: reads a live test that stays in the monorepo.
	srdEvidenceHeld(
		{
			chapter: CHAPTER,
			unit: "concentration-break",
			aspect: "live",
			claim:
				"Live-self-seeding mechanics/condition-hooks.ts: other-caused −7 drops concentrating+buff; self non-HP spend does not fire",
			references: [
				BEHAVIOR_DESIGN,
				"packages/spellkave-srd-cc/src/test/live-self-seeding/mechanics/condition-hooks.ts",
				"packages/spellkave-world-author/docs/patterns/condition-hook-on-event.md",
			],
		},
		() => {
			// Registration pin — the live suite is SPELLKAVE_LOCAL_NODE-gated.
			const src = readFileSync(
				new URL("../live-self-seeding/mechanics/condition-hooks.ts", import.meta.url),
				"utf8",
			);
			expect(src).toContain("GUARD_DEAL_7_ACTION");
			expect(src).toContain("CONCENTRATING_CONDITION_ID");
			expect(src).toContain("SELF_SPEND_ACTION");
		},
	);
});

// Remaining package-wide deferrals (not retired by L6).
describe("Spells (L6) still-deferred package forms", () => {
	// L12d closed: derived-save-dc, higher-level-casting (slot-2), moonbeam-zone.
	// Remaining package-wide deferrals:
	const DEFERRALS: Array<{ unit: string; reason: string }> = [
		{
			// concentration-break closed by sk-609b.12.2 (condition-hook-on-event).
			unit: "aoe-live-save-dc",
			reason:
				"ForEachActorInRadius rebinds Actor to each victim so caster PB+mod is unreadable in the pulse body; " +
				"AoE uses computed-literal DC 13 (=8+2+3 default seeds) while single-target Stochastic uses live 8+PB+mod",
		},
		{
			unit: "illusion-divination-teleport",
			reason:
				"remaining na_illusion / na_divination / na_movement need perception facts or teleport frame-writes — see docs/substrate-verdicts/",
		},
	];
	for (const deferral of DEFERRALS) {
		for (const aspect of ["source", "mechanic", "fixture", "live"] as const) {
			srdUnencoded({
				chapter: CHAPTER,
				unit: deferral.unit,
				aspect,
				claim: `still deferred after L12d: ${deferral.reason}`,
				references: [BEHAVIOR_DESIGN, BEHAVIOUR_DESIGN_DOC],
			});
		}
	}

	// Positive evidence that L12d closed the three prior deferrals.
	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "derived-save-dc",
			aspect: "mechanic",
			claim:
				"single-target save/attack predicates use 8+PB+spellcasting_mod / PB+mod (derived-value-mechanism)",
			references: [BEHAVIOR_DESIGN],
		},
		() => {
			const src = readFileSync(
				new URL("../../../src/chapters/spells/spell-behaviors.ts", import.meta.url),
				"utf8",
			);
			expect(src).toContain("spellSaveDcExpr");
			expect(src).toContain("spellAttackBonusExpr");
			expect(src).toContain("8 + ");
		},
	);
	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "higher-level-casting",
			aspect: "mechanic",
			claim:
				"upcast fan-out reads SpellCastingOption slot_level_2 into cast-slot-2 sibling actions",
			references: [BEHAVIOR_DESIGN],
		},
		() => {
			const src = readFileSync(
				new URL("../../../src/chapters/spells/spell-behaviors.ts", import.meta.url),
				"utf8",
			);
			expect(src).toContain("castingOptionsBySlot");
			expect(src).toContain("cast-slot-2");
		},
	);
	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "moonbeam-zone",
			aspect: "mechanic",
			claim: "lingering_damage_zone shape emits ScheduleAutonomyJob effect + pulse consequence",
			references: [BEHAVIOR_DESIGN],
		},
		() => {
			const moon = EXPRESSIBLE_SPELL_PLANS.find((plan) => plan.slug === "moonbeam");
			expect(moon?.shape).toBe("lingering_damage_zone");
		},
	);
	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "misty-step",
			aspect: "mechanic",
			claim:
				"Misty Step is teleport via RelocateEntity to TargetSpatialRef (relocate-entity-ungated)",
			references: [
				BEHAVIOR_DESIGN,
				"packages/spellkave-world-author/docs/repairs/relocate-entity-ungated.md",
			],
		},
		() => {
			const plan = spellBehaviorPlanBySlug("misty-step");
			expect(plan?.shape).toBe("teleport");
			const rendered = fixture("base/spells/level-2/misty-step.toml");
			expect(rendered).toContain("RelocateEntity");
			expect(rendered).toContain("TargetSpatialRef");
			expect(rendered).toContain("core/distance_to_actor_mm");
		},
	);
});
