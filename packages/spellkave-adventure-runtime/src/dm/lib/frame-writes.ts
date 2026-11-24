/**
 * DM Runtime Library core (ADR-0096 "Runtime-Rendered DM Content from a
 * Typed Component Library", S2 — `ledger/designs/dm-runtime-library-arc.md`)
 * — frame-write literal constructors.
 *
 * D-1 late-bound literals: every consequence delta a DM builder renders is a
 * PLAIN LITERAL the CALLER already computed in TypeScript (a level-1
 * Fighter's HP of `10 + Con modifier`, a point-buy cost, a set-to-exact-
 * value delta) — never `macro(...)` inside a consequence delta (finding
 * #81, `ledger/archive/findings-details.md`; ADR-0096 G-1 records this as
 * resolved-by-construction for this arc). These constructors produce the
 * existing `FrameWriteOp` shapes used by this package's ordinary dialogue
 * consequences:
 *
 *  - `ModifyResource` — a resource delta, actor- or target-carried
 *    (`aldwin.ts`'s `srd/level +1`, HP-growth, and marker-latch writes).
 *  - `Inscribe` — a `srd/speech` trace anchored to the target entity, the
 *    SAME shape `src/chapters/playing-the-game/fragments/speech.ts`'s
 *    `srd/speak-to` and `aldwin.ts`'s `ask-about-advancement` both use, so a
 *    dialogue action stays honestly AUDIBLE (an NPC seat perceives it as a
 *    `speech_heard` WorldEvent) rather than a silent world write.
 *  - `RemoveCondition` — withdraw a body's phase condition in the same
 *    successful frame as its decline or apply writes (ADR-0066 D-1–D-3).
 *
 * `setToExactValueDeltaSource` generalizes the "set to an exact value" idiom
 * `aldwin.ts` documents at its own `setToExactValueDeltaSource` (S1's
 * `srd/xp_value` zero-out idiom; the sister's `death-saves.toml`
 * `d20 - actor.stat(<same>)` pattern): a delta that collapses whatever the
 * resource currently holds to exactly `targetValue`, regardless of its
 * prior value — the mechanism a REVISABLE draft (re-choosing overwrites
 * instead of accumulating) needs.
 */

/** `frame_writes[].ModifyResource.actor` — self or the communicate-target's
 * own entity (the ONLY two binding names the server's steering classifier
 * (`steering_claim.rs`) and consequence evaluator recognize for this shape). */
export type FrameWriteActorRef = "Actor" | "TargetActor";

export interface ModifyResourceFrameWrite {
	ModifyResource: {
		actor: FrameWriteActorRef;
		resource: string;
		delta_source: string;
	};
}

export interface InscribeFrameWrite {
	Inscribe: {
		kind: string;
		location_kind: string;
		location_ref: string;
		payload_json: string;
		carry_dispatch_text: boolean;
		/** Merge the dispatch target's entity id into the payload under an
		 * `addressee` key (bead sk-n16 — the anchor says WHERE, the payload
		 * says TO WHOM). Loud failure if the dispatch has no entity target. */
		carry_addressee: boolean;
		carry_occurrence?: boolean;
	};
}

/** The closed set of `FrameWriteOp` shapes this library renders. Growing
 * this union is a library-API change under ADR-0096 D-6 (the library API is
 * the narrow waist for a future LLM falsifier) — never a silent addition. */
export type FrameWrite = ModifyResourceFrameWrite | InscribeFrameWrite | RemoveConditionFrameWrite;

/** The existing entity-targeted, any-source withdrawal used by DM phases. */
export interface RemoveConditionFrameWrite {
	RemoveCondition: {
		target_kind: "entity";
		target_ref: FrameWriteActorRef;
		condition_definition_id: string;
		source_match: "Any";
	};
}

export function removeConditionWrite(args: {
	actor: FrameWriteActorRef;
	conditionDefinitionId: string;
}): RemoveConditionFrameWrite {
	return {
		RemoveCondition: {
			target_kind: "entity",
			target_ref: args.actor,
			condition_definition_id: args.conditionDefinitionId,
			source_match: "Any",
		},
	};
}

/** A resource delta, late-bound literal `deltaSource` supplied by the caller
 * (e.g. `"1"`, a `cond(...)` DSL string composed from `src/dm/data/` tables,
 * or {@link setToExactValueDeltaSource}'s output) — never computed here. */
export function modifyResourceWrite(args: {
	actor: FrameWriteActorRef;
	resourceId: string;
	deltaSource: string;
}): ModifyResourceFrameWrite {
	return {
		ModifyResource: {
			actor: args.actor,
			resource: args.resourceId,
			delta_source: args.deltaSource,
		},
	};
}

/**
 * The "set to an exact value" idiom (`aldwin.ts`'s own
 * `setToExactValueDeltaSource`, S1's `srd/xp_value` zero-out; the sister's
 * `death-saves.toml` `d20 - actor.stat(<same>)` pattern): a delta that
 * collapses whatever `resourceId` currently holds to exactly `targetValue`
 * — the mechanism that makes re-choosing a draft OVERWRITE instead of
 * accumulating. Always reads `actor.stat(...)` (the ACTING entity's own
 * fact) — see `modifyResourceWrite`'s `actor` field for which binding the
 * accompanying `ModifyResource.actor` should carry.
 */
export function setToExactValueDeltaSource(resourceId: string, targetValue: number): string {
	return `${targetValue} - actor.stat('${resourceId}')`;
}

/**
 * Inscribe a `srd/speech` trace at the SPEAKER's own place, carrying both the
 * dispatched utterance (ADR-0021 `carry_dispatch_text`) and the addressee's
 * entity id (`carry_addressee`) — the room-audible dialogue shape, not the
 * directed `srd/speak-to` / `srd/communicate/telepathy` shape (those now
 * anchor at `TargetSpatialRef`, sk-0m4.33). `speechTraceKindId` is the
 * caller-supplied, already-defined `srd/speech` trace kind id (e.g.
 * `fragments/speech.ts`'s `SPEECH_TRACE_KIND_ID`) — this library never defines
 * the trace kind itself (SRD-tier vocabulary, ADR-0096 D-3).
 *
 * Co-located DM dialogue still hears this: the addressee is standing at the
 * speaker's node by construction and seam A admits it there. Ranged directed
 * contact is `srd/communicate/telepathy`, not this helper.
 *
 * WAS `TargetEntityRef`-ANCHORED until bead sk-n16, and that is the bug
 * sk-oj6 caught in this very file's output. Anchoring on the addressee glued
 * every dialogue line to the DM's entity, so the whole creation exchange —
 * raw `dm/creation/parsed/adopt/...` tokens included — travelled with Aldwin
 * and was handed to a hero who walked into the tavern an arc later. Anchor at
 * the place, name the addressee in the payload.
 */
export function inscribeSpeechTraceWrite(args: { speechTraceKindId: string }): InscribeFrameWrite {
	return {
		Inscribe: {
			kind: args.speechTraceKindId,
			location_kind: "binding",
			location_ref: "ActorSpatialRef",
			payload_json: "{}",
			carry_dispatch_text: true,
			carry_addressee: true,
		},
	};
}

/**
 * Optional spoken comment on a numbered dialog slot (sk-0m4.57 / sk-0m4.59).
 *
 * `srd/speech` requires payload key `text`. The kernel only merges
 * `dispatch_text` when that key is present (`inscribe_payload.rs`); a missing
 * utterance therefore leaves this authored `{"text":""}` in place and the
 * slot still succeeds. A present comment overwrites `text`.
 */
export function inscribeOptionalSpeechCommentWrite(args: {
	speechTraceKindId: string;
}): InscribeFrameWrite {
	return {
		Inscribe: {
			kind: args.speechTraceKindId,
			location_kind: "binding",
			location_ref: "ActorSpatialRef",
			payload_json: JSON.stringify({ text: "" }),
			carry_dispatch_text: true,
			carry_addressee: true,
		},
	};
}

/** Alias of {@link inscribeOptionalSpeechCommentWrite} (Mira slice name). */
export const inscribeOptionalCommentWrite = inscribeOptionalSpeechCommentWrite;

/**
 * Numbered dialog slot or creation menu handle (sk-0m4.64 / sk-0m4.65):
 * one `srd/speech` Inscribe. Spoken `text` is the optional player comment
 * (`""` when fired without utterance; `carry_dispatch_text` overwrites
 * `text` only). The acted id rides in `action_id` so it is not spoken
 * prose (`dm/dialog/choice/k`, `dm/creation/confirm`, adopt-name, …).
 */
export function inscribeDialogSlotWrite(args: {
	speechTraceKindId: string;
	actionId: string;
}): InscribeFrameWrite {
	return {
		Inscribe: {
			kind: args.speechTraceKindId,
			location_kind: "binding",
			location_ref: "ActorSpatialRef",
			payload_json: JSON.stringify({ text: "", action_id: args.actionId }),
			carry_dispatch_text: true,
			carry_addressee: true,
			carry_occurrence: true,
		},
	};
}

/**
 * Legacy second speech Inscribe: the acted `action_id` as durable
 * `payload.text`. Live dialog slots and creation menu handles use
 * {@link inscribeDialogSlotWrite} instead (sk-0m4.64 / sk-0m4.65).
 * Kept because older recorded chapters still replay that spoken-id shape
 * via the engine's text fallback. Not used on the two parse-to-propose
 * contracts (`state-scores`, `state-name`): those must keep the utterance.
 */
export function inscribeActedActionWrite(args: {
	speechTraceKindId: string;
	actionId: string;
}): InscribeFrameWrite {
	return {
		Inscribe: {
			kind: args.speechTraceKindId,
			location_kind: "binding",
			location_ref: "ActorSpatialRef",
			payload_json: JSON.stringify({ text: args.actionId }),
			carry_dispatch_text: false,
			carry_addressee: true,
		},
	};
}
