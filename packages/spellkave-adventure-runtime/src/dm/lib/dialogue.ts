/**
 * DM Runtime Library core (ADR-0096, S2 — `dm-runtime-library-arc.md`) —
 * entity-directed dialogue/menu actions.
 *
 * Generalizes `src/author/dm/aldwin.ts`'s own two/three-call idiom (a
 * `capability_definitions` row, an `action_definitions`/`affordance_
 * templates`/`outcome_templates` row via `spellkave_define_action_verb`,
 * then a `communicationSpeechActUpsertCall`-shaped `spellkave_write_rows`
 * upsert adding `communication_speech_act_id` — no
 * `spellkave_define_action_verb` param exists for that field, per that
 * file's own module header) into ONE typed builder a DM brain calls at
 * dispatch time to wire ONE menu option or dialogue line.
 *
 * SRD BOUNDARY BY CONSTRUCTION (ADR-0096 D-3): this builder authors DM-tier
 * WIRING content only — a capability + action-verb pair whose consequence
 * (if any) reads/writes EXISTING srd resources via caller-supplied ids and
 * DSL fragments (`frame-writes.ts`'s constructors). It never defines a
 * resource, spell, feat, background, species, class feature, or rule macro
 * — see `resources.ts` for the sibling DM-owned-marker-resource builder and
 * `../lib/index.ts`'s own header for the SRD-boundary-by-construction
 * argument at the module level.
 *
 * The eligibility GATE (`gatePredicateSource`) arrives as DATA: an authored
 * DSL string the CALLER already composed (from `src/dm/data/`'s advancement
 * tables, S3, or a hand-authored fragment). This module has NO predicate-
 * evaluation code path — it renders the string into `affordance_templates.
 * predicate_source` verbatim and nothing more; the SERVER evaluates it at
 * dispatch time (D-3's "the library never computes 'is this allowed,' only
 * 'what does this contain'"). Likewise every consequence delta
 * (`frameWrites`) is a late-bound literal the caller already computed
 * (D-1) — this module never derives one.
 */
import {
	DEFINE_ACTION_VERB_TOOL,
	DEFINE_CAPABILITY_TOOL,
	WRITE_ROWS_TOOL,
} from "@spellkave/tool-authoring";
import type { FrameWrite } from "./frame-writes";
import type { VerbCall } from "./scene-driver.ts";

/**
 * One entity-directed dialogue/menu action — a communication-namespace
 * speech act directed at some existing niche (typically an NPC-typed
 * entity's own niche, or its `capability:<id>` synthetic-niche shape),
 * gated on an authored DSL predicate (server-evaluated, never library-
 * evaluated), with late-bound literal consequence deltas the caller already
 * computed.
 *
 * Two shapes both fall out of this ONE spec (`aldwin.ts`'s own precedent):
 * a GATED menu option with `ModifyResource` writes (`level-up/steady-advance`),
 * and an UNGATED, advisory, audible entry point with ONLY an `Inscribe`
 * speech-trace write and no `gatePredicateSource` at all
 * (`ask-about-advancement`) — pass {@link inscribeSpeechTraceWrite}'s
 * output as the sole `frameWrites` entry and omit `gatePredicateSource` to
 * get that shape.
 */
export interface DialogueActionSpec {
	/** The bundle every generated row is stamped with — the DM's own
	 * runtime bundle namespace (ADR-0096 D-1), never an adventure/SRD
	 * bundle. */
	bundle: string;
	/** Local id stem: the full action id is `${bundle}/${actionLocalId}`,
	 * the full capability id is `${bundle}/action/${actionLocalId}`
	 * (mirrors `aldwin.ts`'s own `level-up/steady-advance` /
	 * `action/level-up/steady-advance` pairing verbatim). */
	actionLocalId: string;
	/** The niche this action is directed at — an ALREADY-existing niche id
	 * (defined earlier in the SAME render call list via `niches.ts`'s
	 * `buildNicheDefinition`, or the `capability:<id>` synthetic-niche
	 * convention, or an id already applied in a prior render). Per
	 * `spellkave_define_action_verb`'s own param doc, this is NOT
	 * existence-checked against `niche_definitions` at author time. */
	nicheId: string;
	displayName: string;
	/** `action_definitions.description` — what this menu option does. */
	description: string;
	/** `capability_definitions.description` — that row kind keeps its own
	 * required description column; defaults to `description` when omitted. */
	capabilityDescription?: string;
	/** Authored DSL gate predicate, passed IN as data (ADR-0096 D-3). Omit
	 * for an ungated action (askable/offered unconditionally — the
	 * `ask-about-advancement` shape). */
	gatePredicateSource?: string;
	/** Late-bound literal consequence deltas the CALLER already computed
	 * (ADR-0096 D-1). Omit (or pass an empty array) for a purely advisory
	 * action with no consequence at all (the `offer-level-up` shape). */
	frameWrites?: readonly FrameWrite[];
	/** Defaults to `true` — every dialogue action in this package's own
	 * precedent (`aldwin.ts`) sets this: a communication-namespace action
	 * targeting another entity's seat contends with that seat's own live
	 * claim (`claim_contended`) without it, per the server's conservative
	 * steering classifier (`steering_claim.rs`) — see `aldwin.ts`'s own
	 * NON_STEERING doc comments for the full grounding. */
	nonSteering?: boolean;
	costTimeMs?: number;
	selfEligible?: boolean;
	selfOnly?: boolean;
	actorKind?: string;
	/** `action_definitions` tags. Defaults to `[]` (mirrors every level-up/*
	 * action in `aldwin.ts` — the communication-speech-act upsert below
	 * carries the real, consumed signal, not this field). */
	tags?: readonly string[];
	/** `capability_definitions` tags. Defaults to `["srd.action"]` (every
	 * capability `aldwin.ts` defines carries this tag). */
	capabilityTags?: readonly string[];
	/** When set, reuse this already-defined capability and do not emit a new
	 * `capability_definitions` row (sk-0m4.57: one choose/set-open grant). */
	requiredCapability?: string;
}

export interface DialogueActionUnit {
	actionId: string;
	capabilityId: string;
	calls: VerbCall[];
}

/**
 * Re-states the `outcome_templates` row `spellkave_define_action_verb`
 * itself authors for a call shaped `{id, display_name}` with no
 * `outcome_expression_source`, adding `communication_speech_act_id` — the
 * SAME second-call idiom `aldwin.ts`'s own `communicationSpeechActUpsertCall`
 * documents (no `spellkave_define_action_verb` param exists for this field
 * today). Kept as a private helper here (not exported) — callers compose
 * dialogue actions through {@link buildDialogueAction} only, one API
 * surface per unit.
 */
function communicationSpeechActUpsertCall(args: {
	bundle: string;
	actionId: string;
	displayName: string;
	label: string;
}): VerbCall {
	return {
		toolName: WRITE_ROWS_TOOL,
		label: args.label,
		params: {
			bundle: args.bundle,
			kind: "outcome_templates",
			rows: [
				{
					outcome_template_id: `${args.actionId}/outcome`,
					bundle_id: args.bundle,
					display_name: args.displayName,
					outcome_bool: true,
					manipulation_action_id: args.actionId,
					communication_speech_act_id: args.actionId,
				},
			],
		},
	};
}

/**
 * Build the capability + action-verb + communication-speech-act `VerbCall`
 * sequence for ONE entity-directed dialogue/menu action. Self-contained:
 * the capability is defined immediately before the action-verb call that
 * references it, in the SAME returned sequence — `aldwin.ts`'s own pattern
 * — so this unit renders correctly in a fresh, empty workspace with no
 * `AuthorTarget` needed (see `render.ts`'s own doc comment on when a
 * target IS needed: a reference to content OUTSIDE this one unit).
 */
export function buildDialogueAction(spec: DialogueActionSpec): DialogueActionUnit {
	const capabilityLocalId = `action/${spec.actionLocalId}`;
	const capabilityId = spec.requiredCapability ?? `${spec.bundle}/${capabilityLocalId}`;
	const actionId = `${spec.bundle}/${spec.actionLocalId}`;
	const frameWrites = spec.frameWrites ?? [];

	const calls: VerbCall[] = [
		...(spec.requiredCapability === undefined
			? [
					{
						toolName: DEFINE_CAPABILITY_TOOL,
						label: `capability:${spec.actionLocalId}`,
						params: {
							bundle: spec.bundle,
							id: capabilityLocalId,
							actor_kind: spec.actorKind ?? "entity",
							display_name: spec.displayName,
							description: spec.capabilityDescription ?? spec.description,
							tags: spec.capabilityTags ?? ["srd.action"],
						},
					} satisfies VerbCall,
				]
			: []),
		{
			toolName: DEFINE_ACTION_VERB_TOOL,
			label: `action:${spec.actionLocalId}`,
			params: {
				bundle: spec.bundle,
				id: spec.actionLocalId,
				required_capability: capabilityId,
				niche_id: spec.nicheId,
				display_name: spec.displayName,
				description: spec.description,
				self_eligible: spec.selfEligible ?? false,
				self_only: spec.selfOnly ?? false,
				...(spec.gatePredicateSource === undefined
					? {}
					: { predicate_source: spec.gatePredicateSource }),
				cost_time_ms: spec.costTimeMs ?? 0,
				non_steering: spec.nonSteering ?? true,
				tags: spec.tags ?? [],
				...(frameWrites.length === 0
					? {}
					: {
							consequence: {
								description: spec.description,
								frame_writes: frameWrites,
							},
						}),
			},
		},
		communicationSpeechActUpsertCall({
			bundle: spec.bundle,
			actionId,
			displayName: spec.displayName,
			label: `communication-speech-act:${spec.actionLocalId}`,
		}),
	];

	return { actionId, capabilityId, calls };
}

/** Self-only manipulate — no communication_speech_act_id. Communicate
 * descriptors empty the action_id so self_only is never read, and an
 * actor-provided untargeted template then materialises nothing. */
export function buildSelfOnlyManipulateAction(spec: {
	bundle: string;
	actionLocalId: string;
	requiredCapability: string;
	nicheId: string;
	displayName: string;
	description: string;
	frameWrites: readonly FrameWrite[];
}): VerbCall {
	return {
		toolName: DEFINE_ACTION_VERB_TOOL,
		label: `action:${spec.actionLocalId}`,
		params: {
			bundle: spec.bundle,
			id: spec.actionLocalId,
			required_capability: spec.requiredCapability,
			niche_id: spec.nicheId,
			display_name: spec.displayName,
			description: spec.description,
			self_eligible: true,
			self_only: true,
			non_steering: false,
			consequence: {
				description: spec.description,
				frame_writes: spec.frameWrites,
			},
		},
	};
}
