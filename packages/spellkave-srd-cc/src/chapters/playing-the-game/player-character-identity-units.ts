// DOC-IMPL: capabilities-and-identity#check-attempt-is-not-skill-proficiency
// DOC-IMPL: capabilities-and-identity#identities-that-do-not-mean-universal-behavior
// DOC-IMPL: tags-and-ids#tags-can-be-live-identity-not-only-metadata
/**
 * The PC-only verb package, expressed ONCE against `srd.player_character`.
 *
 * ## What this replaces
 *
 * Before the identity bridge existed, every hero repeated the same
 * `entity_definition_initial_capability` rows by hand — elven-mini's Aldwin
 * carried eleven, seven of them pure hero verbs, and hero number two would
 * have carried the same seven again. That is the "a rule the world should
 * select, expressed as a hand-maintained list" bug class this package
 * retires on the actor-side gate, the same way `fragments/generic.ts`
 * retired it on the target-side niche.
 *
 * ## Why these three, and not others
 *
 * The test is "does *being a character* entitle you to attempt it", i.e. is
 * the verb about the person rather than about their training, their kit, or
 * their place. Included:
 *
 *  - **Level Up** — the advancement verb; a stat block does not level.
 *  - **Claim Victory** — the XP verb; only a character has an XP total to
 *    claim into. Its own affordance is still fully gated (`target.status(
 *    'srd/condition/dead') && target.stat('srd/xp_value') >= 1`), so the
 *    grant hands out an ATTEMPT, never an outcome.
 *  - **Heroic Inspiration reroll** — Heroic Inspiration is a
 *    character-only resource by definition.
 *
 * Deliberately EXCLUDED, and why:
 *
 *  - Walking, Attack/Unarmed Strike, Dodge, Help, Drop Prone, rests, and
 *    `srd/check/*` — universal attempts granted once from `srd.creature` by
 *    `creature-identity-units.ts`.
 *  - `srd/skill/*` — trained proficiencies. A character has *some* skills,
 *    never all of them; that is a class/background choice, not identity.
 *  - Class features (`srd/class-feature/**`) — sourced live from
 *    `srd.advancement_grant` metadata at class-grant time
 *    (`dm/creation`), a strictly narrower axis than identity.
 *
 * ## Why a grant and not a status
 *
 * See `server/src/tag_capability_grant.rs`'s module doc. Short version: the
 * capability IS the actor-side gate, evaluated before predicate evaluation;
 * modelling identity as something each authored predicate must remember to
 * check is the per-template-remembering failure mode sk-dms.39 and
 * sk-dms.40.1 each demonstrated once.
 */
import {
	CLAIM_VICTORY_CAPABILITY_ID,
	LEVEL_UP_CAPABILITY_ID,
} from "../character-creation/advancement-units";
import { BUNDLE_ID } from "./constants";
import { PLAYER_CHARACTER_TAG } from "./creature-type-units";
import { HEROIC_INSPIRATION_REROLL_CAPABILITY_ID } from "./fragments/heroic-inspiration";

/** One `tag_capability_grant` manifest row, pre-`bundle_id`. */
export interface PlayerCharacterCapabilityGrantUnit {
	tag: string;
	capabilityId: string;
	/** Why identity — not training, kit, or place — entitles this verb. */
	rationale: string;
}

/**
 * The three verbs `srd.player_character` grants. Every id is imported from the
 * fragment that DEFINES the capability — never re-typed as a literal, so a
 * renamed capability breaks the build instead of silently granting nothing.
 */
export function buildPlayerCharacterCapabilityGrantUnits(): PlayerCharacterCapabilityGrantUnit[] {
	return [
		{
			tag: PLAYER_CHARACTER_TAG,
			capabilityId: LEVEL_UP_CAPABILITY_ID,
			rationale: "Advancement is a character's own axis; a stat block does not level.",
		},
		{
			tag: PLAYER_CHARACTER_TAG,
			capabilityId: CLAIM_VICTORY_CAPABILITY_ID,
			rationale:
				"Only a character carries an XP total to claim into; the affordance's own predicate still gates the attempt on a dead target with unclaimed srd/xp_value.",
		},
		{
			tag: PLAYER_CHARACTER_TAG,
			capabilityId: HEROIC_INSPIRATION_REROLL_CAPABILITY_ID,
			rationale: "Heroic Inspiration is a character-only resource by definition.",
		},
	];
}

/** The manifest rows, ready for `spellkave_write_rows`. */
export function buildPlayerCharacterCapabilityGrantRows(): {
	tag: string;
	capability_id: string;
	bundle_id: string;
}[] {
	return buildPlayerCharacterCapabilityGrantUnits().map((unit) => ({
		tag: unit.tag,
		capability_id: unit.capabilityId,
		bundle_id: BUNDLE_ID,
	}));
}
