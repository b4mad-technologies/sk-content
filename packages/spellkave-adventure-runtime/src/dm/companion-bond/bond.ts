/**
 * Companion stone and bond authoring. Stone possession is checked at fresh
 * command admission; factual syntax disclosure does not evaluate the predicate.
 * The command capability carries a Party extent over the
 * companion's authored bond tag. Membership alone does not activate the bond.
 * Kavemouth applies an authored condition through its fixed record-bond act,
 * preserving prebond fog and Hesper's identity. Hero and companion markers
 * still gate commands. The runtime watch performs acts and resumes by receipt.
 * Legacy grant/latch renderers remain build-time test-scene composition
 * helpers. Kavemouth activates through author/dm-acts.ts.
 */

import { DEFINE_ACTION_VERB_TOOL } from "@spellkave/tool-authoring";
import { CREATURE_NICHE_TAG, ITEM_GEAR_TAG } from "../../srd-ids.ts";
import { type HostActConfig, personaSlug } from "../host-act/index.ts";
import type { VerbCall } from "../lib/index.ts";

/** Everything the story supplies to the companion-bond authoring. All required. */
export interface CompanionBondConfig extends HostActConfig {
	/** Manifest entity key of the companion (carries the bond tag + bonded marker). */
	readonly companionEntityKey: string;
	/** The companion's name in authored copy. */
	readonly companionName: string;
	/** Manifest entity key of the hero candidate (receives the stone markers and the B grant). */
	readonly heroEntityKey: string;
	/** The bond token's story noun, lowercase, e.g. "telepathy stone". */
	readonly stoneName: string;
	/** The DM's ledger noun, e.g. "hearth-ledger". */
	readonly ledgerName: string;
	/** Bundle-local entity-type id of the stone, e.g. `adventure/item/telepathy_stone`. */
	readonly stoneEntityTypeLocalId: string;
	/** Pure-flavour copy: the item description and the gift action description. */
	readonly copy: {
		readonly stoneItemDescription: string;
		readonly giftActionDescription: string;
	};
}

/** The persisted ids a bond config derives. Mirrors the original constants. */
export interface CompanionBondIds {
	readonly stoneDefId: string;
	readonly stonePossessionPredicate: string;
	readonly commandBondCapabilityId: string;
	readonly stoneGiverCapabilityId: string;
	readonly recordBondCapabilityId: string;
	readonly stoneCarriedResource: string;
	readonly bondRecordedResource: string;
	/** COMPANION-side marker: the same latch, on the companion's own body
	 * (sk-jay0.1.23.12). A body always perceives its own state, so this row
	 * answers "am I under someone's command?" from anywhere, after any
	 * restart. The hero condition controls reach; this marker controls ingress. */
	readonly companionBondedResource: string;
	readonly giftStoneActionId: string;
	/** The membership tag B's party extent resolves (sk-ntz.7: extent_ref IS the
	 * tag). Bond-private on purpose — `srd.party.heroes` is party membership AND
	 * the hero's party-sight extent. */
	readonly companionBondTag: string;
}

export function companionBondIds(
	cfg: Pick<CompanionBondConfig, "bundle" | "stoneEntityTypeLocalId">,
): CompanionBondIds {
	const stoneDefId = `${cfg.bundle}/${cfg.stoneEntityTypeLocalId}`;
	return {
		stoneDefId,
		stonePossessionPredicate: `actor.has_item('${stoneDefId}')`,
		commandBondCapabilityId: `${cfg.bundle}/companion/command-bond`,
		stoneGiverCapabilityId: `${cfg.bundle}/companion/stone-giver`,
		recordBondCapabilityId: `${cfg.bundle}/dm/record-companion-bond`,
		stoneCarriedResource: `${cfg.bundle}/companion/stone-carried`,
		bondRecordedResource: `${cfg.bundle}/companion/bond-recorded`,
		companionBondedResource: `${cfg.bundle}/companion/bonded`,
		giftStoneActionId: `${cfg.bundle}/companion/gift-stone`,
		companionBondTag: `${cfg.bundle}.companion.bond`,
	};
}

/** A typed `entity:<id>` ref; an already prefixed ref passes through. */
function entityRef(idOrRef: string): string {
	return idOrRef.startsWith("entity:") ? idOrRef : `entity:${idOrRef}`;
}

function capitalize(s: string): string {
	return s.length === 0 ? s : `${s[0]?.toUpperCase()}${s.slice(1)}`;
}

/** Plain capability-grant row to a manifest entity (no extent). */
function plainGrantRows(
	cfg: HostActConfig,
	label: string,
	actorKey: string,
	capabilityId: string,
): VerbCall {
	return {
		toolName: "spellkave_write_rows",
		label,
		params: {
			bundle: cfg.bundle,
			kind: "actor_capabilities",
			rows: [
				{
					actor_entity_key: actorKey,
					bundle_id: cfg.bundle,
					capability_id: capabilityId,
					source: cfg.bundle,
					source_args_hash: "",
					elevation_class: "",
					extent_kind_ref: "",
					extent_ref: "",
				},
			],
		},
	};
}

/** Seed-time definitions: capabilities, markers, the stone item, grants. */
export function companionBondDefinitions(cfg: CompanionBondConfig): VerbCall[] {
	const ids = companionBondIds(cfg);
	const bundle = cfg.bundle;
	return [
		{
			toolName: "spellkave_define_capability",
			label: "command-bond-capability",
			params: {
				bundle,
				id: "companion/command-bond",
				actor_kind: "entity",
				display_name: "Bonded companion reach",
				description:
					`The reach half of the companion command authority — granted only by ${cfg.personaName}'s ` +
					`authored bond activation, with a party extent over ${ids.companionBondTag}. Offer gating ` +
					"and cross-graph addressee resolution read this grant's extent. It is the " +
					"single capability id on both the action and the affordance of every command " +
					"verb; stone possession is a separate affordance predicate, never this grant.",
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: "stone-giver-capability",
			params: {
				bundle,
				id: "companion/stone-giver",
				actor_kind: "entity",
				display_name: `Gift the ${cfg.stoneName}`,
				description: `${cfg.companionName}'s may-do for handing the ${cfg.stoneName} to the hero at her join.`,
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: "record-bond-capability",
			params: {
				bundle,
				id: "dm/record-companion-bond",
				actor_kind: "entity",
				display_name: "DM: record companion bond",
				description:
					`${cfg.personaName}'s may-do for the bond-latch write (the ${cfg.ledgerName} entry that a ` +
					`${cfg.stoneName} has been recorded). May-do, self-only dispatch.`,
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: "stone-carried-marker",
			params: {
				bundle,
				id: "companion/stone-carried",
				display_name: `${capitalize(cfg.stoneName)} gifted`,
				description:
					`0 = no stone gifted yet, 1 = ${cfg.companionName}'s gift landed in the hero's inventory. ` +
					`The gift's own consequence writes it; ${cfg.personaName}'s bond watch reads it.`,
				min_value: 0,
				max_value: 1,
				initial_value: 0,
				recovery_rule: "persistent",
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: "bond-recorded-marker",
			params: {
				bundle,
				id: "companion/bond-recorded",
				display_name: "Companion bond recorded",
				description:
					`0 = bond not yet recorded, 1 = ${cfg.personaName} applied the command-bond delta and ` +
					"fired the latch. Durable restore signal for the bond watch.",
				min_value: 0,
				max_value: 1,
				initial_value: 0,
				recovery_rule: "persistent",
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: "companion-bonded-marker",
			params: {
				bundle,
				id: "companion/bonded",
				display_name: "Companion bonded",
				description:
					"0 = not yet bonded, 1 = the bond latch fired for this companion. Lives on " +
					"the COMPANION's own body, so the seat's policy switch answers it from " +
					"anywhere and after any restart (own state is always perceivable).",
				min_value: 0,
				max_value: 1,
				initial_value: 0,
				recovery_rule: "persistent",
			},
		},
		{
			toolName: "spellkave_define_entity_type",
			label: `${personaSlug(cfg.stoneName)}-item`,
			params: {
				bundle,
				id: cfg.stoneEntityTypeLocalId,
				display_name: capitalize(cfg.stoneName),
				description: cfg.copy.stoneItemDescription,
				stackable: false,
				// srd.item.gear puts the definition in the compendium's items chapter
				// (same starter-kit rule the story's docs authoring applies).
				tags: [ITEM_GEAR_TAG],
				// No capability grant and no slot: possession is read as a fact by
				// the stone possession predicate on each command affordance, and the
				// stone is carried rather than worn (Key A retired, sk-vjh.7).
			},
		},
		plainGrantRows(
			cfg,
			`stone-giver-grant-to-${personaSlug(cfg.companionName)}`,
			cfg.companionEntityKey,
			ids.stoneGiverCapabilityId,
		),
		plainGrantRows(
			cfg,
			`record-bond-grant-to-${personaSlug(cfg.personaName)}`,
			cfg.dmEntityKey,
			ids.recordBondCapabilityId,
		),
	];
}

/**
 * The gift action: the companion places the stone in the hero's inventory and
 * writes the stone-carried marker. Target-gated to the (only) body carrying
 * the seeded marker; `non_steering` because a gift into the TARGET's
 * inventory is cooperative — it must never acquire a steering claim on the
 * hero (contract §6.5).
 */
export function companionBondActions(
	cfg: CompanionBondConfig,
	options: { seedHeroMarkers?: boolean } = {},
): VerbCall[] {
	const ids = companionBondIds(cfg);
	const bundle = cfg.bundle;
	return [
		{
			toolName: DEFINE_ACTION_VERB_TOOL,
			label: "action:companion/gift-stone",
			params: {
				bundle,
				id: "companion/gift-stone",
				required_capability: ids.stoneGiverCapabilityId,
				niche_id: CREATURE_NICHE_TAG,
				display_name: `Gift the ${cfg.stoneName}`,
				description: cfg.copy.giftActionDescription,
				predicate_source: `target.stat('${ids.stoneCarriedResource}') == 0`,
				non_steering: true,
				cost_time_ms: 0,
				consequence: {
					description:
						"Place the stone in the hero's inventory and mark it carried (gift " +
						"exactly-once: the marker flips the target predicate off).",
					frame_writes: [
						{
							InsertItem: {
								item_def_id: ids.stoneDefId,
								count: 1,
								destination: { ActorInventory: { actor_ref: "TargetActor" } },
								initial_item_state: [],
							},
						},
						{
							ModifyResource: {
								actor: "TargetActor",
								resource: ids.stoneCarriedResource,
								delta_source: "1",
							},
						},
					],
				},
			},
		},
		// Marker seeds on the hero candidate — ONLY the candidate carries the
		// states, which is what makes the gift's target predicate exclude every
		// other co-located body.
		//
		// DO NOT move this seed into the definitions phase: the creation
		// candidate's own `spellkave_place_actor` clear-and-reseeds the
		// candidate's object_state rows from its resources param, wiping any
		// earlier marker write (bisected live: markers appeared at call ~35,
		// wiped at call 165). This actions phase runs AFTER the candidate's
		// placement, so the seed survives.
		// The companion's bond membership tag is SEED-time (this actions phase),
		// not bond-time: entity_tag validation resolves entity_key against
		// entities authored in the manifest SO FAR — a runtime delta carries no
		// entities at all (MF-VAL-242), and even here the write must come AFTER
		// the companion NPC was placed. The tag only feeds extent ADDRESSABILITY
		// (who a bonded holder may reach); it grants the hero nothing, so seeding
		// it early cannot weaken the unbonded-sender negative — B on the sender
		// gates. It is the bond's OWN tag, not srd.party.heroes (sk-jay0.1.23.35.1).
		{
			toolName: "spellkave_write_rows",
			label: `${personaSlug(cfg.companionName)}-bond-tag`,
			params: {
				bundle,
				kind: "entity_tag",
				rows: [
					{
						bundle_id: bundle,
						entity_key: cfg.companionEntityKey,
						tag: ids.companionBondTag,
					},
				],
			},
		},
		...(options.seedHeroMarkers === false
			? []
			: [
					{
						toolName: "spellkave_write_rows",
						label: "stone-markers-on-hero-candidate",
						params: {
							bundle,
							kind: "object_state",
							rows: [
								{
									bundle_id: bundle,
									entity_key: cfg.heroEntityKey,
									state_id: ids.stoneCarriedResource,
									value_int: 0,
									source_template_id: "manifest",
								},
								{
									bundle_id: bundle,
									entity_key: cfg.heroEntityKey,
									state_id: ids.bondRecordedResource,
									value_int: 0,
									source_template_id: "manifest",
								},
							],
						},
					},
				]),
		// The companion's own bonded marker, seeded to 0 beside her bond tag
		// above. Seed-time by the same reasoning the tag is.
		{
			toolName: "spellkave_write_rows",
			label: `bonded-marker-on-${personaSlug(cfg.companionName)}`,
			params: {
				bundle,
				kind: "object_state",
				rows: [
					{
						bundle_id: bundle,
						entity_key: cfg.companionEntityKey,
						state_id: ids.companionBondedResource,
						value_int: 0,
						source_template_id: "manifest",
					},
				],
			},
		},
	];
}

/**
 * Legacy build-time composition of a stored reach grant: the hero's
 * B grant with a party extent over the bond tag (the companion's matching tag
 * is seed-time, see {@link companionBondActions}).
 * Idempotent by digest (MF-APPLY-012) and by ADR-0085 D-1 upsert.
 */
export function renderCompanionBondGrant(cfg: CompanionBondConfig): VerbCall[] {
	const ids = companionBondIds(cfg);
	return [
		cfg.bundleHeader(),
		{
			toolName: "spellkave_write_rows",
			label: "companion-bond-grant",
			params: {
				bundle: cfg.bundle,
				kind: "actor_capabilities",
				rows: [
					{
						actor_entity_key: cfg.heroEntityKey,
						bundle_id: cfg.bundle,
						capability_id: ids.commandBondCapabilityId,
						extent_kind_ref: "party",
						extent_ref: ids.companionBondTag,
						source: cfg.bundle,
						source_args_hash: "",
						elevation_class: "",
					},
				],
			},
		},
	];
}

/**
 * The bond LATCH — kill-xp's computed-literal shape: the DM targets itself
 * (self-only, same-node, range 0) and writes TWO markers through literal
 * `entity:<id>` refs: the hero's `bond-recorded` (its own restore signal) and
 * the companion's own `bonded` (the one HER seat can perceive from anywhere).
 * `actionLocalId` must be stable per hero so a re-render after a crash
 * re-selects the same action id (the write itself is the idempotent marker
 * flip 0 -> 1).
 */
export function renderCompanionBondLatch(
	cfg: CompanionBondConfig,
	args: {
		heroEntityId: string;
		/** The companion whose own body carries the bonded marker. */
		companionEntityId: string;
		actionLocalId: string;
	},
): VerbCall[] {
	const ids = companionBondIds(cfg);
	const heroRef = entityRef(args.heroEntityId);
	const companionRef = entityRef(args.companionEntityId);
	return [
		cfg.bundleHeader(),
		{
			toolName: DEFINE_ACTION_VERB_TOOL,
			label: `action:${args.actionLocalId}`,
			params: {
				bundle: cfg.bundle,
				id: args.actionLocalId,
				required_capability: ids.recordBondCapabilityId,
				niche_id: CREATURE_NICHE_TAG,
				display_name: "Record companion bond",
				description:
					`Write the ${cfg.ledgerName} entry: the ${cfg.stoneName} bond for ${heroRef} ` +
					"is recorded (bond-recorded 0 -> 1, computed-literal latch).",
				self_eligible: true,
				self_only: true,
				cost_time_ms: 0,
				consequence: {
					description:
						"Flip the hero's bond-recorded marker to 1 — the durable restore signal " +
						`for ${cfg.personaName}'s bond watch — and the companion's own bonded marker, which ` +
						"is the signal her seat can perceive from anywhere.",
					frame_writes: [
						{
							ModifyResource: {
								actor: heroRef,
								resource: ids.bondRecordedResource,
								delta_source: `1 - target.stat('${ids.bondRecordedResource}')`,
							},
						},
						// Same act, same literal-ref idiom, the companion's own body.
						// MF-VAL-242 bars a manifest ENTITY_KEY in a runtime delta; a
						// literal `entity:<id>` ref in a consequence is not barred.
						{
							ModifyResource: {
								actor: companionRef,
								resource: ids.companionBondedResource,
								delta_source: `1 - target.stat('${ids.companionBondedResource}')`,
							},
						},
					],
				},
			},
		},
	];
}
