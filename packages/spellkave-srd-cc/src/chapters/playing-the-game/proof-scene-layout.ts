/**
 * Review-oriented layout for the Playing the Game proof manifest.
 *
 * The authoring verbs render one complete manifest first. This module only
 * moves the already-rendered, byte-identical top-level TOML table blocks into
 * test-oriented include fragments; it never constructs or changes a row.
 */

export const PROOF_FRAGMENT_PATHS = [
	"shared/spatial.toml",
	"identity/hero.toml",
	"exploration/object-interaction.toml",
	"checks/actions.toml",
	"checks/resources.toml",
	"checks/pressure-plate.toml",
	"checks/training-dummies.toml",
	"combat/actions.toml",
	"combat/guard.toml",
	"initiative/combatants.toml",
	"initiative/session.toml",
	"combat-arena/combatants.toml",
	"combat-arena/grid.toml",
	"combat-arena/npc-seat.toml",
	"combat-arena/session.toml",
] as const;

type ProofFragmentPath = (typeof PROOF_FRAGMENT_PATHS)[number];

const SPATIAL_TABLES = new Set([
	"niche_definitions",
	"place_edge_affordance",
	"place_edges",
	"place_graphs",
	"place_nodes",
]);
const RESOURCE_TABLES = new Set(["resource_definitions"]);
const GRID_TABLES = new Set(["combat_grid_blueprints"]);
const SESSION_SCHEDULER_TABLES = new Set(["session_definitions", "turn_scheduler"]);
const ENTITY_TABLES = new Set([
	"actor_capabilities",
	"actor_identities",
	"actor_spatial_locations",
	"actors",
	"entities",
	"entity_definition_initial_equipment",
	"entity_definition_initial_capability",
	"entity_definition_item_dsl_source",
	"entity_definition_initial_state",
	"entity_definition_tag",
	"entity_definitions",
	"entity_tag",
	"equipment_slot_definitions",
	"object_state",
]);
const ACTION_TABLES = new Set([
	"action_definitions",
	"affordance_templates",
	"capability_definitions",
	"condition_definitions",
	"consequence_frame_writes",
	"consequence_templates",
	"modifier_target_definitions",
	"modifier_templates",
	"modifier_template_tag",
	"outcome_templates",
	"spatial_niche_attachments",
]);
const COMBAT_ACTION_MARKERS = ["/attack-roll", "/cover-grant", "/reaction-resolution"] as const;

function entityFragment(block: string): ProofFragmentPath {
	if (block.includes("/lever_1")) return "exploration/object-interaction.toml";
	// N3a: the NPC-seat proof's own dedicated 4th goblin — isolated into its
	// own fragment (never combat-arena/combatants.toml) so it stays visibly
	// separate from the scripted A/B/C narrative it deliberately never
	// touches (combat-arena.ts's own header note on this instance).
	if (block.includes("/goblin-warrior-seat-target")) return "combat-arena/npc-seat.toml";
	if (
		block.includes("/arena-hero") ||
		block.includes("/arena-training-weapon") ||
		block.includes("/slot/main-hand") ||
		block.includes("/goblin-warrior-a") ||
		block.includes("/goblin-warrior-b") ||
		block.includes("/goblin-warrior-c")
	) {
		return "combat-arena/combatants.toml";
	}
	if (block.includes("/combatant-alpha") || block.includes("/combatant-beta")) {
		return "initiative/combatants.toml";
	}
	if (block.includes("/guard")) return "combat/guard.toml";
	if (block.includes("/hero")) return "identity/hero.toml";
	if (block.includes("/pressure-plate")) return "checks/pressure-plate.toml";
	if (
		block.includes("/training-dummy") ||
		block.includes("/dummy_") ||
		block.includes("/advantage-dummy_") ||
		block.includes("/cover-dummy_")
	) {
		return "checks/training-dummies.toml";
	}
	throw new Error("proof-scene layout: entity row does not identify its owning test.");
}

function actionFragment(block: string): ProofFragmentPath {
	if (block.includes("/object-interaction/")) return "exploration/object-interaction.toml";
	return COMBAT_ACTION_MARKERS.some((marker) => block.includes(marker))
		? "combat/actions.toml"
		: "checks/actions.toml";
}

/** `session_definitions`/`turn_scheduler` rows are shared by TWO proof concerns — split by content marker, not just table name. */
function sessionSchedulerFragment(block: string): ProofFragmentPath {
	return block.includes("/combat-arena") ? "combat-arena/session.toml" : "initiative/session.toml";
}

function fragmentForBlock(table: string, block: string): ProofFragmentPath {
	if (block.includes("/object-interaction/")) return "exploration/object-interaction.toml";
	if (SPATIAL_TABLES.has(table)) return "shared/spatial.toml";
	if (RESOURCE_TABLES.has(table)) return "checks/resources.toml";
	if (GRID_TABLES.has(table)) return "combat-arena/grid.toml";
	if (SESSION_SCHEDULER_TABLES.has(table)) return sessionSchedulerFragment(block);
	if (ENTITY_TABLES.has(table)) return entityFragment(block);
	if (ACTION_TABLES.has(table)) return actionFragment(block);
	throw new Error(`proof-scene layout: top-level table '${table}' has no review fragment.`);
}

/**
 * Partition a complete verb-rendered manifest into headerless include
 * fragments. A block begins at a top-level `[[table]]` header and includes
 * all following nested tables until the next top-level array-of-tables
 * header, so e.g. a `consequence_frame_writes.frame_write.*` payload stays
 * attached to its parent row.
 */
export function splitProofManifestRows(toml: string): Record<string, string> {
	const matches = [...toml.matchAll(/^\[\[([a-z0-9_]+)\]\]$/gm)];
	if (matches.length === 0) {
		throw new Error("proof-scene layout: authored manifest contains no top-level row tables.");
	}

	const fragments = Object.fromEntries(PROOF_FRAGMENT_PATHS.map((path) => [path, ""])) as Record<
		string,
		string
	>;
	let sawBundle = false;

	for (const [index, match] of matches.entries()) {
		const table = match[1];
		const start = match.index;
		const end = matches[index + 1]?.index ?? toml.length;
		if (table === undefined || start === undefined) {
			throw new Error("proof-scene layout: malformed top-level table match.");
		}
		if (table === "bundles") {
			sawBundle = true;
			continue;
		}
		const block = toml.slice(start, end).replace(/^\n+|\n+$/g, "");
		const fragment = fragmentForBlock(table, block);
		fragments[fragment] += `${block}\n\n`;
	}

	if (!sawBundle) {
		throw new Error("proof-scene layout: authored manifest contains no bundle row.");
	}
	for (const path of PROOF_FRAGMENT_PATHS) {
		const content = fragments[path];
		if (content === undefined || content.length === 0) {
			throw new Error(`proof-scene layout: '${path}' would be empty.`);
		}
		fragments[path] = content.replace(/\n+$/, "\n");
	}
	return fragments;
}
