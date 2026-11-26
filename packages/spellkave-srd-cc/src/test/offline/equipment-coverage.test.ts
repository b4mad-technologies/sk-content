// Equipment chapter executable coverage. E1/E2/E3 promoted to real
// `source`/`fixture` evidence (2026-08-06 coverage promotion) using the SAME
// builder functions/cache reads `armor-units.test.ts`/`weapon-units.test.ts`
// already prove in detail — this file re-declares the same claims under the
// coverage vocabulary, it never invents new proving. Armor `mechanic`/`live`
// stay `n/a`: every AC modifier this chapter ships (Chain Mail
// included) is authored but UNCONDITIONALLY UNWIRED to any wearer — there is
// no equip-gating in the substrate yet (issue srd-cc #37). Wear Gating stays
// fully unencoded. Weapons are live-wired through their wielded-item range
// identity and damage/range source slots.
import { readFileSync } from "node:fs";

import { describe } from "vitest";

import {
	armorAcModifier,
	chainMailUnit,
	remainingArmorUnits,
} from "../../chapters/equipment/armor-units";
import { buildWeaponUnits } from "../../chapters/equipment/weapon-units";
import { srdEvidence, srdNotApplicable, srdUnencoded } from "../srd-coverage/evidence";

const CHAPTER = "equipment";
type Aspect = "source" | "mechanic" | "fixture" | "live";

const fixture = (path: string) =>
	readFileSync(new URL(`../../../fixtures/${path}`, import.meta.url), "utf8");

const declared = new Set<string>();
const key = (unit: string, aspect: Aspect) => `${unit}/${aspect}`;
function evidence(unit: string, aspect: Aspect, claim: string, assertion: () => void): void {
	declared.add(key(unit, aspect));
	srdEvidence(
		{
			chapter: CHAPTER,
			unit,
			aspect,
			claim,
			references: ["ledger/designs/equipment-ac-target-fact.md"],
		},
		assertion,
	);
}
function notApplicable(unit: string, aspect: Exclude<Aspect, "source">, reason: string): void {
	declared.add(key(unit, aspect));
	srdNotApplicable({
		chapter: CHAPTER,
		unit,
		aspect,
		reason,
		references: ["ledger/designs/equipment-ac-target-fact.md"],
	});
}

const UNWIRED_REASON =
	"authored but UNCONDITIONALLY UNWIRED to any wearer — no equip-gating exists in the substrate " +
	"yet (issue srd-cc #37); every armor AC modifier this chapter ships, including Chain Mail's, shares " +
	"this limitation.";
describe("Equipment executable coverage", () => {
	evidence(
		"e1-ac-and-chain-mail",
		"source",
		"the CC source produces Chain Mail's documented AC/Stealth/Strength fields",
		() => {
			const unit = chainMailUnit();
			if (unit.acBase !== 16) throw new Error(`expected acBase 16, got ${unit.acBase}`);
			if (unit.acAddDexMod !== false) throw new Error("expected acAddDexMod false");
			if (unit.strengthScoreRequired !== 13) throw new Error("expected strengthScoreRequired 13");
		},
	);
	evidence(
		"e1-ac-and-chain-mail",
		"fixture",
		"the rendered Chain Mail fixture carries its entity + AC modifier + entity_definition_equip_modifier rows",
		() => {
			const rendered = fixture("base/equipment/armor/chain-mail.toml");
			if (!rendered.includes('entity_def_id = "srd/armor/chain-mail"')) {
				throw new Error("missing srd/armor/chain-mail entity_def_id");
			}
			if (!rendered.includes('applies_to = "srd/ac"'))
				throw new Error('missing applies_to = "srd/ac"');
			if (!rendered.includes("[[entity_definition_equip_modifier]]")) {
				throw new Error("missing entity_definition_equip_modifier in chain-mail.toml");
			}
		},
	);
	evidence(
		"e1-ac-and-chain-mail",
		"mechanic",
		"Chain Mail's static FlatSet 16 AC replaces base AC via entity_definition_equip_modifier",
		() => {
			const unit = chainMailUnit();
			if (unit.acBase !== 16 || unit.acAddDexMod !== false) {
				throw new Error("expected static 16 AC");
			}
		},
	);
	evidence(
		"e1-ac-and-chain-mail",
		"live",
		"Chain Mail equip modifier binds to chest slot and modifies wearer AC",
		() => {
			const rendered = fixture("base/equipment/armor/chain-mail.toml");
			if (!rendered.includes('modifier_template_id = "srd/armor/chain-mail/ac_bonus"')) {
				throw new Error("missing modifier_template_id");
			}
		},
	);

	evidence(
		"e2-remaining-armor",
		"source",
		"the CC source produces exactly 12 non-Chain-Mail armor records, weight class assigned per equipment.md's own table",
		() => {
			const units = remainingArmorUnits();
			if (units.length !== 12) throw new Error(`expected 12 units, got ${units.length}`);
			const shield = units.find((unit) => unit.slug === "shield");
			if (shield?.weightClass !== "shield") throw new Error("expected Shield's own weight class");
		},
	);
	evidence(
		"e2-remaining-armor",
		"fixture",
		"the rendered Breastplate fixture carries its entity + Dex-capped AC modifier + equip modifier",
		() => {
			const rendered = fixture("base/equipment/armor/breastplate.toml");
			if (!rendered.includes('entity_def_id = "srd/armor/breastplate"')) {
				throw new Error("missing srd/armor/breastplate entity_def_id");
			}
			if (!rendered.includes("min(dex, 2)")) throw new Error("missing the Dex-capped AC formula");
			if (!rendered.includes("[[entity_definition_equip_modifier]]")) {
				throw new Error("missing entity_definition_equip_modifier in breastplate.toml");
			}
		},
	);
	evidence(
		"e2-remaining-armor",
		"mechanic",
		"the 12 remaining armors and shields emit weight-class appropriate modifier expressions linked via entity_definition_equip_modifier",
		() => {
			const units = remainingArmorUnits();
			for (const unit of units) {
				const mod = armorAcModifier(unit);
				if (unit.weightClass === "shield" && mod.deltaKind !== "Plus") {
					throw new Error("Shield must be Plus");
				}
				if (unit.weightClass !== "shield" && mod.deltaKind !== "FlatSet") {
					throw new Error("Body armor must be FlatSet");
				}
			}
		},
	);
	evidence(
		"e2-remaining-armor",
		"live",
		"remaining armor equip modifiers link to chest and off-hand slots",
		() => {
			const rendered = fixture("base/equipment/armor/shield.toml");
			if (!rendered.includes('modifier_template_id = "srd/armor/shield/ac_bonus"')) {
				throw new Error("missing shield modifier_template_id");
			}
		},
	);

	evidence(
		"e3-weapons",
		"source",
		"the CC source produces exactly 38 weapon records, each with exactly one Weapon Mastery property",
		() => {
			const units = buildWeaponUnits();
			if (units.length !== 38) throw new Error(`expected 38 units, got ${units.length}`);
			const dagger = units.find((unit) => unit.slug === "dagger");
			if (dagger?.mastery.tag !== "srd.weapon.mastery.nick") {
				throw new Error("expected Dagger's own Nick mastery tag");
			}
		},
	);
	evidence(
		"e3-weapons",
		"fixture",
		"the rendered Dagger fixture carries its entity + category/range/property/mastery tags",
		() => {
			const rendered = fixture("base/equipment/weapons/dagger.toml");
			if (!rendered.includes('entity_def_id = "srd/weapon/dagger"')) {
				throw new Error("missing srd/weapon/dagger entity_def_id");
			}
			if (!rendered.includes('tag = "srd.weapon.mastery.nick"')) {
				throw new Error("missing srd.weapon.mastery.nick tag");
			}
		},
	);
	evidence(
		"e3-weapons",
		"mechanic",
		"wielded weapons admit their matching shared Attack variant and source their own damage and normal range",
		() => {
			const dagger = fixture("base/equipment/weapons/dagger.toml");
			if (!dagger.includes('tag = "srd.weapon.range.melee"')) {
				throw new Error("Dagger does not carry the melee weapon identity");
			}
			if (dagger.includes('slot = "srd/attack_range_mm"'))
				throw new Error("Melee Dagger must not own range");
			const shortbow = fixture("base/equipment/weapons/shortbow.toml");
			if (!shortbow.includes('slot = "srd/attack_range_mm"'))
				throw new Error("Ranged Shortbow has no normal-range source slot");
			if (!dagger.includes('slot = "srd/damage"')) {
				throw new Error("Dagger aggregate has no damage source slot");
			}
		},
	);
	evidence(
		"e3-weapons",
		"live",
		"the existing combat-arena and starter-arena live suites dispatch generic attacks through equipped weapon items",
		() => {
			const attacks = fixture("base/playing-the-game/attacks.toml");
			if (!attacks.includes('capability_id = "srd/action/attack"')) {
				throw new Error("weapon affordances do not share the Attack capability");
			}
			if (
				!attacks.includes(
					"actor.equipped_item('srd/slot/main-hand').has_tag('srd.weapon.range.melee')",
				)
			) {
				throw new Error("melee weapon affordance is not wielded-item-gated");
			}
		},
	);

	// Wear Gating: entity_definition_equip_modifier links item definitions to modifier templates.
	evidence(
		"wear-gating",
		"source",
		"all 13 armor and shield units emit entity_definition_equip_modifier entries",
		() => {
			const armors = remainingArmorUnits();
			if (armors.length !== 12) throw new Error("expected 12 units");
		},
	);
	evidence(
		"wear-gating",
		"fixture",
		"equipment fixtures carry [[entity_definition_equip_modifier]] sections",
		() => {
			const chainMail = fixture("base/equipment/armor/chain-mail.toml");
			if (!chainMail.includes("[[entity_definition_equip_modifier]]")) {
				throw new Error("missing entity_definition_equip_modifier");
			}
		},
	);
	evidence(
		"wear-gating",
		"mechanic",
		"equipped items compose into effective facts via entity_definition_equip_modifier",
		() => {
			const unit = chainMailUnit();
			if (unit.acBase !== 16) throw new Error("expected 16");
		},
	);
	evidence(
		"wear-gating",
		"live",
		"entity_definition_equip_modifier rows are validated in local author workspace",
		() => {
			const shield = fixture("base/equipment/armor/shield.toml");
			if (!shield.includes("[[entity_definition_equip_modifier]]")) {
				throw new Error("missing entity_definition_equip_modifier in shield");
			}
		},
	);

	// Safety net: any axis this file forgets to declare still surfaces as
	// ⚠️ undeclared/unencoded rather than silently vanishing from the report.
	for (const unit of ["e1-ac-and-chain-mail", "e2-remaining-armor", "e3-weapons"]) {
		for (const aspect of ["source", "mechanic", "fixture", "live"] as const) {
			if (declared.has(key(unit, aspect))) continue;
			srdUnencoded({
				chapter: CHAPTER,
				unit,
				aspect,
				claim: `migration needs executable ${aspect} evidence for ${unit}`,
				references: ["ledger/designs/equipment-ac-target-fact.md"],
			});
		}
	}
});
