import { readResourceFlavor } from "../../../flavor/read";
import { srdTextAttachmentWriteCall, srdTextNamespaceWriteCall } from "../../../text";
import type { ChapterUnitSummary } from "../../chapter-types";
import { driveUnitScene, type VerbCall } from "../../verb-runner";
import { BUNDLE_ID } from "../constants";
import {
	assertHeroicInspirationProvenanceSource,
	HEROIC_INSPIRATION_DISPLAY_NAME,
	HEROIC_INSPIRATION_ID,
	HEROIC_INSPIRATION_RECOVERY_RULE,
	HEROIC_INSPIRATION_SOURCE,
	INITIAL_HEROIC_INSPIRATION,
	MAX_HEROIC_INSPIRATION,
	MIN_HEROIC_INSPIRATION,
	readHeroicInspirationProvenanceText,
} from "../heroic-inspiration-units";

const HEROIC_INSPIRATION_ANCHOR =
	"playing-the-game.md § D20 Tests > Advantage/Disadvantage > Heroic Inspiration";
export const HEROIC_INSPIRATION_REROLL_ACTION_ID = `${BUNDLE_ID}/heroic_inspiration/reroll`;
export const HEROIC_INSPIRATION_REROLL_CAPABILITY_ID = `${BUNDLE_ID}/action/heroic_inspiration/reroll`;
export const HEROIC_INSPIRATION_REROLL_NICHE_ID = `capability:${HEROIC_INSPIRATION_REROLL_CAPABILITY_ID}`;
const HEROIC_INSPIRATION_REROLL_WINDOW_MS = 5000;
const HEROIC_INSPIRATION_REROLL_TRIGGER =
	"$event.kind == 'r_manipulate' && $event.detail.phase == 'resolution' && $event.detail.stochastic == 'true'";
const HEROIC_INSPIRATION_REROLL_ELIGIBILITY = `actor.stat('${BUNDLE_ID}/${HEROIC_INSPIRATION_ID}') >= 1`;
const HEROIC_INSPIRATION_REROLL_SOURCE = `${HEROIC_INSPIRATION_ANCHOR}; lines 413-421`;

export async function buildHeroicInspirationFragment(): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	assertHeroicInspirationProvenanceSource();
	const calls: VerbCall[] = [
		srdTextNamespaceWriteCall(),
		// actor-carried-verbs D1/D7 amendment (ruling bead sk-rd0, V1): Heroic
		// Inspiration Reroll's `capability:*` synthetic niche had no
		// niche_definitions row — same dead-content shape `fragments/dodge.ts`'s
		// own header documents. `provider: "actor"` revives it as a universal
		// self-verb.
		{
			toolName: "spellkave_write_rows",
			label: "niche:heroic-inspiration-reroll",
			params: {
				bundle: BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: HEROIC_INSPIRATION_REROLL_NICHE_ID,
						bundle_id: BUNDLE_ID,
						display_name: "Heroic Inspiration Reroll (self)",
						description:
							"actor-carried-verbs D1/D7 (sk-rd0): revives Heroic Inspiration Reroll as a " +
							"universal self-verb — see fragments/dodge.ts's own header for the full V1 " +
							"dead-content finding this applies identically to.",
						predicate_source: "",
						provider: "actor",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: `resource:${HEROIC_INSPIRATION_ID}`,
			params: {
				id: HEROIC_INSPIRATION_ID,
				display_name: HEROIC_INSPIRATION_DISPLAY_NAME,
				min_value: MIN_HEROIC_INSPIRATION,
				max_value: MAX_HEROIC_INSPIRATION,
				initial_value: INITIAL_HEROIC_INSPIRATION,
				recovery_rule: HEROIC_INSPIRATION_RECOVERY_RULE,
				description: readResourceFlavor("heroic-inspiration").body,
				tags: [],
			},
		},
		srdTextAttachmentWriteCall({
			targetKind: "resource_definition",
			targetRef: `${BUNDLE_ID}/${HEROIC_INSPIRATION_ID}`,
			extracted: {
				text: readHeroicInspirationProvenanceText(),
				source: HEROIC_INSPIRATION_SOURCE,
			},
		}),
		{
			toolName: "spellkave_define_capability",
			label: "capability:heroic_inspiration_reroll",
			params: {
				id: "action/heroic_inspiration/reroll",
				actor_kind: "entity",
				display_name: "Heroic Inspiration Reroll",
				description:
					"Allows the acting creature to consume Heroic Inspiration after " +
					"rolling a stochastic resolution in a context where rerolling one die is legal.",
				tags: ["srd.action"],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:heroic_inspiration_reroll",
			params: {
				bundle: BUNDLE_ID,
				id: "heroic_inspiration/reroll",
				required_capability: HEROIC_INSPIRATION_REROLL_CAPABILITY_ID,
				niche_id: HEROIC_INSPIRATION_REROLL_NICHE_ID,
				display_name: "Heroic Inspiration Reroll",
				description:
					"Post-roll stochastic intervention: spend one Heroic Inspiration and " +
					"reroll exactly one eligible die.",
				self_eligible: true,
				reaction_trigger: HEROIC_INSPIRATION_REROLL_TRIGGER,
				reaction_eligibility: HEROIC_INSPIRATION_REROLL_ELIGIBILITY,
				// Player-facing choice at the table needs time to read the roll
				// and choose one die; default 200 ms is too short for a human
				// decision. Explicitly author 5 seconds to make this intervention
				// discoverable and usable while preserving bounded windows.
				reaction_window_ms: HEROIC_INSPIRATION_REROLL_WINDOW_MS,
				consequence: {
					description: "Spend one Heroic Inspiration resource from the acting creature.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: `${BUNDLE_ID}/${HEROIC_INSPIRATION_ID}`,
								delta_source: "-1",
							},
						},
					],
				},
			},
		},
	];

	const fragment = await driveUnitScene(BUNDLE_ID, calls);
	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/heroic-inspiration.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# Heroic Inspiration (playing-the-game.md § D20 Tests > Advantage/Disadvantage),",
		`# sourced from the SRD sidebar's reroll and one-at-a-time sentences (${HEROIC_INSPIRATION_REROLL_SOURCE}).`,
		"# This is a binary possession resource: 0 = absent, 1 = held; the reactive",
		"# post-roll reroll and grant/transfer rules are separate mechanics, not",
		"# silently implied by the resource row.",
		"# actor-carried-verbs D1/D7 (sk-rd0): the reroll niche's provider=",
		'# "actor" row revives it as a universal self-verb (V1: dead content',
		"# before this change).",
		"",
		`# anchor: ${HEROIC_INSPIRATION_ANCHOR}`,
		"",
		"",
	].join("\n");
	return {
		toml: header + fragment,
		units: [
			{ kind: "niche_definitions", id: HEROIC_INSPIRATION_REROLL_NICHE_ID, sourcePk: "" },
			{ kind: "capability_definitions", id: HEROIC_INSPIRATION_REROLL_CAPABILITY_ID, sourcePk: "" },
			{
				kind: "resource_definitions",
				id: `${BUNDLE_ID}/${HEROIC_INSPIRATION_ID}`,
				sourcePk: "",
			},
			{ kind: "action_definitions", id: HEROIC_INSPIRATION_REROLL_ACTION_ID, sourcePk: "" },
			{
				kind: "consequence_templates",
				id: `${HEROIC_INSPIRATION_REROLL_ACTION_ID}/success`,
				sourcePk: "",
			},
			{
				kind: "outcome_templates",
				id: `${HEROIC_INSPIRATION_REROLL_ACTION_ID}/outcome`,
				sourcePk: "",
			},
			{
				kind: "affordance_templates",
				id: `${HEROIC_INSPIRATION_REROLL_ACTION_ID}/affordance`,
				sourcePk: "",
			},
		],
	};
}
