/**
 * // pattern: proactive-level-up
 * // pattern: draft-then-confirm-wizard
 *
 * Aldwin's adventure placement, persona, authored authority and fixed wizard
 * niches. Shared dialog, creation and level-up definitions are seeded by
 * dmAldwin() in the dm bundle. The inn and both limbos own their spatial
 * niche attachments in kavemouth (ownership-foundation D-4).
 *
 * Wizard handles are authored on Aldwin; class features land through
 * receipt-ordered DM acts before the ceremony latch (ADR-0096 D-5). Speech and fighter class features are actor-carried;
 * the advancement trainer niche is entity-provided by Aldwin's role tag.
 * Aldwin instantiates the SRD Commoner; adventure role tags stay on the instance.
 */

import {
	CREATION_PHASE_RESOURCE_ID,
	CREATION_STATION_NICHE_ID,
	CREATION_STATION_TAG,
	ENROLL_CAPABILITY_ID,
} from "@spellkave/adventure-runtime/dm/creation";
import {
	DIALOG_OPEN_RESOURCE_ID,
	DIALOG_PROMPT_RESOURCE_ID,
} from "@spellkave/adventure-runtime/dm/dialog";
import {
	ACCEPT_LEVEL_UP_OFFER_ACTION_ID,
	ACCEPT_LEVEL_UP_OFFER_CAPABILITY_ID,
	ALDWIN_NICHE_ID,
	ALDWIN_TAG,
	APPLY_LEVEL_UP_ACTION_ID,
	APPLY_LEVEL_UP_CAPABILITY_ID,
	ASK_ABOUT_ADVANCEMENT_ACTION_ID,
	ASK_ABOUT_ADVANCEMENT_CAPABILITY_ID,
	DARING_ADVANCE_ACTION_ID,
	DARING_ADVANCE_CAPABILITY_ID,
	DECLINE_LEVEL_UP_OFFER_ACTION_ID,
	DECLINE_LEVEL_UP_OFFER_CAPABILITY_ID,
	LEVEL_UP_CONFIRM_ACTION_ID,
	LEVEL_UP_CONFIRM_CAPABILITY_ID,
	LEVEL_UP_DISCARD_ACTION_ID,
	LEVEL_UP_DISCARD_CAPABILITY_ID,
	LEVEL_UP_ENROLL_CAPABILITY_ID,
	OFFER_LEVEL_UP_ACTION_ID,
	OFFER_LEVEL_UP_CAPABILITY_ID,
	PENDING_HP_CHOICE_RESOURCE_ID,
	STEADY_ADVANCE_ACTION_ID,
	STEADY_ADVANCE_CAPABILITY_ID,
	TRAINEE_PRESENT_NICHE_ID,
} from "@spellkave/adventure-runtime/dm/level-up";
import { buildSpatialNicheAttachment, type VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import {
	ADVANCEMENT_TRAINER_TAG,
	DM_NPC_TALKER_TAG,
	PARTY_HEROES_TAG,
	SRD_BUNDLE_ID,
	TELEPATHY_CAPABILITY_ID,
} from "@spellkave/adventure-runtime/srd-ids";
import { asEntityRef } from "@spellkave/sdk";
import { ADVANCEMENT_LIMBO_NODE_ID } from "./advancement-limbo.ts";
import { CREATION_LIMBO_NODE_ID } from "./creation-candidate.ts";
import {
	ALDWIN_ADVANCEMENT_DM_BINDING_ID,
	ALDWIN_AUTHOR_BINDING_ID,
	ALDWIN_CREATION_DM_BINDING_ID,
} from "./lib/entity-keys.ts";
import { BUNDLE, GRAPHS, nodeId } from "./lib/ids.ts";

// Re-exported for existing consumers (see this module's own header) — every
// wizard id below is DEFINED in `../dm/level-up`; this file only re-names
// the import boundary, it never re-derives.
export {
	ACCEPT_LEVEL_UP_OFFER_ACTION_ID,
	ACCEPT_LEVEL_UP_OFFER_CAPABILITY_ID,
	ALDWIN_NICHE_ID,
	ALDWIN_TAG,
	APPLY_LEVEL_UP_ACTION_ID,
	APPLY_LEVEL_UP_CAPABILITY_ID,
	ASK_ABOUT_ADVANCEMENT_ACTION_ID,
	ASK_ABOUT_ADVANCEMENT_CAPABILITY_ID,
	DARING_ADVANCE_ACTION_ID,
	DECLINE_LEVEL_UP_OFFER_ACTION_ID,
	DECLINE_LEVEL_UP_OFFER_CAPABILITY_ID,
	DARING_ADVANCE_CAPABILITY_ID,
	LEVEL_UP_CONFIRM_ACTION_ID,
	LEVEL_UP_CONFIRM_CAPABILITY_ID,
	LEVEL_UP_DISCARD_ACTION_ID,
	LEVEL_UP_DISCARD_CAPABILITY_ID,
	OFFER_LEVEL_UP_ACTION_ID,
	OFFER_LEVEL_UP_CAPABILITY_ID,
	PENDING_HP_CHOICE_RESOURCE_ID,
	STEADY_ADVANCE_ACTION_ID,
	STEADY_ADVANCE_CAPABILITY_ID,
	TRAINEE_PRESENT_NICHE_ID,
};

/** Aldwin instantiates the SRD Commoner (BL-56 / #2227). Persona and role
 * tags live on the authored adventure instance; the shared blueprint stays
 * civilian. The ordinary enrollment act seeds the trainee's level-up latch. */
export const ALDWIN_DEF_ID = `${SRD_BUNDLE_ID}/creature/commoner`;
export const ALDWIN_DISPLAY_NAME = "Aldwin, keeper of the hearth-ledger";

export const ALDWIN_KEY_PREFIX = "adventure/npc/aldwin";
export const ALDWIN_ENTITY_KEY = asEntityRef(`${BUNDLE}/${ALDWIN_KEY_PREFIX}_1`);
export const ALDWIN_PLACE_NODE_ID = nodeId(GRAPHS.inn, "common_room");
/** sk-f9u — observation-only carrier for Aldwin's `place_graph` read extent.
 * Deliberately NOT any acting capability: it widens what the DM sees, never
 * what he may do. See its grant row below for the full reasoning. */
export const DM_WATCH_CAPABILITY_ID = `${BUNDLE}/dm/watch`;

/** Aldwin's authored role carries the existing scripted-DM apply authority.
 * Publisher/genesis realises the binding; durable primary identities on the
 * NPC actor are mirrored to its separate presence. Connection-scoped claims
 * are never mirrored (ADR-0151).
 */
export const ALDWIN_AUTHOR_ROLE_ID = `${BUNDLE}/scripted-dm`;
export const ALDWIN_NPC_HOST_BINDING_ID = `${BUNDLE}/aldwin-npc-host`;
export const ALDWIN_DM_BINDING_ID = `${BUNDLE}/aldwin-dm`;
export { ALDWIN_AUTHOR_BINDING_ID } from "./lib/entity-keys.ts";
export const ALDWIN_AUTHOR_BUNDLE_BINDING_ID = `${BUNDLE}/aldwin-author-bundle`;
export const FRONTIER_APPLY_MANIFEST_CAPABILITY_ID = "frontier.apply_manifest";

/**
 * PR #2183 review point, resolved: the DM-only threshold
 * (`dm-threshold.ts`) originally gated on `FRONTIER_APPLY_MANIFEST_CAPABILITY_ID`
 * — Aldwin's *authoring* authority, borrowed as a stand-in for *is the game
 * master*. Those are different things: anyone who may write to the world
 * (any future `frontier.apply_manifest` holder, e.g. a second content author
 * seeded later) would silently also be able to walk into the limbo, and
 * `actor.has_capability(...)` in `r_move`'s per-edge affordance predicate is
 * a **may-do** gate, which ADR-0007 D-3 forbids resolving via a hardcoded
 * role match (`actor_identity.role == "dm"`) — role/`elevation_class`
 * (ADR-0007 D-2/D-4, ADR-0084) govern read-VISIBILITY and, separately, a
 * hardcoded operator identity governs seat BINDING
 * (`server/src/config.rs`/`actor/mod.rs`'s `validate_operator_bind`); write
 * act-as authority for a may-do stays capability-row gated with no role
 * bypass, exactly what `capability_gate_admits` already implements
 * (`server/src/actor/mod.rs`). So the fix is a properly-named capability,
 * not a tier — this one, checked in the SAME two-row shape as
 * `DM_WATCH_CAPABILITY_ID` above (a `capability_definitions` row + an
 * `actor_capabilities` grant row on Aldwin).
 *
 * Reserved authority follows the `frontier.` prefix rule, independently of
 * today's id count. Publisher/genesis applies realise its authored role binding;
 * tags, conditions, equipment, carried facts and definition seeds cannot mint
 * it. Blueprint cloning skips those grants. See privileges.md and the
 * privileged-capability-namespace change for the current contract.
 *
 * This adventure-local `kavemouth/dm/seat` remains an ordinary authored gate,
 * paired with its own vocabulary row and grant. DM and scripted-author
 * role bindings are authored below; later escalation slices establish
 * their delegation or impersonation behavior.

 */
export const DM_SEAT_CAPABILITY_ID = `${BUNDLE}/dm/seat`;

/**
 * Shared party vocabulary and the legacy opt-in sight capability definition.
 * A Party extent admits every body carrying its membership tag, plus their
 * session peers (server/src/actor/mod.rs, ExtentResolutionShape::Party).
 * Hidden elevation limits row classes; it does not limit the grant to the
 * holder's account or current place.
 *
 * Runtime creation candidates must not inherit this grant (sk-jay0.1.55.17).
 * Their shared party tag supports DM watches and telepathy; combat position
 * visibility comes from caller_scope's session_peer_bodies without a grant.
 * Explicit fixture grants still use PARTY_ID as the membership tag
 * (ADR-0155; sk-ntz.7).
 */
export const PARTY_TAG = PARTY_HEROES_TAG;
export const PARTY_ID = PARTY_TAG;
export const PARTY_SIGHT_CAPABILITY_ID = `${BUNDLE}/party/sight`;

export function dmNpc(): VerbCall[] {
	return [
		// NO define-aldwin: Aldwin instantiates srd/creature/commoner
		// (BL-56 / #2227). Role tags that open niches stay on the instance.
		{
			toolName: "spellkave_place_actor",
			label: "place-aldwin",
			params: {
				bundle: BUNDLE,
				kind: "npc",
				entity_def: ALDWIN_DEF_ID,
				at: ALDWIN_PLACE_NODE_ID,
				key_prefix: ALDWIN_KEY_PREFIX,
				name: ALDWIN_DISPLAY_NAME,
				description: "Aldwin sits by the hearth, ledger open on his knee.",
				// sk-9ll.7: Aldwin's OWN role tags, folded into the placement call itself
				// instead of a separate spellkave_write_rows(entity_tag) call.
				tags: [ALDWIN_TAG, ADVANCEMENT_TRAINER_TAG, CREATION_STATION_TAG, DM_NPC_TALKER_TAG],
				resources: [
					{ resource: DIALOG_OPEN_RESOURCE_ID, value: 0 },
					// ADR-0142 D-1: seeded alongside dm/dialog/open (this file's own
					// header comment on `bundle-header.ts` — "talkers seed dm/dialog/
					// open ... so set-open/set-phase can read actor.stat without
					// UnknownField") — dm/dialog/prompt is the SAME generic dm-bundle
					// family and needs the identical seed-time row, or its own
					// dm/dialog/prompt/set/<id> relative-delta write fails closed on
					// the never-written field the first time any giver binds a prompt.
					{ resource: DIALOG_PROMPT_RESOURCE_ID, value: 0 },
					{ resource: CREATION_PHASE_RESOURCE_ID, value: 0 },
				],
			},
		},
		// Fixed wizard placements are authored once, alongside their adventure.
		...[ALDWIN_PLACE_NODE_ID, ADVANCEMENT_LIMBO_NODE_ID].flatMap((placeNodeId) =>
			[ALDWIN_NICHE_ID, TRAINEE_PRESENT_NICHE_ID].map((nicheId) =>
				buildSpatialNicheAttachment({ bundle: BUNDLE, nicheId, placeNodeId }),
			),
		),
		buildSpatialNicheAttachment({
			bundle: BUNDLE,
			nicheId: CREATION_STATION_NICHE_ID,
			placeNodeId: CREATION_LIMBO_NODE_ID,
		}),
		{
			toolName: "spellkave_write_rows",
			label: "define-dm-watch-capability",
			params: {
				bundle: BUNDLE,
				kind: "capability_definitions",
				rows: [
					{
						actor_kind: "entity",
						bundle_id: BUNDLE,
						capability_id: DM_WATCH_CAPABILITY_ID,
						default_visibility: "Public",
						description:
							"The DM's watch over the adventure: carries the place_graph extent that broadens Aldwin's read scope to every body in the region, including the ephemeral combat grids of any session opened inside it. Read-only — it authorises no action and is never a gate_predicate's required_capability.",
						display_name: "DM: watch the adventure",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "define-dm-seat-capability",
			params: {
				bundle: BUNDLE,
				kind: "capability_definitions",
				rows: [
					{
						actor_kind: "entity",
						bundle_id: BUNDLE,
						capability_id: DM_SEAT_CAPABILITY_ID,
						default_visibility: "Public",
						description:
							"Holds the DM seat: the key a may-do gate checks to admit the game master specifically, as opposed to anyone who may write to the world (frontier.apply_manifest) or anyone widened into read range (kavemouth/dm/watch). Today's only consumer is the DM-only threshold (dm-threshold.ts); a future gate that needs 'is this actor the DM' should check this capability, not actor_identity.role (ADR-0007 D-3 forbids a hardcoded role match on a may-do).",
						display_name: "DM: hold the seat",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "define-aldwin-scripted-author-role",
			params: {
				bundle: BUNDLE,
				kind: "role_definitions",
				rows: [
					{
						role_id: ALDWIN_AUTHOR_ROLE_ID,
						bundle_id: BUNDLE,
						display_name: "Scripted Dungeon Master",
						description: "Aldwin's standing authority to apply scripted content deltas.",
						capability_ids: [
							FRONTIER_APPLY_MANIFEST_CAPABILITY_ID,
							"frontier.pace_time",
							"frontier.open_session",
						],
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "bind-aldwin-dm-and-scripted-author-presences",
			params: {
				bundle: BUNDLE,
				kind: "role_bindings",
				rows: [
					{
						binding_id: ALDWIN_DM_BINDING_ID,
						bundle_id: BUNDLE,
						subject: ALDWIN_ENTITY_KEY,
						role_id: "dm",
						extent_kind_ref: "place_graph",
						extent_ref: GRAPHS.region,
						description: "Aldwin reads hidden and internal adventure facts as its DM.",
					},
					...[
						[ALDWIN_CREATION_DM_BINDING_ID, GRAPHS.creation_limbo],
						[ALDWIN_ADVANCEMENT_DM_BINDING_ID, GRAPHS.advancement_limbo],
					].map(([binding_id, extent_ref]) => ({
						binding_id,
						bundle_id: BUNDLE,
						subject: ALDWIN_ENTITY_KEY,
						role_id: "dm",
						extent_kind_ref: "place_graph",
						extent_ref,
						description: "Aldwin's bounded authored act presence for this limbo.",
					})),
					{
						binding_id: ALDWIN_AUTHOR_BINDING_ID,
						bundle_id: BUNDLE,
						subject: ALDWIN_ENTITY_KEY,
						role_id: ALDWIN_AUTHOR_ROLE_ID,
						extent_kind_ref: "place_graph",
						extent_ref: GRAPHS.region,
						description: "Aldwin applies scripted adventure deltas.",
					},
					{
						binding_id: ALDWIN_AUTHOR_BUNDLE_BINDING_ID,
						bundle_id: BUNDLE,
						subject: ALDWIN_ENTITY_KEY,
						role_id: ALDWIN_AUTHOR_ROLE_ID,
						extent_kind_ref: "bundle",
						extent_ref: BUNDLE,
						description:
							"Aldwin may author definitions in his own adventure; live menus and character changes use DM acts.",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "grant-ordinary-dm-watch-and-seat",
			params: {
				bundle: BUNDLE,
				kind: "actor_capabilities",
				rows: [
					...[
						LEVEL_UP_ENROLL_CAPABILITY_ID,
						OFFER_LEVEL_UP_CAPABILITY_ID,
						APPLY_LEVEL_UP_CAPABILITY_ID,
					].map((capability_id) => ({
						actor_entity_key: ALDWIN_ENTITY_KEY,
						bundle_id: BUNDLE,
						capability_id,
						source: BUNDLE,
						source_args_hash: "",
						elevation_class: "",
						extent_kind_ref: "",
						extent_ref: "",
					})),
					// Keep the ordinary watch grant for its existing authored consumers.
					// Read-role authority is carried by Aldwin's separate DM presence.
					{
						actor_entity_key: ALDWIN_ENTITY_KEY,
						bundle_id: BUNDLE,
						capability_id: DM_WATCH_CAPABILITY_ID,
						source: BUNDLE,
						source_args_hash: "",
						// sk-e7n item 3 (elevated-predicate repair): once a plain
						// PC can also hold a broadening extent grant (the hero's
						// party/sight grant above), "sees more bodies than it
						// owns" stopped being a safe elevated-caller test —
						// `caller_is_extent_elevated` now keys on the elevation
						// CEILING a grant confers (ADR-0084), not the mere fact
						// of broadening. Aldwin must keep reading as the elevated
						// DM/operator caller the elevation-only views
						// (`visible_event_create_entity`,
						// `visible_event_spawn_entity_definition`) expect, so his
						// own `kavemouth/dm/*` grants flip to `full` here — the
						// hero's Hidden-class party grant (dm-npc.ts's own
						// `PARTY_SIGHT_CAPABILITY_ID` above) never does.
						elevation_class: "full",
						extent_kind_ref: "place_graph",
						extent_ref: GRAPHS.region,
					},
					// DM_SEAT_CAPABILITY_ID's own doc comment above has the full
					// story: the key that identifies Aldwin as THE game master for
					// may-do gates (the DM-only threshold, `dm-threshold.ts`),
					// distinct from FRONTIER_APPLY_MANIFEST_CAPABILITY_ID (may
					// WRITE to the world) and DM_WATCH_CAPABILITY_ID (may SEE
					// beyond his own body). Empty extent, like the speak grant — it is an identity marker, not
					// an extent-widened read/write reach. `elevation_class = "full"`
					// for the same sk-e7n item 3 reason as DM_WATCH_CAPABILITY_ID's
					// grant just above.
					{
						actor_entity_key: ALDWIN_ENTITY_KEY,
						bundle_id: BUNDLE,
						capability_id: DM_SEAT_CAPABILITY_ID,
						source: BUNDLE,
						source_args_hash: "",
						elevation_class: "full",
						extent_kind_ref: "",
						extent_ref: "",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "define-party-sight-capability",
			params: {
				bundle: BUNDLE,
				kind: "capability_definitions",
				rows: [
					{
						actor_kind: "entity",
						bundle_id: BUNDLE,
						capability_id: PARTY_SIGHT_CAPABILITY_ID,
						default_visibility: "Public",
						description:
							"Party sight: extends the holder's read scope to every body reachable through the srd.party.heroes membership tag, including a fellow member's session peers on any battle map opened for that party (caller_scope's ExtentResolutionShape::Party arm, ADR-0007 D-1). Hidden elevation only — this widens what the holder SEES, never what they may DO, and never raises them to DM/operator read scope (ADR-0084; contrast kavemouth/dm/watch and kavemouth/dm/seat above, both elevation_class = full).",
						display_name: "Party: see fellow members",
					},
				],
			},
		},
		// sk-0m4.34: Aldwin holds the directed telepathy verb. The grant
		// carries the same party extent as party/sight (PARTY_ID) so he can
		// address every srd.party.heroes body regardless of
		// place node or place graph. A large range_m cannot do this —
		// validate_reachability rejects cross-graph pairs. Elevation stays
		// empty: this widens WHO he may address, not what he may see
		// (contrast DM_WATCH_CAPABILITY_ID above).
		{
			toolName: "spellkave_write_rows",
			label: "grant-telepathy-to-aldwin",
			params: {
				bundle: BUNDLE,
				kind: "actor_capabilities",
				rows: [
					{
						actor_entity_key: ALDWIN_ENTITY_KEY,
						bundle_id: BUNDLE,
						capability_id: TELEPATHY_CAPABILITY_ID,
						source: SRD_BUNDLE_ID,
						source_args_hash: "",
						elevation_class: "",
						extent_kind_ref: "party",
						extent_ref: PARTY_ID,
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "aldwin-late-companion-host-authority",
			params: {
				bundle: BUNDLE,
				kind: "role_bindings",
				rows: [
					{
						bundle_id: BUNDLE,
						binding_id: ALDWIN_NPC_HOST_BINDING_ID,
						subject: ALDWIN_ENTITY_KEY,
						role_id: "npc-host",
						extent_kind_ref: "party",
						extent_ref: PARTY_HEROES_TAG,
						description:
							"Aldwin assigns an accepted world-owned party companion its durable Service driver; the existing driver admission guards exclude playable seats and authority subjects.",
					},
				],
			},
		},
	];
}
