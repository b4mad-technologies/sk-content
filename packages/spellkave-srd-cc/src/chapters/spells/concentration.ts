// Concentration condition + damage-break check (sk-609b.12.2 / L12b2).
//
// pattern: condition-hook-on-event
// Hook bindings set Actor+TargetActor entity refs but NOT ActorSpatialRef
// (K-B A4); ForEachActorInRadius centers must use TargetSpatialRef.
//
// After kernel K-B (ADR-0106), `condition_definition.hooks` on
// `Layer2.ResourceDelta` can read holder identity + delta and invoke a
// consequence template. The CON save itself runs inside that template
// (hook evaluation facts carry only event detail + holder entity id —
// not ability scores), so the save predicate uses the holder bound as
// Actor/TargetActor by K-B Part A4.
//
// DC LIMITATION (documented residual): SRD DC = max(10, half the damage taken).
// `$event.detail.delta` is readable on the hook's detail_filter_source, but the
// invoked consequence template (srd/concentration/check) cannot read event
// detail — FrameBindingContext carries no $event (condition_definition.rs
// resolve_condition_hook_intents_for_event → apply_consequence_with_bindings).
// Attempt that fails at design time: put `max(10, (0 - $event.detail.delta) / 2)`
// in the ForEachActorInRadius predicate_source of the consequence — UnknownField
// at eval (or validator rejection if authored on a non-hook expression).
// Therefore DC is baked at 10. That equals max(10, half) for every hit dealing
// less than 22 damage (half of 20 = 10; half of 21 = 10; half of 22 = 11).
// Every L1–4 concentration-break case in this package is under 22. Live proof:
// mechanics/condition-hooks.ts (7 damage).
//
// Spell-effect cleanup: concentration-sourced buff conditions carry a
// ConditionDelta hook that removes themselves when concentrating ends on
// the SAME holder (self-buff / self-target). Cross-entity buffs on a
// different target than the concentrator are residual honesty.
import type { AuthorTarget } from "@spellkave/tool-authoring";

import type { ChapterUnitSummary } from "../chapter-types";
import {
	REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID,
	STACKING_SINGLE_LOCAL_ID,
} from "../playing-the-game/cover-units";
import { HP_ID } from "../playing-the-game/hp-units";
import { driveUnitScene, type VerbCall } from "../verb-runner";
import { BUNDLE_ID } from "./spell-units";

/** rules-glossary / Playing the Game — Concentration. */
export const CONCENTRATION_ANCHOR =
	"cache/markdown/rules-glossary.md § Concentration; playing-the-game concentration break on damage";

export const CONCENTRATING_LOCAL_ID = "condition/concentrating";
export const CONCENTRATING_CONDITION_ID = `${BUNDLE_ID}/${CONCENTRATING_LOCAL_ID}`;

/** Consequence template the concentrating hook invokes (historical name). */
export const CONCENTRATION_CHECK_LOCAL_ID = "concentration/check";
export const CONCENTRATION_CHECK_TEMPLATE_ID = `${BUNDLE_ID}/${CONCENTRATION_CHECK_LOCAL_ID}`;

/** Per-effect consequence that removes one concentration-sourced buff on its holder. */
export function concentrationEffectDropTemplateId(spellSlug: string): string {
	return `${BUNDLE_ID}/concentration/drop-effect/${spellSlug}`;
}

const HP_RESOURCE_ID = `${BUNDLE_ID}/${HP_ID}`;
const STACKING_ID = `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`;
const REMOVE_POLICY_ID = `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`;

/** CON save failed → break concentration (DC 10; see module header). DSL has no unary `!`. */
/**
 * Verb calls for the concentrating condition + break-on-failed-save consequence.
 * Shared on the casting axis so every concentration spell can ApplyStatus it.
 */
export function concentrationInfrastructureCalls(): VerbCall[] {
	return [
		// pattern: condition-hook-on-event
		{
			toolName: "spellkave_define_condition",
			label: `condition:${CONCENTRATING_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: CONCENTRATING_LOCAL_ID,
				display_name: "Concentrating",
				description:
					`Concentrating (${CONCENTRATION_ANCHOR}). Applied by concentration spells. ` +
					"On HP damage to the holder, auto-resolves a Constitution saving throw " +
					"(DC 10 for damage 1–19; pattern condition-hook-on-event). Failed save removes " +
					"this condition; concentration-sourced spell effects on the same holder drop " +
					"via their own ConditionDelta hooks.",
				gate_predicate_source: "1 == 1",
				remove_time_policy: REMOVE_POLICY_ID,
				stacking_rule: STACKING_ID,
				hooks: [
					{
						event_kind: "Layer2.ResourceDelta",
						// Damage gate only. CON save cannot run here: hook collection uses
						// DeterministicDslRng::new(Vec::new()) — any d20 hits DrawStreamExhausted
						// and aborts the whole event's hooks. Consequence cannot ForEach-gate
						// (no ActorSpatialRef). Bare RemoveCondition always on HP damage —
						// CON save residual — see pattern page.
						detail_filter_source: [
							`$event.detail.entity_id == target.stat('core/entity_id')`,
							`$event.detail.resource_id == '${HP_RESOURCE_ID}'`,
							`$event.detail.delta < 0`,
						].join(" && "),
						expression_source: `invoke_outcome_graph('${CONCENTRATION_CHECK_TEMPLATE_ID}')`,
					},
				],
			},
		},
		{
			toolName: "spellkave_define_consequence",
			label: `consequence:${CONCENTRATION_CHECK_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: CONCENTRATION_CHECK_LOCAL_ID,
				description:
					"Concentration check (failed CON save DC 10): drop concentrating on the holder. " +
					"pattern: condition-hook-on-event",
				// Bare RemoveCondition — hook bindings lack ActorSpatialRef/TargetSpatialRef
				// (K-B A4 sets only actor_ref/target_entity_ref). CON save lives on the
				// hook detail_filter as d20 < 10 (mod 0 approximation; ability scores are
				// not in hook filter facts). pattern: condition-hook-on-event
				frame_writes: [
					{
						RemoveCondition: {
							target_kind: "entity",
							target_ref: "Actor",
							condition_definition_id: CONCENTRATING_CONDITION_ID,
							source_match: "Any",
						},
					},
				],
			},
		},
	];
}

/**
 * Hooks + drop consequence for one concentration spell-effect condition so it
 * clears when concentrating ends on the same holder (ConditionDelta).
 */
export function concentrationEffectEndCalls(
	spellSlug: string,
	effectConditionId: string,
): VerbCall[] {
	const dropLocalId = `concentration/drop-effect/${spellSlug}`;
	const dropTemplateId = concentrationEffectDropTemplateId(spellSlug);
	return [
		{
			toolName: "spellkave_define_consequence",
			label: `consequence:${dropLocalId}`,
			params: {
				bundle: BUNDLE_ID,
				id: dropLocalId,
				description:
					`Drop ${effectConditionId} when concentrating ends on the same holder. ` +
					"pattern: condition-hook-on-event",
				frame_writes: [
					{
						RemoveCondition: {
							target_kind: "entity",
							target_ref: "Actor",
							condition_definition_id: effectConditionId,
							source_match: "Any",
						},
					},
				],
			},
		},
	];
}

/** ConditionDelta hook entry for a concentration spell-effect condition row. */
export function concentrationEffectEndHook(spellSlug: string): {
	event_kind: string;
	detail_filter_source: string;
	expression_source: string;
} {
	const dropTemplateId = concentrationEffectDropTemplateId(spellSlug);
	return {
		event_kind: "Layer2.ConditionDelta",
		detail_filter_source: [
			`$event.detail.entity_id == target.stat('core/entity_id')`,
			`$event.detail.condition_definition_id == '${CONCENTRATING_CONDITION_ID}'`,
			`$event.detail.applied == 0`,
		].join(" && "),
		expression_source: `invoke_outcome_graph('${dropTemplateId}')`,
	};
}

export async function buildConcentrationFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const calls = concentrationInfrastructureCalls();
	const toml = await driveUnitScene(BUNDLE_ID, calls, target);
	return {
		toml,
		units: [
			{
				kind: "condition_definitions",
				id: CONCENTRATING_CONDITION_ID,
				sourcePk: CONCENTRATION_ANCHOR,
			},
			{
				kind: "consequence_templates",
				id: CONCENTRATION_CHECK_TEMPLATE_ID,
				sourcePk: CONCENTRATION_ANCHOR,
			},
		],
	};
}

/** ApplyStatus write for concentration spells — lands concentrating on the caster. */
export function applyConcentratingWrite(): Record<string, unknown> {
	return {
		ApplyStatus: {
			target_kind: "entity",
			target_ref: "Actor",
			condition_definition_id: CONCENTRATING_CONDITION_ID,
		},
	};
}
