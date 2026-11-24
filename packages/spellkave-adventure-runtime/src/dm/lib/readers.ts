/**
 * Reader manifests for the scripted DM seat and its watches.
 *
 * WHY HERE: these are table lists the DM host passes to `subscribeReaders`.
 * The ORDER of the lists and of the tables inside them is observable: the
 * golden brain oracle (`tests/oracle/brain-trace.json` in the elven-mini
 * package) records the ordered `subscribeReaders` calls, so a reordered
 * table is a behaviour change, not a tidy-up.
 *
 * Nothing here names a bundle or a story. Tables are kernel/SRD surfaces.
 */

import type { ReaderManifest } from "@spellkave/sdk";
import { readManipulationContextRequiredTables } from "@spellkave/sdk/readers";

/** Read-only definition catalog consumed by creation and advancement plans.
 * `createLiveAuthorTarget` supplies the catalog adapter; the DM writes through
 * authored acts. Equipment choices and grant metadata need their definitions
 * in this caller's snapshot before a plan can reference them. */
export const DM_LIVE_AUTHOR_READER_MANIFEST = {
	requiredTables: [
		"resource_definition",
		"entity_definition",
		"object_state_definition",
		"capability_definition",
		// Prompt occurrences refer to the seeded action vocabulary. Runtime
		// choices use these definitions rather than authoring new prompt rows.
		"action_definition",
		// Creation grants are derived from srd.advancement_grant metadata.
		// TestWorld's broad readers used to provide this implicitly, while the
		// production LiveSession did not, so recorded Fighters received Second
		// Wind and hosted Fighters only received its use counter (#2417).
		// `metadata_attachment` is private (ADR-0130 D-1); `createLiveAuthorTarget`'s
		// `lookup("metadata_attachments", ...)` unions all three play/reference
		// views (`lookupLiveMetadataAttachments`), so all three must be
		// subscribed here - `srd.advancement_grant`/`srd.spell_slot_grant`/etc.
		// are `on_demand` reference rows (ADR-0130 D-4) that only
		// `public_reference_metadata` carries; omitting it reintroduces #2417.
		"metadata_namespace_definition",
		"public_metadata_attachment",
		"visible_metadata_attachment",
		"public_reference_metadata",
		// Class-list menus (Ranger/Paladin/Wizard prepared + cantrips) read
		// `srd.spell.list.<class>` via entity_definition_tag. Without this
		// table the live catalog sees preparedCount=2 and zero options - the
		// hosted empty "Which prepared spell (2 more)?" wall (sk-0m4.109 / #2511).
		"entity_definition_tag",
		"dsl_macro_definition",
		"modifier_target_definition",
		"equipment_slot_definition",
		"visible_target_condition",
	],
} as const;

/**
 * The DM seat's connect-time reader floor, in subscription order: bundle
 * definitions, the manipulation-context reader contract (creation self-alignment
 * composes `r_manipulate` from these factored facts), the scene/seat tables
 * (`seat` is the public, occupant-free catalog behind the claim gate,
 * ADR-0084), and the live-author set. Watches widen this additively after it.
 */
export const DM_SEAT_FLOOR_READERS: readonly ReaderManifest[] = [
	{ requiredTables: ["mod_bundle"] },
	{ requiredTables: readManipulationContextRequiredTables },
	{
		requiredTables: [
			"visible_trace",
			"affordance_template",
			"place_edge_affordance",
			"visible_place_graph_definition",
			"entity",
			"visible_entity_tag",
			"visible_entity_tag_coverage",
			"entity_description",
			"visible_entity_location",
			"visible_target_condition",
			"seat",
		],
	},
	DM_LIVE_AUTHOR_READER_MANIFEST,
];

/**
 * The initiative watch's tables. None is in `CONNECTION_BASELINE`
 * (`packages/spellkave-sdk/src/connection.ts`), so without this the snapshot
 * is empty and the DM silently never sees a blow. `subscribeReaders` is
 * ADDITIVE, so it composes with the DM floor already on the connection.
 * `actor` (public, world-readable, unlike `visible_actor_identity`) backs the
 * interim seatless rule (sk-h2i / sk-dhu). `visible_target_condition` and
 * `visible_object_state` serve the kill-time XP duty (sk-0m4.27). The last
 * six are the authored cast, faction membership and present/living roster.
 */
export const INITIATIVE_WATCH_READERS: readonly ReaderManifest[] = [
	{
		requiredTables: [
			"visible_event_apply_consequence",
			"visible_event_resource_delta",
			"action_definition",
			"visible_session",
			"actor",
			"visible_target_condition",
			"visible_object_state",
			"visible_manifest_authored_entity",
			"visible_manifest_authored_entity_coverage",
			"visible_actor_spatial_location",
			"visible_entity_tag",
			"visible_entity_tag_coverage",
			"visible_role_binding",
			"visible_actor_identity",
		],
	},
];

/** The kill-XP duty on its own (when not riding the initiative watch's
 * wider set): dead condition, the killing blow's resource delta, and the
 * victim's `srd/xp_value`. */
export const KILL_XP_WATCH_READERS: readonly ReaderManifest[] = [
	{
		requiredTables: [
			"visible_event_resource_delta",
			"visible_target_condition",
			"visible_object_state",
			"visible_manifest_authored_entity",
			"visible_manifest_authored_entity_coverage",
		],
	},
];

/** The XP-threshold watch's tables (offer, teleport and return duties). */
export const XP_THRESHOLD_WATCH_READERS: readonly ReaderManifest[] = [
	{
		requiredTables: [
			"visible_object_state",
			"visible_actor_spatial_location",
			"visible_manifest_authored_entity",
			"visible_manifest_authored_entity_coverage",
			"entity",
			"actor",
		],
	},
];

/** The quest-XP watch's tables. `visible_manifest_authored_entity` maps authored keys
 * onto live ids (without it no terminal ever satisfies); the last two serve a
 * host that answers the present-party resolver by co-location
 * (`visible_actor_spatial_location` via `readActorSnapshot`; without it the
 * resolver sees no companion anywhere and silently rebuilds the hero-only
 * grant it exists to replace, sk-awlo.15). Order is oracle-recorded. */
export const QUEST_XP_WATCH_READERS: readonly ReaderManifest[] = [
	{
		requiredTables: [
			"visible_manifest_authored_entity",
			"visible_manifest_authored_entity_coverage",
			"visible_target_condition",
			"entity",
			"actor",
			"visible_object_state",
			"visible_actor_spatial_location",
			"visible_entity_containment",
		],
	},
];

/** The companion-bond watch's tables: hero markers (`visible_object_state`,
 * an NPC-tool read, not DSL) and id resolution (`visible_manifest_authored_entity`).
 * Neither is in the connection baseline; without them the snapshot is empty
 * and the watch silently never fires. */
export const COMPANION_BOND_WATCH_READERS: readonly ReaderManifest[] = [
	{
		requiredTables: [
			"visible_object_state",
			"visible_manifest_authored_entity",
			"visible_manifest_authored_entity_coverage",
		],
	},
];
