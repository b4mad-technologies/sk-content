// DOC-IMPL: capabilities-and-identity#the-capability-bridges
// DOC-IMPL: capabilities-and-identity#what-srdcreature-grants
// DOC-IMPL: capabilities-and-identity#check-attempt-is-not-skill-proficiency
// DOC-IMPL: capabilities-and-identity#identities-that-do-not-mean-universal-behavior
// DOC-IMPL: capabilities-and-identity#scenario-authoring-rule
// DOC-IMPL: tags-and-ids#tags-can-be-live-identity-not-only-metadata
/**
 * Universal creature attempts, expressed once as `srd.creature` tag grants.
 *
 * The source boundary is deliberately narrower than the SRD vocabulary. The
 * cached Actions table names twelve common actions, but this package currently
 * ships complete verb paths for only Attack, Dodge, Dash, Help, and Utilize
 * (the carried-gear verbs Spread Caltrops and Spill Ball Bearings,
 * sk-jay0.3.19.6). Those five, walking, dropping prone, standing up, resting,
 * picking up a loose item, using a consumable, and the 24 real generic-check
 * verbs are granted here. Disengage/Hide/Influence/Magic/Ready/Search/Study
 * remain identity rows only and therefore do not earn a grant yet.
 *
 * `srd/skill/*` never appears here. Those capabilities mean proficiency and
 * only affect the bonus inside a skill check; `srd/check/*` is the separate
 * universal eligibility axis for attempting that check at all.
 *
 * Source anchors:
 * - cache/markdown/playing-the-game.md § Actions, Ability Checks, Movement,
 *   Short Rest, Long Rest
 * - cache/markdown/rules-glossary.md § Speed, Help [Action], Dash [Action],
 *   Prone [Condition]
 */
import { buildActionUnits } from "./actions-units";
import { BUNDLE_ID } from "./constants";
import { CREATURE_NICHE_TAG } from "./creature-type-units";
import { CONSUME_CAPABILITY_ID } from "./fragments/consume";
import { DASH_CAPABILITY_ID } from "./fragments/dash";
import { DODGE_CAPABILITY_ID } from "./fragments/dodge";
import { DROP_PRONE_CAPABILITY_ID } from "./fragments/drop-prone";
import { HELP_CAPABILITY_ID } from "./fragments/help";
import { PICKUP_CAPABILITY_ID } from "./fragments/pickup";
import { LONG_REST_CAPABILITY_ID, SHORT_REST_CAPABILITY_ID } from "./fragments/rest";
import { STAND_UP_CAPABILITY_ID } from "./fragments/stand-up";
import { buildGenericCheckSubjects, genericCheckCapabilitySuffix } from "./generic-check-units";
import { WALK_CAPABILITY_ID } from "./grid-units";
import { ATTACK_ACTION_CAPABILITY_SUFFIX } from "./unarmed-strike-units";

/** `srd/action/utilize` (actions.toml, from the SRD Actions table). */
const UTILIZE_CAPABILITY_ID = `${BUNDLE_ID}/action/utilize`;

export interface CreatureCapabilityGrantUnit {
	tag: string;
	capabilityId: string;
	/** Why creature identity, rather than training, equipment, or scenario state, owns this attempt. */
	rationale: string;
}

const IMPLEMENTED_UNIVERSAL_ACTIONS = [
	{
		slug: "attack",
		capabilityId: `${BUNDLE_ID}/${ATTACK_ACTION_CAPABILITY_SUFFIX}`,
		rationale:
			"The shared Attack umbrella always exposes Unarmed Strike; matching equipped items add weapon variants separately.",
	},
	{
		slug: "dodge",
		capabilityId: DODGE_CAPABILITY_ID,
		rationale: "Dodge is a shipped universal self-action, not training or equipment.",
	},
	{
		slug: "dash",
		capabilityId: DASH_CAPABILITY_ID,
		rationale:
			"Dash is a shipped universal self-action (sk-0m4.123): spend the Primary action, gain " +
			"one full extra Movement pool for the turn.",
	},
	{
		slug: "help",
		capabilityId: HELP_CAPABILITY_ID,
		rationale: "Help is a shipped universal creature action; its own target rules still gate use.",
	},
	{
		slug: "utilize",
		capabilityId: UTILIZE_CAPABILITY_ID,
		rationale:
			"Utilize is the SRD's universal action for operating a nonmagical object; the carried " +
			"gear verbs that name it (Caltrops, Ball Bearings, sk-jay0.3.19.6) gate on carrying the item.",
	},
] as const;

function implementedUniversalActionUnits(): CreatureCapabilityGrantUnit[] {
	const sourcedActions = new Set(buildActionUnits().map((unit) => unit.slug));
	for (const action of IMPLEMENTED_UNIVERSAL_ACTIONS) {
		if (!sourcedActions.has(action.slug)) {
			throw new Error(
				`creature-identity: implemented action '${action.slug}' disappeared from the cached SRD Actions table.`,
			);
		}
	}
	return IMPLEMENTED_UNIVERSAL_ACTIONS.map((action) => ({
		tag: CREATURE_NICHE_TAG,
		capabilityId: action.capabilityId,
		rationale: action.rationale,
	}));
}

/** The complete currently implemented universal attempt package. */
export function buildCreatureCapabilityGrantUnits(): CreatureCapabilityGrantUnit[] {
	return [
		{
			tag: CREATURE_NICHE_TAG,
			capabilityId: WALK_CAPABILITY_ID,
			rationale:
				"Every SRD creature definition carries walking Speed; the seeded value, including 0, constrains actual reach.",
		},
		...implementedUniversalActionUnits(),
		{
			tag: CREATURE_NICHE_TAG,
			capabilityId: DROP_PRONE_CAPABILITY_ID,
			rationale: "Dropping prone is a shipped universal self-action with no training gate.",
		},
		{
			tag: CREATURE_NICHE_TAG,
			capabilityId: STAND_UP_CAPABILITY_ID,
			rationale:
				"Standing up from Prone is a shipped universal self-action (sk-0m4.123 part 3), " +
				"gated on the Prone condition rather than training or equipment.",
		},
		{
			tag: CREATURE_NICHE_TAG,
			capabilityId: SHORT_REST_CAPABILITY_ID,
			rationale:
				"Short Rest is a creature recovery attempt; its effect depends on carried resources.",
		},
		{
			tag: CREATURE_NICHE_TAG,
			capabilityId: LONG_REST_CAPABILITY_ID,
			rationale:
				"Long Rest is a creature recovery attempt; its effect depends on carried resources.",
		},
		{
			tag: CREATURE_NICHE_TAG,
			capabilityId: PICKUP_CAPABILITY_ID,
			rationale:
				"Picking up a loose item is a shipped universal object interaction " +
				"(sk-jay0.1.23.36.22.4); no narrower 'can handle objects' identity tag exists in " +
				"this bundle yet — flagged over-wide (rats/oozes also receive it) by a findingGap " +
				"beside character-identity-units.test.ts's own creature-grant assertions.",
		},
		{
			tag: CREATURE_NICHE_TAG,
			capabilityId: CONSUME_CAPABILITY_ID,
			rationale:
				"Drinking a carried potion is a shipped universal action (sk-jay0.1.23.36.22.10; one " +
				"srd/consume verb targeting the held potion since sk-jay0.1.23.36.22.17); an affordance " +
				"template with an empty capability_id is never disclosed, so the consume templates " +
				"need a capability every creature holds. Over-wide like pickup, " +
				"for the same reason: no narrower 'can handle objects' identity tag exists yet.",
		},
		...buildGenericCheckSubjects().map(
			(subject): CreatureCapabilityGrantUnit => ({
				tag: CREATURE_NICHE_TAG,
				capabilityId: `${BUNDLE_ID}/${genericCheckCapabilitySuffix(subject)}`,
				rationale:
					`Any creature may attempt the shipped ${subject.displayName} check; ` +
					"a separate srd/skill/* capability conditionally adds proficiency.",
			}),
		),
	];
}

export function buildCreatureCapabilityGrantRows(): {
	tag: string;
	capability_id: string;
	bundle_id: string;
}[] {
	return buildCreatureCapabilityGrantUnits().map((unit) => ({
		tag: unit.tag,
		capability_id: unit.capabilityId,
		bundle_id: BUNDLE_ID,
	}));
}
