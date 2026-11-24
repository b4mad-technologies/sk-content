import type { AuthorTarget } from "@spellkave/tool-authoring";
import { dsl } from "@spellkave/world-author";

import type { ChapterUnitSummary } from "../../chapter-types";
import { driveUnitScene, outcomeGraphRowsCall, type VerbCall } from "../../verb-runner";
import { BONUS_CHANNEL_ID } from "../action-economy-units";
import { BUNDLE_ID } from "../constants";

export const CONSUME_CAPABILITY_ID = `${BUNDLE_ID}/action/consume`;
export const CONSUME_CAPABILITY_SEED_LABEL = "seed-capability:action/consume";
/** The ONE world verb every carried consumable is used through. */
export const CONSUME_ACTION_ID = `${BUNDLE_ID}/consume`;
/** Shared `srd/consume` success consequence: remove one dose from the TARGET item. */
export const CONSUME_SUCCESS_CONSEQUENCE_ID = `${CONSUME_ACTION_ID}/success`;
/** Target niche: a consumable item in the acting creature's own carriage. */
export const CONSUMABLE_NICHE_ID = `${BUNDLE_ID}/consumable`;
/**
 * Definition tag every consumable with a `srd/consume` template carries
 * (vocabulary row: `tag-value-vocabulary.ts`). Only items that own a consume
 * template carry it, so the niche never offers a target no template resolves.
 */
export const CONSUMABLE_TAG = `${BUNDLE_ID}.consumable`;
/**
 * Kernel-derived target-home fact for an item in the actor's own carriage —
 * NOT `core` bundle content (`packages/spellkave-srd-cc/CLAUDE.md`
 * self-sufficiency exception, the same one `fragments/pickup.ts` uses for
 * `core/grounded` / `core/contained`): `server/src/world_interaction/target_niches.rs`.
 */
export const CORE_OWNED_STATE = "core/owned";

const CONSUME_VERB_SEED_LABEL_PREFIX = "seed-consume-verb:";

/**
 * Seed-then-strip placeholder for scenes in OTHER chapters whose rows name
 * `srd/action/consume`: authoring refuses a capability that is neither in the
 * workspace nor in the active local target, and on a first render the target
 * does not carry this fragment yet. Callers pass
 * `omitRowKinds: ["capability_definitions"]` to `driveUnitScene` so the real
 * row ships only from `consume.toml` (creature-identity.ts's own pattern).
 */
export function consumeCapabilitySeedCall(): VerbCall {
	return {
		toolName: "spellkave_define_capability",
		label: CONSUME_CAPABILITY_SEED_LABEL,
		params: {
			bundle: BUNDLE_ID,
			id: "action/consume",
			actor_kind: "entity",
			display_name: "Use a Consumable (seed-then-strip)",
			description:
				"Throwaway seed so consume templates validate — never emitted (omitRowKinds " +
				"capability_definitions). Real row: playing-the-game/fragments/consume.ts.",
		},
	};
}

function consumableNicheCall(label: string): VerbCall {
	// A REAL niche_definitions row with `provider = "entity"`, exactly like
	// `fragments/pickup.ts`'s `srd/item` niche (see that module for why a bare
	// tag as `niche_id` falls back to the `place` provider and demands a
	// spatial attachment a carried item never has).
	return {
		toolName: "spellkave_write_rows",
		label,
		params: {
			bundle: BUNDLE_ID,
			kind: "niche_definitions",
			rows: [
				{
					niche_id: CONSUMABLE_NICHE_ID,
					bundle_id: BUNDLE_ID,
					display_name: "Carried Consumable",
					description: "A consumable item (a potion) in the acting creature's own carriage.",
					predicate_source: dsl`target.has_niche('${CONSUMABLE_TAG}') && target.has_niche('${CORE_OWNED_STATE}')`,
					provider: "entity",
				},
			],
		},
	};
}

function consumeSuccessConsequenceCall(label: string): VerbCall {
	return {
		toolName: "spellkave_define_consequence",
		label,
		params: {
			bundle: BUNDLE_ID,
			id: "consume/success",
			description: "Remove one dose from the consumable being used (the dispatch target).",
			frame_writes: [{ RemoveItem: { count: 1, source: { TargetItem: {} } } }],
		},
	};
}

function consumeActionCall(label: string): VerbCall {
	return {
		toolName: "spellkave_define_action",
		label,
		params: {
			bundle: BUNDLE_ID,
			id: "consume",
			required_capability: CONSUME_CAPABILITY_ID,
			on_success: CONSUME_SUCCESS_CONSEQUENCE_ID,
			display_name: "Use a Consumable",
			description:
				"Bonus Action: drink a potion (or use another consumable) you are carrying. Choose " +
				"the item as the target; it loses one dose and its own effect applies to you " +
				"(magic-items.md § Potions).",
			self_eligible: false,
			self_only: false,
			spends_channel: BONUS_CHANNEL_ID,
			cost_time_ms: 0,
		},
	};
}

/**
 * Seed-then-strip for scenes in OTHER chapters that author a `srd/consume`
 * template: the capability, the consumable niche, the shared consequence and
 * the action must resolve in the throwaway workspace, but ship only from
 * `consume.toml`. Pair with {@link stripConsumeVerbSeedRows} and
 * `omitRowKinds: ["capability_definitions"]`.
 */
export function consumeVerbSeedCalls(): VerbCall[] {
	return [
		consumeCapabilitySeedCall(),
		consumableNicheCall(`${CONSUME_VERB_SEED_LABEL_PREFIX}niche`),
		consumeSuccessConsequenceCall(`${CONSUME_VERB_SEED_LABEL_PREFIX}consequence`),
		consumeActionCall(`${CONSUME_VERB_SEED_LABEL_PREFIX}action`),
	];
}

/** Drop the rows {@link consumeVerbSeedCalls} seeded from a rendered fragment. */
export function stripConsumeVerbSeedRows(toml: string): string {
	const seeded: ReadonlyArray<readonly [string, string]> = [
		["[[niche_definitions]]", `niche_id = "${CONSUMABLE_NICHE_ID}"`],
		["[[consequence_templates]]", `template_id = "${CONSUME_SUCCESS_CONSEQUENCE_ID}"`],
		["[[consequence_frame_writes]]", `template_id = "${CONSUME_SUCCESS_CONSEQUENCE_ID}"`],
		["[[action_definitions]]", `action_id = "${CONSUME_ACTION_ID}"`],
		["[[action_definition_tag]]", `action_id = "${CONSUME_ACTION_ID}"`],
	];
	return toml
		.split(/(?=^\[\[)/m)
		.filter((block) => {
			const head = block.split("\n", 1)[0] ?? "";
			const lines = block.split("\n");
			return !seeded.some(([kind, idLine]) => head === kind && lines.includes(idLine));
		})
		.join("");
}

export interface ConsumeTemplateSpec {
	/** The consumable's `entity_definitions` id — a target niche the kernel derives. */
	itemDefId: string;
	/** Player-facing name of the template, e.g. "Drink Potion of Healing". */
	displayName: string;
	/** Consequence applying the item's own effect to the drinker (`Actor`). */
	effectConsequenceId: string;
}

/** Template / outcome / graph ids for one consumable's `srd/consume` template. */
export function consumeTemplateIds(itemDefId: string): {
	affordanceTemplateId: string;
	outcomeTemplateId: string;
	effectOutcomeTemplateId: string;
	graphId: string;
} {
	const stem = `${itemDefId}/consume`;
	return {
		affordanceTemplateId: `${stem}/affordance`,
		outcomeTemplateId: `${stem}/outcome`,
		effectOutcomeTemplateId: `${stem}/effect`,
		graphId: `${stem}/graph`,
	};
}

/**
 * The `srd/consume` template predicate for one consumable definition.
 *
 * No `core/owned` clause here although the niche carries one: for a carried
 * target item `r_manipulate` re-checks the template predicate
 * (`revalidate_item_source`) against a NARROWER niche set — `item:<id>` and the
 * item's `entity_def_id` only, no home state and no tags — after checking loose
 * carriage itself. A `core/owned` clause here fails that re-check
 * (`stale_item_source` / `predicate-fail`, measured live
 * sk-jay0.1.23.36.22.17). Ownership is enforced by the `srd/consumable` niche
 * at selection and by the revalidation's own containment check.
 */
export function consumeTemplatePredicate(itemDefId: string): string {
	return dsl`actor.has_capability('${CONSUME_CAPABILITY_ID}') && target.has_niche('${itemDefId}')`;
}

/**
 * ONE `srd/consume` affordance template for ONE consumable
 * (pattern: consumable-inventory-consume).
 *
 * The kernel binds the consequence to the ACTION, not to the affordance
 * template (`r_manipulate` applies `action.on_success`), so every template
 * shares `srd/consume/success`: remove one dose from the target item. The
 * item's own effect rides on the template's outcome row:
 * `outcome_expression_source` invokes a one-node outcome graph whose terminal
 * outcome template carries the effect consequence.
 * `commit_resolved_manipulation` runs the action's frame first, then that
 * expression, with the same binding context
 * (`server/src/world_interaction/layer2/r_manipulate/mod.rs`,
 * `execute_outcome_expression`), so `Actor` is the drinker in both.
 *
 * The predicate selects exactly this item definition as the target (the
 * `entity_def_id` is a derived target niche), so the templates sharing
 * `srd/consume` at `srd/consumable` are mutually exclusive by eligibility
 * (MF-VAL-341 accepted in `pipeline.test.ts`).
 */
export function consumeTemplateCalls(spec: ConsumeTemplateSpec): VerbCall[] {
	const ids = consumeTemplateIds(spec.itemDefId);
	return [
		{
			toolName: "spellkave_write_rows",
			label: `consume-outcomes:${spec.itemDefId}`,
			params: {
				bundle: BUNDLE_ID,
				kind: "outcome_templates",
				rows: [
					{
						outcome_template_id: ids.effectOutcomeTemplateId,
						bundle_id: BUNDLE_ID,
						display_name: `${spec.displayName} (effect)`,
						outcome_bool: true,
						consequence_template_id: spec.effectConsequenceId,
					},
					{
						outcome_template_id: ids.outcomeTemplateId,
						bundle_id: BUNDLE_ID,
						display_name: spec.displayName,
						outcome_bool: true,
						outcome_expression_source: `invoke_outcome_graph('${ids.graphId}')`,
						manipulation_action_id: CONSUME_ACTION_ID,
					},
				],
			},
		},
		// Finding #66: graph + node land together; the affordance write below
		// re-validates the whole scratch manifest.
		outcomeGraphRowsCall(`consume-graph:${spec.itemDefId}`, {
			outcome_graphs: [
				{
					outcome_graph_id: ids.graphId,
					bundle_id: BUNDLE_ID,
					display_name: `${spec.displayName} (effect)`,
					root_node_id: "effect",
					max_depth: 1,
					max_nodes: 1,
					max_draws: 8,
				},
			],
			outcome_graph_nodes: [
				{
					outcome_graph_node_id: `${ids.graphId}/effect`,
					outcome_graph_id: ids.graphId,
					node_id: "effect",
					outcome_template_id: ids.effectOutcomeTemplateId,
					terminal: true,
					authored_order: 0,
				},
			],
		}),
		{
			toolName: "spellkave_write_rows",
			label: `consume-affordance:${spec.itemDefId}`,
			params: {
				bundle: BUNDLE_ID,
				kind: "affordance_templates",
				rows: [
					{
						template_id: ids.affordanceTemplateId,
						bundle_id: BUNDLE_ID,
						capability_id: CONSUME_CAPABILITY_ID,
						niche_id: CONSUMABLE_NICHE_ID,
						outcome_template_id: ids.outcomeTemplateId,
						display_name: spec.displayName,
						predicate_source: consumeTemplatePredicate(spec.itemDefId),
						range_m: 0,
						spends_channel: BONUS_CHANNEL_ID,
					},
				],
			},
		},
	];
}

/**
 * `srd/action/consume` + `srd/consume` — drink or use a carried consumable.
 *
 * WHY THE CAPABILITY EXISTS (sk-jay0.1.23.36.22.10). An affordance template
 * with `capability_id = ""` is never disclosed: the affordance materialiser
 * (`server/src/world_interaction/affordance_materialiser/mod.rs`,
 * `available_actions_from_catalog`) keeps only templates whose capability the
 * actor holds. The capability follows the identity-tag-capability-grant
 * pattern exactly as `srd/action/pickup` does: granted from `srd.creature` in
 * `creature-identity-units.ts`. Like pickup it is over-wide by construction
 * (a rat may "drink"); the target niche, `RemoveItem`'s target-item removal
 * and the Bonus Action channel still constrain the attempt.
 *
 * ONE VERB, TARGET = THE HELD ITEM (sk-jay0.1.23.36.22.17). This module owns
 * the single `srd/consume` action (no affordance template of its own), the
 * `srd/consumable` target niche (an item tagged `srd.consumable` in the
 * actor's own carriage, `core/owned`) and the shared success consequence
 * (`RemoveItem { source: TargetItem }`). Each consumable adds ONE template via
 * {@link consumeTemplateCalls} beside its own definition (magic-items), so a
 * creature's manipulation context lists one `srd/consume` row whose targets
 * are exactly the consumables it holds. It replaced ten self-only per-potion
 * verbs (`srd/item/<potion>/consume`) that every creature saw whether or not
 * it carried the potion.
 *
 * pattern: identity-tag-capability-grant, consumable-inventory-consume
 */
export async function buildConsumeFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const calls: VerbCall[] = [
		{
			toolName: "spellkave_define_capability",
			label: "capability:consume",
			params: {
				bundle: BUNDLE_ID,
				id: "action/consume",
				display_name: "Use a Consumable",
				description:
					"Drink a potion or use another carried consumable on yourself. Potions are a " +
					"Bonus Action to drink (magic-items.md § Potions); the chosen item loses one " +
					"dose and applies its effect. pattern: consumable-inventory-consume.",
				actor_kind: "entity",
				tags: ["srd.action"],
			},
		},
		consumableNicheCall("niche:consumable"),
		consumeSuccessConsequenceCall("consequence:consume/success"),
		consumeActionCall("action:consume"),
	];
	const body = await driveUnitScene(BUNDLE_ID, calls, target);
	const units: ChapterUnitSummary[] = [
		{ kind: "capability_definitions", id: CONSUME_CAPABILITY_ID, sourcePk: "" },
		{ kind: "niche_definitions", id: CONSUMABLE_NICHE_ID, sourcePk: "" },
		{ kind: "consequence_templates", id: CONSUME_SUCCESS_CONSEQUENCE_ID, sourcePk: "" },
		{
			kind: "action_definitions",
			id: CONSUME_ACTION_ID,
			sourcePk: "cache/markdown/magic-items.md",
		},
	];
	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/consume.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# pattern: consumable-inventory-consume",
		"# Use a Consumable — srd/action/consume (granted from srd.creature in",
		"# creature-identity.toml) and the ONE world verb srd/consume: target = a",
		"# consumable in the actor's own carriage (niche srd/consumable). Each",
		"# consumable ships its own srd/consume affordance template beside its",
		"# definition (magic-items); this fragment owns the action, the niche and",
		"# the shared RemoveItem TargetItem consequence (sk-jay0.1.23.36.22.17).",
		"",
		"",
	].join("\n");
	return { toml: header + body, units };
}
