import { fixedHitPointsPerLevelForClass } from "../../../markdown/character-creation";
import { HP_PER_LEVEL_ID, XP_ID } from "../../character-creation/advancement-units";
import { standardArrayForClass } from "../../character-creation/creation-tables-units";
import { guaranteedFailureDc, guaranteedSuccessDc } from "../d20-units";
import { BUNDLE_ID } from "../index";
import { expectedAbilityModifier } from "../modifier-units";
import { PROOF_BUNDLE_ID } from "./shared";

// Slice 1b: the flex actions are deliberately NOT self_eligible (MF-VAL-263
// requires a budget resource for self-eligible actions — out of scope for a
// proof), so the affordance pair needs a co-located TARGET to materialize on.
export const PROOF_DUMMY_DEF_LOCAL_ID = "training-dummy";
export const PROOF_DUMMY_DEF_ID = `${PROOF_BUNDLE_ID}/${PROOF_DUMMY_DEF_LOCAL_ID}`;
export const PROOF_DUMMY_SPAWN_KEY_PREFIX = "dummy";
export const PROOF_DUMMY_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${PROOF_DUMMY_SPAWN_KEY_PREFIX}_1`;

// Slice 3.1 (the proof-scene design record, "SLICE 3.1 CORRECTION"): the
// dummy's own honest SRD creature type — an inert training dummy is a
// magically-animated construct (`CreatureTypeDescription.json`'s own
// "Constructs are magically created creatures..."), not a living being.
// `assertCreatureTypeSlug` (below, at module load) guards this against a
// typo/invented type — see creature-type-units.ts's own module header for
// why the 14-type vocabulary exists with no mechanical consumer yet.
export const PROOF_DUMMY_CREATURE_TYPE = "construct";

// A SECOND, dedicated instance of the SAME training-dummy entity_def, used
// ONLY as the Advantage extension's target (the proof-scene design record).
// `resolve_manipulation_gate_bias` keys the composed roll bias on the
// manipulation's TARGET (`server/src/world_interaction/layer2/r_manipulate/
// mod.rs`'s `target_ref`, not the acting actor) — landing a condition with no
// expiry on the SHARED dummy would bias every OTHER check in this file
// (discovered live: it broke the attack-roll/attack-roll-cover tests' own
// single-draw assertions, since vitest runs every `it()` in one file against
// the SAME entities, in declaration order, across BOTH re-runs of the whole
// suite). A dedicated target this pair alone ever manipulates keeps the
// blast radius contained to exactly the two checks under test.
export const PROOF_ADVANTAGE_DUMMY_SPAWN_KEY_PREFIX = "advantage-dummy";
export const PROOF_ADVANTAGE_DUMMY_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${PROOF_ADVANTAGE_DUMMY_SPAWN_KEY_PREFIX}_1`;

// The act-path proof's observable: a proof-only counter on the DUMMY that
// BOTH flex consequences increment by +1 (`consequence_frame_writes`,
// mirroring the sister's persuade->srd/attitude shape) — so the dummy's
// counter moves iff a flex action's predicate ADMITTED the act. The live
// test asserts RELATIVE movement (+1 after flex-str, unchanged after
// flex-wis), never an absolute value, so re-runs against an un-wiped node
// stay green (the same re-runnability rule the persuasion twin follows).
export const PROOF_FLEXED_STATE_ID = `${PROOF_BUNDLE_ID}/flexed`;
export const PROOF_STR_FLEX_ACTION_ID = `${PROOF_BUNDLE_ID}/flex-str`;
export const PROOF_WIS_FLEX_ACTION_ID = `${PROOF_BUNDLE_ID}/flex-wis`;

// C3 (Ability-Score Generation, `ledger/character-creation.md`'s "C3
// direction" addendum): the hero's six ability scores are the FIGHTER
// column of the Standard Array by Class table (`character-creation.md:355`),
// read through the SAME parser `character-creation/creation-tables-units.ts`'s own
// `srd.character_creation.standard_array` tag metadata renders from — never a re-typed
// literal. Prior slices seeded str/dex/wis (14/14/9) and left con/int at the
// six ability resources' shared default (`fragments/identity.ts`'s
// `initial_value: 10`); this slice seeds all SIX explicitly.
export const PROOF_FIGHTER_STANDARD_ARRAY = standardArrayForClass("Fighter");

export const PROOF_STR_VALUE = PROOF_FIGHTER_STANDARD_ARRAY.str;
export const PROOF_DEX_VALUE = PROOF_FIGHTER_STANDARD_ARRAY.dex;
export const PROOF_CON_VALUE = PROOF_FIGHTER_STANDARD_ARRAY.con;
export const PROOF_INT_VALUE = PROOF_FIGHTER_STANDARD_ARRAY.int;
export const PROOF_WIS_VALUE = PROOF_FIGHTER_STANDARD_ARRAY.wis;
export const PROOF_STR_STATE_ID = `${BUNDLE_ID}/str`;
export const PROOF_DEX_STATE_ID = `${BUNDLE_ID}/dex`;
export const PROOF_CON_STATE_ID = `${BUNDLE_ID}/con`;
export const PROOF_INT_STATE_ID = `${BUNDLE_ID}/int`;
export const PROOF_WIS_STATE_ID = `${BUNDLE_ID}/wis`;
export const PROOF_SKILL_ID = `${BUNDLE_ID}/skill/perception`;

// Modifier-proof pair, RE-DERIVED (never re-typed) through
// `expectedAbilityModifier` — the SAME SRD-cited lookup `modifier-units.test.ts`
// pins offline — so a future Standard Array re-sync can never silently drift
// these out of sync with the seeded scores above. str 15 -> +2 (matches the
// == 2 gate; UNCHANGED from the prior 14 -> +2, since
// floor((15-10)/2) === floor((14-10)/2)); wis 10 -> +0 (fails the gate;
// the prior wis 9 -> -1 also failed it — same observable outcome, different
// underlying modifier, see `checks.ts`'s own PROOF_SKILL_*_DC re-derivation).
export const PROOF_STR_MODIFIER = expectedAbilityModifier(PROOF_STR_VALUE);
export const PROOF_DEX_MODIFIER = expectedAbilityModifier(PROOF_DEX_VALUE);
export const PROOF_FLEX_GATE_MODIFIER = 2;
export const PROOF_STR_CHECK_CAP = `${PROOF_BUNDLE_ID}/check/flex-str`;
export const PROOF_WIS_CHECK_CAP = `${PROOF_BUNDLE_ID}/check/flex-wis`;
export const PROOF_STR_FLEX_VERB = "Flex (Strength check gate)";
export const PROOF_WIS_FLEX_VERB = "Flex (Wisdom check gate)";

// D20 core-procedure trio (see the proof-scene design record; the trio's own
// affordances are TORN DOWN, slice 2 — these arithmetic constants survive
// because `advantage-grant`/`advantage-check` (KEPT) and the generic-check
// Athletics rework (below) both still consume them). Level 5 -> PB +3
// pinned offline against the cached table (`modifier-units.test.ts` /
// `d20-units.test.ts`); the total modifier feeds the boundary-DC helpers, so
// the easy/impossible DCs are DERIVED, never retyped.
/** The REAL shipped srd/level resource (level-units.ts) — migrated from a proof-local stand-in, see the proof-scene design record. */
export const PROOF_LEVEL_STATE_ID = `${BUNDLE_ID}/level`;
export const PROOF_LEVEL_VALUE = 5;
export const PROOF_PROFICIENCY_BONUS = 3;

// C4 (Level Advancement, `ledger/character-creation.md`'s C4 row; standing
// pattern addendum: "vocabulary never ships unattached"). `srd/xp` starts at
// 0, matching the resource's own `initial_value` — an explicit seed here for
// discoverability/pinning, not a divergent value (the live self-seeding test
// force-resets it before its own proof anyway, since a prior un-wiped run may
// have granted XP). `srd/hp_per_level` is the Fixed Hit Points by Class
// table's (`:779`) Fighter row FLAT number — parsed via
// `fixedHitPointsPerLevelForClass`, never hand-typed — WITHOUT the
// Constitution-modifier addition (composing a per-actor Con modifier into
// this single flat fact remains out of scope; `advancement-units.ts`'s own
// module header names it an honest, named simplification).
//
// K1 (Classes, `ledger/classes.md`): the Classes chapter now ships the REAL
// def-level writer for this exact fact — `srd/class/fighter`'s own
// `entity_definition_initial_state` seed, `hp_per_level=6`
// (`classes-units.ts`'s `buildClassUnits()`, sourced from the SAME
// `character-creation.md:779-804` table via the SAME
// `fixedHitPointsPerLevelForClass` reader). This proof-local literal is kept
// as the ONE value actually applied to the hero, unchanged — the hero's own
// entity definition is `srd_proof/hero`, a SEPARATE def
// from `srd/class/fighter`, and this substrate has no entity-definition
// inheritance mechanism (no "parent" field on `entity_definitions`), so
// there is no double-authoring collision: the two rows independently agree
// on the same number, cross-checked here rather than silently duplicated
// (see `proof-scene/calls/identity.ts`'s own K1 header for the hero's
// companion `srd.class.fighter` tag).
export const PROOF_XP_STATE_ID = `${BUNDLE_ID}/${XP_ID}`;
export const PROOF_XP_VALUE = 0;
export const PROOF_HP_PER_LEVEL_STATE_ID = `${BUNDLE_ID}/${HP_PER_LEVEL_ID}`;
export const PROOF_HP_PER_LEVEL_VALUE = fixedHitPointsPerLevelForClass("Fighter");
/** Proof-local identity grant; class-owned save-proficiency data is outside this package slice. */
export const PROOF_DEX_SAVE_PROFICIENCY_CAPABILITY_ID = `${PROOF_BUNDLE_ID}/save-proficiency/dex`;
export const PROOF_D20_TOTAL_MODIFIER = PROOF_STR_MODIFIER + PROOF_PROFICIENCY_BONUS;
export const PROOF_D20_EASY_DC = guaranteedSuccessDc(PROOF_D20_TOTAL_MODIFIER);
/** Consumed by `advantage-check`'s own contested DC (`PROOF_ADVANTAGE_CHECK_DC`, below) — a shared mid-DC value, not tied to any one check's identity. */
export const PROOF_D20_CONTESTED_DC = 15;

// Skill Proficiencies boundary-DC pair (the proof-scene design record; the
// skill-proficient/skill-unproficient-control AFFORDANCES are TORN DOWN,
// slice 2 — these two DC values survive as the SEED values the reworked
// `check/perception`/`check/insight` generic verbs now read off the
// target's own `srd/dc/<slug>` override, below). WIS 10 -> +0 (C3 re-derive:
// prior WIS 9 -> -1), level 5 -> PB +3, same as every other check in this
// scene.
export const PROOF_WIS_MODIFIER = expectedAbilityModifier(PROOF_WIS_VALUE);
export const PROOF_SKILL_PROFICIENT_DC = guaranteedSuccessDc(
	PROOF_WIS_MODIFIER + PROOF_PROFICIENCY_BONUS,
);
export const PROOF_SKILL_UNPROFICIENT_DC = guaranteedFailureDc(PROOF_WIS_MODIFIER);
