// Damage beside to-hit (tohit-fidelity.test.ts): every natural weapon a
// creature is equipped with deals the stat block's own dice and bonus.
// Before sk-jay0.1.55.60.3 a block whose numbers match no single ability
// fell back to a Strength read, so the Specter (Strength 1, "7 (2d6)") dealt
// 2d6 - 5. Such a weapon now carries the block's literal bonus.
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseSchemaManifestToml } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";
import { buildEquipmentSeeds } from "../../chapters/monsters/bestiary-plan";

const FIXTURES = path.resolve(import.meta.dirname, "../../../fixtures/base/monsters");
const seeds = buildEquipmentSeeds().filter((seed) => seed.naturalWeaponSlug !== null);
const modifier = (score: number) => Math.floor((score - 10) / 2);

function read(slug: string) {
	const manifest = parseSchemaManifestToml(
		readFileSync(path.join(FIXTURES, `${slug}.toml`), "utf8"),
	);
	const states = (manifest.entity_definition_initial_state ?? []) as {
		state_id: string;
		value_int: number;
	}[];
	const score = (id: string) => states.find((row) => row.state_id === id)?.value_int ?? Number.NaN;
	const sources = (manifest.entity_definition_item_dsl_source ?? []) as {
		slot: string;
		source: string;
	}[];
	return {
		str: modifier(score("srd/str")),
		dex: modifier(score("srd/dex")),
		damage: sources.find((row) => row.slot === "srd/damage")?.source,
	};
}

describe("damage fidelity: an equipped natural weapon deals the stat block's dice and bonus", () => {
	it("covers the bestiary", () => {
		expect(seeds.length).toBeGreaterThan(100);
		expect(seeds.some((seed) => seed.literalDamageBonus !== null)).toBe(true);
	});
	for (const seed of seeds) {
		it(`${seed.slug}: ${seed.equippedAttack.diceExpr} + ${seed.equippedAttack.damageBonus}`, () => {
			const { str, dex, damage } = read(seed.slug);
			const attack = seed.equippedAttack;
			if (seed.literalDamageBonus !== null) {
				expect(seed.literalDamageBonus).toBe(attack.damageBonus);
				expect(damage).toBe(`${attack.diceExpr} + (${attack.damageBonus})`);
				return;
			}
			// An ability read: that ability's modifier IS the block's bonus.
			const abilityRead =
				seed.abilityMode === "finesse"
					? Math.max(str, dex)
					: seed.abilityMode === "dex"
						? dex
						: str;
			expect(abilityRead).toBe(attack.damageBonus);
			expect(damage?.startsWith(`${attack.diceExpr} + (`)).toBe(true);
			expect(damage).toContain("_modifier");
		});
	}
	it("the Specter and the Will-o'-Wisp deal what their blocks say", () => {
		expect(read("specter").damage).toBe("2d6 + (0)");
		expect(read("will-o-wisp").damage).toBe("2d8 + (2)");
	});
});
