/** Build-time authored act vocabulary; runtime callers supply only admitted arguments. */
import type { VerbCall } from "../../dm/lib/scene-driver.ts";

export interface AuthoredAct {
	id: string;
	capability: string;
	writes: Record<string, unknown>[];
	predicate?: string;
	speechAct?: boolean;
}
export function authoredActCalls(bundle: string, acts: readonly AuthoredAct[]): VerbCall[] {
	const write = (kind: string, rows: Record<string, unknown>[]): VerbCall => ({
		toolName: "spellkave_write_rows",
		label: `authored-dm-acts:${kind}`,
		params: { bundle, kind, rows },
	});
	return [
		write("niche_definitions", [
			{
				bundle_id: bundle,
				niche_id: `${bundle}/dm/act-target`,
				display_name: "DM act target",
				provider: "actor",
				predicate_source: "",
				description: "A body addressed by an authored privileged act.",
			},
		]),
		write(
			"consequence_templates",
			acts.map((act) => ({ bundle_id: bundle, template_id: `${act.id}/success` })),
		),
		write(
			"consequence_frame_writes",
			acts.flatMap((act) =>
				act.writes.map((frame_write, ordinal) => ({
					template_id: `${act.id}/success`,
					ordinal,
					frame_write,
				})),
			),
		),
		write(
			"action_definitions",
			acts.map((act) => ({
				bundle_id: bundle,
				action_id: act.id,
				display_name: act.id,
				required_capability: act.capability,
				resolution_mode: "Deterministic",
				on_success: `${act.id}/success`,
				cost_time_ms: 0,
				...(act.speechAct ? { non_steering: true } : {}),
			})),
		),
		write(
			"outcome_templates",
			acts.map((act) => ({
				bundle_id: bundle,
				outcome_template_id: `${act.id}/outcome`,
				display_name: act.id,
				manipulation_action_id: act.id,
				outcome_bool: true,
				...(act.speechAct ? { communication_speech_act_id: act.id } : {}),
			})),
		),
		write(
			"affordance_templates",
			acts.map((act) => ({
				bundle_id: bundle,
				template_id: `${act.id}/affordance`,
				display_name: act.id,
				capability_id: act.capability,
				niche_id: `${bundle}/dm/act-target`,
				outcome_template_id: `${act.id}/outcome`,
				predicate_source: `actor.has_capability('${act.capability}')${act.predicate === undefined ? "" : ` && ${act.predicate}`}`,
			})),
		),
	];
}
