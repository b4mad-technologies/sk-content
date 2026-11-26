/**
 * // pattern: blueprint-instance-override
 *
 * Storyline §5 encounter cast — blueprint instances with role tags.
 * Named villains get display-name overrides; dialogue/parley is L10's.
 *
 * Waves (Q5, Q6, Q12): second-wave actors sit on a reinforcement node one hop
 * from the primary fight node (present for inventory + scene proofs).
 */

import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { FACTION_MONSTERS_TAG, SRD_BUNDLE_ID } from "@spellkave/adventure-runtime/srd-ids";
import { asEntityRef } from "@spellkave/sdk";
import { BUNDLE, GRAPHS, nodeId } from "./lib/ids.ts";
import { Q4_FANATIC_PROOF_ENTITY_DEF } from "./loot-drop.ts";

/** Seeded Q4 boss drop instance (loot-table-drop proof; stowed on Maelis). */
export const Q4_FANATIC_LOOT_ITEM_KEY = "kavemouth/adventure/loot/q4_fanatic_longsword_plus_1";

const ROLE = {
	skirmisher: "srd.creature.role.skirmisher",
	archer: "srd.creature.role.archer",
	brute: "srd.creature.role.brute",
	leader: "srd.creature.role.leader",
	lurker: "srd.creature.role.lurker",
	undeadTide: "srd.creature.role.undead-tide",
	casterBoss: "srd.creature.role.caster-boss",
} as const;

function creatureDef(slug: string): string {
	return `${SRD_BUNDLE_ID}/creature/${slug}`;
}

function entityKey(slug: string, n: number): string {
	return `${BUNDLE}/adventure/encounter/${slug}_${n}`;
}

/** Group spawn via count (one call → _1.._n). Display names are `${namePrefix} ${n}` via `name_prefix`. */
function placeGroup(args: {
	label: string;
	slug: string;
	creature: string;
	at: string;
	count: number;
	namePrefix: string;
	description: string;
	role: string;
	hp?: number;
}): VerbCall[] {
	const def = creatureDef(args.creature);
	return [
		{
			toolName: "spellkave_place_actor",
			label: `place-${args.label}`,
			params: {
				bundle: BUNDLE,
				kind: "npc",
				entity_def: def,
				at: args.at,
				count: args.count,
				key_prefix: `adventure/encounter/${args.slug}`,
				name_prefix: args.namePrefix,
				description: args.description,
				tags: [FACTION_MONSTERS_TAG, args.role],
				...(args.hp !== undefined
					? { resources: [{ resource: `${SRD_BUNDLE_ID}/hp`, value: args.hp }] }
					: {}),
			},
		},
	];
}

/** Single named villain via explicit entity_key. */
function placeNamed(args: {
	label: string;
	slug: string;
	creature: string;
	at: string;
	/** defaults to 1 */
	n?: number;
	name: string;
	description: string;
	role: string;
}): VerbCall[] {
	const n = args.n ?? 1;
	const key = entityKey(args.slug, n);
	const def = creatureDef(args.creature);
	return [
		{
			toolName: "spellkave_place_actor",
			label: `place-${args.label}`,
			params: {
				bundle: BUNDLE,
				kind: "npc",
				entity_def: def,
				at: args.at,
				entity_key: key,
				name: args.name,
				description: args.description,
				tags: [FACTION_MONSTERS_TAG, args.role],
			},
		},
	];
}

/** Exported inventory for offline tests — storyline §5 counts per graph. */
export const ENCOUNTER_INVENTORY: ReadonlyArray<{
	graphKey: keyof typeof GRAPHS;
	quest: string;
	placements: readonly { creature: string; count: number; node: string }[];
}> = [
	{
		graphKey: "mill",
		quest: "Q4",
		placements: [
			{ creature: "cultist", count: 4, node: "fork" },
			{ creature: "cultist-fanatic", count: 1, node: "altar" },
		],
	},
	{
		graphKey: "war_camp",
		quest: "Q5",
		placements: [
			{ creature: "hobgoblin-warrior", count: 3, node: "tent_row" },
			{ creature: "hobgoblin-captain", count: 1, node: "command_tent" },
			{ creature: "worg", count: 2, node: "worg_pens" },
		],
	},
	{
		graphKey: "hesper_lodge",
		quest: "Q6",
		placements: [
			{ creature: "giant-spider", count: 2, node: "tree_line" },
			{ creature: "owlbear", count: 1, node: "clearing" },
		],
	},
	{
		graphKey: "goblin_warren",
		quest: "Q7",
		placements: [
			{ creature: "goblin-minion", count: 6, node: "common_den" },
			{ creature: "goblin-warrior", count: 2, node: "guard_post" },
			{ creature: "goblin-boss", count: 1, node: "chief_hall" },
		],
	},
	{
		graphKey: "swamp",
		quest: "Q8",
		placements: [
			{ creature: "green-hag", count: 1, node: "hag_hut" },
			{ creature: "giant-frog", count: 2, node: "frog_pool" },
			{ creature: "will-o-wisp", count: 1, node: "will_o_wisp_glade" },
		],
	},
	{
		graphKey: "mine",
		quest: "Q9",
		placements: [
			{ creature: "skeleton", count: 4, node: "skeleton_gallery" },
			{ creature: "ghoul", count: 2, node: "ghoul_den" },
			{ creature: "ghast", count: 1, node: "lower_hall" },
			{ creature: "wight", count: 1, node: "durgan_crypt" },
		],
	},
	{
		graphKey: "shrine",
		quest: "Q10",
		placements: [
			{ creature: "shadow", count: 3, node: "shadow_crypt" },
			{ creature: "specter", count: 1, node: "nave" },
		],
	},
	{
		graphKey: "well",
		quest: "Q11",
		placements: [
			{ creature: "wererat", count: 2, node: "wererat_nest" },
			{ creature: "giant-rat", count: 4, node: "depth_hall" },
			{ creature: "gray-ooze", count: 1, node: "ooze_pool" },
		],
	},
	{
		graphKey: "deep_tomb",
		quest: "Q12",
		placements: [
			{ creature: "zombie", count: 4, node: "zombie_hall" },
			{ creature: "ogre-zombie", count: 1, node: "ogre_alcove" },
			{ creature: "specter", count: 1, node: "steward_court" },
			{ creature: "wight", count: 2, node: "wight_niche_a" },
		],
	},
	{
		graphKey: "stonebridge",
		quest: "Q2",
		placements: [{ creature: "wolf", count: 1, node: "bridge_mid" }],
	},
	{
		graphKey: "village",
		quest: "Q3",
		placements: [{ creature: "stirge", count: 1, node: "green" }],
	},
];

/** Frozen key list for adventure-seeded encounters (layout CAST_MEMBERS). */
export const ENCOUNTER_ENTITY_KEYS = [
	"kavemouth/adventure/encounter/road_wolf_1",
	"kavemouth/adventure/encounter/green_stirge_1",
	"kavemouth/adventure/encounter/mill_cultist_1",
	"kavemouth/adventure/encounter/mill_cultist_2",
	"kavemouth/adventure/encounter/mill_cultist_3",
	"kavemouth/adventure/encounter/mill_cultist_4",
	"kavemouth/adventure/encounter/sister_maelis_1",
	"kavemouth/adventure/encounter/camp_hobgoblin_1",
	"kavemouth/adventure/encounter/camp_hobgoblin_2",
	"kavemouth/adventure/encounter/camp_hobgoblin_3",
	"kavemouth/adventure/encounter/warcaptain_ghorza_1",
	"kavemouth/adventure/encounter/camp_worg_1",
	"kavemouth/adventure/encounter/camp_worg_2",
	"kavemouth/adventure/encounter/lodge_spider_1",
	"kavemouth/adventure/encounter/lodge_spider_2",
	"kavemouth/adventure/encounter/lodge_owlbear_1",
	"kavemouth/adventure/encounter/warren_minion_1",
	"kavemouth/adventure/encounter/warren_minion_2",
	"kavemouth/adventure/encounter/warren_minion_3",
	"kavemouth/adventure/encounter/warren_minion_4",
	"kavemouth/adventure/encounter/warren_minion_5",
	"kavemouth/adventure/encounter/warren_minion_6",
	"kavemouth/adventure/encounter/warren_warrior_1",
	"kavemouth/adventure/encounter/warren_warrior_2",
	"kavemouth/adventure/encounter/grubnash_1",
	"kavemouth/adventure/encounter/ulda_1",
	"kavemouth/adventure/encounter/swamp_frog_1",
	"kavemouth/adventure/encounter/swamp_frog_2",
	"kavemouth/adventure/encounter/swamp_wisp_1",
	"kavemouth/adventure/encounter/mine_skeleton_1",
	"kavemouth/adventure/encounter/mine_skeleton_2",
	"kavemouth/adventure/encounter/mine_skeleton_3",
	"kavemouth/adventure/encounter/mine_skeleton_4",
	"kavemouth/adventure/encounter/mine_ghoul_1",
	"kavemouth/adventure/encounter/mine_ghoul_2",
	"kavemouth/adventure/encounter/mine_ghast_1",
	"kavemouth/adventure/encounter/durgan_ironfold_1",
	"kavemouth/adventure/encounter/shrine_shadow_1",
	"kavemouth/adventure/encounter/shrine_shadow_2",
	"kavemouth/adventure/encounter/shrine_shadow_3",
	"kavemouth/adventure/encounter/shrine_specter_1",
	"kavemouth/adventure/encounter/well_wererat_1",
	"kavemouth/adventure/encounter/well_wererat_2",
	"kavemouth/adventure/encounter/well_rat_1",
	"kavemouth/adventure/encounter/well_rat_2",
	"kavemouth/adventure/encounter/well_rat_3",
	"kavemouth/adventure/encounter/well_rat_4",
	"kavemouth/adventure/encounter/well_ooze_1",
	"kavemouth/adventure/encounter/deep_zombie_1",
	"kavemouth/adventure/encounter/deep_zombie_2",
	"kavemouth/adventure/encounter/deep_zombie_3",
	"kavemouth/adventure/encounter/deep_zombie_4",
	"kavemouth/adventure/encounter/deep_ogre_zombie_1",
	"kavemouth/adventure/encounter/pale_steward_1",
	"kavemouth/adventure/encounter/deep_wight_1",
	"kavemouth/adventure/encounter/deep_wight_2",
].map((key) => asEntityRef(key));

/** Full §5 encounter cast seeded into the adventure bundle (export bound 4000). */
export function encounters(): VerbCall[] {
	return [
		// Q2
		...placeGroup({
			label: "road-wolves",
			hp: 4,
			slug: "road_wolf",
			creature: "wolf",
			at: nodeId(GRAPHS.stonebridge, "bridge_mid"),
			count: 1,
			namePrefix: "Road Wolf",
			description: "A lean wolf packing the bridge midspan.",
			role: ROLE.skirmisher,
		}),
		// Q3
		...placeGroup({
			label: "green-stirges",
			slug: "green_stirge",
			creature: "stirge",
			at: nodeId(GRAPHS.village, "green"),
			count: 1,
			namePrefix: "Stirge",
			description: "A blood-drinker stirge among the moonpetal.",
			role: ROLE.lurker,
			hp: 3,
		}),
		// Q4
		...placeGroup({
			label: "mill-cultists",
			slug: "mill_cultist",
			creature: "cultist",
			at: nodeId(GRAPHS.mill, "fork"),
			count: 4,
			namePrefix: "Cultist",
			description: "A Chaff cultist holding the tunnel intersection.",
			// The canonical cultist wields a melee ritual sickle. Keep its
			// skirmisher tactics instead of asking it to maintain bow range.
			role: ROLE.skirmisher,
		}),
		...placeNamed({
			label: "sister-maelis",
			slug: "sister_maelis",
			creature: "cultist-fanatic",
			at: nodeId(GRAPHS.mill, "altar"),
			name: "Sister Maelis",
			description: "Sister Maelis, fanatic leader of the Chaff cult.",
			role: ROLE.leader,
		}),
		// pattern: loot-table-drop — Q4 fanatic proof drop (longsword +1), stowed on Maelis.
		{
			toolName: "spellkave_place_entity",
			label: "place-q4-fanatic-loot",
			params: {
				bundle: BUNDLE,
				kind: "item",
				entity_def: Q4_FANATIC_PROOF_ENTITY_DEF,
				at: nodeId(GRAPHS.mill, "altar"),
				entity_key: Q4_FANATIC_LOOT_ITEM_KEY,
				name: "Longsword (+1)",
				description:
					"Sister Maelis's prize — Q4 boss table representative drop (srd/loot/boss/q4-fanatic).",
			},
		},
		{
			toolName: "spellkave_stow_item",
			label: "stow-q4-fanatic-loot",
			params: {
				bundle: BUNDLE,
				actor_entity_key: `${BUNDLE}/adventure/encounter/sister_maelis_1`,
				item_entity_key: Q4_FANATIC_LOOT_ITEM_KEY,
			},
		},
		// Q5
		...placeGroup({
			label: "camp-hobgoblins",
			slug: "camp_hobgoblin",
			creature: "hobgoblin-warrior",
			at: nodeId(GRAPHS.war_camp, "tent_row"),
			count: 3,
			namePrefix: "Hobgoblin Warrior",
			description: "A hobgoblin warrior of Ghorza's road raiders.",
			role: ROLE.archer,
		}),
		...placeNamed({
			label: "warcaptain-ghorza",
			slug: "warcaptain_ghorza",
			creature: "hobgoblin-captain",
			at: nodeId(GRAPHS.war_camp, "command_tent"),
			name: "Warcaptain Ghorza",
			description: "Warcaptain Ghorza, leader of the road raids.",
			role: ROLE.leader,
		}),
		...placeGroup({
			label: "camp-worgs",
			slug: "camp_worg",
			creature: "worg",
			at: nodeId(GRAPHS.war_camp, "worg_pens"),
			count: 2,
			namePrefix: "Worg",
			description: "A worg staked at the pens — second wave of the raid fight.",
			role: ROLE.skirmisher,
		}),
		// Q6
		...placeGroup({
			label: "lodge-spiders",
			slug: "lodge_spider",
			creature: "giant-spider",
			at: nodeId(GRAPHS.hesper_lodge, "tree_line"),
			count: 2,
			namePrefix: "Giant Spider",
			description: "A giant spider dropping from the tree line.",
			role: ROLE.lurker,
		}),
		...placeNamed({
			label: "lodge-owlbear",
			slug: "lodge_owlbear",
			creature: "owlbear",
			at: nodeId(GRAPHS.hesper_lodge, "clearing"),
			name: "Owlbear",
			description: "An owlbear crashing into the lodge clearing (wave two).",
			role: ROLE.brute,
		}),
		// Q7
		...placeGroup({
			label: "warren-minions",
			slug: "warren_minion",
			creature: "goblin-minion",
			at: nodeId(GRAPHS.goblin_warren, "common_den"),
			count: 6,
			namePrefix: "Goblin Minion",
			description:
				"A scrawny goblin minion of Grubnash's warren, quick to flee and quicker to swarm.",
			role: ROLE.skirmisher,
		}),
		...placeGroup({
			label: "warren-warriors",
			slug: "warren_warrior",
			creature: "goblin-warrior",
			at: nodeId(GRAPHS.goblin_warren, "guard_post"),
			count: 2,
			namePrefix: "Goblin Warrior",
			description: "A goblin warrior at the warren guard post.",
			role: ROLE.archer,
		}),
		...placeNamed({
			label: "grubnash",
			slug: "grubnash",
			creature: "goblin-boss",
			at: nodeId(GRAPHS.goblin_warren, "chief_hall"),
			name: "Grubnash",
			description: "Grubnash, goblin boss of the warren.",
			role: ROLE.leader,
		}),
		// Q8
		...placeNamed({
			label: "ulda",
			slug: "ulda",
			creature: "green-hag",
			at: nodeId(GRAPHS.swamp, "hag_hut"),
			name: "Ulda Reedwife",
			description: "Ulda Reedwife, green hag of the swamp.",
			role: ROLE.casterBoss,
		}),
		...placeGroup({
			label: "swamp-frogs",
			slug: "swamp_frog",
			creature: "giant-frog",
			at: nodeId(GRAPHS.swamp, "frog_pool"),
			count: 2,
			namePrefix: "Giant Frog",
			description: "A giant frog in the hag's pool.",
			role: ROLE.skirmisher,
		}),
		...placeNamed({
			label: "swamp-wisp",
			slug: "swamp_wisp",
			creature: "will-o-wisp",
			at: nodeId(GRAPHS.swamp, "will_o_wisp_glade"),
			name: "Will-o'-Wisp",
			description: "A will-o'-wisp drifting the glade.",
			role: ROLE.lurker,
		}),
		// Q9
		...placeGroup({
			label: "mine-skeletons",
			slug: "mine_skeleton",
			creature: "skeleton",
			at: nodeId(GRAPHS.mine, "skeleton_gallery"),
			count: 4,
			namePrefix: "Skeleton",
			description: "A skeleton pacing the mine gallery.",
			role: ROLE.undeadTide,
		}),
		...placeGroup({
			label: "mine-ghouls",
			slug: "mine_ghoul",
			creature: "ghoul",
			at: nodeId(GRAPHS.mine, "ghoul_den"),
			count: 2,
			namePrefix: "Ghoul",
			description: "A ghoul in the side den.",
			role: ROLE.skirmisher,
		}),
		...placeNamed({
			label: "mine-ghast",
			slug: "mine_ghast",
			creature: "ghast",
			at: nodeId(GRAPHS.mine, "lower_hall"),
			name: "Ghast",
			description: "A ghast haunting the lower hall.",
			role: ROLE.brute,
		}),
		...placeNamed({
			label: "durgan-ironfold",
			slug: "durgan_ironfold",
			creature: "wight",
			at: nodeId(GRAPHS.mine, "durgan_crypt"),
			name: "Durgan Ironfold",
			description: "Durgan Ironfold, last dwarf of the mine, wight-cursed.",
			role: ROLE.casterBoss,
		}),
		// Q10
		...placeGroup({
			label: "shrine-shadows",
			slug: "shrine_shadow",
			creature: "shadow",
			at: nodeId(GRAPHS.shrine, "shadow_crypt"),
			count: 3,
			namePrefix: "Shadow",
			description: "A shadow clinging to the shrine crypt.",
			role: ROLE.lurker,
		}),
		...placeNamed({
			label: "shrine-specter",
			slug: "shrine_specter",
			creature: "specter",
			at: nodeId(GRAPHS.shrine, "nave"),
			name: "Shrine Specter",
			description: "A specter haunting the shrine nave.",
			role: ROLE.lurker,
		}),
		// Q11
		...placeGroup({
			label: "well-wererats",
			slug: "well_wererat",
			creature: "wererat",
			at: nodeId(GRAPHS.well, "wererat_nest"),
			count: 2,
			namePrefix: "Wererat",
			description: "A wererat of the nest under the well.",
			role: ROLE.skirmisher,
		}),
		...placeGroup({
			label: "well-rats",
			slug: "well_rat",
			creature: "giant-rat",
			at: nodeId(GRAPHS.well, "depth_hall"),
			count: 4,
			namePrefix: "Giant Rat",
			description: "A giant rat in the well's depth hall.",
			role: ROLE.skirmisher,
		}),
		...placeNamed({
			label: "well-ooze",
			slug: "well_ooze",
			creature: "gray-ooze",
			at: nodeId(GRAPHS.well, "ooze_pool"),
			name: "Gray Ooze",
			description: "A gray ooze in the lowest pool under the well.",
			role: ROLE.brute,
		}),
		// Q12
		...placeGroup({
			label: "deep-zombies",
			slug: "deep_zombie",
			creature: "zombie",
			at: nodeId(GRAPHS.deep_tomb, "zombie_hall"),
			count: 4,
			namePrefix: "Zombie",
			description: "A zombie packing the deep-tomb hall.",
			role: ROLE.undeadTide,
		}),
		...placeNamed({
			label: "deep-ogre-zombie",
			slug: "deep_ogre_zombie",
			creature: "ogre-zombie",
			at: nodeId(GRAPHS.deep_tomb, "ogre_alcove"),
			name: "Ogre Zombie",
			description: "An ogre zombie waiting in the alcove.",
			role: ROLE.brute,
		}),
		...placeNamed({
			label: "pale-steward",
			slug: "pale_steward",
			creature: "specter",
			at: nodeId(GRAPHS.deep_tomb, "steward_court"),
			name: "The Pale Steward",
			description: "The Pale Steward, specter bound under the tomb.",
			role: ROLE.casterBoss,
		}),
		// Two wights on different nodes — placeNamed each
		...placeNamed({
			label: "deep-wight-a",
			slug: "deep_wight",
			creature: "wight",
			at: nodeId(GRAPHS.deep_tomb, "wight_niche_a"),
			n: 1,
			name: "Bound Wight",
			description: "A wight bound to the Steward's left niche.",
			role: ROLE.undeadTide,
		}),
		...placeNamed({
			label: "deep-wight-b",
			slug: "deep_wight",
			creature: "wight",
			at: nodeId(GRAPHS.deep_tomb, "wight_niche_b"),
			n: 2,
			name: "Bound Wight",
			description: "A wight bound to the Steward's right niche.",
			role: ROLE.undeadTide,
		}),
	];
}
