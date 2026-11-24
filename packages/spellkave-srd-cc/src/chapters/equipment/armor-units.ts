// Equipment slice E1 (`ledger/designs/equipment-ac-target-fact.md`): the
// `srd/ac` target fact + Chain Mail, the ONE proven armor this slice ships.
// Ledger row: `ledger/equipment.md` "Armor Class axis" / "Chain Mail".
//
// SRD/AC REPRESENTATION, DECIDED (design draft's own open question 4 / the
// operator brief's own ask, "resource_definitions vs the sister's
// object_state shape"): `resource_definitions`, matching THIS package's own
// established convention for every other numeric stat (`srd/str`..`srd/cha`,
// `srd/level`, `srd/hp`, `srd/dc/<slug>` — `playing-the-game/index.ts`), NOT
// the sister's `object_state_definitions`. Grounded, not just precedent-
// matched: `crates/spellkave-dsl/src/eval.rs`'s `Op::ReadInt`/
// `Op::ReadEffectiveInt` arms (`actor.stat`/`actor.effective`) read a
// flat `int_fields`/`effective_int_fields` fact list keyed ONLY by
// `(subject, field_id)` — the read path is IDENTICAL regardless of which
// catalog (`resource_definitions` or `object_state_definitions`) authored
// the field_id; nothing in the eval arm branches on catalog kind. Definition-
// level seeding is equally catalog-agnostic since finding #10's fix
// (`MF-VAL-253` widened to accept either catalog, `ledger/designs/
// finding-10-definition-time-resource-seed.md`) — this package's own
// `entity_definition_initial_state` seeds (proof-scene.ts's str/wis/level/
// cha rows) already exercise the `resource_definitions` path exclusively.
// With no correctness or authoring-surface difference, consistency wins:
// introducing `object_state_definitions` for exactly ONE axis, when every
// other stat in this bundle is a resource, would be a needless second
// catalog with no consumer benefiting from it (AGENTS.md "question, never
// copy" — the sister's own object_state choice is PRECEDENT, not a
// requirement, once grounded and found equivalent here).
//
// WEAR MECHANISM (design draft's decision 2, mirrors the sister's own
// `world-fixtures/srd/base/armor.toml` probe): Chain Mail ships as an
// `entity_definitions` item with `slot_compatibility_predicate =
// 'slot_id == "srd/slot/chest"'`, an srd-OWN `equipment_slot_definitions` row
// (`index.ts`'s `buildArmorFragment`) rather than the server-bootstrapped
// `core/chest` slot the sister reuses (`server/src/world_interaction/layer3/
// equipment_slot_definition.rs:33-37`, "the slot-vocab axis is fits-trivially
// and does not need re-proving" — `world-fixtures/srd/base/armor.toml`'s own
// header, Direction O). Self-sufficiency (AGENTS.md, `ledger/archive/general-decisions.md`'s
// 2026-07-28 operator ruling) forecloses that reuse here even though
// `core/chest` genuinely exists on every node (genesis-seeded, not core-
// bundle content) — the sister's OWN `srd/main_hand` row (`world-fixtures/
// srd/base/items.toml`, "the SRD bundle authors its own equipment_slot_
// definition row rather than reusing core/main_hand ... a modder can publish
// a self-contained equipment vocabulary") is the closer precedent for this
// package's own posture: same shape (`slot_id`/`bundle_id`/`label`/
// `default_compatibility_predicate`), applied to `chest` instead of
// `main_hand`. Plus an ALWAYS-ACTIVE `modifier_templates`
// row (`predicate_source = ""`, `delta_kind = "FlatSet"`) on the `srd/ac`
// axis. This is IDENTITY content only — no `entities`/spawn instance, no
// actor to wear it, and (finding #37, filed BEFORE this module
// existed) no substrate mechanism fires a modifier_template from equip
// state alone: `effective_int_fields` composes ONLY from a `target_condition`
// row (`condition_definition.rs`'s `fold_condition_modifier_int_facts`), and
// nothing here authors a `condition_definitions` row wrapping this
// modifier_template — so Chain Mail's FlatSet 16 is authored, proven to
// compose via the axis (server-side unit test precedent,
// `modifier_target_definition.rs`'s own Leather-Armor-shaped test), but NOT
// live-wired to any wearer. Inherited consciously (finding #37), not closed
// here — E2's own wear-gating slice, #266-family.
import { armorByPk, readArmor } from "../../open5e/armor";
import { abilityModifierMacroCall } from "../playing-the-game/modifier-units";

export const CHAIN_MAIL_ARMOR_PK = "srd-2024_chain-mail";

/** One armor unit this chapter ships — fields read straight off `Armor.json`, never hand-typed. */
export interface ArmorUnit {
	slug: string;
	displayName: string;
	acBase: number;
	acAddDexMod: boolean;
	acCapDexMod: number | null;
	grantsStealthDisadvantage: boolean;
	strengthScoreRequired: number | null;
	sourcePk: string;
}

/**
 * Chain Mail — E1's one proven armor (design draft's decision 3): STATIC AC
 * (`ac_add_dexmod: false`), so no dex-cap encoding is needed (Breastplate's
 * dex-capped shape is explicitly OUT of this slice, finding #37/
 * the design draft's own decision 3). Throws loudly if the cached record
 * ever stops being static — a silent `ac_add_dexmod: true` flip would make
 * this unit's own "static, no dex composition" framing wrong.
 */
export function chainMailUnit(): ArmorUnit {
	const record = armorByPk(CHAIN_MAIL_ARMOR_PK);
	if (record.acAddDexMod) {
		throw new Error(
			"armor-units: Chain Mail's cached Armor.json record now has ac_add_dexmod=true — this " +
				"unit's 'static FlatSet' framing (design draft decision 3) no longer holds; re-derive.",
		);
	}
	return {
		slug: "chain-mail",
		displayName: record.name,
		acBase: record.acBase,
		acAddDexMod: record.acAddDexMod,
		acCapDexMod: record.acCapDexMod,
		grantsStealthDisadvantage: record.grantsStealthDisadvantage,
		strengthScoreRequired: record.strengthScoreRequired,
		sourcePk: record.pk,
	};
}

/** `equipment_slot_definitions` local id stem for this bundle's own Chest anchor — full id `${BUNDLE_ID}/${CHEST_SLOT_LOCAL_ID}` (`index.ts`'s `buildArmorFragment`). Self-sufficiency (module header): srd-own, never `core/chest`. */
export const CHEST_SLOT_LOCAL_ID = "slot/chest";
export const CHEST_SLOT_LABEL = "Chest";

// ---------------------------------------------------------------------------
// E2 (equipment quick-win completion, `ledger/equipment.md` "E2 Remaining
// Armor"): the remaining 12 `Armor.json` records (13 total minus Chain
// Mail). Same catalog (`resource_definitions`/`srd/ac`), same self-owned
// Chest slot for the 11 body-armor rows — Shield is the one exception, an
// srd-OWN `slot/off-hand` anchor below, since a Shield is worn alongside
// body armor, never replacing it (`equipment.md:579`'s own "Shield" table
// subsection, distinct from "Light/Medium/Heavy Armor").
//
// A Shield's `slot_compatibility_predicate` below is UNGATED by the SRD's own
// Shield training requirement (`equipment.md:598`, "You gain the Armor Class
// benefit of a Shield only if you have training with it") — same "identity
// authored, not live-wired" posture Chain Mail's own module header already
// establishes for wear-gating generally (finding #37/#265 family); this
// slice does not attempt Shield's training gate specifically.
export const OFF_HAND_SLOT_LOCAL_ID = "slot/off-hand";
export const OFF_HAND_SLOT_LABEL = "Off Hand";
/** Self-owned hand slot used by manufactured and natural weapon seeds. */
export const MAIN_HAND_SLOT_LOCAL_ID = "slot/main-hand";
export const MAIN_HAND_SLOT_LABEL = "Main Hand";

/** `equipment.md`'s own three Armor weight classes (`:474` Light, `:501` Medium, `:544` Heavy) plus its separate Shield subsection (`:579`, NOT a fourth weight class — its own table heading). */
export type ArmorWeightClass = "light" | "medium" | "heavy" | "shield";

const ARMOR_PK_PREFIX = "srd-2024_";

function slugFromArmorPk(pk: string): string {
	if (!pk.startsWith(ARMOR_PK_PREFIX)) {
		throw new Error(
			`armor-units: Armor.json pk '${pk}' does not carry the expected '${ARMOR_PK_PREFIX}' prefix.`,
		);
	}
	return pk.slice(ARMOR_PK_PREFIX.length);
}

/**
 * Closed, cache-verified lookup (mirrors `creature-tag-values.ts`'s
 * `CR_SLUG_BY_RAW` idiom) grounded in `equipment.md`'s own table subsection
 * headings, NOT derived from `ac_add_dexmod`/`ac_cap_dexmod` — those two
 * booleans alone can't distinguish Shield from Heavy Armor (both carry
 * `ac_add_dexmod: false`), so a literal table is the only unambiguous source.
 * `armorWeightClass` throws loudly on a pk this table doesn't cover — a cache
 * resync introducing a 14th armor must fail the generator, not silently omit it.
 */
const ARMOR_WEIGHT_CLASS_BY_PK: Readonly<Record<string, ArmorWeightClass>> = {
	"srd-2024_padded-armor": "light",
	"srd-2024_leather-armor": "light",
	"srd-2024_studded-leather-armor": "light",
	"srd-2024_hide-armor": "medium",
	"srd-2024_chain-shirt": "medium",
	"srd-2024_scale-mail": "medium",
	"srd-2024_breastplate": "medium",
	"srd-2024_half-plate-armor": "medium",
	"srd-2024_ring-mail": "heavy",
	[CHAIN_MAIL_ARMOR_PK]: "heavy",
	"srd-2024_splint-armor": "heavy",
	"srd-2024_plate-armor": "heavy",
	"srd-2024_shield": "shield",
};

export function armorWeightClass(pk: string): ArmorWeightClass {
	const weightClass = ARMOR_WEIGHT_CLASS_BY_PK[pk];
	if (weightClass === undefined) {
		throw new Error(
			`armor-units: no weight class recorded for Armor.json pk '${pk}' — ARMOR_WEIGHT_CLASS_BY_PK ` +
				"is stale against a cache resync (equipment.md's Armor table subsections).",
		);
	}
	return weightClass;
}

export interface GeneralArmorUnit extends ArmorUnit {
	weightClass: ArmorWeightClass;
}

/**
 * The 12 remaining `Armor.json` records (everything but Chain Mail, already
 * shipped by `chainMailUnit`) — fields read straight off the cache, weight
 * class from the closed lookup above. Throws if the cache no longer carries
 * exactly the 13 rows `ARMOR_WEIGHT_CLASS_BY_PK` covers (staleness guard,
 * same posture as `feats-units.ts`'s `EXPECTED_ORIGIN_FEAT_COUNT`).
 */
export function remainingArmorUnits(): GeneralArmorUnit[] {
	const records = readArmor();
	const expectedCount = Object.keys(ARMOR_WEIGHT_CLASS_BY_PK).length;
	if (records.length !== expectedCount) {
		throw new Error(
			`armor-units: expected exactly ${expectedCount} Armor.json records (E2 completion), found ` +
				`${records.length} — a cache resync may have changed the Armor table.`,
		);
	}
	return records
		.filter((record) => record.pk !== CHAIN_MAIL_ARMOR_PK)
		.map((record) => ({
			slug: slugFromArmorPk(record.pk),
			displayName: record.name,
			acBase: record.acBase,
			acAddDexMod: record.acAddDexMod,
			acCapDexMod: record.acCapDexMod,
			grantsStealthDisadvantage: record.grantsStealthDisadvantage,
			strengthScoreRequired: record.strengthScoreRequired,
			sourcePk: record.pk,
			weightClass: armorWeightClass(record.pk),
		}));
}

/** One armor's AC `modifier_templates` composition — expression source plus the correct `delta_kind`. */
export interface ArmorAcModifier {
	expression: string;
	deltaKind: "FlatSet" | "Plus";
}

/**
 * Compose the AC modifier for one non-Chain-Mail armor, by weight class:
 *
 * - **Shield**: `equipment.md:453`'s own "your base AC is..." framing plus
 *   the Shield table row's own AC value (+2) — RAW Shield "increases your
 *   AC by 2" (not quoted verbatim in the cached prose, but the table's own
 *   AC column header and the Armor Class section together establish it):
 *   this ADDS to whatever AC the wearer already has, unlike body armor's
 *   replace-outright semantics. `Plus`, never `FlatSet`.
 * - **Heavy** (`ac_add_dexmod: false`): static, replaces outright — same
 *   `FlatSet` posture Chain Mail's own header already establishes.
 * - **Light** (`ac_add_dexmod: true`, `ac_cap_dexmod: null`): base plus the
 *   FULL Dexterity modifier, uncapped — `FlatSet` (the armor still REPLACES
 *   the unarmored baseline outright, it just composes Dexterity into the
 *   replacement value).
 * - **Medium** (`ac_add_dexmod: true`, `ac_cap_dexmod: 2`): base plus
 *   Dexterity modifier capped at `ac_cap_dexmod` — expressed with the DSL's
 *   `min(a, b)` builtin (`crates/spellkave-dsl/src/lib.rs`'s `parse_cond`
 *   sibling `min`/`max` parsing; historical blocker issue #265 is CLOSED —
 *   confirmed EXPRESSIBLE, not worked around).
 *
 * The Dexterity term reads the live effective actor score (`actor.effective('srd/dex')` through
 * the shared `srd/ability_modifier` macro, `modifier-units.ts`) — same
 * `EvaluationContext` read path `attack-roll-units.ts`'s own `baseArmorClassExpr`
 * already exercises for the unarmored baseline. Per Chain Mail's own header,
 * NONE of these rows are live-wired to any wearer this slice (finding #37) —
 * this only fixes the FORMULA each row carries, not equip-gating.
 */
export function armorAcModifier(unit: GeneralArmorUnit): ArmorAcModifier {
	if (unit.weightClass === "shield") {
		return { expression: `let bonus = ${unit.acBase}; bonus`, deltaKind: "Plus" };
	}
	if (!unit.acAddDexMod) {
		return { expression: `let ac = ${unit.acBase}; ac`, deltaKind: "FlatSet" };
	}
	const dexModExpr = abilityModifierMacroCall("actor.effective('srd/dex')");
	if (unit.acCapDexMod === null) {
		return {
			expression: `let base = ${unit.acBase}; let dex = ${dexModExpr}; base + dex`,
			deltaKind: "FlatSet",
		};
	}
	return {
		expression: `let base = ${unit.acBase}; let dex = ${dexModExpr}; base + min(dex, ${unit.acCapDexMod})`,
		deltaKind: "FlatSet",
	};
}
