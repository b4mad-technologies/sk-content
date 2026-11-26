// pattern: milestone-gate-terminal-flags
/**
 * The four quest endings that are no kill (bead sk-jay0.3.4.11, batch for
 * sk-jay0.1.55.60.3). `author/quests.toml` gives Q4, Q5 and Q7 the terminal
 * "the leader is dead OR a flag is set" and Q10 "the shadows are dead AND a
 * flag is set". The quest source bound each flag to a state from the start;
 * no resource defined the state and nothing wrote it, so the no-fight ending
 * of Q4, Q5 and Q7 did not exist and Q10 could not be finished at all.
 *
 * SHAPE, the one `tomb-key.ts` (Q9) and `q3-delivery.ts` (Q3) use: a
 * resource for the public milestone, one capability every hero holds through
 * its party tag, a niche attached to the place where the deed is done, and
 * one verb there that sets the flag on the hero. The first write is a zero
 * delta, so a hero made before these rows existed gets the flag, and no gate
 * reads the flag (a read of a state the actor never had fails closed).
 *
 * Two kinds of deed:
 * - spoken to the leader (Q4, Q7): the verb's target is the living leader of
 *   that place (`srd.creature.role.leader`, not Dead). The storyline keeps
 *   the leader's parley open while it lives (docs/kavemouth-storyline.md
 *   section 6); this verb is that offer taken. The leader stays where it is
 *   and carries the peace condition from then on (`on-sight.ts`): the DM
 *   opens no fight when the hero comes back to it.
 * - done at a place (Q5, Q10): the hero acts on itself where it stands.
 *
 * The verbs cost the hero's action. None of them reads who else is in the
 * room: the manifest cannot ask whether a leader's followers still live.
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { BUNDLE, GRAPHS, nodeId } from "./lib/ids.ts";
import { PEACE_CONDITION_ID, PEACE_CONDITION_LOCAL_ID } from "./on-sight.ts";
import { questFlagState } from "./quests.ts";

export const QUEST_MILESTONE_CAPABILITY_ID = `${BUNDLE}/quest/milestone-deeds`;

const HERO_TAG = "srd.party.heroes";
const PRIMARY_CHANNEL_ID = "srd/economy_channel/primary";
const LIVING_LEADER =
	"target.has_tag('srd.creature.role.leader') && target.status('srd/condition/dead') == false";

export interface QuestMilestone {
	quest: string;
	flag: string;
	/** Local id of the verb and of its niche. */
	slug: string;
	node: string;
	/** `leader`: spoken to the living leader there. `place`: done by the hero where it stands. */
	deed: "leader" | "place";
	flagName: string;
	flagDescription: string;
	nicheName: string;
	nicheDescription: string;
	verbName: string;
	verbDescription: string;
}

export const QUEST_MILESTONES: readonly QuestMilestone[] = [
	{
		quest: "Q4",
		flag: "q4_maelis_surrendered",
		slug: "accept-maelis-surrender",
		node: nodeId(GRAPHS.mill, "altar"),
		deed: "leader",
		flagName: "Sister Maelis has yielded",
		flagDescription: "Sister Maelis gave up the Chaff cult to the hero.",
		nicheName: "The mill altar",
		nicheDescription: "The altar of the Chaff cult, where Sister Maelis keeps her vigil.",
		verbName: "Call on Sister Maelis to yield",
		verbDescription:
			"You tell Sister Maelis that the mill is lost and that she may walk out of it alive. She lowers her blade and gives up the cult.",
	},
	{
		quest: "Q5",
		flag: "q5_camp_burned",
		slug: "burn-the-camp",
		node: nodeId(GRAPHS.war_camp, "cookfire"),
		deed: "place",
		flagName: "The raiders' camp has burned",
		flagDescription: "The hero set Warcaptain Ghorza's camp alight.",
		nicheName: "The camp cookfire",
		nicheDescription: "The cookfire at the heart of the war camp, ringed by dry canvas.",
		verbName: "Set the camp alight",
		verbDescription:
			"You pull a burning brand from the cookfire and put it to the tents. The camp goes up; the raids from here are over.",
	},
	{
		quest: "Q7",
		flag: "q7_truce",
		slug: "strike-truce-with-grubnash",
		node: nodeId(GRAPHS.goblin_warren, "chief_hall"),
		deed: "leader",
		flagName: "Truce with Grubnash",
		flagDescription: "Grubnash agreed to keep his goblins off the road.",
		nicheName: "Grubnash's hall",
		nicheDescription: "The chief's hall of the warren, where Grubnash holds court.",
		verbName: "Strike a truce with Grubnash",
		verbDescription:
			"You offer Grubnash a bargain: his warren stays his, and his goblins stay off the road. He spits, and takes it.",
	},
	{
		quest: "Q10",
		flag: "q10_altar_relit",
		slug: "relight-the-altar",
		node: nodeId(GRAPHS.shrine, "altar"),
		deed: "place",
		flagName: "The shrine altar burns again",
		flagDescription: "The hero relit the altar of the Twin Lamps.",
		nicheName: "The altar of the Twin Lamps",
		nicheDescription: "The cold altar of the shrine, its lamps long out.",
		verbName: "Relight the altar",
		verbDescription:
			"You trim the wicks and light the altar lamps. Sun and moon stand in the flame again. The shrine is only clean once its shadows are gone.",
	},
];

export function questMilestoneDefinitions(): VerbCall[] {
	const peace: VerbCall = {
		toolName: "spellkave_define_condition",
		label: "milestone-peace-condition",
		params: {
			bundle: BUNDLE,
			id: PEACE_CONDITION_LOCAL_ID,
			display_name: "At peace with the party",
			description:
				"This creature has yielded to the party or struck a truce with it. It does not start a fight when the party comes near.",
		},
	};
	return [peace, ...questMilestoneFlags()];
}

function questMilestoneFlags(): VerbCall[] {
	return QUEST_MILESTONES.map((milestone) => ({
		toolName: "spellkave_define_resource",
		label: `milestone-flag-${milestone.flag}`,
		params: {
			bundle: BUNDLE,
			id: `quest/flag/${milestone.flag}`,
			display_name: milestone.flagName,
			description: milestone.flagDescription,
			min_value: 0,
			max_value: 1,
			initial_value: 0,
			recovery_rule: "persistent",
		},
	}));
}

export function questMilestoneActions(): VerbCall[] {
	return [
		{
			toolName: "spellkave_define_capability",
			label: "milestone-capability",
			params: {
				bundle: BUNDLE,
				id: "quest/milestone-deeds",
				actor_kind: "entity",
				display_name: "Quest deeds",
				description:
					"End a quest by a deed other than a kill: a surrender, a truce, a fire, a relit altar.",
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "milestone-grant-to-heroes",
			params: {
				bundle: BUNDLE,
				kind: "tag_capability_grant",
				rows: [{ bundle_id: BUNDLE, tag: HERO_TAG, capability_id: QUEST_MILESTONE_CAPABILITY_ID }],
			},
		},
		...QUEST_MILESTONES.flatMap((milestone): VerbCall[] => {
			const resource = questFlagState(milestone.flag);
			const nicheId = `${BUNDLE}/niche/${milestone.slug}`;
			return [
				{
					toolName: "spellkave_define_niche",
					label: `milestone-niche-${milestone.slug}`,
					params: {
						bundle: BUNDLE,
						id: `niche/${milestone.slug}`,
						display_name: milestone.nicheName,
						description: milestone.nicheDescription,
					},
				},
				{
					toolName: "spellkave_write_rows",
					label: `milestone-place-${milestone.slug}`,
					params: {
						bundle: BUNDLE,
						kind: "spatial_niche_attachments",
						rows: [{ bundle_id: BUNDLE, place_node_id: milestone.node, niche_id: nicheId }],
					},
				},
				{
					toolName: "spellkave_define_action_verb",
					label: `milestone-verb-${milestone.slug}`,
					params: {
						bundle: BUNDLE,
						id: `quest/${milestone.slug}`,
						required_capability: QUEST_MILESTONE_CAPABILITY_ID,
						niche_id: nicheId,
						display_name: milestone.verbName,
						description: milestone.verbDescription,
						...(milestone.deed === "leader"
							? { predicate_source: LIVING_LEADER, self_eligible: false }
							: { self_eligible: true, self_only: true }),
						spends_channel: PRIMARY_CHANNEL_ID,
						cost_time_ms: 0,
						range_m: 0,
						consequence: {
							description: `Records on the hero: ${milestone.flagDescription}`,
							frame_writes: [
								{ ModifyResource: { actor: "Actor", resource, delta_source: "0" } },
								{
									ModifyResource: {
										actor: "Actor",
										resource,
										delta_source: `1 - actor.stat('${resource}')`,
									},
								},
								...(milestone.deed === "leader"
									? [
											{
												ApplyStatus: {
													condition_definition_id: PEACE_CONDITION_ID,
													target_kind: "entity",
													target_ref: "TargetActor",
												},
											},
										]
									: []),
							],
						},
					},
				},
			];
		}),
	];
}
