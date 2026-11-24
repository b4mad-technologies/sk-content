// pattern: none — proof scene fixture for monsters
// Monsters chapter — starter-arena LIVE PROOF scene (design doc §7,
// `ledger/designs/monsters-chapter-design.md`). Own staging node, own hero,
// own claim identities — never combat-arena's own scene (`playing-the-game/
// proof-scene/combat-arena.ts`), same isolation rationale that file's own
// module header gives for its own dedicated anchor.
//
// DELIBERATELY NOT wired into `src/pipeline.ts`'s `generateProofs` hook
// (unlike `playing-the-game`'s own proof scenes): `renderAll()` already
// renders every registered chapter's identity content once per call, and
// `pipeline.test.ts`'s own shared render is at its documented budget ceiling
// (see `starter-behaviors.ts`'s own sibling test coverage, and this slice's
// own operator report) — adding a SECOND proof-render pass here would only
// worsen that, for a scene this slice does not even run. Instead, the live
// test itself authors this scene INLINE at setup time via
// `driveSrdScene` + `@spellkave/test-lab`'s `applyManifestSource`
// (the SAME "self-seeding fixture setup... exempt from the tool-only rule"
// carve-out `combat-arena/npc-seat.ts`'s own module header documents for its
// own second session) — no committed `fixtures/proofs/*.toml` file is
// authored this slice.
//
// SCENE: one Hero (AC/HP only — a pure punching bag, never acts) plus one
// spawned INSTANCE EACH of the already-shipped `srd/creature/wolf` (single-
// attack proof) and `srd/creature/black-bear` (multiattack proof). Both
// creature definitions carry `srd.creature`, so the shared
// `tag_capability_grant` supplies `srd/action/attack`; the Black Bear's own
// definition grant additionally supplies its statblock-specific Multiattack.
// No instance-level universal capability seed is needed. The CREATURE is the
// one attacking the Hero, proving each starter's OWN offense, not the Hero's.
//
// PROBE sk-84i.1 (bead sk-84i): the Wolf no longer has its own bespoke
// `srd/creature/wolf/action/bite` — it now attacks through the SHARED
// `srd/attack/melee` action (`playing-the-game/fragments/attacks.ts`),
// sourcing its Bite damage from a WIELDED `srd/natural-weapon/wolf-bite`
// item (`natural-weapon-units.ts`). Concrete MANIFEST-PLACED actors (this
// scene, via `spellkave_place_actor`) CAN carry an authored item at apply
// time — `entities` + `entity_containment` rows, mirroring the sister's own
// regdar-dagger precedent (`world-fixtures/srd/base/items.toml`'s own
// `[[entity_containment]]` row, loose carriage: `slot_id = ""`,
// `direction = ""` — `resolve_wielded_item_entity`'s lowest-entity-id
// carried-item selection, `server/src/world_interaction/layer2/r_manipulate/
// selection/entity_facts.rs`). This is a TEST-ONLY setup, not a general
// answer: a RUNTIME-SPAWNED creature (the `Spawn` effect primitive,
// `server/src/world_interaction/layer2/r_apply_consequence/spawn.rs`) has NO
// authorable initial-containment/equipment path today —
// `apply_definition_seeds` only seeds capabilities/states/conditions onto a
// spawned entity, never containment. A DM-spawned Wolf (not manifest-placed
// like this proof's own instance) therefore has no Bite item for the shared
// source-backed melee action; it retains the universal Unarmed Strike instead
// of receiving invented weapon damage. Whether definitions need an initial-
// containment authoring path remains a separate content-spawning question.
import { AC_RESOURCE_ID } from "../playing-the-game/armor-class-units";
import { HP_ID } from "../playing-the-game/hp-units";
import { STRIKEABLE_NICHE_LOCAL_ID } from "../playing-the-game/weapon-attack-units";
import type { VerbCall } from "../verb-runner";
import { BUNDLE_ID } from "./creature-units";
import { WOLF_BITE_ENTITY_ID } from "./natural-weapon-units";

export const PROOF_BUNDLE_ID = "srd_monsters_proof";
export const PROOF_BUNDLE_ROW = {
	bundle_id: PROOF_BUNDLE_ID,
	display_name: "Monsters starter-arena proof scene",
	author: "spellkave-srd-cc",
	version: "0.1.0",
	depends_on: [BUNDLE_ID],
	description:
		"TEST-ONLY proof scene for the 8 starter creatures' attack behaviors (design doc §7). " +
		"Never shipped in fixtures/manifest.toml — applied inline by the live-self-seeding test.",
};

/** Underscore-joined graph id (hierarchical slash-joined ids are legal since sk-j8e.1). */
export const PROOF_GRAPH_ID = `${PROOF_BUNDLE_ID}_scene`;
export const PROOF_ANCHOR_NODE_ID = `${PROOF_GRAPH_ID}/anchor`;

const HERO_DEF_LOCAL_ID = "hero";
export const HERO_DEF_ID = `${PROOF_BUNDLE_ID}/${HERO_DEF_LOCAL_ID}`;
const HERO_SPAWN_KEY_PREFIX = "hero";
export const HERO_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${HERO_SPAWN_KEY_PREFIX}_1`;
export const HERO_AC = 15;
export const HERO_HP = 30;

const WOLF_SPAWN_KEY_PREFIX = "wolf";
export const WOLF_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${WOLF_SPAWN_KEY_PREFIX}_1`;
/** Probe sk-84i.1: the Wolf attacks through the SHARED `srd/attack/melee` action (module header) — no more `srd/creature/wolf/action/bite`. */
export const WOLF_ATTACK_ACTION_ID = "srd/attack/melee";
/** The Wolf's own wielded Bite item, authored as a concrete `entities` row (module header — the manifest-placed, NOT runtime-`Spawn`ed, workaround). */
export const WOLF_BITE_ITEM_ENTITY_KEY = `${PROOF_BUNDLE_ID}/wolf-bite-item_1`;

const BLACK_BEAR_SPAWN_KEY_PREFIX = "black-bear";
export const BLACK_BEAR_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${BLACK_BEAR_SPAWN_KEY_PREFIX}_1`;
export const BLACK_BEAR_ATTACK_ACTION_ID = "srd/creature/black-bear/action/multiattack";

export const MONSTERS_PROOF_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_define_bundle",
		label: "monsters-proof-bundle-header",
		params: PROOF_BUNDLE_ROW,
	},
	// Probe sk-84i.1: switched from a raw `spellkave_write_rows(kind:
	// "place_nodes", ...)` call to `spellkave_author_place` — the RAW call
	// never creates the OWNING `place_graph_definitions` row (only
	// `spellkave_author_place` does, `authoring-verbs.ts`'s own "2.
	// spellkave_author_place — place_graphs + place_nodes + place_edges"
	// section header; `playing-the-game/proof-scene/calls/shared.ts`'s own
	// precedent + module header: "additional nodes into an EXISTING graph go
	// through write_rows, never a repeat author_place call"), so this scene's
	// single anchor node was left pointing at a graph that never existed
	// (MF-VAL-101 "references unknown graph", pre-existing since this scene's
	// own P2b authoring — this describe block's own title, "WRITTEN, NOT RUN
	// this slice (P2c)", is why it was never caught live before this probe
	// finally ran it). Fixed here as the minimal unblock for THIS probe's own
	// live proof, not a general proof-scene audit.
	{
		toolName: "spellkave_author_place",
		label: "monsters-proof-anchor",
		params: {
			bundle: PROOF_BUNDLE_ID,
			substrate: "outdoor",
			display_name: "Monsters Starter-Arena Anchor",
			nodes: [{ id: PROOF_ANCHOR_NODE_ID, name: "Monsters Starter-Arena Anchor" }],
			edges: [],
		},
	},
	{
		toolName: "spellkave_define_entity_type",
		label: "monsters-proof-hero-def",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: HERO_DEF_LOCAL_ID,
			display_name: "Monsters Starter-Arena Hero",
			description:
				"TEST-ONLY monsters starter-arena proof hero — a pure punching bag (AC/HP only, never " +
				"acts): the WOLF and BLACK BEAR instances below are the ones attacking, proving each " +
				"starter's own offense (design doc §7).",
			initial_states: [
				{ state: AC_RESOURCE_ID, value_int: HERO_AC },
				{ state: `${BUNDLE_ID}/${HP_ID}`, value_int: HERO_HP },
			],
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "monsters-proof-hero-placement",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "player",
			entity_def: HERO_DEF_ID,
			at: PROOF_ANCHOR_NODE_ID,
			key_prefix: HERO_SPAWN_KEY_PREFIX,
			description: "TEST-ONLY spawned instance for the monsters starter-arena proof.",
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "monsters-proof-wolf-placement",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "npc",
			entity_def: `${BUNDLE_ID}/creature/wolf`,
			at: PROOF_ANCHOR_NODE_ID,
			key_prefix: WOLF_SPAWN_KEY_PREFIX,
			description: "TEST-ONLY spawned instance of the shipped srd/creature/wolf identity row.",
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "monsters-proof-black-bear-placement",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "npc",
			entity_def: `${BUNDLE_ID}/creature/black-bear`,
			at: PROOF_ANCHOR_NODE_ID,
			key_prefix: BLACK_BEAR_SPAWN_KEY_PREFIX,
			description:
				"TEST-ONLY spawned instance of the shipped srd/creature/black-bear identity row.",
		},
	},
	// Probe sk-84i.1: the Wolf's own wielded Bite item — a concrete `entities`
	// row (no `spellkave_place_item` tool exists; `entities` is a generic,
	// natural-keyed manifest row kind `spellkave_write_rows` already supports)
	// + `entity_containment`
	// (loose carriage — `slot_id`/`direction` both `""`, the regdar-dagger
	// precedent, module header). `resolve_wielded_item_entity`'s equipped-
	// else-lowest-entity-id-carried fallback then resolves this AS the Wolf's
	// wielded item for `srd/attack/melee`'s hit consequence.
	{
		toolName: "spellkave_write_rows",
		label: "monsters-proof-wolf-bite-item",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "entities",
			rows: [
				{
					entity_key: WOLF_BITE_ITEM_ENTITY_KEY,
					bundle_id: PROOF_BUNDLE_ID,
					entity_def_id: WOLF_BITE_ENTITY_ID,
					name: "Wolf Bite",
					kind: "item",
					place_node_id: "",
				},
			],
		},
	},
	{
		toolName: "spellkave_stow_item",
		label: "monsters-proof-wolf-bite-containment",
		params: {
			bundle: PROOF_BUNDLE_ID,
			actor_entity_key: WOLF_ENTITY_KEY,
			item_entity_key: WOLF_BITE_ITEM_ENTITY_KEY,
		},
	},
	// `srd/attack/melee`'s OFFER niche is `srd/niche/strikeable`
	// (`weapon-attack-units.ts`'s `STRIKEABLE_NICHE_LOCAL_ID`) — like every
	// other niche-gated action, `r_manipulate`'s selector needs a REAL
	// `spatial_niche_attachment` binding that niche to the acting node before
	// it will even reach resolution, same "no attachment row needed" trap
	// `playing-the-game/proof-scene/calls/combat-arena.ts`'s own
	// `COMBAT_ARENA_STRIKEABLE_NICHE_ATTACHMENT_CALLS` already documents and
	// fixes for its own arena anchor (live-reproduced there as
	// `precondition_failed (element=attachment_presence): no
	// spatial_niche_attachment for niche 'srd/niche/strikeable'`, the SAME
	// failure this scene hit for the Wolf's single-attack sub-test, bead
	// sk-84i / probe sk-84i.1 — the Black Bear's own bespoke multiattack
	// action gates on a different niche and was unaffected). One row, this
	// scene's own single anchor node, mirroring that precedent exactly.
	{
		toolName: "spellkave_write_rows",
		label: "monsters-proof-strikeable-niche-attachment",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "spatial_niche_attachments",
			rows: [
				{
					bundle_id: PROOF_BUNDLE_ID,
					niche_id: `${BUNDLE_ID}/${STRIKEABLE_NICHE_LOCAL_ID}`,
					place_node_id: PROOF_ANCHOR_NODE_ID,
					visibility: "Public",
					condition_bool: true,
					ecological_invariant: false,
				},
			],
		},
	},
];
