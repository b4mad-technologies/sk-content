import { unarmoredBaseArmorClass } from "../armor-class-units";
import { POISONED_LOCAL_ID } from "../conditions-units";
import { COVER_HALF_LOCAL_ID, halfCoverBonus } from "../cover-units";
import { D20_MAX_FACE, D20_MIN_FACE } from "../d20-units";
import { DODGE_ACTION_ID, DODGE_CONDITION_ID } from "../fragments/dodge";
import { HELP_ACTION_ID, HELP_CONDITION_ID } from "../fragments/help";
import {
	COMPLETE_LONG_REST_ACTION_ID,
	COMPLETE_SHORT_REST_ACTION_ID,
	LONG_REST_CAPABILITY_ID,
	SHORT_REST_CAPABILITY_ID,
} from "../fragments/rest";
import { HP_ID, HP_SAFETY_MAX, INITIAL_HP } from "../hp-units";
import { BUNDLE_ID } from "../index";
import {
	ATTACK_ACTION_CAPABILITY_SUFFIX,
	UNARMED_STRIKE_DAMAGE_ACTION_SUFFIX,
} from "../unarmed-strike-units";
import { PROOF_D20_CONTESTED_DC, PROOF_STR_MODIFIER } from "./identity";
import { PROOF_BUNDLE_ID } from "./shared";

// Attack-roll extension, F2 CLOSURE (the proof-scene design record): the SEEDED
// `srd/ac` value on the shared training dummy — the unarmored-formula's own
// "no seeded Dexterity" branch (the dummy carries no `srd/dex`), computed at
// generation time via `unarmoredBaseArmorClass()` (`armor-class-units.ts`),
// never a bare literal. Both `attack-roll` and `attack-roll-cover` read this
// SAME seed (`target.effective('srd/ac')`) — a mid value so ordinary
// hits/misses and the nat-20/nat-1 override are both live-exercisable across
// repeat runs, not just the boundary extremes the d20 trio already covers.
export const PROOF_ATTACK_ROLL_AC = unarmoredBaseArmorClass();
export const PROOF_ATTACK_ROLL_ACTION_ID = `${PROOF_BUNDLE_ID}/attack-roll`;
/** The attack-roll affordance's template id — the live test matches provenance rows on it. */
export const PROOF_ATTACK_ROLL_AFFORDANCE_ID = `${PROOF_ATTACK_ROLL_ACTION_ID}/affordance`;

// Generic Attack action review correction (ledger/designs/generic-unarmed-
// strike.md): the shipped base-bundle Unarmed Strike Damage verb, exercised
// against the REAL second actor below instead of another proof-only dummy
// action. The Hero already carries STR 14 + level 5; the Guard is seeded with
// real srd/ac + srd/hp and presents the shared creature niche.
export const PROOF_UNARMED_STRIKE_ACTION_ID = `${BUNDLE_ID}/${UNARMED_STRIKE_DAMAGE_ACTION_SUFFIX}`;
export const PROOF_OPPORTUNITY_ATTACK_ACTION_ID = `${BUNDLE_ID}/attack/opportunity-attack`;
export const PROOF_REACTION_RESOLUTION_ACTION_ID = `${PROOF_BUNDLE_ID}/reaction-resolution`;
export const PROOF_REACTION_RESOLUTION_CAPABILITY_ID = PROOF_REACTION_RESOLUTION_ACTION_ID;
export const PROOF_REACTION_SUPPRESSION_ACTION_ID = `${PROOF_BUNDLE_ID}/reaction-suppression`;
export const PROOF_REACTION_HIT_AC = D20_MIN_FACE;
export const PROOF_REACTION_MISS_AC = D20_MAX_FACE + 1;
export const PROOF_REACTION_RESOLUTION_DAMAGE = 1;
export const PROOF_ATTACK_ACTION_CAPABILITY_ID = `${BUNDLE_ID}/${ATTACK_ACTION_CAPABILITY_SUFFIX}`;
export const PROOF_DODGE_ACTION_ID = DODGE_ACTION_ID;
export const PROOF_DODGE_CONDITION_ID = DODGE_CONDITION_ID;
export const PROOF_DODGE_CAPABILITY_ID = `${BUNDLE_ID}/action/dodge`;
export const PROOF_HELP_ACTION_ID = HELP_ACTION_ID;
export const PROOF_HELP_CONDITION_ID = HELP_CONDITION_ID;
export const PROOF_HELP_CAPABILITY_ID = `${BUNDLE_ID}/action/help`;
export const PROOF_DODGE_NEGATIVE_ATTACK_ACTION_ID = `${PROOF_BUNDLE_ID}/dodge-negative-attack`;
export const PROOF_SHORT_REST_ACTION_ID = COMPLETE_SHORT_REST_ACTION_ID;
export const PROOF_SHORT_REST_CAPABILITY_ID = SHORT_REST_CAPABILITY_ID;
// O3 (Character Origins, Resourceful trait — `trait-units.ts`'s own header):
// the Long Rest completion action, exercised by the same Human-tagged proof
// hero as the Short Rest one above.
export const PROOF_LONG_REST_ACTION_ID = COMPLETE_LONG_REST_ACTION_ID;
export const PROOF_LONG_REST_CAPABILITY_ID = LONG_REST_CAPABILITY_ID;
// The Guard doubles as the guaranteed-miss target for the proof-only raw-d20
// reaction-resolution seam. The shipped OA keeps its SRD nat-20 auto-hit and
// is therefore proven by draw recomputation rather than a fake boundary.
export const PROOF_GUARD_AC = PROOF_REACTION_MISS_AC;
export const PROOF_GUARD_HP_STATE_ID = `${BUNDLE_ID}/${HP_ID}`;
export const PROOF_GUARD_HP = INITIAL_HP;
export const PROOF_UNARMED_STRIKE_DAMAGE = Math.max(0, 1 + PROOF_STR_MODIFIER);

// Cover extension, F1 REWORK (the proof-scene design record): the SHIPPED base-
// bundle condition id `cover-grant` lands on the dedicated cover-dummy —
// a cross-bundle REFERENCE (legal, MF-VAL-291 only forbids foreign-namespace
// DEFINITIONS), not a proof-authored condition like the Advantage extension's
// own `advantage_condition`. `PROOF_ATTACK_ROLL_COVER_EFFECTIVE_AC` is
// DERIVED from the SAME base-AC seed every dummy instance carries plus the
// parsed Half-cover bonus — what the live test recomputes the engine's
// admit/reject decision against, now proving the CONDITION's own modifier
// actually composed into `effective('srd/ac')`, not a generation-time string
// transform.
export const PROOF_COVER_HALF_CONDITION_ID = `${BUNDLE_ID}/${COVER_HALF_LOCAL_ID}`;
export const PROOF_ATTACK_ROLL_COVER_BONUS = halfCoverBonus();
export const PROOF_ATTACK_ROLL_COVER_EFFECTIVE_AC =
	PROOF_ATTACK_ROLL_AC + PROOF_ATTACK_ROLL_COVER_BONUS;
export const PROOF_COVER_GRANT_ACTION_ID = `${PROOF_BUNDLE_ID}/cover-grant`;
export const PROOF_ATTACK_ROLL_COVER_ACTION_ID = `${PROOF_BUNDLE_ID}/attack-roll-cover`;
/** The attack-roll-cover affordance's template id — the live test matches provenance rows on it. */
export const PROOF_ATTACK_ROLL_COVER_AFFORDANCE_ID = `${PROOF_ATTACK_ROLL_COVER_ACTION_ID}/affordance`;

// Dedicated cover-dummy target (the proof-scene design record, "DEDICATED
// TARGET"): a THIRD spawned instance of the SAME `training-dummy` entity_def
// — isolates the SHIPPED, permanent `srd/cover/half` condition from every
// other check's shared/advantage dummy, same rationale as
// `PROOF_ADVANTAGE_DUMMY_ENTITY_KEY`.
export const PROOF_COVER_DUMMY_SPAWN_KEY_PREFIX = "cover-dummy";
export const PROOF_COVER_DUMMY_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${PROOF_COVER_DUMMY_SPAWN_KEY_PREFIX}_1`;

// Generic Saving Throw pressure-plate proof
// (`ledger/designs/generic-saving-throw-pressure-plate.md`): the creature
// owns every roll input and the affected HP pool; the plate owns only the DC.
export const PROOF_HERO_HP_STATE_ID = `${BUNDLE_ID}/${HP_ID}`;
export const PROOF_HERO_HP = HP_SAFETY_MAX;
export const PROOF_SAVE_DAMAGE = 11;
export const PROOF_SAVE_HALF_DAMAGE = Math.trunc(PROOF_SAVE_DAMAGE / 2);
export const PROOF_SAVE_DC_STATE_ID = `${PROOF_BUNDLE_ID}/save_dc`;
export const PROOF_PRESSURE_PLATE_DC = 15;
export const PROOF_SAVE_ACTION_ID = `${PROOF_BUNDLE_ID}/pressure-plate-save`;
export const PROOF_PRESSURE_PLATE_DEF_LOCAL_ID = "pressure-plate";
export const PROOF_PRESSURE_PLATE_DEF_ID = `${PROOF_BUNDLE_ID}/${PROOF_PRESSURE_PLATE_DEF_LOCAL_ID}`;
export const PROOF_PRESSURE_PLATE_SPAWN_KEY_PREFIX = "pressure-plate";
export const PROOF_PRESSURE_PLATE_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${PROOF_PRESSURE_PLATE_SPAWN_KEY_PREFIX}_1`;

// Advantage extension (finding #23, night/b7-roll-bias substrate
// fix) — the live proof that `Op::Roll` now consults `ComposedRollBias`. Two
// MORE checks in the SAME `ALL_CHECKS` plumbing, targeting their OWN
// dedicated `advantage-dummy` instance (`PROOF_ADVANTAGE_DUMMY_ENTITY_KEY`
// below), NOT the shared training dummy every other check targets —
// `resolve_manipulation_gate_bias` keys the composed bias on the
// manipulation's TARGET, so a PERMANENT condition landed on the shared
// dummy would silently bias every other check aimed at it too (discovered
// live: it broke the attack-roll/attack-roll-cover tests' own single-draw
// assertions on the first attempt at this proof — see the design draft's
// implementation record):
//   - `advantage-grant`: a guaranteed-success d20 check (same boundary-DC
//     trick as `d20-easy`) whose success consequence is an `ApplyStatus`
//     frame_write (not the shared flexed-counter `ModifyResource` every
//     OTHER check uses) — it lands a TEST-ONLY, unconditionally-active
//     (`gate_predicate_source = "1 == 1"`) Advantage condition on the
//     dedicated advantage-dummy. The condition/modifier rows are authored
//     via the typed `spellkave_define_condition` verb (folds
//     `modifier_templates` + `condition_definitions` in one call), own to
//     THIS proof bundle only — the sister's
//     `world-fixtures/srd/base/conditions.toml` is untouched.
//   - `advantage-check`: a SECOND, genuinely contested d20 check (SAME bare
//     `d20TestExpr` shape as the d20 trio — the exact gap finding #23
//     named, NOT `biasableD20TestExpr`'s `roll_table` workaround) targeting
//     the SAME advantage-dummy, so `resolve_manipulation_gate_bias`'s
//     target-keyed lookup (`server/src/world_interaction/layer2/
//     r_manipulate/mod.rs`) picks up the condition `advantage-grant` just
//     landed. The live test reads exactly TWO `stochastic_draws` off this
//     affordance's own `dsl_node` (vs the un-advantaged `d20-contested`
//     check's one, the live control) and recomputes `max(face1,face2) +
//     modifier >= DC` against the engine's own admit/reject decision.
export const PROOF_ADVANTAGE_CONDITION_ID = `${PROOF_BUNDLE_ID}/advantage_condition`;
export const PROOF_ADVANTAGE_GRANT_ACTION_ID = `${PROOF_BUNDLE_ID}/advantage-grant`;
/** SAME contested DC as `d20-contested` — the un-advantaged live control shares the exact target. */
export const PROOF_ADVANTAGE_CHECK_DC = PROOF_D20_CONTESTED_DC;
export const PROOF_ADVANTAGE_CHECK_ACTION_ID = `${PROOF_BUNDLE_ID}/advantage-check`;
/** The advantage-check affordance's template id — the live test matches provenance rows on it. */
export const PROOF_ADVANTAGE_CHECK_AFFORDANCE_ID = `${PROOF_ADVANTAGE_CHECK_ACTION_ID}/affordance`;

// CONDITIONS PACKAGE live proof (Poisoned) — the shipped `srd/condition/
// poisoned` condition's ACTOR-side Disadvantage, proven end-to-end via the
// SAME `ALL_CHECKS` plumbing the Advantage extension already established,
// but ACTOR-keyed rather than TARGET-keyed:
//   - `poisoned-grant`: a guaranteed-success d20 check (same boundary-DC
//     trick as `d20-easy`/`advantage-grant`) whose success consequence lands
//     BOTH the SHIPPED `srd/condition/poisoned` condition AND its sibling
//     `srd/condition/poisoned/ability-check-disadvantage` on the ACTOR ITSELF
//     (`target_ref: "Actor"`, not `"TargetActor"` — the bearer of Poisoned is
//     whoever rolls the check, not whoever/whatever the manipulation targets
//     for eligibility purposes) via TWO explicit `ApplyStatus` frame_writes —
//     Dodge's own actual twin-condition shape, never `implies` (see the
//     removability finding below). Cross-fragment REFERENCEs (MF-VAL-291),
//     not proof-authored conditions.
//   - `poisoned-check`: a SECOND, genuinely contested bare `d20TestExpr`
//     check (same shape as `advantage-check`) at the 'srd/ability_check'
//     resolution scope (`action_definitions.resolution_scope`) — the exact
//     scope Poisoned's own sibling ability-check-disadvantage condition
//     targets (finding #56's addendum: an actor-carried modifier only fires
//     when its `applies_to` matches the RESOLVING action's own
//     `resolution_scope`). The acting hero already carries both Poisoned
//     halves (poisoned-grant ran first, same connection), so the live test
//     reads exactly TWO `stochastic_draws` and recomputes `min(face1,face2) +
//     modifier >= DC` — Disadvantage takes the WORSE face, the mirror image
//     of Advantage's own `max`.
//   - `poisoned-cure`: a THIRD, unconditionally-eligible check whose success
//     consequence issues TWO explicit `RemoveCondition` frame_writes
//     (`source_match: "Any"`), one per condition poisoned-grant landed —
//     run in the SAME test, immediately after poisoned-check, so no LATER
//     check in this file (or any file sharing this live node) ever rolls
//     against a hero still carrying Poisoned's Disadvantage. This mirrors why
//     the Advantage/Cover extensions dedicate their OWN target dummy: an
//     uncured, permanent condition on a shared subject would bias every
//     unrelated check that subject touches afterward (`proof-scene/
//     identity.ts`'s own module header, the Advantage-dummy note).
//
//   Historical removability finding: the original 0 == 1 remove policy
//   stranded implied children after a cure. This proof retained two primary
//   ApplyStatus rows. Round-3 d020 now admits implied-child removal through
//   independent_lifetime, so new content need not copy that workaround.
export const PROOF_POISONED_CONDITION_ID = `${BUNDLE_ID}/${POISONED_LOCAL_ID}`;
export const PROOF_POISONED_GRANT_ACTION_ID = `${PROOF_BUNDLE_ID}/poisoned-grant`;
/** SAME contested DC as `d20-contested`/`advantage-check` — genuinely mid/stochastic, not a boundary trick. */
export const PROOF_POISONED_CHECK_DC = PROOF_D20_CONTESTED_DC;
export const PROOF_POISONED_CHECK_ACTION_ID = `${PROOF_BUNDLE_ID}/poisoned-check`;
/** The poisoned-check affordance's template id — the live test matches provenance rows on it. */
export const PROOF_POISONED_CHECK_AFFORDANCE_ID = `${PROOF_POISONED_CHECK_ACTION_ID}/affordance`;
export const PROOF_POISONED_CURE_ACTION_ID = `${PROOF_BUNDLE_ID}/poisoned-cure`;
