// pattern: none — authored kavemouth encounter audience, not runtime rules.
/**
 * Levels follow docs/kavemouth-storyline.md §2 and quests.md's rung catalog.
 * Solo is the default; later fights retain the storyline's companion party.
 * The camp captain and lodge owlbear require all four party members: these
 * encounters remain an owner progression decision, not a statblock rewrite.
 */
export const ENCOUNTER_TARGETS: Record<string, { level: number; partySize: number }> = {
	"kavemouth/inn/cellar": { level: 1, partySize: 1 },
	"kavemouth/stonebridge/bridge_mid": { level: 1, partySize: 1 },
	"kavemouth/village/green": { level: 1, partySize: 1 },
	"kavemouth/tomb/hall": { level: 1, partySize: 1 },
	"kavemouth/tomb/crypt": { level: 1, partySize: 1 },
	"kavemouth/mill/fork": { level: 2, partySize: 3 },
	"kavemouth/mill/altar": { level: 2, partySize: 3 },
	"kavemouth/war_camp/tent_row": { level: 2, partySize: 3 },
	"kavemouth/war_camp/command_tent": { level: 2, partySize: 4 },
	"kavemouth/war_camp/worg_pens": { level: 2, partySize: 3 },
	"kavemouth/hesper_lodge/tree_line": { level: 2, partySize: 3 },
	"kavemouth/hesper_lodge/clearing": { level: 2, partySize: 4 },
	"kavemouth/goblin_warren/common_den": { level: 2, partySize: 3 },
	"kavemouth/goblin_warren/guard_post": { level: 2, partySize: 3 },
	"kavemouth/goblin_warren/chief_hall": { level: 2, partySize: 3 },
	"kavemouth/swamp/hag_hut": { level: 3, partySize: 4 },
	"kavemouth/swamp/frog_pool": { level: 3, partySize: 4 },
	"kavemouth/swamp/will_o_wisp_glade": { level: 3, partySize: 4 },
	"kavemouth/mine/skeleton_gallery": { level: 3, partySize: 4 },
	"kavemouth/mine/ghoul_den": { level: 3, partySize: 4 },
	"kavemouth/mine/lower_hall": { level: 3, partySize: 4 },
	"kavemouth/mine/durgan_crypt": { level: 3, partySize: 4 },
	"kavemouth/shrine/shadow_crypt": { level: 3, partySize: 4 },
	"kavemouth/shrine/nave": { level: 3, partySize: 4 },
	// Q11 is rung III even though the well is accessible from the hamlet.
	"kavemouth/well/wererat_nest": { level: 3, partySize: 4 },
	"kavemouth/well/depth_hall": { level: 3, partySize: 4 },
	"kavemouth/well/ooze_pool": { level: 3, partySize: 4 },
	"kavemouth/deep_tomb/zombie_hall": { level: 4, partySize: 4 },
	"kavemouth/deep_tomb/ogre_alcove": { level: 4, partySize: 4 },
	"kavemouth/deep_tomb/steward_court": { level: 4, partySize: 4 },
	"kavemouth/deep_tomb/wight_niche_a": { level: 4, partySize: 4 },
	"kavemouth/deep_tomb/wight_niche_b": { level: 4, partySize: 4 },
};
