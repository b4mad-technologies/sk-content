// DOC-IMPL: derived-values#read-semantics-fail-closed-vs-fail-open
// DOC-IMPL: derived-values#the-decision-rule
// C5 — Step-5 derived numbers (`character-creation.md:580-644`, § Fill In
// Numbers; `ledger/character-creation.md`'s C5 row). Home decision: this
// module lives under `character-creation/` (not `playing-the-game/`) because
// the SOURCE section is this chapter's own ("Fill In Numbers" is Step 5 of
// Character Creation) even though every underlying fact it reads
// (`srd/wis`, `srd/level`, `srd/skill/perception`, the two composed macros)
// is owned by Playing the Game — the SAME cross-chapter-read shape
// `advancement-units.ts` already established for `srd/level`/`srd/hp`.
//
// PASSIVE PERCEPTION (`:590`): "Passive Perception = 10 + Wisdom (Perception)
// check modifier" — genuinely missing before this slice; consumer: the
// baseline-sensing/future stealth-vs-passive-perception check (this slice's
// own live proof, `playing-the-game/proof-scene/checks.ts`'s
// `stealthVsPassivePerceptionCheckSpec`). Composed exactly like
// `equipment-proficiencies-units.ts`'s `toolCheckExpr` — NO new DSL macro,
// since a capability id is not a clean macro parameter on this authoring
// surface (that module's own header, reused verbatim as design precedent):
// `10 + <ability-modifier macro call> + cond(<subject>.has_capability(...),
// <proficiency-bonus macro call>, 0)`.
//
// `target.has_capability(...)` GROUNDING (verified against the grammar/eval
// code directly, not assumed): `crates/spellkave-dsl/src/lib.rs`'s
// `subject_from_ident` accepts `"target"` as an ordinary `SubjectRef` for
// `parse_method_bool` (the SAME grammar rule `has_capability`/`has_item`/
// `has_niche`/`has_tag` all share) — there is no actor-only special case.
// `eval.rs`'s `Op::HasCapability` arm calls the subject-agnostic `has_id`
// helper, which filters the capabilities-fact list by `(subject, id)`
// equality with NO subject-kind restriction. Crucially, UNLIKE `stat`/
// `effective` int reads (`generic-check-units.ts`'s own Open Question 1
// finding: those FAIL CLOSED with `UnknownField` on an unseeded subject),
// `has_capability` (and its `has_item`/`has_niche`/`has_tag` siblings) reads
// an ABSENT capability as plain `false` — no fail-closed precondition to
// document. `target.has_capability(...)` is therefore both grammar-legal and
// safe to compose with no special seeding contract, and it is not a
// speculative probe: the sister package already ships it for real
// (`world-fixtures/srd/base/attack-melee.toml`,
// `world-fixtures/srd/base/mounts.toml`).
//
// `passivePerceptionExpr` is parameterized over WHICH subject the formula
// reads (`"actor"` / `"target"`) because this slice's own consumer proof
// reads it off the TARGET of a check (the defender's Passive Perception is
// the attacker's DC), while a future self-facing reader (a character-sheet
// display) would read it off the ACTOR — same idiom, different subject,
// never a second builder.
//
// ALREADY-SHIPPED FORMULAS (`:629` Initiative, `:631` Armor Class, `:633-637`
// Attacks): this slice ships PROVENANCE-ONLY units pointing at their owning
// code, never a re-emit (`ledger/character-creation.md`'s own C5 row).
// Initiative is a row-less idiom (`playing-the-game/order-of-combat-units.ts`'s
// `initiativeRollExpr`, no manifest row — `playing-the-game/index.ts`'s own
// "Row-less mechanic units" coverage table already documents it this way).
// Armor Class is the shipped `srd/ac` resource
// (`playing-the-game/fragments/armor-class.ts`) plus the `srd/base_ac` macro
// (`playing-the-game/attack-roll-units.ts`). The Melee/Ranged attack-bonus
// formulas are the shipped `attackRollExpr` idiom, composing the SAME
// `srd/ability_modifier` + `srd/proficiency_bonus` macros this module's own
// Passive Perception formula composes.
//
// SPELL SAVE DC / SPELL ATTACK BONUS (`:640-643`): DEFERRED-WITH-OWNER — no
// spellcasting substrate exists in this package yet (owner: a future
// classes/spells chapter, per the ledger's own C5 row).
import type { ChapterUnitSummary } from "../chapter-types";
import { BUNDLE_ID as SRD_BUNDLE_ID } from "../playing-the-game/constants";
import { LEVEL_ID } from "../playing-the-game/level-units";
import {
	abilityModifierMacroCall,
	expectedAbilityModifier,
	expectedProficiencyBonus,
	proficiencyBonusMacroCall,
} from "../playing-the-game/modifier-units";
import { buildSkillUnits } from "../playing-the-game/skill-units";

const WIS_ABILITY_CODE = "wis";
const PERCEPTION_SKILL_SLUG = "perception";

export const PASSIVE_PERCEPTION_ANCHOR =
	"character-creation.md:590 (§ Fill In Numbers > Passive Perception: " +
	'"Passive Perception = 10 + Wisdom (Perception) check modifier")';

const INITIATIVE_ANCHOR = "character-creation.md:629 (§ Fill In Numbers > Initiative)";
const ARMOR_CLASS_ANCHOR = "character-creation.md:631 (§ Fill In Numbers > Armor Class)";
const ATTACKS_ANCHOR = "character-creation.md:633-637 (§ Fill In Numbers > Attacks)";
const SPELLCASTING_ANCHOR = "character-creation.md:640-643 (§ Fill In Numbers > Spellcasting)";

/**
 * `srd/skill/perception` — verified against the shipped skill catalog
 * (`skill-units.ts`'s `buildSkillUnits`, never hand-typed) so a future fork
 * re-sync that ever drops/renames/re-governs the Perception skill fails
 * loudly here instead of silently authoring a dead or wrongly-derived
 * reference.
 */
export function perceptionSkillCapabilityId(): string {
	const perception = buildSkillUnits().find((skill) => skill.slug === PERCEPTION_SKILL_SLUG);
	if (perception === undefined) {
		throw new Error(
			`derived-units: no '${PERCEPTION_SKILL_SLUG}' skill in the shipped skill catalog.`,
		);
	}
	if (perception.governingAbility !== WIS_ABILITY_CODE) {
		throw new Error(
			"derived-units: expected the Perception skill to be Wisdom-governed, got " +
				`'${perception.governingAbility}'.`,
		);
	}
	return `${SRD_BUNDLE_ID}/skill/${perception.slug}`;
}

/**
 * Build the Passive Perception expression (`:590`):
 * `10 + <Wisdom modifier macro call> + cond(<subject>.has_capability('srd/skill/perception'), <proficiency-bonus macro call>, 0)`
 * — see this module's own header for the composition precedent
 * (`equipment-proficiencies-units.ts`'s `toolCheckExpr`) and the
 * `target.has_capability` grounding.
 */
export function passivePerceptionExpr(subject: "actor" | "target"): string {
	const wisScoreExpr = `${subject}.stat('${SRD_BUNDLE_ID}/${WIS_ABILITY_CODE}')`;
	const levelExpr = `${subject}.stat('${SRD_BUNDLE_ID}/${LEVEL_ID}')`;
	const proficiencyGate = `${subject}.has_capability('${perceptionSkillCapabilityId()}')`;
	const proficiencyTerm = `cond(${proficiencyGate}, ${proficiencyBonusMacroCall(levelExpr)}, 0)`;
	return `10 + ${abilityModifierMacroCall(wisScoreExpr)} + ${proficiencyTerm}`;
}

/**
 * TS-side mirror of the formula's own arithmetic — re-derived from the SAME
 * SRD-cited lookup tables (`expectedAbilityModifier`, `expectedProficiencyBonus`),
 * never a second hand-typed copy of the numbers — mirroring
 * `advancement-units.ts`'s `xpThresholdForLevel` precedent. Used by the
 * offline test and by the live proof's expected-DC derivation.
 */
export function expectedPassivePerception(
	wisScore: number,
	levelOrCr: number,
	proficient: boolean,
): number {
	return (
		10 + expectedAbilityModifier(wisScore) + (proficient ? expectedProficiencyBonus(levelOrCr) : 0)
	);
}

/**
 * C5's own shipped idiom unit — a real, consumed TS builder (this file's
 * `passivePerceptionExpr`), never a manifest row (module header). Rendered
 * distinctly from a bare `provenance_only` unit by `index.ts`'s
 * `renderCoverage` (kind `"idiom_only"`).
 */
export function passivePerceptionProvenanceUnit(): ChapterUnitSummary {
	return {
		kind: "idiom_only",
		id: "character-creation/fill-in-numbers/passive-perception",
		sourcePk: PASSIVE_PERCEPTION_ANCHOR,
	};
}

/**
 * The remaining "Fill In Numbers" units (`:580`): Initiative/Armor Class/
 * Attacks are provenance rows pointing at their ALREADY-SHIPPED owning code
 * (never re-emitted, module header); Spell save DC / spell attack bonus are
 * deferred-with-owner (no spellcasting substrate yet).
 */
export function fillInNumbersProvenanceUnits(): ChapterUnitSummary[] {
	return [
		{
			kind: "already_shipped_elsewhere",
			id: "character-creation/fill-in-numbers/initiative",
			sourcePk:
				`${INITIATIVE_ANCHOR} — already shipped as a row-less idiom: ` +
				"playing-the-game/order-of-combat-units.ts's initiativeRollExpr (no manifest row).",
		},
		{
			kind: "already_shipped_elsewhere",
			id: "character-creation/fill-in-numbers/armor-class",
			sourcePk:
				`${ARMOR_CLASS_ANCHOR} — already shipped: playing-the-game/fragments/armor-class.ts's ` +
				"srd/ac resource plus playing-the-game/attack-roll-units.ts's srd/base_ac macro.",
		},
		{
			kind: "already_shipped_elsewhere",
			id: "character-creation/fill-in-numbers/attacks",
			sourcePk:
				`${ATTACKS_ANCHOR} — already shipped: playing-the-game/attack-roll-units.ts's ` +
				"attackRollExpr idiom (composes the SAME srd/ability_modifier + srd/proficiency_bonus " +
				"macros this slice's own Passive Perception formula composes).",
		},
		{
			kind: "deferred_with_owner",
			id: "character-creation/fill-in-numbers/spell-save-dc",
			sourcePk: `${SPELLCASTING_ANCHOR} — owner: a future classes/spells chapter (no spellcasting substrate yet).`,
		},
		{
			kind: "deferred_with_owner",
			id: "character-creation/fill-in-numbers/spell-attack-bonus",
			sourcePk: `${SPELLCASTING_ANCHOR} — owner: a future classes/spells chapter (no spellcasting substrate yet).`,
		},
	];
}
