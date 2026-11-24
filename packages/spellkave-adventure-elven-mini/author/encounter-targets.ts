// pattern: none — authored elven-mini encounter audience, not runtime rules.
/**
 * Levels follow docs/elven-mini-storyline.md §2 and quests.md's rung catalog.
 * Solo is the default; later fights retain the storyline's companion party.
 * The camp captain and lodge owlbear require all four party members: these
 * encounters remain an owner progression decision, not a statblock rewrite.
 */
export const ENCOUNTER_TARGETS: Record<string, { level: number; partySize: number }> = {
	"elven_mini/inn/cellar": { level: 1, partySize: 1 },
	"elven_mini/river_crossing/bridge_mid": { level: 1, partySize: 1 },
	"elven_mini/village/green": { level: 1, partySize: 1 },
	"elven_mini/tomb/hall": { level: 1, partySize: 1 },
	"elven_mini/tomb/crypt": { level: 1, partySize: 1 },
	"elven_mini/mill/intersection": { level: 2, partySize: 3 },
	"elven_mini/mill/altar": { level: 2, partySize: 3 },
	"elven_mini/hobgoblin_camp/tent_row": { level: 2, partySize: 3 },
	"elven_mini/hobgoblin_camp/command_tent": { level: 2, partySize: 4 },
	"elven_mini/hobgoblin_camp/worg_pens": { level: 2, partySize: 3 },
	"elven_mini/forest_lodge/tree_line": { level: 2, partySize: 3 },
	"elven_mini/forest_lodge/clearing": { level: 2, partySize: 4 },
	"elven_mini/goblin_warren/common_den": { level: 2, partySize: 3 },
	"elven_mini/goblin_warren/guard_post": { level: 2, partySize: 3 },
	"elven_mini/goblin_warren/chief_hall": { level: 2, partySize: 3 },
	"elven_mini/swamp/hag_hut": { level: 3, partySize: 4 },
	"elven_mini/swamp/frog_pool": { level: 3, partySize: 4 },
	"elven_mini/swamp/will_o_wisp_glade": { level: 3, partySize: 4 },
	"elven_mini/mine/skeleton_gallery": { level: 3, partySize: 4 },
	"elven_mini/mine/ghoul_den": { level: 3, partySize: 4 },
	"elven_mini/mine/lower_hall": { level: 3, partySize: 4 },
	"elven_mini/mine/durgan_crypt": { level: 3, partySize: 4 },
	"elven_mini/shrine/shadow_crypt": { level: 3, partySize: 4 },
	"elven_mini/shrine/nave": { level: 3, partySize: 4 },
	// Q11 is rung III even though the well is accessible from the hamlet.
	"elven_mini/well/wererat_nest": { level: 3, partySize: 4 },
	"elven_mini/well/depth_hall": { level: 3, partySize: 4 },
	"elven_mini/well/ooze_pool": { level: 3, partySize: 4 },
	"elven_mini/deep_tomb/zombie_hall": { level: 4, partySize: 4 },
	"elven_mini/deep_tomb/ogre_alcove": { level: 4, partySize: 4 },
	"elven_mini/deep_tomb/steward_court": { level: 4, partySize: 4 },
	"elven_mini/deep_tomb/wight_niche_a": { level: 4, partySize: 4 },
	"elven_mini/deep_tomb/wight_niche_b": { level: 4, partySize: 4 },
};
