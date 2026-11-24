// pattern: container-with-loot
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { ADVENTURE_CANDIDATE_DEF_ID } from "./creation-candidate";
import { ADVENTURE_FIELD_KIT_DEF_ID } from "./hero";
import { BUNDLE } from "./lib/ids";
import { LOFT_CHEST_KEY, LOFT_CHEST_OPEN_STATE } from "./loft-chest";
import { TOMB_CHEST_DEF_ID } from "./occupancy";
import { ROGUE_COMPANION_DEF_ID } from "./rogue-companion";

export const LOFT_CONTENTS_POLICY = `${BUNDLE}/containment/loft-chest`;
export const SEALED_CONTENTS_POLICY = `${BUNDLE}/containment/sealed`;

/** #4940 owns the lid; both policy predicates consume its existing 0/1 state. */
export function containmentPolicies(): VerbCall[] {
	const write = (kind: string, rows: Record<string, unknown>[]): VerbCall => ({
		toolName: "spellkave_write_rows",
		label: `containment:${kind}`,
		params: { bundle: BUNDLE, kind, rows },
	});
	return [
		write("containment_policy_definition", [
			{
				bundle_id: BUNDLE,
				policy_id: LOFT_CONTENTS_POLICY,
				exposure_predicate_source: `target.stat('${LOFT_CHEST_OPEN_STATE}') == 1`,
				access_predicate_source: `target.stat('${LOFT_CHEST_OPEN_STATE}') == 1`,
			},
			{
				bundle_id: BUNDLE,
				policy_id: SEALED_CONTENTS_POLICY,
				exposure_predicate_source: "false == true",
				access_predicate_source: "false == true",
			},
		]),
		write("entity_definition_containment_policy", [
			...[ADVENTURE_CANDIDATE_DEF_ID, ROGUE_COMPANION_DEF_ID].map((entity_def_id) => ({
				bundle_id: BUNDLE,
				entity_def_id,
				policy_id: "srd/containment/corpse",
			})),
			...[ADVENTURE_FIELD_KIT_DEF_ID, `${BUNDLE}/item/rogue-field-kit`].map((entity_def_id) => ({
				bundle_id: BUNDLE,
				entity_def_id,
				policy_id: "srd/containment/open",
			})),
			{ bundle_id: BUNDLE, entity_def_id: TOMB_CHEST_DEF_ID, policy_id: SEALED_CONTENTS_POLICY },
		]),
		write("entity_containment_policy", [
			{ bundle_id: BUNDLE, entity_key: LOFT_CHEST_KEY, policy_id: LOFT_CONTENTS_POLICY },
		]),
	];
}
