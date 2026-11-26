// pattern: directed-speech-anchor
import type { ChapterUnitSummary } from "../../chapter-types";
import { driveUnitScene, type VerbCall } from "../../verb-runner";
import { BUNDLE_ID } from "../constants";
import {
	buildVocalCommunicationCapabilityGrantRows,
	SPEAK_CAPABILITY_ID,
} from "../vocal-communication-identity-units";
import { BASELINE_COMMUNICATE_NICHE_ID, communicationSpeechActUpsertCall } from "./communication";
import { DEAD_CONDITION_ID } from "./conditions";

export { SPEAK_CAPABILITY_ID } from "../vocal-communication-identity-units";

/**
 * Generic srd-own speech-trace mechanic (substrate-capability slice, no SRD
 * rule citation: SRD 5.2.1 has no rules text for "speaking" as a mechanic —
 * this fragment proves the trace-inscribing SUBSTRATE `communication.ts`'s
 * baseline `assert` chain deliberately left flavor-only, per this package's
 * self-sufficiency invariant (own `srd/` chain, never referencing
 * `phandelver/*`). PATTERN precedent only, never a dependency:
 * `world-fixtures/phandelver/base/speech-traces.toml` (`phandelver/utterance`
 * kind, `phandelver/speak_aloud` action) and `speak-to-room.toml`
 * (`ForEachActorInRadius`/`core/area/node_ball` fan-out) — this fragment
 * pattern-copies their SHAPE under a fresh `srd/`-namespaced trace kind and
 * action ids, ADR-0095's `entity` trace-anchor scope, and ADR-0021's
 * `carry_dispatch_text` opt-in (all landed on THIS branch,
 * server/src/world_interaction/layer2/r_apply_consequence/inscribe.rs and
 * mod.rs).
 *
 * THE ANCHOR SAYS WHERE, THE PAYLOAD SAYS TO WHOM (bead sk-n16). Broadcast
 * and self-shaped speech still sit at the place the sound was made. Directed
 * speech (speak-to, telepathy) anchors at the ADDRESSEE's current place
 * (`TargetSpatialRef`) so ordinary co-location admission delivers it there —
 * not a new admission model, and not `TargetEntityRef` (that glued the row
 * to a person; see below). An addressee in the payload still delivers to
 * nobody: free overhearing survives for anyone co-located with the ANCHOR.
 *
 * SHIPPED HERE: four chains —
 * - `srd/speak-aloud` — self/place-shaped, `ActorSpatialRef`, no addressee.
 * - `srd/speak-to-room` — `ForEachActorInRadius` fan-out over a metric
 *   `core/area/sphere` with a hall-scale `radius_m` (BL-33's topological
 *   `node_ball` radius > 0 stays open; this bypasses it via the metric
 *   shape that already works). Names an addressee.
 * - `srd/speak-to` — entity-directed: `TargetSpatialRef` place-anchor plus
 *   `carry_addressee`, which merges the dispatch target's entity id into the
 *   payload under an `addressee` key (`resolve_inscribed_payload_json`,
 *   server/src/world_interaction/layer2/r_apply_consequence/inscribe.rs).
 * - `srd/communicate/telepathy` — the same directed shape with a real
 *   `range_m` (sk-0m4.33; Aldwin is granted it for sk-0m4.19 slice b).
 *
 * WHY NOT THE ADDRESSEE'S ENTITY AS THE ANCHOR: anchoring at
 * `TargetEntityRef` made the anchor do both jobs at once, and the trace then
 * accumulated ON A PERSON and travelled with them. Aldwin carried every line
 * ever addressed to him and handed the stack to whoever later stood next to
 * him — sk-oj6 caught a hero perceiving another character's entire creation
 * exchange, raw internal tokens included. `TargetSpatialRef` is the place
 * the addressee currently occupies, not the person: the row does not travel.
 * Note this was never a delivery bug of the entity-anchor: that admitted by
 * co-location like any other, so it was not addressee-exclusive either.
 *
 * WHY THE TRACE STILL HAS NO EXPIRY: speech is not ephemeral by nature, it
 * is ephemeral to PERCEIVE. `perceptible_for_ticks = 0` below says a body
 * hears an utterance if it was present when it was said and never by walking
 * in afterwards (`observer_knowledge::learn_at_node`), while the row itself
 * survives so the room keeps a history an elevated/DM caller can read back.
 * Expiring the row instead (`Inscribe.expires_at_tick`) would delete it —
 * and `visible_trace` resolves each remembered trace back through the
 * `trace` table, skipping dangling ids, so decay would silently UN-HEAR a
 * listener who had already heard.
 *
 * `payload text == the dispatched utterance` is provable for ALL THREE
 * (server commit 337f28aed closed the `carry_dispatch_text` wire gap:
 * `ManipulationArgs.dispatch_text`, threaded through the SDK's
 * `manipulationArgsFromJson` and the shared tool runtime's `utterance` tool
 * param — originally declared BL-36, now retired).
 */

export const SPEECH_TRACE_KIND_ID = `${BUNDLE_ID}/speech`;

export const SPEAK_ALOUD_ACTION_ID = `${BUNDLE_ID}/speak-aloud`;
export const SPEAK_ALOUD_OUTCOME_ID = `${SPEAK_ALOUD_ACTION_ID}/outcome`;
export const SPEAK_ALOUD_AFFORDANCE_ID = `${SPEAK_ALOUD_ACTION_ID}/affordance`;

export const SPEAK_TO_ROOM_ACTION_ID = `${BUNDLE_ID}/speak-to-room`;
export const SPEAK_TO_ROOM_OUTCOME_ID = `${SPEAK_TO_ROOM_ACTION_ID}/outcome`;
export const SPEAK_TO_ROOM_AFFORDANCE_ID = `${SPEAK_TO_ROOM_ACTION_ID}/affordance`;

export const SPEAK_TO_ACTION_ID = `${BUNDLE_ID}/speak-to`;
export const SPEAK_TO_OUTCOME_ID = `${SPEAK_TO_ACTION_ID}/outcome`;
export const SPEAK_TO_AFFORDANCE_ID = `${SPEAK_TO_ACTION_ID}/affordance`;

export const TELEPATHY_CAPABILITY_ID = `${BUNDLE_ID}/action/communicate/telepathy`;
export const TELEPATHY_ACTION_ID = `${BUNDLE_ID}/communicate/telepathy`;
export const TELEPATHY_OUTCOME_ID = `${TELEPATHY_ACTION_ID}/outcome`;
export const TELEPATHY_AFFORDANCE_ID = `${TELEPATHY_ACTION_ID}/affordance`;

/** Hall-scale shout in the ForEachActorInRadius / `area_shape` frame (BL-35):
 * raw `pos_*` grid units, not `metres_per_unit`. Covers inn neighbour nodes
 * (foyer/bar/stairs ≈ 3–4 units) and not loft/cellar (≈ 18–25). Inn/tomb
 * hall nodes all carry `pos_present = true` (verified 2026-08-17). */
export const SPEAK_TO_ROOM_RADIUS_M = 10;

/** Directed telepathy range covering the kavemouth inn graph diameter
 * (loft↔cellar ≈ 38 m). Cross-graph addressability is a grant *extent*
 * (sk-0m4.34), not a bigger number here; creature/item range telepathy
 * stays same-graph. */
export const TELEPATHY_RANGE_M = 50;

/**
 * The authored payload contract for `srd/speech`, enforced by the kernel
 * while it assembles the payload (`inscribe::validate_payload_against_schema`).
 * Shape: a flat key -> type-name object, the one the `handled_item` bootstrap
 * kind has always used — a `?` suffix marks the key optional.
 *
 * `addressee` is optional because it genuinely is: `speak-aloud` is a shout
 * with nobody in particular in mind, `speak-to` names someone, and both are
 * the same kind of sound. Where it MUST be present, the guarantee comes from
 * `carry_addressee` rather than from the schema — the kernel refuses the
 * dispatch outright when the flag is set and no entity target exists.
 *
 * This replaces the `{"legacy_payload_schema":""}` placeholder every authored
 * trace kind used to pattern-copy. That value declared nothing and nothing
 * read it, which is indistinguishable from a working contract right up until
 * something depends on a field (bead sk-n16).
 */
const SPEECH_SCHEMA_JSON = '{"text":"string","addressee":"integer?"}';

export type SpeechInscribeAnchor = "ActorSpatialRef" | "TargetSpatialRef";

/**
 * Broadcast / self-shaped speech (`ActorSpatialRef`) sits at the speaker's
 * place — or, inside `speak-to-room`'s fan-out, at each selected hearer's
 * node after the executor rebinds `ActorSpatialRef`. Directed speech
 * (`TargetSpatialRef`) sits at the addressee's current place so ordinary
 * co-location admission delivers it there (sk-0m4.33). Never `TargetEntityRef`:
 * that glued the row to a person (sk-oj6).
 *
 * `carryAddressee` opts into the kernel merging the dispatch target's entity
 * id into the payload under an `addressee` key. Set it only on the chains
 * that actually name someone — a `speak-aloud` dispatch has no entity target
 * and the kernel rejects the flag loudly rather than inscribing a trace whose
 * declared addressee is silently missing.
 */
function speechInscribeFrameWrite(
	carryAddressee: boolean,
	anchor: SpeechInscribeAnchor,
): Record<string, unknown> {
	return {
		Inscribe: {
			kind: SPEECH_TRACE_KIND_ID,
			location_kind: "binding",
			location_ref: anchor,
			payload_json: "{}",
			carry_dispatch_text: true,
			carry_addressee: carryAddressee,
		},
	};
}

export async function buildSpeechFragment(): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	const calls: VerbCall[] = [
		{
			toolName: "spellkave_define_trace_kind",
			label: "trace-kind:speech",
			params: {
				bundle: BUNDLE_ID,
				id: "speech",
				// place_node ONLY. An utterance is at the place it was made;
				// the addressee rides in the payload. The 'entity' scope was
				// dropped when srd/speak-to stopped anchoring to the person
				// spoken to (bead sk-n16) — narrowing it here means no author
				// can re-open sk-oj6 by reaching for the old shape.
				location_kinds: "place_node",
				schema_json: SPEECH_SCHEMA_JSON,
				// Speech is an EVENT, not a mark: heard by whoever was present
				// when it was said, never by someone who walks in afterwards.
				// The row survives — the room keeps its history for a DM
				// look-back; what expires is only admission on arrival.
				perceptible_for_ticks: 0,
				description:
					"A spoken utterance inscribed at the speaker's own place (Local visibility — " +
					"overhearing falls out for free; carries the dispatched utterance verbatim under " +
					"a 'text' key, ADR-0021 carry_dispatch_text, and the addressee's entity id under " +
					"'addressee' when the utterance was directed at someone). Perceptible only as it " +
					"is spoken: the anchor says WHERE, the payload says TO WHOM.",
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: "capability:communicate-speak",
			params: {
				bundle: BUNDLE_ID,
				id: "action/communicate/speak",
				actor_kind: "entity",
				display_name: "Speak",
				description:
					"Actor performs a deterministic speech act that inscribes a srd/speech trace, carrying " +
					"its own dispatched text, for co-located bodies to perceive.",
				tags: ["srd.action"],
			},
		},
		// sk-0m4.4: Speak Aloud is a performance that works EVERYWHERE. The
		// synthetic `capability:<speak>` niche used to fall back to the place
		// default (no niche_definitions row), so r_manipulate demanded a
		// spatial_niche_attachment at the acting node. `provider: "actor"`
		// makes the speaker's own Speak capability carry the verb, same as
		// Dodge / Rest / Drop Prone — no attachment, no per-room opt-in.
		{
			toolName: "spellkave_write_rows",
			label: "niche:speak",
			params: {
				bundle: BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: `capability:${SPEAK_CAPABILITY_ID}`,
						bundle_id: BUNDLE_ID,
						display_name: "Speak (actor-carried)",
						description:
							"actor-carried-verbs (sk-0m4.4): Speak Aloud is a performance the acting " +
							"creature's own Speak capability carries everywhere — no " +
							"spatial_niche_attachment, no per-room opt-in. Place-level speech " +
							"prohibitions are a later separate mechanism, not this row.",
						predicate_source: "",
						provider: "actor",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "vocal-communication-identity-grant",
			params: {
				bundle: BUNDLE_ID,
				kind: "tag_capability_grant",
				rows: buildVocalCommunicationCapabilityGrantRows(),
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:speak-aloud",
			params: {
				bundle: BUNDLE_ID,
				id: "speak-aloud",
				required_capability: SPEAK_CAPABILITY_ID,
				// ADR-0137 (amends ADR-0033 §D-2): speak-aloud is a genuine
				// communicate affordance with no addressee, not a self-only
				// manipulate one (sk-men.4 — the prior self_only/self_eligible
				// shape materialised speak-aloud as `manipulation.action_id=
				// srd/speak-aloud` targeting the speaker, which the PLAYER tool's
				// utterance-folding never reached, since that only runs on the
				// communicate branch). The `capability:<speak>` niche stays
				// `provider: "actor"` (sk-0m4.4, unchanged) — it is exactly this
				// actor-provided-ness (`niche_is_actor_provided`) that the
				// materialiser now uses to admit the place sentinel INSTEAD of
				// any entity target: `communicationSpeechActUpsertCall` below is
				// what makes this row surface under the `communication.`
				// namespace at all.
				niche_id: `capability:${SPEAK_CAPABILITY_ID}`,
				display_name: "Speak Aloud",
				description:
					"Speak aloud with no specific addressee — inscribes a srd/speech trace at the " +
					"speaker's own current place (ActorSpatialRef); free overhearing by anyone co-located " +
					"falls out from the trace's Local visibility, no separate broadcast mechanism needed.",
				// A place-targeted verb is not self-scoped (ADR-0137): neither flag
				// applies here, the target is the place sentinel, never the actor.
				self_eligible: false,
				self_only: false,
				cost_time_ms: 100,
				consequence: {
					description: "Inscribe a srd/speech trace at the speaker's own current place.",
					// No addressee: a shout with nobody in particular in mind. The
					// payload's `addressee` key is optional for exactly this chain.
					frame_writes: [speechInscribeFrameWrite(false, "ActorSpatialRef")],
				},
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:speak-to-room",
			params: {
				bundle: BUNDLE_ID,
				id: "speak-to-room",
				required_capability: SPEAK_CAPABILITY_ID,
				// Reuses communication.ts's ALREADY-broad "any creature can be
				// addressed" niche rather than minting an identical duplicate
				// predicate (CLAUDE.md design maxim: never mint predicate variants
				// for situations world state can express) — speak-to-room's
				// addressee-eligibility question is byte-identical to baseline
				// communicate/assert's.
				niche_id: BASELINE_COMMUNICATE_NICHE_ID,
				display_name: "Speak Aloud to Room",
				description:
					"Speak toward an addressee loud enough for the whole room to hear: fans a srd/speech " +
					"trace out to every actor inside a hall-scale metric sphere around the SPEAKER " +
					`(ForEachActorInRadius, core/area/sphere radius_m ${SPEAK_TO_ROOM_RADIUS_M} — ` +
					"BL-33's topological node_ball radius > 0 stays open; this bypasses it). Each " +
					"per-hearer Inscribe rebinds ActorSpatialRef to that hearer's OWN node " +
					"(for_each_actor_in_radius.rs's per_actor_bindings).",
				self_eligible: false,
				self_only: false,
				cost_time_ms: 100,
				// None of this consequence's frame_writes ever write to "TargetActor"
				// (the ForEachActorInRadius body only ever writes the fan-out's OWN
				// rebound "Actor") — the server's conservative steering classifier
				// (steering_claim.rs's classify_frame_write_target_steering) defaults
				// an entity-directed action with no such write to REQUIRING a target
				// claim; this flag is the documented override (dm/aldwin.ts's own
				// NON_STEERING doc comment, same reasoning verbatim).
				non_steering: true,
				consequence: {
					description: `Fan srd/speech out to every actor inside a ${SPEAK_TO_ROOM_RADIUS_M} m hall-scale sphere.`,
					frame_writes: [
						{
							ForEachActorInRadius: {
								center_ref: "ActorSpatialRef",
								// Mandatory field with no serde default (live-verified: omitting
								// it fails the whole dispatch with `write_failure: normalized
								// frame write row ... missing field predicate_source`) — empty =
								// no per-actor filter, the same shape phandelver's own
								// speak-to-room fan-out authors (speak-to-room.toml).
								predicate_source: "",
								shape_id: "core/area/sphere",
								shape_params_json: `{"radius_m": ${SPEAK_TO_ROOM_RADIUS_M}}`,
								// The fan-out rebinds `Actor` per hearer but carries the
								// parent context through (`per_actor_bindings`'s
								// `..parent.clone()`), so the dispatch's own addressee is
								// still in hand inside the body.
								body: [speechInscribeFrameWrite(true, "ActorSpatialRef")],
							},
						},
					],
				},
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:speak-to",
			params: {
				bundle: BUNDLE_ID,
				id: "speak-to",
				range_m: 18,
				required_capability: SPEAK_CAPABILITY_ID,
				// Same reuse rationale as speak-to-room above — the addressee-
				// eligibility question ("who can be spoken to") is identical.
				// Dead exclusion lives HERE, not on the shared niche: a corpse
				// remains a creature (Claim Victory still needs that) and
				// Speak with Dead stays authorable against it. Niche predicates
				// cannot see statuses; the affordance predicate can.
				niche_id: BASELINE_COMMUNICATE_NICHE_ID,
				predicate_source: `target.status('${DEAD_CONDITION_ID}') == false`,
				display_name: "Speak To",
				description:
					"Speak directly to an addressee: inscribes a srd/speech trace at the ADDRESSEE's " +
					"current place (TargetSpatialRef — the place, never TargetEntityRef) and names the " +
					"addressee INSIDE the payload (carry_addressee merges the dispatch target's entity id " +
					"under an 'addressee' key). Admission is the ordinary co-location rule at that place: " +
					"the addressee hears it, bystanders at the addressee's node overhear it, and nobody at " +
					"the speaker's node does unless they share it. No recipient column, ADR-0095's " +
					"Alternative A rejection stands. A dead creature is not offered (sk-0m4.4 / run 6 " +
					"slime corpse).",
				self_eligible: false,
				self_only: false,
				cost_time_ms: 100,
				// Same reasoning as speak-to-room's own NON_STEERING comment above:
				// this consequence never writes "TargetActor" (Inscribe is not a
				// ModifyResource), so the conservative steering classifier would
				// otherwise require a target claim on the addressee.
				non_steering: true,
				consequence: {
					description:
						"Inscribe a srd/speech trace at the addressee's place, carrying the addressee in " +
						"the payload.",
					frame_writes: [speechInscribeFrameWrite(true, "TargetSpatialRef")],
				},
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: "capability:communicate-telepathy",
			params: {
				bundle: BUNDLE_ID,
				id: "action/communicate/telepathy",
				actor_kind: "entity",
				display_name: "Telepathy",
				description:
					"Actor addresses a creature within an authored metric range without sharing a node " +
					"(sk-0m4.33). A grant extent on this capability additionally admits the extent's " +
					"members across place graphs (sk-0m4.34); range alone stays same-graph. Separate " +
					"from Speak — vocal identity does not grant this. Inherits ADR-0070 wall " +
					"occlusion via the shared validate_reachability path; a magical wall-bypass is " +
					"out of scope (BL-35).",
				tags: ["srd.action"],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:communicate-telepathy",
			params: {
				bundle: BUNDLE_ID,
				id: "communicate/telepathy",
				required_capability: TELEPATHY_CAPABILITY_ID,
				niche_id: BASELINE_COMMUNICATE_NICHE_ID,
				predicate_source: `target.status('${DEAD_CONDITION_ID}') == false`,
				display_name: "Telepathy",
				description:
					"Address a creature within range without speaking aloud: inscribes a srd/speech " +
					"trace at the ADDRESSEE's current place (TargetSpatialRef) and names them in the " +
					`payload. range_m ${TELEPATHY_RANGE_M} covers an inn-scale graph; cross-graph ` +
					"addressability is a grant extent (sk-0m4.34), not a bigger range. A dead " +
					"creature is not offered.",
				self_eligible: false,
				self_only: false,
				range_m: TELEPATHY_RANGE_M,
				cost_time_ms: 100,
				non_steering: true,
				consequence: {
					description:
						"Inscribe a srd/speech trace at the addressee's place, carrying the addressee in " +
						"the payload.",
					frame_writes: [speechInscribeFrameWrite(true, "TargetSpatialRef")],
				},
			},
		},
		// The communication_speech_act_id two-call idiom (communication.ts) is
		// what marks EVERY one of these four rows `communication.*` instead of
		// `manipulation.*` in the materialiser's projected descriptor
		// (candidates.rs's `resolve_typed_descriptor`). Speak Aloud's niche is
		// actor-provided (no addressee) — ADR-0137 admits it exactly the place
		// sentinel. The other three's niche is entity-provided
		// (`BASELINE_COMMUNICATE_NICHE_ID`) — they keep entity-target candidate
		// selection, unchanged (ADR-0033 §D-2).
		communicationSpeechActUpsertCall({
			actionId: SPEAK_ALOUD_ACTION_ID,
			displayName: "Speak Aloud",
			label: "communication-speech-act:speak-aloud",
		}),
		communicationSpeechActUpsertCall({
			actionId: SPEAK_TO_ROOM_ACTION_ID,
			displayName: "Speak Aloud to Room",
			label: "communication-speech-act:speak-to-room",
		}),
		communicationSpeechActUpsertCall({
			actionId: SPEAK_TO_ACTION_ID,
			displayName: "Speak To",
			label: "communication-speech-act:speak-to",
		}),
		communicationSpeechActUpsertCall({
			actionId: TELEPATHY_ACTION_ID,
			displayName: "Telepathy",
			label: "communication-speech-act:telepathy",
		}),
	];

	const body = await driveUnitScene(BUNDLE_ID, calls);

	const units: ChapterUnitSummary[] = [
		{ kind: "trace_kind_definitions", id: SPEECH_TRACE_KIND_ID, sourcePk: "" },
		{
			kind: "niche_definitions",
			id: `capability:${SPEAK_CAPABILITY_ID}`,
			sourcePk: "",
		},
		{ kind: "capability_definitions", id: SPEAK_CAPABILITY_ID, sourcePk: "" },
		{
			kind: "tag_capability_grant",
			id: `srd.communication.vocal:${SPEAK_CAPABILITY_ID}`,
			sourcePk: "",
		},
		{ kind: "action_definitions", id: SPEAK_ALOUD_ACTION_ID, sourcePk: "" },
		{ kind: "outcome_templates", id: SPEAK_ALOUD_OUTCOME_ID, sourcePk: "" },
		{ kind: "affordance_templates", id: SPEAK_ALOUD_AFFORDANCE_ID, sourcePk: "" },
		{ kind: "action_definitions", id: SPEAK_TO_ROOM_ACTION_ID, sourcePk: "" },
		{ kind: "outcome_templates", id: SPEAK_TO_ROOM_OUTCOME_ID, sourcePk: "" },
		{ kind: "affordance_templates", id: SPEAK_TO_ROOM_AFFORDANCE_ID, sourcePk: "" },
		{ kind: "action_definitions", id: SPEAK_TO_ACTION_ID, sourcePk: "" },
		{ kind: "outcome_templates", id: SPEAK_TO_OUTCOME_ID, sourcePk: "" },
		{ kind: "affordance_templates", id: SPEAK_TO_AFFORDANCE_ID, sourcePk: "" },
		{ kind: "capability_definitions", id: TELEPATHY_CAPABILITY_ID, sourcePk: "" },
		{ kind: "action_definitions", id: TELEPATHY_ACTION_ID, sourcePk: "" },
		{ kind: "outcome_templates", id: TELEPATHY_OUTCOME_ID, sourcePk: "" },
		{ kind: "affordance_templates", id: TELEPATHY_AFFORDANCE_ID, sourcePk: "" },
	];

	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/speech.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# srd/speech: a generic speech-trace mechanic (substrate-capability slice,",
		"# no SRD rule citation — see this fragment's own module header). The anchor",
		"# says WHERE, the payload says TO WHOM (bead sk-n16): speak-aloud and",
		"# speak-to-room inscribe at ActorSpatialRef; directed speak-to / telepathy",
		"# inscribe at TargetSpatialRef (the addressee's place, never their entity).",
		"# Ships srd/speak-aloud (place-targeted, no addressee), srd/speak-to-room",
		"# (ForEachActorInRadius metric sphere, hall-scale), srd/speak-to, and",
		"# srd/communicate/telepathy (ranged, granted to Aldwin). Pattern",
		"# Actor eligibility derives only from srd.communication.vocal;",
		"# srd.creature remains the target niche and language tags remain competence.",
		"# sk-0m4.4: speak-aloud is actor-carried (capability:<speak> provider=actor);",
		"# speak-to / speak-to-room reuse the entity-provided communicable niche.",
		"# Speak To additionally refuses a dead addressee at offer time.",
		"# precedent only, never a dependency: world-fixtures/phandelver/base/",
		"# speech-traces.toml + speak-to-room.toml (self-sufficiency invariant —",
		"# this package never references phandelver/* ids).",
		"",
		"",
	].join("\n");
	return { toml: header + body, units };
}
