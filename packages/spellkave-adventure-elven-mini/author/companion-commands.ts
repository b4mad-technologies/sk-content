// pattern: directed-speech-anchor
// pattern: trace-perceptibility-window
// pattern: dm-applied-extent-grant
/**
 * The companion command verbs — hold, follow, cancel
 * (sk-jay0.1.23.20 · contract `ledger/designs/one-companion-command-contract.md` §3).
 *
 * WHAT THIS AUTHORS: one typed trace kind
 * (`elven_mini/adventure/trace/companion_command`) and three deterministic,
 * zero-cost action verbs. Each verb inscribes exactly ONE trace at the
 * addressee's current place, carrying the command word in the payload and the
 * addressee's entity id under `addressee` (`carry_addressee`). No new kernel
 * primitive: the shape is the srd `communicate/telepathy` shape with an
 * authored payload instead of dispatched text.
 *
 * HOW THE GATES COMPOSE (three independent tests, none substituting another):
 *  1. REACH — {@link COMMAND_BOND_CAPABILITY_ID} (Key B) sits on BOTH
 *     `action_definitions.required_capability` and
 *     `affordance_templates.capability_id` (the telepathy single-id posture;
 *     no `affordance_capability_id` override). The authored active bond
 *     condition derives this reach with a Party extent over
 *     `elven_mini.companion.bond` after bond recording. That extent broadens
 *     factual observation and target admission across place graphs; it is
 *     absent before activation. Current bond markers gate both channels.
 *  2. POSSESSION — {@link STONE_POSSESSION_PREDICATE}
 *     (`actor.has_item('<stone def>')`) on the affordance predicate: the
 *     stone must be CARRIED at fresh act admission. Factual syntax disclosure
 *     does not evaluate that predicate (ADR-0141 D-1/D-2/D-4). Possession is
 *     a predicate fact; an item-granted capability cannot replace that fact.
 *  3. RECIPIENT — the target must carry the bond tag
 *     (`elven_mini.companion.bond`) and must not be dead. Any other
 *     co-located creature fails fresh act admission.
 *
 * WHY THE TRACE IS PLACE-VISIBLE: addressing is not privacy
 * (directed-speech-anchor). The anchor says WHERE — `TargetSpatialRef`, the
 * addressee's current place, never `TargetEntityRef` (a row glued to a person
 * travels with them and hands its whole history to whoever stands next to
 * them, sk-oj6). The payload says TO WHOM. Bystanders at that place may
 * perceive the command; the addressee alone is expected to act on it. There
 * is no recipient column and no private mailbox.
 *
 * WHY `perceptible_for_ticks = 30`: it is ARRIVAL DISCOVERY only
 * (trace-perceptibility-window) — how long after inscription a body that
 * walks in may still notice the row. It is never the row's lifetime and
 * never command validity. Command freshness, dedup by `trace_id`, expiry and
 * authority revalidation are brain-side (contract §5, bead .21); an author
 * constant here could not express them and must not be read as if it did.
 *
 * RANGE: {@link COMPANION_COMMAND_RANGE_M} is an honest same-graph reach,
 * matching srd-cc's `TELEPATHY_RANGE_M`
 * (`packages/spellkave-srd-cc/src/chapters/playing-the-game/fragments/speech.ts`)
 * — an inn-scale graph diameter. Crossing a graph boundary is Key B's extent,
 * never a bigger number here.
 *
 * THE SPOKEN VARIANT (sk-jay0.1.23.35.3): coordination must also work by
 * ordinary speech when hero and companion stand together. Each verb therefore
 * carries TWO `affordance_templates` rows onto the SAME `action_definitions`
 * row — no second action, no second consequence, no second trace kind:
 *  - the stone template, gated by POSSESSION, reaching cross-graph on B's
 *    party extent;
 *  - the spoken template ({@link companionSpokenCommandActions}), gated by
 *    CO-LOCATION ({@link COMPANION_SPOKEN_COMMAND_DISTANCE_MM}) and carrying
 *    no `has_item` clause.
 * The bond (Key B) still gates commanding AT ALL, on either channel; the
 * stone now gates REMOTE reach only.
 *
 * WHY THE SPOKEN VARIANT INSCRIBES NO TEXT: same consequence, same trace
 * kind, same `{command}` + `carry_addressee` payload as the stone verbs, so
 * the SDK builder emits `trace_addressed` and the brain ingress (bead .21)
 * admits it unchanged — the ingress is channel-agnostic on purpose. The
 * "spoken" quality is authored on the AFFORDANCE only: display name plus the
 * co-location gate.
 *
 * WHY TWO TEMPLATES ARE SAFE: manipulation_context discloses both authored
 * templates as syntax. Fresh dispatch selects an admitted template from
 * current facts, including possession, distance and bond markers. Both
 * templates carry the SAME consequence and addressed trace payload.
 * companion-bond.live.test.ts pins disclosure of both channels and dispatch
 * refusal when neither channel is admitted.
 *
 * MECHANISM vs STORY: the renderers, id derivation and the ingress-config
 * builder live in `@spellkave/adventure-runtime/dm/companion-bond`
 * (`commands.ts`). This module is the elven-mini binding
 * ({@link ELVEN_MINI_COMMANDS}: Hesper's three words, their copy, the stale
 * window and the two ranges). The SAME config feeds the renderers and the
 * brain ingress (`companionIngressConfig`), so the halves cannot drift.
 */

import {
	type CompanionCommandConfig,
	companionCommandKinds,
	companionCommandTraceKindId,
	companionSpokenCommandDistanceMm,
	companionCommandActionId as genericActionId,
	companionCommandActions as genericActions,
	companionCommandDefinitions as genericDefinitions,
	companionSpokenCommandActions as genericSpokenActions,
	companionSpokenCommandTemplateId as genericSpokenTemplateId,
} from "@spellkave/adventure-runtime/dm/companion-bond";
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { ELVEN_MINI_BOND } from "./companion-stone.ts";

/** The command-kind vocabulary of the TypeScript companion brain
 * (`CompanionCommandKind` in `@spellkave/npc-brains`), kept here so this file
 * imports no host package. Elven Mini emits only hold, follow and cancel
 * (`COMPANION_COMMAND_VERBS`); the Rust NPC host admits exactly those three
 * (`CommandKind` in `crates/spellkave-npc-host/src/npc_documents.rs`). */
export type CompanionCommandKind =
	| "follow"
	| "hold"
	| "regroup"
	| "focus_target"
	| "protect_target"
	| "retreat"
	| "reserve_resource"
	| "cancel";

/** The three command words the first release ships. */
export const COMPANION_COMMAND_VERBS = ["hold", "follow", "cancel"] as const;
export type CompanionCommandVerb = (typeof COMPANION_COMMAND_VERBS)[number];

/**
 * Human-facing labels and fiction. No implementation vocabulary reaches the
 * player: "stop", not "cancel the active command".
 */
export const ELVEN_MINI_COMMANDS: CompanionCommandConfig<CompanionCommandKind> = {
	bond: ELVEN_MINI_BOND,
	// Two ticks: a command is a live instruction, not a standing order, and a
	// companion that acts on a minutes-old "hold" is acting on a world that no
	// longer exists (contract §5, bead sk-jay0.1.23.21). Distinct from the
	// trace kind's `perceptible_for_ticks = 30` (arrival DISCOVERY only).
	staleAfterTicks: 2,
	// Same-graph reach, matching srd-cc's `TELEPATHY_RANGE_M` (inn graph
	// diameter loft<->cellar ~ 38 m). Cross-graph addressability is Key B's
	// party extent, never a larger range.
	rangeM: 50,
	// Co-located spoken reach, mirroring srd-cc's `SPEAK_TO_ROOM_RADIUS_M`.
	// Mirrored, not imported: this package does not depend on srd-cc.
	spokenRangeM: 10,
	commands: [
		{
			verb: "hold",
			kind: "hold",
			displayName: "Tell Hesper to hold",
			description:
				"Through the stone you ask Hesper to stay where she is and keep watch. " +
				"Inscribes a companion_command trace at her current place naming her as addressee; " +
				"her own brain decides what to do with it.",
			spokenDisplayName: "Say to Hesper: hold",
		},
		{
			verb: "follow",
			kind: "follow",
			displayName: "Tell Hesper to follow",
			description:
				"Through the stone you ask Hesper to come with you and keep pace. " +
				"Inscribes a companion_command trace at her current place naming her as addressee; " +
				"her own brain decides what to do with it.",
			spokenDisplayName: "Say to Hesper: follow",
		},
		{
			verb: "cancel",
			kind: "cancel",
			displayName: "Tell Hesper to stop",
			description:
				"Through the stone you tell Hesper to let the last request go and act as she sees fit. " +
				"Inscribes a companion_command trace at her current place naming her as addressee; " +
				"her own brain decides what to do with it.",
			spokenDisplayName: "Say to Hesper: stop",
		},
	],
};

/** The typed command footprint every command verb inscribes. */
export const COMPANION_COMMAND_TRACE_KIND_ID = companionCommandTraceKindId(ELVEN_MINI_COMMANDS);

/** Fully-qualified action id for one command verb. */
export function companionCommandActionId(verb: CompanionCommandVerb): string {
	return genericActionId(ELVEN_MINI_COMMANDS, verb);
}

/** Ticks after inscription a command still counts as current; passed INTO the
 * brain's ingress config (the brain owns no adventure constant). */
export const COMPANION_COMMAND_STALE_AFTER_TICKS = ELVEN_MINI_COMMANDS.staleAfterTicks;

/** The closed translation from this adventure's command words to the brain's
 * command vocabulary. */
export const COMPANION_COMMAND_KINDS = companionCommandKinds(ELVEN_MINI_COMMANDS) as Record<
	CompanionCommandVerb,
	CompanionCommandKind
>;

/** Same-graph reach of the stone channel, in metres. */
export const COMPANION_COMMAND_RANGE_M = ELVEN_MINI_COMMANDS.rangeM;

/** Definitions phase: the trace kind only. */
export function companionCommandDefinitions(): VerbCall[] {
	return genericDefinitions(ELVEN_MINI_COMMANDS);
}

/** Actions phase: one stone-channel verb per command word. */
export function companionCommandActions(): VerbCall[] {
	return genericActions(ELVEN_MINI_COMMANDS);
}

/** The co-located spoken reach, in metres. */
export const COMPANION_SPOKEN_COMMAND_RANGE_M = ELVEN_MINI_COMMANDS.spokenRangeM;

/** {@link COMPANION_SPOKEN_COMMAND_RANGE_M} in the kernel's millimetre fact unit. */
export const COMPANION_SPOKEN_COMMAND_DISTANCE_MM =
	companionSpokenCommandDistanceMm(ELVEN_MINI_COMMANDS);

/** Fully-qualified affordance template id for one spoken command verb. */
export function companionSpokenCommandTemplateId(verb: CompanionCommandVerb): string {
	return genericSpokenTemplateId(ELVEN_MINI_COMMANDS, verb);
}

/**
 * Actions phase: the spoken twin of every command verb. Runs AFTER
 * `companionCommandActions()` — the action rows these outcomes execute must
 * already exist, and `spellkave_define_affordance` authors none.
 */
export function companionSpokenCommandActions(): VerbCall[] {
	return genericSpokenActions(ELVEN_MINI_COMMANDS);
}
