import { ALIGNMENT_TAG_PREFIX } from "../../../character-creation/alignment-units";
import { LANGUAGE_TAG_PREFIX } from "../../../character-creation/language-units";
import {
	creatureSizeRankByCategory,
	SIZE_RESOURCE_ID,
	SPECIES_TAG_PREFIX,
} from "../../../character-origins/species-units";
import {
	RESOURCEFUL_TRAIT_TAG,
	skillfulProofSkillCapabilityId,
} from "../../../character-origins/trait-units";
import { CLASS_TAG_PREFIX } from "../../../classes/classes-units";
import {
	SECOND_WIND_CAPABILITY_ID,
	SECOND_WIND_USES_INITIAL,
	SECOND_WIND_USES_RESOURCE_ID,
} from "../../../classes/fighter-units";
import { skilledProofSkillCapabilityIds } from "../../../feats/skilled-units";
import type { VerbCall } from "../../../verb-runner";
import { AC_RESOURCE_ID } from "../../armor-class-units";
import { CREATURE_NICHE_TAG, PLAYER_CHARACTER_TAG } from "../../creature-type-units";
import { GAMING_SET_DICE_PROFICIENCY_CAPABILITY_ID } from "../../equipment-proficiencies-units";
import { SPEED_WALK_RESOURCE_ID } from "../../fragments/grid";
import { TELEPATHY_CAPABILITY_ID } from "../../fragments/speech";
import { SPEED_WALK_INITIAL } from "../../grid-units";
import { BUNDLE_ID } from "../../index";
import { PROFICIENCY_BONUS_STATE_ID } from "../../modifier-units";
import { REACH_RESOURCE_ID, STANDARD_REACH_MM } from "../../reach-units";
import { BACKGROUND_TAG_PREFIX } from "../../tag-value-vocabulary";
import { VOCAL_COMMUNICATION_TAG } from "../../vocal-communication-identity-units";
import {
	ALL_CHECKS,
	PROOF_ATHLETICS_SKILL_CAPABILITY_ID,
	PROOF_BUNDLE_ID,
	PROOF_CHA_STATE_ID,
	PROOF_CHA_VALUE,
	PROOF_CON_STATE_ID,
	PROOF_CON_VALUE,
	PROOF_DEX_SAVE_PROFICIENCY_CAPABILITY_ID,
	PROOF_DEX_STATE_ID,
	PROOF_DEX_VALUE,
	PROOF_ENTITY_DEF_ID,
	PROOF_ENTITY_DEF_LOCAL_ID,
	PROOF_HERO_HP,
	PROOF_HERO_HP_STATE_ID,
	PROOF_HP_PER_LEVEL_STATE_ID,
	PROOF_HP_PER_LEVEL_VALUE,
	PROOF_INT_STATE_ID,
	PROOF_INT_VALUE,
	PROOF_LEVEL_STATE_ID,
	PROOF_LEVEL_VALUE,
	PROOF_MOVEMENT_REACH,
	PROOF_MOVEMENT_REACH_STATE_ID,
	PROOF_PLACE_NODE_ID,
	PROOF_PROFICIENCY_BONUS,
	PROOF_REACTION_HIT_AC,
	PROOF_REACTION_RESOLUTION_CAPABILITY_ID,
	PROOF_SKILL_ID,
	PROOF_SPAWN_KEY_PREFIX,
	PROOF_STEALTH_SKILL_CAPABILITY_ID,
	PROOF_STEALTH_VS_PASSIVE_PERCEPTION_CHECK_CAP,
	PROOF_STR_STATE_ID,
	PROOF_STR_VALUE,
	PROOF_TRAVERSAL_CAPABILITY_ID,
	PROOF_WIS_STATE_ID,
	PROOF_WIS_VALUE,
	PROOF_XP_STATE_ID,
	PROOF_XP_VALUE,
} from "..";

// C3 (Ability-Score Generation, `ledger/character-creation.md`'s "Standing
// pattern" addendum: vocabulary never ships unattached). Alignment is an
// AUTHORIAL choice for the hero (no SRD stat block governs a player
// character's alignment) — Lawful Good, a conventional heroic-PC pick, never
// derived from a source table. Languages: Common (every player character
// knows it, `character-creation.md:204`) plus Elvish, ALSO an authorial
// choice (a player picks their second/third language; nothing in the SRD
// mandates one for an unspecified species/background).
const HERO_ALIGNMENT_TAG = `${ALIGNMENT_TAG_PREFIX}.lawful-good`; // authorial choice
const HERO_LANGUAGE_COMMON_TAG = `${LANGUAGE_TAG_PREFIX}.common`;
const HERO_LANGUAGE_SECOND_TAG = `${LANGUAGE_TAG_PREFIX}.elvish`; // authorial choice

// O1 (Character Origins Backgrounds, `ledger/character-origins.md`'s
// "Standing pattern" instruction): the proof HERO takes the SOLDIER
// background (an AUTHORIAL choice — nothing forces a proof hero into any
// particular background) and receives its concrete grants:
//   - `srd.background.soldier` tag (background-units.ts's own O1 identity).
//   - Athletics ('srd/skill/athletics'): the hero ALREADY carries this
//     capability (C5, PROOF_ATHLETICS_SKILL_CAPABILITY_ID above) — a
//     genuine no-op, kept as a single grant row rather than duplicated, and
//     noted here honestly rather than silently overlapping.
//   - Intimidation ('srd/skill/intimidation'): a NET-NEW grant to the hero,
//     disjoint from every skill capability already on this list.
//   - Gaming Set (Dice) proficiency: the concrete authorial pick for
//     Soldier's open "Choose one kind of Gaming Set" (see
//     `equipment-proficiencies-units.ts`).
//   - Savage Attacker ('srd/feat/savage-attacker'): reference-only — the
//     feat entity already ships as F1 identity and carries NO mechanic
//     (deferred-with-owner, `ledger/designs/finding-58-post-roll-reroll-
//     intervention.md`), so there is no capability to grant; only the
//     background's own description names it.
const HERO_BACKGROUND_SOLDIER_TAG = `${BACKGROUND_TAG_PREFIX}.soldier`; // authorial choice
const HERO_INTIMIDATION_SKILL_CAPABILITY_ID = `${BUNDLE_ID}/skill/intimidation`;

// O2 (Character Origins Species, `ledger/character-origins.md`'s "Standing
// pattern" instruction): the proof HERO takes the Human species (an
// AUTHORIAL choice, same posture as its Soldier background above) —
// srd.species.human tag, Medium srd.creature_size tag, and the def-level
// srd/size + srd/speed-walk seeds species-units.ts's own entity calls also
// author. GROUNDED first (this file's own header claim): this def had NO
// srd/speed-walk state before this slice — the identity proof scene reads
// movement through its own decoupled `proof/movement_reach` resource
// (`shared.ts`'s `PROOF_MOVEMENT_REACH_STATE_ID`, a scene design predating
// grid traversal), so seeding the real srd/speed-walk value here is a
// genuinely NEW row, never a re-seed of an existing one (this package's own
// combat-arena proof scene, a DIFFERENT entity def, is the one live grid
// consumer of srd/speed-walk — `combat-arena.ts`'s own header).
const HERO_SPECIES_HUMAN_TAG = `${SPECIES_TAG_PREFIX}.human`; // authorial choice
const HERO_CREATURE_SIZE_MEDIUM_TAG = "srd.creature_size.medium";

// O3 (Character Origins Traits, `ledger/character-origins.md`'s O3 row): the
// hero's Human species carries the FIXED Resourceful trait (not a choice —
// every Human has it) — tagged directly on the hero's own def, the same
// "grant lives on the def, no inheritance from a species entity" idiom O1/O2
// already established. Skillful's own grant (ALSO a fixed Human trait, but
// its skill pick IS an authorial choice) is a real srd/skill/<slug>
// capability, same shape as F1 Skilled's own proof grant below.
const HERO_TRAIT_RESOURCEFUL_TAG = RESOURCEFUL_TRAIT_TAG;
const HERO_SKILLFUL_SKILL_CAPABILITY_ID = skillfulProofSkillCapabilityId();
const HERO_SIZE_MEDIUM_RANK = creatureSizeRankByCategory().Medium;
if (HERO_SIZE_MEDIUM_RANK === undefined) {
	throw new Error("identity: no 'Medium' rank in creatureSizeRankByCategory().");
}

// K1 (Classes, `ledger/classes.md`'s "Standing pattern" instruction): the
// hero is the Fighter exemplar — `srd.class.fighter`, an AUTHORIAL choice
// (same posture as its Human species/Soldier background above), naming the
// REAL `srd/class/fighter` entity_definitions row K1 ships
// (`classes-units.ts`). Vocabulary-only: this hero entity is its own
// SEPARATE `srd_proof/hero` definition, not
// `srd/class/fighter` itself, and this substrate has no entity-definition
// inheritance mechanism (no "parent" field) — so tagging the hero does not
// pull `srd/class/fighter`'s own `entity_definition_initial_state` seeds
// (hit-die, hp_per_level) onto it. See `identity.ts`'s own header (this
// file's sibling) for how `PROOF_HP_PER_LEVEL_VALUE` relates to K1's now-real
// class writer.
const HERO_CLASS_FIGHTER_TAG = `${CLASS_TAG_PREFIX}.fighter`;

// K2 (Classes, Fighter vertical, `ledger/classes.md`'s K2 row): Second Wind
// mechanized LIVE. The hero's own entity def
// (`srd_proof/hero`) is NOT `srd/class/fighter` (this
// substrate has no entity-definition inheritance — K1's own header above),
// so the sister's "inherited by every Fighter instance" shape does not reach
// it automatically; this proof grants the SAME capability + seeds the SAME
// resource EXPLICITLY on the hero, the identical posture O1/O2/O3/C4/C5/F1
// already use for their own cross-chapter proof grants (`classes/index.ts`'s
// own K2 module header explains why the ship-time `srd/class/fighter`
// auto-inheritance grant itself is deferred, not built this same commit).

export const IDENTITY_DEFINITION_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_define_entity_type",
		label: "proof-entity-def",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: PROOF_ENTITY_DEF_LOCAL_ID,
			display_name: "Identity Proof Hero",
			description:
				"TEST-ONLY hero blueprint carrying inherited srd/skill/perception + srd/skill/" +
				"athletics capabilities, proof Dexterity-save proficiency, and definition-level " +
				"str/dex/con/int/wis/cha/level plus srd/hp seeds (C3: all six ability scores are " +
				"the Fighter Standard Array column, `character-creation.md:355`) — " +
				"proves the Playing the Game ability/skill identity rows are usable by a real " +
				"entity, not just well-formed TOML. Tagged with the C1/C2 identity vocabulary " +
				"(C3 'vocabulary never ships unattached' addendum): one srd.alignment.* value and " +
				"two srd.language.* values, both authorial choices (see this file's own header). " +
				"O1 (Character Origins): also tagged with the Soldier background " +
				"(srd.background.soldier, authorial choice) and granted its concrete Intimidation " +
				"+ Gaming Set (Dice) proficiency capabilities below. O2 (Character Origins Species): " +
				"also tagged with the Human species (srd.species.human, srd.creature_size.medium, " +
				"authorial choice) and seeded with its def-level srd/size (Medium) + srd/speed-walk " +
				"(30 ft / 6 cells) structural facts — this file's own O2 header above. K1 (Classes): " +
				"also tagged with the Fighter class (srd.class.fighter, authorial choice) — " +
				"vocabulary only, this file's own K1 header above. K2 (Classes, Fighter vertical): " +
				"also granted Second Wind's own capability + seeded with 2 srd/fighter/second-wind-uses " +
				"— an EXPLICIT proof grant (this substrate has no class-definition inheritance), this " +
				"file's own K2 header above.",
			// C3 (`ledger/character-creation.md`'s "Standing pattern" addendum):
			// the hero is the FIRST proof actor tagged with the C1 alignment +
			// C2 language vocabulary — both authorial choices, marked as such
			// above this call list. O1: also tagged with its chosen Soldier
			// background (same "standing pattern" idiom).
			tags: [
				// Stable actor identities own the universal and PC-only attempt
				// packages. The direct grants below are only authored training,
				// proof infrastructure, or class features.
				CREATURE_NICHE_TAG,
				PLAYER_CHARACTER_TAG,
				HERO_ALIGNMENT_TAG,
				HERO_LANGUAGE_COMMON_TAG,
				HERO_LANGUAGE_SECOND_TAG,
				HERO_BACKGROUND_SOLDIER_TAG,
				HERO_SPECIES_HUMAN_TAG,
				HERO_CREATURE_SIZE_MEDIUM_TAG,
				// Vocal modality, separate from the two language-competence tags
				// above. This tag is the only source of the proof hero's Speak grant.
				VOCAL_COMMUNICATION_TAG,
				// O3 (Character Origins Traits): Resourceful is a FIXED Human trait
				// (not a choice) — the Long-Rest completion action's own species-gate
				// reads exactly this tag (rest.ts's own O3-consumer comment).
				HERO_TRAIT_RESOURCEFUL_TAG,
				// K1 (Classes): the Fighter exemplar tag — vocabulary only, this
				// file's own K1 header above.
				HERO_CLASS_FIGHTER_TAG,
			],
			// Direct grants are deliberately narrower than creature/PC identity:
			// proficiencies, proof-only actions, and class/background choices.
			initial_capabilities: [
				{ capability: PROOF_SKILL_ID },
				{ capability: PROOF_ATHLETICS_SKILL_CAPABILITY_ID },
				{ capability: PROOF_REACTION_RESOLUTION_CAPABILITY_ID },
				{ capability: PROOF_DEX_SAVE_PROFICIENCY_CAPABILITY_ID },
				{ capability: PROOF_TRAVERSAL_CAPABILITY_ID },
				// C5 (Passive Perception): the hero is the ACTING entity of the
				// stealth-vs-passive-perception check (its own claimed
				// connection, the stable rail every other check uses — the
				// guard-acted variant hit claim contention, finding #84):
				// Stealth skill-identity capability (the +PB proficiency term)
				// plus the check's own eligibility capability.
				{ capability: PROOF_STEALTH_SKILL_CAPABILITY_ID },
				{ capability: PROOF_STEALTH_VS_PASSIVE_PERCEPTION_CHECK_CAP },
				// F1 (Feats, Skilled — "fully mechanized" tier,
				// `feats/skilled-units.ts`'s own header): the proof hero's
				// concrete, AUTHORIAL-CHOICE Skilled grant — three already-
				// mechanized srd/skill/* capabilities (History/Investigation/
				// Insight, disjoint from the hero's existing Perception/
				// Athletics/Stealth grants above), proving Skilled's
				// prose-only "three skills of your choice" as a real
				// background->feat->capability GRANT, not a new mechanic.
				...skilledProofSkillCapabilityIds().map((capability) => ({ capability })),
				...ALL_CHECKS.map((check) => ({ capability: check.capabilityId })),
				// O1 (Character Origins, Soldier background — this file's own O1
				// header above): Intimidation is a NET-NEW skill grant (disjoint
				// from every capability already listed); Gaming Set (Dice) is the
				// concrete authorial pick for Soldier's Tool Proficiency. Athletics
				// is DELIBERATELY NOT re-listed here — the hero already carries
				// PROOF_ATHLETICS_SKILL_CAPABILITY_ID above, and this substrate has
				// no "grant twice" concept; the no-op is the honest verdict.
				{ capability: HERO_INTIMIDATION_SKILL_CAPABILITY_ID },
				{ capability: GAMING_SET_DICE_PROFICIENCY_CAPABILITY_ID },
				// O3 (Character Origins Traits, Skillful — "capability-grant class",
				// trait-units.ts's own header): the hero's concrete, AUTHORIAL-CHOICE
				// Skillful pick is Arcana, disjoint from every skill capability
				// already granted above (Perception, Athletics, Stealth, History,
				// Investigation, Insight, Intimidation — 7 of 18 taken).
				{ capability: HERO_SKILLFUL_SKILL_CAPABILITY_ID },
				// K2 (Classes, Fighter vertical): Second Wind's own gate capability
				// — an EXPLICIT proof grant, this file's own K2 header above.
				{ capability: SECOND_WIND_CAPABILITY_ID },
				// sk-0m4.33: proof-only grant so the live telepathy beat can fire
				// without putting the verb on the vocal tag. Aldwin's adventure
				// grant lives in author/elven-mini/dm-npc.ts.
				{ capability: TELEPATHY_CAPABILITY_ID },
			],
			initial_states: [
				{ state: REACH_RESOURCE_ID, value_int: STANDARD_REACH_MM },
				{ state: PROOF_STR_STATE_ID, value_int: PROOF_STR_VALUE },
				{ state: PROOF_DEX_STATE_ID, value_int: PROOF_DEX_VALUE },
				// C3: con/int were previously unseeded (defaulting to the six
				// ability resources' shared initial_value 10) — now explicit,
				// completing all six scores to the Fighter Standard Array column.
				{ state: PROOF_CON_STATE_ID, value_int: PROOF_CON_VALUE },
				{ state: PROOF_INT_STATE_ID, value_int: PROOF_INT_VALUE },
				{ state: PROOF_WIS_STATE_ID, value_int: PROOF_WIS_VALUE },
				// D20 trio: level 5 -> proficiency bonus +3 (pinned offline).
				{ state: PROOF_LEVEL_STATE_ID, value_int: PROOF_LEVEL_VALUE },
				{ state: PROFICIENCY_BONUS_STATE_ID, value_int: PROOF_PROFICIENCY_BONUS },
				// Generic-check verb rework (the proof-scene design record): CHA 12 ->
				// modifier +1 (C3 re-derive: was CHA 10 -> modifier 0), so the
				// Influence-shaped Persuasion check's total modifier is +1 (hero
				// unproficient in Persuasion — see `checks.ts`'s own
				// PROOF_GENERIC_PERSUASION_DERIVED_DC re-derivation).
				{ state: PROOF_CHA_STATE_ID, value_int: PROOF_CHA_VALUE },
				{ state: PROOF_HERO_HP_STATE_ID, value_int: PROOF_HERO_HP },
				{ state: AC_RESOURCE_ID, value_int: PROOF_REACTION_HIT_AC },
				{ state: PROOF_MOVEMENT_REACH_STATE_ID, value_int: PROOF_MOVEMENT_REACH },
				// C4 (Level Advancement, "vocabulary never ships unattached"): xp=0
				// matches srd/xp's own initial_value (explicit for discoverability);
				// hp_per_level is the Fixed HP by Class table's Fighter row FLAT
				// number (see identity.ts's own header for the Con-modifier caveat).
				{ state: PROOF_XP_STATE_ID, value_int: PROOF_XP_VALUE },
				{ state: PROOF_HP_PER_LEVEL_STATE_ID, value_int: PROOF_HP_PER_LEVEL_VALUE },
				// O2 (Character Origins Species): the Human species' own def-level
				// structural facts — Medium srd/size rank, 30 ft (6 cells)
				// srd/speed-walk — this file's own O2 header above.
				{ state: SIZE_RESOURCE_ID, value_int: HERO_SIZE_MEDIUM_RANK },
				{ state: SPEED_WALK_RESOURCE_ID, value_int: SPEED_WALK_INITIAL },
				// K2 (Classes, Fighter vertical): Second Wind's own uses seed —
				// this file's own K2 header above.
				{ state: SECOND_WIND_USES_RESOURCE_ID, value_int: SECOND_WIND_USES_INITIAL },
			],
		},
	},
];

export const IDENTITY_SPAWN_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_place_actor",
		label: "proof-actor-placement",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "player",
			entity_def: PROOF_ENTITY_DEF_ID,
			at: PROOF_PLACE_NODE_ID,
			key_prefix: PROOF_SPAWN_KEY_PREFIX,
			description: "TEST-ONLY spawned instance for the ability/skill identity proof.",
		},
	},
];
