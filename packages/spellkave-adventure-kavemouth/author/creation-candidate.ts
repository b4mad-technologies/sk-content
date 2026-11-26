// DOC-IMPL: scenario-blueprints#blueprints-derive-universal-behavior-from-identity
/** Unplaced creation blueprint. DM acts spawn world-owned playable vessels. */
import { creationSheetStateIds } from "@spellkave/adventure-runtime/dm/creation";
import { ASK_ABOUT_ADVANCEMENT_CAPABILITY_ID } from "@spellkave/adventure-runtime/dm/level-up";
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import {
	CREATURE_NICHE_TAG,
	HP_ID,
	LEVEL_ID,
	PLAYER_CHARACTER_TAG,
	REACH_RESOURCE_ID,
	SPEED_WALK_MAX,
	SPEED_WALK_RESOURCE_ID,
	SRD_BUNDLE_ID,
	STANDARD_REACH_MM,
	VOCAL_COMMUNICATION_TAG,
} from "@spellkave/adventure-runtime/srd-ids";
import type { AuthorTarget } from "@spellkave/tool-authoring";
import { BUNDLE, GRAPHS, nodeId } from "./lib/ids.ts";
import {
	questAcceptedState,
	questProgressOnHero,
	questRewardedState,
	questXpAwardedState,
} from "./quest-progress.ts";
import { QUESTS } from "./quests.ts";

export const CREATION_LIMBO_NODE_ID = nodeId(GRAPHS.creation_limbo, "station");

export const ADVENTURE_CANDIDATE_DEF_LOCAL_ID = "adventure/candidate";
export const ADVENTURE_CANDIDATE_DEF_ID = `${BUNDLE}/${ADVENTURE_CANDIDATE_DEF_LOCAL_ID}`;
export const ADVENTURE_CANDIDATE_DISPLAY_NAME = "Creation Candidate";

/** srd/level's own floor — a "not yet created" candidate cannot legally
 * read 0 (`level-units.ts`'s `min_value = 1`). */
export const CANDIDATE_LEVEL_FLOOR = 1;
export const CANDIDATE_HP_FLOOR = 0;
/** All six ability resources' own floor (`abilities.toml`). */
export const CANDIDATE_ABILITY_FLOOR = 0;
/** Same ceiling `hero.ts` seeds the pregen hero with — the safety-bound
 * maximum, not a class/species-derived value (the candidate has neither yet). */
export const CANDIDATE_SPEED_WALK_CELLS = SPEED_WALK_MAX;

export const CANDIDATE_LEVEL_STATE_ID = `${SRD_BUNDLE_ID}/${LEVEL_ID}`;
export const CANDIDATE_HP_STATE_ID = `${SRD_BUNDLE_ID}/${HP_ID}`;
export const CANDIDATE_STR_STATE_ID = `${SRD_BUNDLE_ID}/str`;
export const CANDIDATE_DEX_STATE_ID = `${SRD_BUNDLE_ID}/dex`;
export const CANDIDATE_CON_STATE_ID = `${SRD_BUNDLE_ID}/con`;
export const CANDIDATE_INT_STATE_ID = `${SRD_BUNDLE_ID}/int`;
export const CANDIDATE_WIS_STATE_ID = `${SRD_BUNDLE_ID}/wis`;
export const CANDIDATE_CHA_STATE_ID = `${SRD_BUNDLE_ID}/cha`;

/** The creation-limbo place_graph — one node, no edges declared here, no map/backdrop.
 * The DM threshold is supplied elsewhere. */
export function creationLimbo(): VerbCall[] {
	return [
		{
			toolName: "spellkave_author_place",
			label: "author-creation-limbo",
			params: {
				bundle: BUNDLE,
				// "indoor", not "outdoor": keeps this node OUT of the H3 world-compose
				// render (adventure-outdoor-h3.jpg) alongside region/hamlet — an
				// outdoor substrate anchors at real cell_res10=0, which visually
				// overlapped the region graph's own crossroads origin. "indoor"
				// matches inn/tomb's own exclusion from that composite; the limbo
				// has no real-world position anyway (live-verified via regen diff).
				substrate: "indoor",
				description:
					"A quiet pause before the adventure, where Aldwin helps you choose who you will be before entering the inn.",
				nodes: [
					{
						id: CREATION_LIMBO_NODE_ID,
						name: "Creation Limbo",
						description:
							"Aldwin waits with you as you choose your identity. When you are ready, the inn lies to the northeast.",
					},
				],
				edges: [],
			},
		},
	];
}

/** The instance is created by the authored open-seat act, never a manifest placement. */
export function candidateOccupancy(target?: AuthorTarget): VerbCall[] {
	const definitions = new Map(
		(target?.lookup("resource_definitions") ?? []).map((row) => [
			String(row.resource_definition_id),
			row,
		]),
	);
	const seeds = new Map(
		creationSheetStateIds(target).map((state) => [
			state,
			Math.max(0, Number(definitions.get(state)?.min_value ?? 0)),
		]),
	);
	for (const [state, value] of [
		[REACH_RESOURCE_ID, STANDARD_REACH_MM],
		[CANDIDATE_LEVEL_STATE_ID, CANDIDATE_LEVEL_FLOOR],
		[SPEED_WALK_RESOURCE_ID, CANDIDATE_SPEED_WALK_CELLS],
		["dm/creation/kit-granted", 0],
		["kavemouth/companion/stone-carried", 0],
		["kavemouth/companion/bond-recorded", 0],
		["kavemouth/quest/flag/q9_tomb_opened", 0],
		...QUESTS.map((quest) => [questXpAwardedState(quest.id), 0] as const),
		...QUESTS.filter((q) => questProgressOnHero(q.id)).flatMap(
			(q) =>
				[
					[questAcceptedState(q.id), 0],
					[questRewardedState(q.id), 0],
				] as const,
		),
	] as const)
		seeds.set(state, value);
	return [
		{
			toolName: "spellkave_define_entity_type",
			label: "define-creation-candidate",
			params: {
				bundle: BUNDLE,
				id: ADVENTURE_CANDIDATE_DEF_LOCAL_ID,
				display_name: ADVENTURE_CANDIDATE_DISPLAY_NAME,
				description:
					"An unplaced blueprint for a world-owned hero, completed through authored DM acts.",
				tags: [
					CREATURE_NICHE_TAG,
					PLAYER_CHARACTER_TAG,
					VOCAL_COMMUNICATION_TAG,
					"srd.faction.party",
					"srd.party.heroes",
				],
				initial_capabilities: [
					{ capability: "srd/action/short-rest" },
					{ capability: ASK_ABOUT_ADVANCEMENT_CAPABILITY_ID },
					{ capability: "kavemouth/quest/open-tomb" },
					// Party membership serves Aldwin's watches, but is not consent to
					// see every other account's body and speech across the world.
					// Combat visibility already comes from session-peer sight.
				],
				initial_conditions: [{ condition: "dm/creation/drafting" }],
				initial_states: [
					...[...seeds].map(([state, value_int]) => ({ state, value_int })),
					{ state: "srd/appearance", value_text: "" },
					{ state: "srd/backstory", value_text: "" },
				],
			},
		},
	];
}
