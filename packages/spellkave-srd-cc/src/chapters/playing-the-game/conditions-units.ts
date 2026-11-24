// Combat-arena proof, Slice A (`ledger/designs/combat-arena-proof.md`):
// Incapacitated and Dead — the two condition identities the combat proof's
// lethal-to-0-HP step needs. Both are IDENTITY-ONLY carriers (no
// gate_predicate, no modifier_template), matching the sister's own
// `srd/dead`/`srd/dying`/`srd/stunned` shape (`world-fixtures/srd/base/
// conditions.toml`, read directly for reconciliation — never imported):
// each of those rows is a bare `condition_definitions` row plus an `implies`
// cascade edge, no behavioural modifier attached.
//
// SLICE 2 ADDITION (combat-arena bonus units, `ledger/designs/
// combat-arena-proof.md` "Dropping Prone"; extended `ledger/designs/
// prone-free-action.md` Slice B): Prone joins the identity list. Of its two
// sub-effects, ONE is now MECHANIZED: Disadvantage on the prone creature's
// OWN attack rolls (`fragments/conditions.ts`'s own Disadvantage modifier on
// the `srd/attack_roll` actor-side axis, `resolution-scope-units.ts`) — the
// FIRST consumer of that axis. The OTHER sub-effect stays UNMECHANIZED and
// honestly deferred: Restricted Movement (would need a per-creature
// movement-mode override, no such axis exists anywhere in this package) and
// the AGAINST-prone half (Advantage within 5 ft, Disadvantage beyond).
// Modifier predicates now execute (finding #76's regression proof), but this
// condition still has no target-relative distance and applied-source identity
// available to that predicate, so the distance-conditional flip remains a
// separate content/design gap. The free (no action/Speed
// cost) self-grant affordance the SRD's own Dropping Prone rule describes
// (`fragments/drop-prone.ts`) was SEPARATELY blocked by MF-VAL-263 (finding
// #73) — RESOLVED substrate-side by PR #2079 (finding #73's own addendum);
// the action now ships too.
//
// SK-DMS.40.2 ADDITION (2026-08-12): Incapacitated's own "Inactive" sub-
// effect ("can't take any action, Bonus Action, or Reaction") is now
// MECHANIZED — a dead+incapacitated corpse was observed taking an
// Opportunity Attack (Reaction) because the row shipped identity-only and
// enforced nothing (sk-dms.40.2's own diagnosis). The substrate already
// couples a condition to an economy channel: a condition-driven Numeric
// modifier whose `applies_to` IS an economy-channel id scales that
// channel's pool at check time (`budget_gate.rs`'s
// `effective_pool_from_composed`, both reaction sites —
// `reaction_producer.rs`/`r_react.rs` — already consult it), no server
// change needed. `ConditionDefinition` carries ONE `modifier_template_id`
// (a String, not a list), so one row cannot zero three channels: THREE
// sibling condition rows — `.../no-action`, `.../no-bonus-action`,
// `.../no-reaction`, one per `srd/economy_channel/{primary,bonus,reaction}`
// — are reached from this row via `implies`, each carrying its own
// FlatSet(0) Numeric modifier (see each sibling's own description for the
// FlatSet-vs-negative-Plus and implies-safety reasoning). This row itself
// STAYS an identity-only carrier — the three modifiers live on the
// siblings, not here. The OTHER three SRD sub-effects (No Concentration,
// Speechless, Surprised) are UNCHANGED by this fix and remain unmechanized;
// see `INCAPACITATED_DESCRIPTION`'s own up-to-date accounting rather than
// re-deriving it here.
//
// SOURCE:
//   - Incapacitated [Condition] (cache/markdown/rules-glossary.md:923-933):
//     four sub-effects — Inactive (can't take action/Bonus Action/Reaction),
//     No Concentration, Speechless, Surprised (Disadvantage on Initiative if
//     Incapacitated when rolling it). NONE of the four have a substrate
//     primitive today (same class of gap the sister's own Stunned/Blinded
//     rows already recorded for their own auto-fail/action-block axes) — this
//     module ships the IDENTITY only, honestly, with no fabricated modifier.
//   - Monster Death (cache/markdown/playing-the-game.md:1217): "A monster
//     dies the instant it drops to 0 Hit Points, although a Game Master can
//     ignore this rule for an individual monster and treat it like a
//     character." — the combat proof's two monsters are exactly this case:
//     no death saves, no dying clock (this package ships neither), a hit
//     that drops a monster to 0 HP applies `srd/condition/dead` directly.
//   - Dead [glossary] (cache/markdown/rules-glossary.md:670-674): "A dead
//     creature has no Hit Points and can't regain them unless it is first
//     revived by magic..." — cited for the identity description only; the
//     no-heal-while-dead axis has no gate primitive here either (recorded
//     honestly, not built).
//   - Prone [Condition] (cache/markdown/rules-glossary.md:1183-1189):
//     _Restricted Movement_ (crawl, or spend half Speed rounded down to
//     stand) and _Attacks Affected_ (Disadvantage on the prone creature's own
//     attack rolls; Advantage against it within 5 ft, Disadvantage otherwise)
//     — cited for the identity description only, per this module's own gap
//     note above.
//
// CASCADE: `srd/condition/dead` implies `srd/condition/incapacitated` — the
// `ApplyStatus` implies-cascade is a GENERIC kernel feature
// (`server/src/world_interaction/layer2/r_apply_consequence/apply_status.rs`),
// not something this package builds; authoring the edge is the whole unit.
// The sister's own `srd/dead` ALSO implies `core/condition/prone` — this
// package's OWN `srd/condition/prone` now exists (Slice 2, above) but `srd/
// condition/dead` does NOT imply it here: Monster Death (this proof's own
// lethal path) has no "falls prone on death" clause anywhere in its own
// source text (unlike, e.g., the Falling rule's own prone-on-landing clause,
// rules-glossary.md:800) — implying Prone from Dead would be an invented
// cascade this chapter's own text does not support, not a scope trim.
//
// STACKING/REMOVE-POLICY: self-sufficiency (AGENTS.md, `ledger/archive/general-decisions.md`'s
// 2026-07-28 operator ruling) — both conditions REFERENCE this package's own
// `srd/stacking/single`/`srd/remove_policy/independent_lifetime` ids (bare
// string refs, `cover-units.ts`'s exported local-id stems), the SAME
// bare-reference pattern `fragments/dodge.ts`/`fragments/help.ts` already
// use: `condition_definitions.stacking_rule`/`remove_time_policy` carry NO
// static referential-integrity check anywhere in
// `crates/spellkave-validate/src/refs.rs` (grepped directly — zero hits for
// either field name), so a bare-string reference validates standalone in
// this fragment's own isolated workspace with no need to re-declare the
// full `stacking_discipline_definitions`/`condition_remove_policy_definitions`
// rows (which WOULD collide as duplicate ids across committed files,
// MF-VAL-272 — `fragments/cover.ts`'s own header already authors those two
// rows once, package-wide).
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_MARKDOWN_DIR } from "../../markdown/paths";

export const INCAPACITATED_LOCAL_ID = "condition/incapacitated";
export const INCAPACITATED_DISPLAY_NAME = "Incapacitated";
export const DEAD_LOCAL_ID = "condition/dead";
export const DEAD_DISPLAY_NAME = "Dead";
export const UNCONSCIOUS_LOCAL_ID = "condition/unconscious";
export const UNCONSCIOUS_DISPLAY_NAME = "Unconscious";
export const STABLE_LOCAL_ID = "condition/stable";
export const STABLE_DISPLAY_NAME = "Stable";
export const PRONE_LOCAL_ID = "condition/prone";
export const PRONE_DISPLAY_NAME = "Prone";

// sk-dms.40.2: the three economy-channel-zeroing siblings reached from
// Incapacitated via `implies` (this module's own header note above carries
// the full design grounding).
export const INCAPACITATED_NO_ACTION_LOCAL_ID = "condition/incapacitated/no-action";
export const INCAPACITATED_NO_ACTION_DISPLAY_NAME = "Incapacitated: No Action";
export const INCAPACITATED_NO_BONUS_ACTION_LOCAL_ID = "condition/incapacitated/no-bonus-action";
export const INCAPACITATED_NO_BONUS_ACTION_DISPLAY_NAME = "Incapacitated: No Bonus Action";
export const INCAPACITATED_NO_REACTION_LOCAL_ID = "condition/incapacitated/no-reaction";
export const INCAPACITATED_NO_REACTION_DISPLAY_NAME = "Incapacitated: No Reaction";

// CONDITIONS PACKAGE (operator-approved cross-chapter slice, scheduled after
// C6, `ledger/character-origins.md` § Cross-chapter decisions): the five
// missing SRD conditions — Poisoned, Charmed, Frightened, Grappled, Prone —
// each authored HONESTLY at the granularity this substrate can actually
// enforce. Grounding for the shared design decisions below (full detail in
// each condition's own DESCRIPTION, cited by source line):
//
//   - The actor-side roll-bias channel (`resolution-scope-units.ts`,
//     `server/src/world_interaction/layer2/r_manipulate/roll_bias.rs`,
//     finding #56's "Implementation addendum") lets a BEARER's own condition
//     impose Advantage/Disadvantage on ITS OWN rolls in a NAMED resolution
//     scope (`srd/attack_roll`/`srd/ability_check`, both already shipped —
//     `fragments/attacks.ts`/`fragments/generic.ts`) — this is the exact
//     granularity Poisoned/Frightened/Grappled/Prone need ("Disadvantage on
//     attack rolls AND ability checks" is expressible as EXACTLY that, with
//     no bleed onto Saving Throws, which carry a THIRD, distinct scope id).
//     Every Disadvantage modifier below rides this channel — none use the
//     older, coarser `applies_to = "ResolutionCheck"` bare axis (that axis is
//     TARGET-keyed: "rolls against the bearer", the wrong direction for a
//     self-afflicting condition).
//   - No condition here can read WHO applied it. `TargetCondition`
//     (`server/src/world_interaction/layer3/condition_definition.rs`) DOES
//     store a `source_body_entity_id`/`source_id` per applied instance, but
//     `crates/spellkave-dsl/src/lib.rs` exposes NO primitive that reads it
//     (grepped directly: zero hits for either field name) — so a condition
//     can never single out "except the grappler"/"except the charmer" or
//     grant a bonus to a THIRD party (the charmer). Every such clause below
//     is either dropped (documented over-breadth) or left unbuilt
//     (documented gap), never faked.
//   - The movement-reach gate now folds condition-effective Numeric modifiers
//     before deciding whether an actor may traverse an edge (issue #2090,
//     finding #90's live regression proof). Grappled's "Speed 0" remains
//     un-authored in this content slice: introducing its `srd/speed-walk`
//     target and FlatSet(0) carrier belongs to a dedicated content proof, not
//     to the substrate regression test that established the execution path.
//   - Round 3 (d020) changes independent_lifetime to admit removal of
//     implied children. Poisoned/Frightened retain their existing separately
//     applied sibling rows; new compositions can use implies with the shared
//     policy. See docs/round-3-live-deltas.md for the canon-review boundary.
//   - The range-conditional half of Prone's own Attacks-Affected clause
//     ("Advantage if the attacker is within 5 feet... Otherwise,
//     Disadvantage") needs a THIRD-PARTY spatial-distance read — the EXACT
//     gap finding #64 already confirmed and recorded ("no
//     `Distance`/spatial-proximity operator... no third-party-actor binding
//     at all") — cross-referenced here, not re-derived.

const CHARMED_SOURCE_SENTENCES = [
	"_Can't Harm the Charmer._ You can't attack the charmer or target the charmer with damaging abilities or magical effects.",
	"_Social Advantage._ The charmer has Advantage on any ability check to interact with you socially.",
] as const;

const FRIGHTENED_SOURCE_SENTENCES = [
	"_Ability Checks and Attacks Affected._ You have Disadvantage on ability checks and attack rolls while the source of fear is within line of sight.",
	"_Can't Approach._ You can't willingly move closer to the source of fear.",
] as const;

const GRAPPLED_SOURCE_SENTENCES = [
	"_Speed 0._ Your Speed is 0 and can't increase.",
	"_Attacks Affected._ You have Disadvantage on attack rolls against any target other than the grappler.",
	"_Movable._ The grappler can drag or carry you when it moves, but every foot of movement costs it 1 extra foot unless you are Tiny or two or more sizes smaller than it.",
] as const;

const POISONED_SOURCE_SENTENCES = [
	"_Ability Checks and Attacks Affected._ You have Disadvantage on attack rolls and ability checks.",
] as const;

export const POISONED_LOCAL_ID = "condition/poisoned";
export const POISONED_DISPLAY_NAME = "Poisoned";
/**
 * Sibling condition carrying the ability-check half — a SEPARATE top-level
 * row, deliberately NOT reached via Poisoned's own `implies` (see
 * `POISONED_DESCRIPTION`'s own removability finding). A future consumer
 * applies BOTH ids via twin `ApplyStatus` writes, the SAME shape Dodge's own
 * action already uses for its own two-condition split
 * (`condition/dodging` + `condition/dodging/dex-save`, `fragments/dodge.ts`).
 */
export const POISONED_ABILITY_CHECK_DISADVANTAGE_LOCAL_ID =
	"condition/poisoned/ability-check-disadvantage";

export const CHARMED_LOCAL_ID = "condition/charmed";
export const CHARMED_DISPLAY_NAME = "Charmed";

export const FRIGHTENED_LOCAL_ID = "condition/frightened";
export const FRIGHTENED_DISPLAY_NAME = "Frightened";
export const FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_LOCAL_ID =
	"condition/frightened/ability-check-disadvantage";

export const GRAPPLED_LOCAL_ID = "condition/grappled";
export const GRAPPLED_DISPLAY_NAME = "Grappled";

export const POISONED_DESCRIPTION =
	"Poisoned (cache/markdown/rules-glossary.md:1169-1173): Disadvantage on attack rolls and ability " +
	"checks. SHIPPED CLEAN — both halves ride the actor-side resolution-scope channel " +
	"('srd/attack_roll' on this row, 'srd/ability_check' on the SIBLING " +
	"'srd/condition/poisoned/ability-check-disadvantage' row), the EXACT breadth the SRD text names, " +
	"with no bleed onto Saving Throws (a third, distinct resolution scope) and no over-breadth to " +
	"document. The existing twin ApplyStatus composition is retained. Round 3 (d020) " +
	"admits implied-child removal through independent_lifetime; new compositions need not copy " +
	"the historical separate-primary-row workaround.";

export const POISONED_ABILITY_CHECK_DISADVANTAGE_DESCRIPTION =
	"Sibling actor-side half of Poisoned (cache/markdown/rules-glossary.md:1173): while Poisoned, " +
	"ability checks made by this creature have Disadvantage (the 'srd/ability_check' resolution scope " +
	"— resolution-scope-units.ts). A SEPARATE top-level condition_definitions row, NOT reached via " +
	"`implies` — see `POISONED_DESCRIPTION`'s own removability finding for why. A future consumer lands " +
	"BOTH this row and 'srd/condition/poisoned' together via twin ApplyStatus writes, mirroring Dodge's " +
	"own `condition/dodging` + `condition/dodging/dex-save` split.";

export const CHARMED_DESCRIPTION =
	"Charmed (cache/markdown/rules-glossary.md:434-440): Can't Harm the Charmer (can't attack the " +
	"charmer or target them with damaging abilities/magical effects) and Social Advantage (the charmer " +
	"has Advantage on ability checks to interact with you socially). IDENTITY-ONLY carrier — BOTH " +
	"sub-effects need a per-instance 'who is my charmer' identity read: `TargetCondition`'s own " +
	"`source_body_entity_id` DOES store it, but no DSL primitive reads it (grepped " +
	"crates/spellkave-dsl/src/lib.rs directly: zero hits), so a condition can neither exclude a single " +
	"named target from its own bearer's attacks nor grant a bonus to a THIRD party's rolls (the " +
	"charmer) — the latter is exactly finding #56's 'third-party grant' class (Help's own fully-blocked " +
	"shape). Both gaps recorded honestly, no modifier attached.";

export const FRIGHTENED_DESCRIPTION =
	"Frightened (cache/markdown/rules-glossary.md:816-822): Disadvantage on ability checks and attack " +
	"rolls WHILE the source of fear is within line of sight; can't willingly move closer to the source. " +
	"SHIPS the Disadvantage pair (actor-side 'srd/attack_roll' on this row, 'srd/ability_check' on the " +
	"SIBLING 'srd/condition/frightened/ability-check-disadvantage' row) UNCONDITIONALLY — OVER-BROAD: " +
	"the 'within line of sight of the source' gate is dropped (no line-of-sight predicate, and no " +
	"per-instance 'source' identity read exists either, same absent channel as Charmed's own gap), so " +
	"this Disadvantage never lifts even once the source is out of sight. 'Can't Approach' (a movement " +
	"predicate keyed on a specific other creature's position) is NOT shipped at all — no " +
	"movement-restriction-vs-named-actor primitive exists on this substrate; recorded as an unbuilt gap, " +
	"not worked around. Existing twin ApplyStatus rows are retained; round-3 d020 now admits " +
	"implied-child removal through the shared independent_lifetime policy.";

export const FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_DESCRIPTION =
	"Sibling actor-side half of Frightened (cache/markdown/rules-glossary.md:820): while Frightened, " +
	"ability checks made by this creature have Disadvantage (the 'srd/ability_check' resolution scope). " +
	"A SEPARATE top-level condition_definitions row, NOT reached via `implies` — see " +
	"`FRIGHTENED_DESCRIPTION`'s own removability finding for why.";

export const GRAPPLED_DESCRIPTION =
	"Grappled (cache/markdown/rules-glossary.md:824-832): Speed 0 (can't increase); Disadvantage on " +
	"attack rolls against any target OTHER than the grappler; the grappler can drag/carry you at an " +
	"extra movement cost. SHIPS ONLY the attack-roll Disadvantage (actor-side 'srd/attack_roll' " +
	"resolution scope), and OVER-BROAD: it applies to EVERY attack roll this creature makes, including " +
	"one against the grappler itself — the SRD's own exclusion needs the same absent " +
	"'who is my grappler' identity read Charmed's gap already names, so it cannot be narrowed. 'Speed " +
	"0' is NOT shipped as a modifier in this content slice. The movement reducer now composes Numeric " +
	"condition modifiers on its bound reach resource (issue #2090; finding #90 regression proof), so " +
	"the execution path exists; a dedicated Grappled-content slice still needs to author and prove the " +
	"`srd/speed-walk` target plus FlatSet(0) carrier. The 'Movable' clause (grappler-side movement-cost surcharge) is out " +
	"of this slice's scope, not attempted.";

const INCAPACITATED_SOURCE_SENTENCES = [
	"_Inactive._ You can't take any action, Bonus Action, or Reaction.",
	"_No Concentration._ Your Concentration is broken.",
	"_Speechless._ You can't speak.",
	"_Surprised._ If you're Incapacitated when you roll Initiative, you have Disadvantage on the roll.",
] as const;

const MONSTER_DEATH_SOURCE_SENTENCE =
	"_Monster Death._ A monster dies the instant it drops to 0 Hit Points, although a Game Master " +
	"can ignore this rule for an individual monster and treat it like a character.";

const DEAD_GLOSSARY_SOURCE_SENTENCE =
	"A dead creature has no Hit Points and can't regain them unless it is first revived by magic " +
	"such as the _Raise Dead_ or _Revivify_ spell.";

const PRONE_SOURCE_SENTENCES = [
	"_Restricted Movement._ Your only movement options are to crawl or to spend an amount of " +
		"movement equal to half your Speed (round down) to right yourself and thereby end the " +
		"condition. If your Speed is 0, you can't right yourself.",
	"_Attacks Affected._ You have Disadvantage on attack rolls. An attack roll against you has " +
		"Advantage if the attacker is within 5 feet of you. Otherwise, that attack roll has " +
		"Disadvantage.",
] as const;

export const INCAPACITATED_DESCRIPTION =
	"Incapacitated (cache/markdown/rules-glossary.md:923-933): can't take any action, Bonus Action, " +
	"or Reaction (Inactive); Concentration breaks (No Concentration); can't speak (Speechless); " +
	"Disadvantage on Initiative if Incapacitated when rolled (Surprised). sk-dms.40.2: the Inactive " +
	"sub-effect is now MECHANIZED — a dead+incapacitated corpse was observed taking an Opportunity " +
	"Attack (Reaction) because this row shipped identity-only and enforced nothing. Fixed by THREE " +
	"sibling condition rows reached via `implies` — 'srd/condition/incapacitated/no-action', " +
	"'.../no-bonus-action', '.../no-reaction' — each zeroing one of 'srd/economy_channel/" +
	"{primary,bonus,reaction}' via its own FlatSet(0) Numeric modifier (ConditionDefinition carries a " +
	"single `modifier_template_id` String, not a list, forcing the three-way split; see each sibling's " +
	"own description for the FlatSet-vs-negative-Plus and implies-safety reasoning). This row itself " +
	"STAYS an identity-only carrier — the three modifiers live on the siblings, never here. The OTHER " +
	"three sub-effects remain unmechanized, honestly: No Concentration and Surprised have no " +
	"Concentration-tracking or Initiative-roll-timing primitive anywhere in this package (same class of " +
	"gap the sister's own Stunned/Blinded rows record for their auto-fail axes); Speechless needs a " +
	"condition-driven CAPABILITY-suppression primitive this substrate does not have — a Numeric modifier " +
	"scales a whole economy channel, not one capability inside it — tracked as sk-syo (a condition " +
	"declaring which action class/capability it suppresses, evaluated at gate time), which would " +
	"suppress 'srd/action/communicate/speak' once it lands. Other conditions still cascade INTO this " +
	"row via `implies` (Dead's own edge, unchanged).";

export const INCAPACITATED_NO_ACTION_DESCRIPTION =
	"Sibling channel-zeroing half of Incapacitated (cache/markdown/rules-glossary.md:923-933, " +
	"'Inactive' — can't take any action): zeroes the bearer's 'srd/economy_channel/primary' pool via a " +
	"FlatSet(0) Numeric modifier. FlatSet, not a negative Plus: `fold_effective_int` " +
	"(server/src/world_interaction/kernel/composition.rs) short-circuits on `flat_set`, so this stays " +
	"correct even if `pool_ms_per_round` ever grows — a negative Plus would silently stop zeroing the " +
	"moment it did. Composed rather than materialised as an `economy_channel_grant`, so expiry restores " +
	"the pool automatically at the next fold — no refill interaction to manage (a negative grant WOULD " +
	"be erased at every refill, `budget_gate.rs`'s `grant_in_window`; recorded on sk-syo as the reason " +
	"NOT to take that route). A SEPARATE top-level condition_definitions row, reached from " +
	"'srd/condition/incapacitated' via `implies` — forced, not a style choice: ConditionDefinition " +
	"carries a single `modifier_template_id` String, not a list, so one row cannot zero three channels; " +
	"this is the SAME split idiom Poisoned's own sibling row already documents (twin/sibling condition " +
	"rows for a multi-axis effect, `POISONED_ABILITY_CHECK_DISADVANTAGE_DESCRIPTION`). UNLIKE " +
	"Poisoned/Frightened's own siblings, this one IS reached via `implies` rather than twin ApplyStatus " +
	"writes. Round-3 d020 admits implied-child removal through independent_lifetime. " +
	"The heal-clear consequence removes the Unconscious cascade using source_match Any.";

export const INCAPACITATED_NO_BONUS_ACTION_DESCRIPTION =
	"Sibling channel-zeroing half of Incapacitated (cache/markdown/rules-glossary.md:923-933, " +
	"'Inactive' — can't take any Bonus Action): zeroes the bearer's 'srd/economy_channel/bonus' pool " +
	"via a FlatSet(0) Numeric modifier — same FlatSet-vs-negative-Plus, composed-not-materialised, and " +
	"implies-safety reasoning as the sibling primary-channel row, " +
	"`INCAPACITATED_NO_ACTION_DESCRIPTION`, not re-derived here.";

export const INCAPACITATED_NO_REACTION_DESCRIPTION =
	"Sibling channel-zeroing half of Incapacitated (cache/markdown/rules-glossary.md:923-933, " +
	"'Inactive' — can't take any Reaction): zeroes the bearer's 'srd/economy_channel/reaction' pool via " +
	"a FlatSet(0) Numeric modifier. This is the axis sk-dms.40.2 itself diagnosed: a dead+incapacitated " +
	"corpse took an Opportunity Attack because this channel was never gated (both reaction sites — " +
	"`reaction_producer.rs`'s candidate scan and `r_react.rs`'s accept path — consult the composed pool, " +
	"so a FlatSet(0) here reaches both). Same FlatSet-vs-negative-Plus, composed-not-materialised, and " +
	"implies-safety reasoning as the sibling primary-channel row, `INCAPACITATED_NO_ACTION_DESCRIPTION`, " +
	"not re-derived here.";

export const UNCONSCIOUS_DESCRIPTION =
	"Unconscious (cache/markdown/playing-the-game.md:1229 Falling Unconscious; rules-glossary " +
	"Unconscious): a character that reaches 0 Hit Points and does not die instantly has the " +
	"Unconscious condition until it regains any Hit Points, and now faces Death Saving Throws " +
	"(sk-609b.18). Cascades to Incapacitated via `implies` so action/bonus/reaction channels zero. " +
	"Grants `srd/capability/death_save` while active (condition capability grant bridge). A K-B " +
	"ResourceDelta hook clears Unconscious + Stable and resets the death-save clock when HP rises " +
	"above 0 (pattern: condition-hook-on-event). Other Unconscious axes (drop held items, auto-fail " +
	"STR/DEX saves, attacks against have Advantage, melee auto-crit) remain unmechanized, honestly.";

export const STABLE_DESCRIPTION =
	"Stable (cache/markdown/playing-the-game.md Stabilizing a Character): a creature with 0 Hit " +
	"Points that has stopped making Death Saving Throws (three successes, or a successful Medicine " +
	"stabilize). Still has the Unconscious condition until it regains any Hit Points. The death-save " +
	"roll affordance gates on `actor.status('srd/condition/stable') == false`; tallies reset when " +
	"Stable lands or when healing clears Unconscious.";

export const DEAD_DESCRIPTION =
	"Dead (cache/markdown/playing-the-game.md:1217, Monster Death; rules-glossary.md:670-674; " +
	"character path sk-609b.18): a monster dies the instant it drops to 0 Hit Points; a character " +
	"reaches Dead on the third failed Death Saving Throw (or massive damage / HP-max 0, not yet " +
	"shipped). A dead creature is a corpse — Incapacitated via `implies`, death-save and universal " +
	"creature capabilities suppressed while Dead so the PLAYER palette is empty. No in-world " +
	"respawn/new-character flow; seat release is website account management (out of scope). " +
	"no-heal-while-dead axis has no gate primitive here, recorded honestly, not built.";

export const PRONE_DESCRIPTION =
	"Prone (cache/markdown/rules-glossary.md:1183-1189): Restricted Movement (crawl, or spend half " +
	"Speed rounded down to stand back up); Disadvantage on the prone creature's own attack rolls; " +
	"Advantage on attacks against it within 5 ft, Disadvantage otherwise. The actor-side Disadvantage " +
	"is MECHANIZED (a modifier_template on the srd/attack_roll axis). Restricted Movement and the " +
	"against-prone distance split remain unmechanized and honestly deferred: Restricted Movement has " +
	"no per-creature movement-mode override anywhere in this package, and the distance split needs " +
	"target-relative distance and applied-source identity in the modifier predicate context. Predicate " +
	"evaluation itself is covered by finding #76's live regression proof.";

/**
 * Loud-fail guard over every source sentence this module's descriptions
 * depend on — a fork re-sync that rewords any of them is caught here rather
 * than silently leaving the authored rows un-grounded (same posture as
 * `hp-units.ts`'s `assertHpProvenanceSource`).
 */
export function assertConditionsProvenanceSource(): void {
	const glossary = readFileSync(path.join(CACHE_MARKDOWN_DIR, "rules-glossary.md"), "utf8");
	for (const source of INCAPACITATED_SOURCE_SENTENCES) {
		if (!glossary.includes(source)) {
			throw new Error(
				`conditions-units: expected Incapacitated source sentence not found in cached ` +
					`rules-glossary.md: '${source}'`,
			);
		}
	}
	if (!glossary.includes(DEAD_GLOSSARY_SOURCE_SENTENCE)) {
		throw new Error(
			`conditions-units: expected Dead glossary source sentence not found in cached ` +
				`rules-glossary.md: '${DEAD_GLOSSARY_SOURCE_SENTENCE}'`,
		);
	}
	for (const source of PRONE_SOURCE_SENTENCES) {
		if (!glossary.includes(source)) {
			throw new Error(
				`conditions-units: expected Prone source sentence not found in cached ` +
					`rules-glossary.md: '${source}'`,
			);
		}
	}
	const playingTheGame = readFileSync(path.join(CACHE_MARKDOWN_DIR, "playing-the-game.md"), "utf8");
	if (!playingTheGame.includes(MONSTER_DEATH_SOURCE_SENTENCE)) {
		throw new Error(
			`conditions-units: expected Monster Death source sentence not found in cached ` +
				`playing-the-game.md: '${MONSTER_DEATH_SOURCE_SENTENCE}'`,
		);
	}
	const conditionsPackageSources: readonly [string, readonly string[]][] = [
		["Charmed", CHARMED_SOURCE_SENTENCES],
		["Frightened", FRIGHTENED_SOURCE_SENTENCES],
		["Grappled", GRAPPLED_SOURCE_SENTENCES],
		["Poisoned", POISONED_SOURCE_SENTENCES],
		["Prone", PRONE_SOURCE_SENTENCES],
	];
	for (const [name, sentences] of conditionsPackageSources) {
		for (const source of sentences) {
			if (!glossary.includes(source)) {
				throw new Error(
					`conditions-units: expected ${name} source sentence not found in cached ` +
						`rules-glossary.md: '${source}'`,
				);
			}
		}
	}
}
