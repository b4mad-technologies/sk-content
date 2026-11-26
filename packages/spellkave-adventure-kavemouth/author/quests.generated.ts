// Generated from author/quests.toml by scripts/compile-npc-quests.ts.
// Edit the TOML; this is a static compatibility loader, not an authored catalog.
export const COMPILED_QUEST_SOURCE = {
	"quests": [
		{
			"id": "Q1",
			"name": "Rats in the Cellar",
			"rung": "I",
			"giverKey": "kavemouth/adventure/npc/aldwin_1",
			"giverName": "Aldwin",
			"acceptSlot": 1,
			"declineSlot": 2,
			"promptId": 1,
			"slotAcceptText": "The cellar is overrun — I'll clear it.",
			"slotDeclineText": "Not today.",
			"objective": "Clear the inn cellar of a giant rat and the swarm.",
			"terminal": {
				"kind": "all_dead",
				"deadKeys": [
					"kavemouth/adventure/encounter/cellar_rat_1",
					"kavemouth/adventure/encounter/cellar_swarm_1"
				]
			},
			"rewardXp": 100,
			"killXpCreatures": [
				{
					"slug": "giant-rat",
					"count": 1
				},
				{
					"slug": "swarm-of-rats",
					"count": 1
				}
			]
		},
		{
			"id": "Q2",
			"name": "Road Watch",
			"rung": "I",
			"giverKey": "kavemouth/adventure/npc/ysolde_1",
			"giverName": "Captain Ysolde Farwind",
			"acceptSlot": 1,
			"declineSlot": 2,
			"promptId": 2,
			"slotAcceptText": "I'll escort Jory to the gate.",
			"slotDeclineText": "Another time.",
			"objective": "Escort Jory from the Stonebridge to the hamlet gate alive.",
			"terminal": {
				"kind": "escort_alive_at",
				"escortKey": "kavemouth/adventure/npc/jory_1",
				"atNodeId": "kavemouth/hamlet/gate"
			},
			"rewardXp": 75,
			"killXpCreatures": [
				{
					"slug": "wolf",
					"count": 1
				}
			]
		},
		{
			"id": "Q3",
			"name": "Tamsin's Basket",
			"rung": "I",
			"giverKey": "kavemouth/adventure/npc/tamsin_1",
			"giverName": "Old Tamsin",
			"acceptSlot": 1,
			"declineSlot": 2,
			"promptId": 3,
			"slotAcceptText": "I'll fetch the moonpetal.",
			"slotDeclineText": "Not tonight.",
			"objective": "Fetch moonpetal from the village green and deliver it.",
			"terminal": {
				"kind": "has_item",
				"itemKey": "kavemouth/adventure/item/moonpetal_1",
				"flag": "q3_delivered"
			},
			"rewardXp": 25,
			"killXpCreatures": [
				{
					"slug": "stirge",
					"count": 1
				}
			]
		},
		{
			"id": "Q4",
			"name": "The Silent Mill",
			"rung": "II",
			"giverKey": "kavemouth/adventure/npc/ysolde_1",
			"giverName": "Captain Ysolde Farwind",
			"acceptSlot": 1,
			"declineSlot": 2,
			"promptId": 4,
			"slotAcceptText": "I'll end the Chaff cult.",
			"slotDeclineText": "Later.",
			"objective": "End Sister Maelis — dead or surrendered.",
			"terminal": {
				"kind": "any_dead_or_flag",
				"anyDeadKeys": [
					"kavemouth/adventure/encounter/sister_maelis_1"
				],
				"flag": "q4_maelis_surrendered"
			},
			"rewardXp": 200,
			"killXpCreatures": [
				{
					"slug": "cultist",
					"count": 4
				},
				{
					"slug": "cultist-fanatic",
					"count": 1
				}
			]
		},
		{
			"id": "Q5",
			"name": "Break the Raid",
			"rung": "II",
			"giverKey": "kavemouth/adventure/npc/ysolde_1",
			"giverName": "Captain Ysolde Farwind",
			"acceptSlot": 1,
			"declineSlot": 2,
			"promptId": 5,
			"slotAcceptText": "I'll stop Ghorza's raids.",
			"slotDeclineText": "Not yet.",
			"objective": "Stop Warcaptain Ghorza — dead or camp burned.",
			"terminal": {
				"kind": "any_dead_or_flag",
				"anyDeadKeys": [
					"kavemouth/adventure/encounter/warcaptain_ghorza_1"
				],
				"flag": "q5_camp_burned"
			},
			"rewardXp": 250,
			"killXpCreatures": [
				{
					"slug": "hobgoblin-warrior",
					"count": 3
				},
				{
					"slug": "hobgoblin-captain",
					"count": 1
				},
				{
					"slug": "worg",
					"count": 2
				}
			]
		},
		{
			"id": "Q6",
			"name": "The Lodge Fire",
			"rung": "II",
			"giverKey": "kavemouth/adventure/npc/hesper_1",
			"giverName": "Hesper of the Lodge",
			"acceptSlot": 1,
			"declineSlot": 2,
			"promptId": 6,
			"slotAcceptText": "I'll stand with you at dusk.",
			"slotDeclineText": "I must pass.",
			"objective": "Defend the lodge; Hesper survives.",
			"terminal": {
				"kind": "all_dead_and_alive",
				"deadKeys": [
					"kavemouth/adventure/encounter/lodge_spider_1",
					"kavemouth/adventure/encounter/lodge_spider_2",
					"kavemouth/adventure/encounter/lodge_owlbear_1"
				],
				"aliveKey": "kavemouth/adventure/npc/hesper_1"
			},
			"rewardXp": 100,
			"killXpCreatures": [
				{
					"slug": "giant-spider",
					"count": 2
				},
				{
					"slug": "owlbear",
					"count": 1
				}
			]
		},
		{
			"id": "Q7",
			"name": "Grubnash's Warren",
			"rung": "II",
			"giverKey": "kavemouth/adventure/npc/vessk_1",
			"giverName": "Vessk",
			"acceptSlot": 1,
			"declineSlot": 2,
			"promptId": 7,
			"slotAcceptText": "I'll clear the warren.",
			"slotDeclineText": "Not my fight.",
			"objective": "Clear or subdue Grubnash's warren.",
			"terminal": {
				"kind": "any_dead_or_flag",
				"anyDeadKeys": [
					"kavemouth/adventure/encounter/grubnash_1"
				],
				"flag": "q7_truce"
			},
			"rewardXp": 200,
			"bonusXp": 50,
			"bonusFlag": "q7_truce",
			"killXpCreatures": [
				{
					"slug": "goblin-minion",
					"count": 6
				},
				{
					"slug": "goblin-warrior",
					"count": 2
				},
				{
					"slug": "goblin-boss",
					"count": 1
				}
			]
		},
		{
			"id": "Q8",
			"name": "Ulda's Bargain",
			"rung": "III",
			"giverKey": "kavemouth/adventure/npc/tamsin_1",
			"giverName": "Old Tamsin",
			"acceptSlot": 1,
			"declineSlot": 2,
			"promptId": 8,
			"slotAcceptText": "I'll recover the cult relic.",
			"slotDeclineText": "Too dangerous.",
			"objective": "Recover the cult relic from the hag — fight or trade.",
			"terminal": {
				"kind": "has_item",
				"itemKey": "kavemouth/adventure/item/cult_relic_1"
			},
			"rewardXp": 300,
			"killXpCreatures": [
				{
					"slug": "green-hag",
					"count": 1
				},
				{
					"slug": "giant-frog",
					"count": 2
				},
				{
					"slug": "will-o-wisp",
					"count": 1
				}
			]
		},
		{
			"id": "Q9",
			"name": "The Ironfold Key",
			"rung": "III",
			"giverKey": "kavemouth/adventure/npc/ysolde_1",
			"giverName": "Captain Ysolde Farwind",
			"acceptSlot": 1,
			"declineSlot": 2,
			"promptId": 9,
			"slotAcceptText": "I'll take the mine and the key.",
			"slotDeclineText": "Not ready.",
			"objective": "Recover Durgan's ward-key in the mine, then spend it at the sealed stair in the upper tomb's crypt.",
			"terminal": {
				"kind": "flag",
				"itemKey": "kavemouth/adventure/item/tomb_key_1",
				"flag": "q9_tomb_opened"
			},
			"rewardXp": 500,
			"killXpCreatures": [
				{
					"slug": "skeleton",
					"count": 4
				},
				{
					"slug": "ghoul",
					"count": 2
				},
				{
					"slug": "ghast",
					"count": 1
				},
				{
					"slug": "wight",
					"count": 1
				}
			]
		},
		{
			"id": "Q10",
			"name": "The Twin Lamps",
			"rung": "III",
			"giverKey": "kavemouth/adventure/npc/caddoc_1",
			"giverName": "Brother Caddoc",
			"acceptSlot": 1,
			"declineSlot": 2,
			"promptId": 10,
			"slotAcceptText": "I'll cleanse the shrine.",
			"slotDeclineText": "Another day.",
			"objective": "Clear the shadows and relight the altar.",
			"terminal": {
				"kind": "all_dead_and_flag",
				"deadKeys": [
					"kavemouth/adventure/encounter/shrine_shadow_1",
					"kavemouth/adventure/encounter/shrine_shadow_2",
					"kavemouth/adventure/encounter/shrine_shadow_3",
					"kavemouth/adventure/encounter/shrine_specter_1"
				],
				"flag": "q10_altar_relit"
			},
			"rewardXp": 250,
			"killXpCreatures": [
				{
					"slug": "shadow",
					"count": 3
				},
				{
					"slug": "specter",
					"count": 1
				}
			]
		},
		{
			"id": "Q11",
			"name": "Whispers in the Well",
			"rung": "III",
			"giverKey": "kavemouth/adventure/innkeeper_1",
			"giverName": "Mira",
			"acceptSlot": 1,
			"declineSlot": 2,
			"promptId": 11,
			"slotAcceptText": "I'll see what's under the well.",
			"slotDeclineText": "Keep the drinks coming.",
			"objective": "Clear the wererat nest under the hamlet well.",
			"terminal": {
				"kind": "all_dead",
				"deadKeys": [
					"kavemouth/adventure/encounter/well_wererat_1",
					"kavemouth/adventure/encounter/well_wererat_2",
					"kavemouth/adventure/encounter/well_rat_1",
					"kavemouth/adventure/encounter/well_rat_2",
					"kavemouth/adventure/encounter/well_rat_3",
					"kavemouth/adventure/encounter/well_rat_4",
					"kavemouth/adventure/encounter/well_ooze_1"
				]
			},
			"rewardXp": 200,
			"killXpCreatures": [
				{
					"slug": "wererat",
					"count": 2
				},
				{
					"slug": "giant-rat",
					"count": 4
				},
				{
					"slug": "gray-ooze",
					"count": 1
				}
			]
		},
		{
			"id": "Q12",
			"name": "The Pale Steward",
			"rung": "finale",
			"giverKey": "kavemouth/adventure/npc/aldwin_1",
			"giverName": "Aldwin",
			"acceptSlot": 1,
			"declineSlot": 2,
			"promptId": 12,
			"slotAcceptText": "I'll open the deep tomb.",
			"slotDeclineText": "Not yet.",
			"objective": "End the Pale Steward under the tomb.",
			"terminal": {
				"kind": "all_dead",
				"deadKeys": [
					"kavemouth/adventure/encounter/pale_steward_1"
				]
			},
			"rewardXp": 800,
			"killXpCreatures": [
				{
					"slug": "goblin-warrior",
					"count": 1
				},
				{
					"slug": "zombie",
					"count": 4
				},
				{
					"slug": "ogre-zombie",
					"count": 1
				},
				{
					"slug": "specter",
					"count": 1
				},
				{
					"slug": "wight",
					"count": 2
				}
			]
		}
	],
	"promptLinesByQuest": {
		"Q1": {
			"greeting": "Aldwin taps the ledger. The cellar is overrun with rats — a giant one, and a swarm in the casks. Clear them and the inn keeps a room for you.",
			"accept": "Good. The hatch is off the stairs. Come back when the cellar is quiet.",
			"decline": "As you will. The barrels can wait a day — not two.",
			"complete": "The cellar is clear. One hundred experience for the work — I'll mark the ledger."
		},
		"Q2": {
			"greeting": "Captain Ysolde Farwind nods from the gate. Jory is stranded at the river.",
			"accept": "Bring Jory to this gate alive. Wolves pack the bridge.",
			"decline": "Then keep the road in mind.",
			"complete": "Jory is safe. The watch owes you."
		},
		"Q3": {
			"greeting": "Old Tamsin clutches an empty basket. Moonpetal only opens at night on the green.",
			"accept": "Fetch the moonpetal and bring it to me.",
			"decline": "The brew can wait.",
			"complete": "Bless you. Take these potions — and rest."
		},
		"Q4": {
			"greeting": "Ysolde's jaw tightens. The mill is silent for the wrong reasons.",
			"accept": "End Sister Maelis. Dead or kneeling — the cult stops.",
			"decline": "The mill will keep rotting.",
			"complete": "The mill is quiet again. Well fought."
		},
		"Q5": {
			"greeting": "Raid smoke on the road. Ghorza's banners.",
			"accept": "Break the raid. Ghorza falls or the camp burns.",
			"decline": "Then stay off the east road.",
			"complete": "The road is clear. The watch drinks tonight."
		},
		"Q6": {
			"greeting": "Hesper of the Lodge regards you. Work needs doing — The Lodge Fire.",
			"accept": "Defend the lodge; Hesper survives. Return when it is done.",
			"decline": "Very well. The valley will wait — for a while.",
			"complete": "It is done. The Lodge Fire is closed — Aldwin will see the ledger updated."
		},
		"Q7": {
			"greeting": "Vessk hisses from the brush. Grubnash grows bold.",
			"accept": "Clear the warren — or make the boss take a truce.",
			"decline": "Then Vessk watches alone.",
			"complete": "The warren is settled. Vessk pays in scrap and thanks."
		},
		"Q8": {
			"greeting": "Tamsin lowers her voice. Ulda Reedwife has the cult's relic.",
			"accept": "Recover the relic — by steel or by bargain.",
			"decline": "The swamp keeps its secrets.",
			"complete": "The relic is home. Careful with swamp debts."
		},
		"Q9": {
			"greeting": "Ysolde and Caddoc share a look. The mine holds Durgan's key.",
			"accept": "Recover the Ironfold ward-key in the mine. Spend it in the upper tomb's crypt to open the sealed deep stair; the ward consumes its key.",
			"decline": "The tomb can stay shut a little longer.",
			"complete": "The ward is broken. The deep stair is open to your party. Tell Aldwin you are ready."
		},
		"Q10": {
			"greeting": "Brother Caddoc wrings his hands. The shrine is dark.",
			"accept": "Drive out the shadows and relight the altar.",
			"decline": "I will pray until you can.",
			"complete": "Light returns. Walk with my blessing."
		},
		"Q11": {
			"greeting": "Mira leans in. Something scratches under the well.",
			"accept": "See to the nest. The square will sleep better.",
			"decline": "Another mug, then.",
			"complete": "Quiet under the stones. Drink's on the house."
		},
		"Q12": {
			"greeting": "The deep tomb is open enough to enter. What sleeps under the Warden answers to the Pale Steward. End it, and the valley may breathe again.",
			"accept": "Take the crypt stair when you are ready. Caddoc will aid if he can reach you.",
			"decline": "Wisely cautious. The Steward will keep.",
			"complete": "The Steward is gone. Eight hundred experience — and the next chapter of the valley begins beyond level four."
		}
	},
	"spokenLinesByQuest": {
		"Q1": {
			"greeting": "Aldwin taps the ledger. The cellar is overrun with rats — a giant one, and a swarm in the casks. Clear them and the inn keeps a room for you.",
			"accept": "Good. The hatch is off the stairs. Come back when the cellar is quiet.",
			"decline": "As you will. The barrels can wait a day — not two.",
			"complete": "The cellar is clear. One hundred experience for the work — I'll mark the ledger."
		},
		"Q2": {
			"greeting": "Captain Ysolde Farwind nods from the gate. Jory is stranded at the river.",
			"accept": "Bring Jory to this gate alive. Wolves pack the bridge.",
			"decline": "Then keep the road in mind.",
			"complete": "Jory is safe. The watch owes you."
		},
		"Q3": {
			"greeting": "Old Tamsin clutches an empty basket. Moonpetal only opens at night on the green.",
			"accept": "Fetch the moonpetal and bring it to me.",
			"decline": "The brew can wait.",
			"complete": "Bless you. Take these potions — and rest."
		},
		"Q4": {
			"greeting": "Ysolde's jaw tightens. The mill is silent for the wrong reasons.",
			"accept": "End Sister Maelis. Dead or kneeling — the cult stops.",
			"decline": "The mill will keep rotting.",
			"complete": "The mill is quiet again. Well fought."
		},
		"Q5": {
			"greeting": "Raid smoke on the road. Ghorza's banners.",
			"accept": "Break the raid. Ghorza falls or the camp burns.",
			"decline": "Then stay off the east road.",
			"complete": "The road is clear. The watch drinks tonight."
		},
		"Q6": {
			"greeting": "Hesper of the Lodge wipes sap from a hatchet. Dusk brings spiders — and worse. Stand with me?",
			"accept": "Good. Hold the porch line. When the clearing falls quiet, I walk with you.",
			"decline": "Very well. The valley will wait — for a while.",
			"complete": "The lodge stands. I am with you now — first companion of the valley road."
		},
		"Q7": {
			"greeting": "Vessk hisses from the brush. Grubnash grows bold.",
			"accept": "Clear the warren — or make the boss take a truce.",
			"decline": "Then Vessk watches alone.",
			"complete": "The warren is settled. Vessk pays in scrap and thanks."
		},
		"Q8": {
			"greeting": "Tamsin lowers her voice. Ulda Reedwife has the cult's relic.",
			"accept": "Recover the relic — by steel or by bargain.",
			"decline": "The swamp keeps its secrets.",
			"complete": "The relic is home. Careful with swamp debts."
		},
		"Q9": {
			"greeting": "Ysolde and Caddoc share a look. The mine holds Durgan's key.",
			"accept": "Recover the Ironfold ward-key in the mine. Spend it in the upper tomb's crypt to open the sealed deep stair; the ward consumes its key.",
			"decline": "The tomb can stay shut a little longer.",
			"complete": "The ward is broken. The deep stair is open to your party. Tell Aldwin you are ready."
		},
		"Q10": {
			"greeting": "Brother Caddoc wrings his hands. The shrine is dark — will you cleanse it with me?",
			"accept": "Bless you. Drive the shadows from the altar; I will hold the rite.",
			"decline": "Very well. The valley will wait — for a while.",
			"complete": "The altar burns again. Take my blessing — and my company. I heal the lowest among us first."
		},
		"Q11": {
			"greeting": "Mira leans in. Something scratches under the well.",
			"accept": "See to the nest. The square will sleep better.",
			"decline": "Another mug, then.",
			"complete": "Quiet under the stones. Drink's on the house."
		},
		"Q12": {
			"greeting": "The deep tomb is open enough to enter. What sleeps under the Warden answers to the Pale Steward. End it, and the valley may breathe again.",
			"accept": "Take the crypt stair when you are ready. Caddoc will aid if he can reach you.",
			"decline": "Wisely cautious. The Steward will keep.",
			"complete": "The Steward is gone. Eight hundred experience — and the next chapter of the valley begins beyond level four."
		}
	},
	"bindingsByQuest": {
		"Q1": {
			"minimum_level": 1,
			"progress_home": "self",
			"progress_state_id": "kavemouth/quest/Q1/accepted",
			"rewarded_state_id": "kavemouth/quest/Q1/rewarded",
			"awarded_state_id": "kavemouth/quest/Q1/xp-awarded",
			"acceptance_action_id": "kavemouth/quest/Q1/accept",
			"award_action_id": "kavemouth/dm/award-quest-xp/Q1",
			"settle_action_id": "kavemouth/dm/settle-quest/Q1"
		},
		"Q2": {
			"minimum_level": 1,
			"progress_home": "visitor",
			"progress_state_id": "kavemouth/quest/Q2/accepted",
			"rewarded_state_id": "kavemouth/quest/Q2/rewarded",
			"awarded_state_id": "kavemouth/quest/Q2/xp-awarded",
			"acceptance_action_id": "kavemouth/quest/Q2/accept",
			"award_action_id": "kavemouth/dm/award-quest-xp/Q2",
			"settle_action_id": "kavemouth/dm/settle-quest/Q2"
		},
		"Q3": {
			"minimum_level": 1,
			"progress_home": "self",
			"progress_state_id": "kavemouth/quest/Q3/accepted",
			"rewarded_state_id": "kavemouth/quest/Q3/rewarded",
			"awarded_state_id": "kavemouth/quest/Q3/xp-awarded",
			"acceptance_action_id": "kavemouth/quest/Q3/accept",
			"award_action_id": "kavemouth/dm/award-quest-xp/Q3",
			"settle_action_id": "kavemouth/dm/settle-quest/Q3"
		},
		"Q4": {
			"minimum_level": 2,
			"progress_home": "visitor",
			"progress_state_id": "kavemouth/quest/Q4/accepted",
			"rewarded_state_id": "kavemouth/quest/Q4/rewarded",
			"awarded_state_id": "kavemouth/quest/Q4/xp-awarded",
			"acceptance_action_id": "kavemouth/quest/Q4/accept",
			"award_action_id": "kavemouth/dm/award-quest-xp/Q4",
			"settle_action_id": "kavemouth/dm/settle-quest/Q4"
		},
		"Q5": {
			"minimum_level": 2,
			"progress_home": "visitor",
			"progress_state_id": "kavemouth/quest/Q5/accepted",
			"rewarded_state_id": "kavemouth/quest/Q5/rewarded",
			"awarded_state_id": "kavemouth/quest/Q5/xp-awarded",
			"acceptance_action_id": "kavemouth/quest/Q5/accept",
			"award_action_id": "kavemouth/dm/award-quest-xp/Q5",
			"settle_action_id": "kavemouth/dm/settle-quest/Q5"
		},
		"Q6": {
			"minimum_level": 2,
			"progress_home": "self",
			"progress_state_id": "kavemouth/quest/Q6/accepted",
			"rewarded_state_id": "kavemouth/quest/Q6/rewarded",
			"awarded_state_id": "kavemouth/quest/Q6/xp-awarded",
			"acceptance_action_id": "kavemouth/quest/Q6/accept",
			"award_action_id": "kavemouth/dm/award-quest-xp/Q6",
			"settle_action_id": "kavemouth/dm/settle-quest/Q6"
		},
		"Q7": {
			"minimum_level": 2,
			"progress_home": "self",
			"progress_state_id": "kavemouth/quest/Q7/accepted",
			"rewarded_state_id": "kavemouth/quest/Q7/rewarded",
			"awarded_state_id": "kavemouth/quest/Q7/xp-awarded",
			"acceptance_action_id": "kavemouth/quest/Q7/accept",
			"award_action_id": "kavemouth/dm/award-quest-xp/Q7",
			"settle_action_id": "kavemouth/dm/settle-quest/Q7"
		},
		"Q8": {
			"minimum_level": 3,
			"progress_home": "self",
			"progress_state_id": "kavemouth/quest/Q8/accepted",
			"rewarded_state_id": "kavemouth/quest/Q8/rewarded",
			"awarded_state_id": "kavemouth/quest/Q8/xp-awarded",
			"acceptance_action_id": "kavemouth/quest/Q8/accept",
			"award_action_id": "kavemouth/dm/award-quest-xp/Q8",
			"settle_action_id": "kavemouth/dm/settle-quest/Q8"
		},
		"Q9": {
			"minimum_level": 3,
			"progress_home": "visitor",
			"progress_state_id": "kavemouth/quest/Q9/accepted",
			"rewarded_state_id": "kavemouth/quest/Q9/rewarded",
			"awarded_state_id": "kavemouth/quest/Q9/xp-awarded",
			"acceptance_action_id": "kavemouth/quest/Q9/accept",
			"award_action_id": "kavemouth/dm/award-quest-xp/Q9",
			"settle_action_id": "kavemouth/dm/settle-quest/Q9"
		},
		"Q10": {
			"minimum_level": 3,
			"progress_home": "self",
			"progress_state_id": "kavemouth/quest/Q10/accepted",
			"rewarded_state_id": "kavemouth/quest/Q10/rewarded",
			"awarded_state_id": "kavemouth/quest/Q10/xp-awarded",
			"acceptance_action_id": "kavemouth/quest/Q10/accept",
			"award_action_id": "kavemouth/dm/award-quest-xp/Q10",
			"settle_action_id": "kavemouth/dm/settle-quest/Q10"
		},
		"Q11": {
			"minimum_level": 3,
			"progress_home": "self",
			"progress_state_id": "kavemouth/quest/Q11/accepted",
			"rewarded_state_id": "kavemouth/quest/Q11/rewarded",
			"awarded_state_id": "kavemouth/quest/Q11/xp-awarded",
			"acceptance_action_id": "kavemouth/quest/Q11/accept",
			"award_action_id": "kavemouth/dm/award-quest-xp/Q11",
			"settle_action_id": "kavemouth/dm/settle-quest/Q11"
		},
		"Q12": {
			"minimum_level": 4,
			"progress_home": "self",
			"progress_state_id": "kavemouth/quest/Q12/accepted",
			"rewarded_state_id": "kavemouth/quest/Q12/rewarded",
			"awarded_state_id": "kavemouth/quest/Q12/xp-awarded",
			"acceptance_action_id": "kavemouth/quest/Q12/accept",
			"award_action_id": "kavemouth/dm/award-quest-xp/Q12",
			"settle_action_id": "kavemouth/dm/settle-quest/Q12"
		}
	},
	"runtimeBindings": {
		"hero_blueprint_id": "kavemouth/adventure/candidate",
		"level_state_id": "srd/level",
		"drafting_condition_id": "dm/creation/drafting",
		"answer_count": 2,
		"flag_state_ids": {
			"q3_delivered": "kavemouth/quest/flag/q3_delivered",
			"q4_maelis_surrendered": "kavemouth/quest/flag/q4_maelis_surrendered",
			"q5_camp_burned": "kavemouth/quest/flag/q5_camp_burned",
			"q7_truce": "kavemouth/quest/flag/q7_truce",
			"q9_tomb_opened": "kavemouth/quest/flag/q9_tomb_opened",
			"q10_altar_relit": "kavemouth/quest/flag/q10_altar_relit"
		},
		"vocabulary": {
			"speechTraceKindId": "srd/speech",
			"speakActionId": "srd/speak-to",
			"choiceActions": {
				"dm/dialog/choice/1": 1,
				"dm/dialog/choice/2": 2
			},
			"openActions": {
				"0": "dm/dialog/open/set/0",
				"2": "dm/dialog/open/set/2"
			},
			"promptActions": {
				"0": "dm/dialog/prompt/set/0",
				"1": "dm/dialog/prompt/set/1",
				"2": "dm/dialog/prompt/set/2",
				"3": "dm/dialog/prompt/set/3",
				"4": "dm/dialog/prompt/set/4",
				"5": "dm/dialog/prompt/set/5",
				"6": "dm/dialog/prompt/set/6",
				"7": "dm/dialog/prompt/set/7",
				"8": "dm/dialog/prompt/set/8",
				"9": "dm/dialog/prompt/set/9",
				"10": "dm/dialog/prompt/set/10",
				"11": "dm/dialog/prompt/set/11",
				"12": "dm/dialog/prompt/set/12"
			}
		}
	}
} as const;
