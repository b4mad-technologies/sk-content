// pattern: directed-speech-anchor
// pattern: trace-perceptibility-window
/**
 * The companion command verbs (sk-jay0.1.23.20 · contract
 * `ledger/designs/one-companion-command-contract.md` §3), generic half.
 * The story supplies the command list, brain command kinds and every
 * player-facing line through {@link CompanionCommandConfig}; ids derive from
 * the bundle, so persisted values stay identical to what a story ships.
 *
 * WHAT THIS AUTHORS: one typed trace kind
 * (`<bundle>/adventure/trace/companion_command`) and one deterministic,
 * zero-cost action verb per configured command. Each verb inscribes exactly
 * ONE trace at the addressee's current place, carrying the command word in the
 * payload and the addressee's entity id under `addressee`
 * (`carry_addressee`). No new kernel primitive: the shape is the srd
 * `communicate/telepathy` shape with an authored payload.
 *
 * HOW THE GATES COMPOSE (three independent tests, none substituting another):
 *  1. REACH — the bond capability (Key B) sits on BOTH
 *     `action_definitions.required_capability` and
 *     `affordance_templates.capability_id`. Kavemouth's authored condition
 *     supplies Party reach over the bond tag after the bond-recording act.
 *     Both channels require the sender's recorded-bond marker and
 *     the recipient's bonded marker before a command is admitted.
 *  2. POSSESSION — the stone possession predicate (`actor.has_item(...)`) on
 *     the affordance predicate, evaluated at act time. A
 *     predicate, not a capability (sk-vjh.7).
 *  3. RECIPIENT — the target must carry the bond tag, have a recorded bond,
 *     and be alive. A tag alone does not establish a completed bond.
 *
 * WHY THE TRACE IS PLACE-VISIBLE: addressing is not privacy
 * (directed-speech-anchor). The anchor says WHERE — `TargetSpatialRef`, the
 * addressee's current place, never `TargetEntityRef` (sk-oj6). The payload says
 * TO WHOM. There is no recipient column and no private mailbox.
 *
 * WHY `perceptible_for_ticks = 30`: ARRIVAL DISCOVERY only
 * (trace-perceptibility-window) — never the row's lifetime and never command
 * validity. Freshness, dedup, expiry and authority revalidation are
 * brain-side (contract §5, bead .21): `staleAfterTicks` is passed INTO the
 * brain's ingress config by {@link companionIngressConfig}.
 *
 * THE SPOKEN VARIANT (sk-jay0.1.23.35.3): each verb carries a SECOND
 * `affordance_templates` row onto the SAME action row, gated by co-location
 * instead of stone possession. No second action, consequence or trace kind;
 * the bond (Key B) still gates commanding at all on either channel.
 */

import { DEFINE_ACTION_VERB_TOOL, DEFINE_AFFORDANCE_TOOL } from "@spellkave/tool-authoring";
import { CREATURE_NICHE_TAG, DEAD_CONDITION_ID } from "../../srd-ids.ts";
import type { VerbCall } from "../lib/index.ts";
import { type CompanionBondConfig, companionBondIds } from "./bond.ts";

/** One command word: its brain kind and all player-facing copy. */
export interface CompanionCommandSpec<K extends string = string> {
	/** The authored command word, e.g. `hold`. Becomes the payload `command`. */
	readonly verb: string;
	/** The brain's command kind this word translates to at ingress. */
	readonly kind: K;
	/** Stone-channel menu label. */
	readonly displayName: string;
	/** Stone-channel description (story flavour). */
	readonly description: string;
	/** Spoken-channel menu label (no stone in the fiction). */
	readonly spokenDisplayName: string;
}

export interface CompanionCommandConfig<K extends string = string> {
	/** The bond this command set rides on (ids, bundle). */
	readonly bond: Pick<CompanionBondConfig, "bundle" | "stoneEntityTypeLocalId">;
	/** The closed, ordered command list. */
	readonly commands: readonly CompanionCommandSpec<K>[];
	/** Ticks a command stays current (contract §5, bead sk-jay0.1.23.21). Authored
	 * here and passed INTO the brain's ingress — the brain owns no adventure
	 * constant. Distinct from the trace's 30-tick arrival-discovery window. */
	readonly staleAfterTicks: number;
	/** Same-graph reach in metres of the stone channel. Cross-graph addressability
	 * is Key B's party extent, never a larger range. */
	readonly rangeM: number;
	/** Co-located spoken reach in metres (mirrors srd-cc `SPEAK_TO_ROOM_RADIUS_M`;
	 * mirrored, not imported — the runtime does not depend on srd-cc). */
	readonly spokenRangeM: number;
}

/** The typed command footprint every command verb inscribes. */
export function companionCommandTraceKindId(cfg: CompanionCommandConfig): string {
	return `${cfg.bond.bundle}/adventure/trace/companion_command`;
}

/** Fully-qualified action id for one command verb. */
export function companionCommandActionId(cfg: CompanionCommandConfig, verb: string): string {
	return `${cfg.bond.bundle}/companion/${verb}`;
}

/** Fully-qualified affordance template id for one spoken command verb. */
export function companionSpokenCommandTemplateId(
	cfg: CompanionCommandConfig,
	verb: string,
): string {
	return `${cfg.bond.bundle}/companion/say-${verb}/affordance`;
}

/** The spoken reach in the kernel's millimetre fact unit. */
export function companionSpokenCommandDistanceMm(cfg: CompanionCommandConfig): number {
	return cfg.spokenRangeM * 1000;
}

/**
 * The closed translation from the authored command words to the brain's
 * command vocabulary. A payload word outside this map is ignored by the
 * ingress with a reason, never guessed at.
 */
export function companionCommandKinds<K extends string>(
	cfg: CompanionCommandConfig<K>,
): Record<string, K> {
	return Object.fromEntries(cfg.commands.map((c) => [c.verb, c.kind]));
}

/**
 * The brain's command-ingress config, from the SAME config that feeds the
 * renderers — so the authored half and the brain half cannot drift. `self`
 * and `controller` are runtime facts of the seat, passed through untouched.
 */
export function companionIngressConfig<K extends string, S, C>(
	cfg: CompanionCommandConfig<K>,
	self: S,
	controller: C,
): {
	traceKind: string;
	commandKinds: Record<string, K>;
	staleAfterTicks: number;
	self: S;
	controller: C;
} {
	return {
		traceKind: companionCommandTraceKindId(cfg),
		commandKinds: companionCommandKinds(cfg),
		staleAfterTicks: cfg.staleAfterTicks,
		self,
		controller,
	};
}

/**
 * The recipient gate: a bonded companion who is still alive. A dead creature
 * is still a creature (Claim Victory needs that), so the exclusion lives on
 * the affordance predicate, not on the niche — niche predicates cannot see
 * statuses (the srd `speak-to` precedent).
 */
function recipientPredicate(cfg: CompanionCommandConfig): string {
	const ids = companionBondIds(cfg.bond);
	return (
		`target.has_tag('${ids.companionBondTag}') && ` +
		`actor.stat('${ids.bondRecordedResource}') == 1 && ` +
		`target.stat('${ids.companionBondedResource}') == 1 && ` +
		`target.status('${DEAD_CONDITION_ID}') == false`
	);
}

/**
 * Definitions phase: the trace kind only. It must exist before the verbs
 * below reference it, and so must Key B (`companionBondDefinitions`).
 */
export function companionCommandDefinitions(cfg: CompanionCommandConfig): VerbCall[] {
	return [
		{
			toolName: "spellkave_define_trace_kind",
			label: "trace-kind:companion-command",
			params: {
				bundle: cfg.bond.bundle,
				id: "adventure/trace/companion_command",
				// place_node ONLY: a command sits at the place it was delivered to.
				// The addressee rides in the payload (directed-speech-anchor).
				location_kinds: "place_node",
				// Arrival discovery only — never row lifetime, never command
				// validity (that is brain-side, contract §5).
				perceptible_for_ticks: 30,
				schema_json: '{"command":"string","addressee":"integer"}',
				description:
					"A typed companion command footprint, inscribed at the addressee's current " +
					"place: 'command' is the authored command word, 'addressee' the bound " +
					"companion's entity id (carry_addressee). Place-visible on purpose — " +
					"addressing is not privacy, so bystanders at that place may perceive it; the " +
					"addressee alone is expected to act on it. Perceptible to an arriving " +
					"observer for 30 ticks; that window is discovery only and says nothing about " +
					"whether the command is still valid.",
			},
		},
	];
}

/** One command verb chain: action + outcome + affordance + consequence. */
function companionCommandAction(cfg: CompanionCommandConfig, spec: CompanionCommandSpec): VerbCall {
	const ids = companionBondIds(cfg.bond);
	return {
		toolName: DEFINE_ACTION_VERB_TOOL,
		label: `action:companion/${spec.verb}`,
		params: {
			bundle: cfg.bond.bundle,
			id: `companion/${spec.verb}`,
			// Single id on BOTH the action and the affordance (telepathy posture):
			// the affordance half is what expands offer candidates and admits a
			// cross-graph addressee through the grant's party extent.
			required_capability: ids.commandBondCapabilityId,
			// Entity-provided creature niche, as the gift verb uses — no
			// spatial_niche_attachments, no per-room opt-in.
			niche_id: CREATURE_NICHE_TAG,
			display_name: spec.displayName,
			description: spec.description,
			predicate_source: `${ids.stonePossessionPredicate} && ${recipientPredicate(cfg)}`,
			range_m: cfg.rangeM,
			// Cooperative delivery to a consenting companion: no steering claim, so
			// her own brain keeps sole steering of her body (contract §6.5). The
			// consequence writes no "TargetActor" row, which the conservative
			// classifier would otherwise read as requiring a target claim.
			non_steering: true,
			cost_time_ms: 0,
			consequence: {
				description: `Inscribe a companion_command trace ('${spec.verb}') at the addressee's current place.`,
				frame_writes: [
					{
						Inscribe: {
							kind: companionCommandTraceKindId(cfg),
							location_kind: "binding",
							// The addressee's PLACE, never their entity (sk-oj6).
							location_ref: "TargetSpatialRef",
							payload_json: JSON.stringify({ command: spec.verb }),
							// Merges the dispatch target's entity id under 'addressee'.
							carry_addressee: true,
							// The command word is authored, never caller-provided speech.
							carry_dispatch_text: false,
						},
					},
				],
			},
		},
	};
}

/**
 * Actions phase: one command verb per configured command. Runs after
 * `companionBondActions()` so the companion's bond tag is already authored.
 */
export function companionCommandActions(cfg: CompanionCommandConfig): VerbCall[] {
	return cfg.commands.map((spec) => companionCommandAction(cfg, spec));
}

/**
 * The co-location gate. `core/distance_to_actor_mm` is a kernel-populated
 * spatial fact (`server/src/world_interaction/layer2/r_manipulate/selection/spatial_facts.rs`).
 * It is ABSENT across place graphs and without a metric embedding
 * (`selection/target.rs` returns `None`), so the predicate sees `UnknownField`
 * and evaluates false at offer AND at act time (ADR-0035 D-4). Cross-graph
 * spoken commands therefore fail closed by construction — no extra clause.
 */
function coLocationPredicate(cfg: CompanionCommandConfig): string {
	return `target.stat('core/distance_to_actor_mm') <= ${companionSpokenCommandDistanceMm(cfg)}`;
}

/** One spoken command verb: a second affordance onto the SAME action row. */
function companionSpokenCommandAction(
	cfg: CompanionCommandConfig,
	spec: CompanionCommandSpec,
): VerbCall {
	const ids = companionBondIds(cfg.bond);
	return {
		toolName: DEFINE_AFFORDANCE_TOOL,
		label: `affordance:companion/say-${spec.verb}`,
		params: {
			bundle: cfg.bond.bundle,
			id: `companion/say-${spec.verb}`,
			niche_id: CREATURE_NICHE_TAG,
			// The SAME single id as the stone template and the action row: the
			// bond gates commanding at all, on either channel.
			capability_id: ids.commandBondCapabilityId,
			// The darkness-consumer idiom: this outcome executes an ALREADY
			// authored action, so no second action id and no second consequence.
			manipulation_action_id: companionCommandActionId(cfg, spec.verb),
			display_name: spec.spokenDisplayName,
			// No `has_item` clause: speech needs no stone, only nearness.
			predicate_source: `${recipientPredicate(cfg)} && ${coLocationPredicate(cfg)}`,
			range_m: cfg.spokenRangeM,
		},
	};
}

/**
 * Actions phase: the spoken twin of every command verb. Runs AFTER
 * `companionCommandActions()` — the action rows these outcomes execute must
 * already exist, and `spellkave_define_affordance` authors none.
 */
export function companionSpokenCommandActions(cfg: CompanionCommandConfig): VerbCall[] {
	return cfg.commands.map((spec) => companionSpokenCommandAction(cfg, spec));
}
