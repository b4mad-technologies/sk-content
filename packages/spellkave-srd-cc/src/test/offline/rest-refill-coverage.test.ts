// L12b rest-boundary resource refill + Arcane Recovery / Magical Cunning.
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseSchemaManifestToml } from "@spellkave/world-author";
import { describe, expect } from "vitest";
import {
	HIT_DICE_SPENT_ID,
	HIT_DIE_HEAL_ID,
	hitDieHealExpr,
} from "../../chapters/playing-the-game/fragments/rest";
import { srdEvidence } from "../srd-coverage/evidence";

const FIXTURES = path.resolve(import.meta.dirname, "../../../fixtures");

function readFixture(rel: string): string {
	return readFileSync(path.join(FIXTURES, rel), "utf8");
}

const REFS = [
	"packages/spellkave-world-author/docs/patterns/rest-boundary-resource-refill.md",
	"docs/spellcasting-substrate.md",
] as const;

describe("Rest boundary resource refill (L12b)", () => {
	srdEvidence(
		{
			chapter: "playing-the-game",
			unit: "long-rest-resource-refill",
			aspect: "fixture",
			claim: "Long Rest consequence full-refills HP and gated pools via resource_max - stat",
			references: [...REFS],
		},
		() => {
			const rest = readFixture("base/playing-the-game/rest.toml");
			expect(rest).toContain("pattern: rest-boundary-resource-refill");
			expect(rest).toContain("actor.resource_max('srd/hp') - actor.stat('srd/hp')");
			expect(rest).toContain("srd/fighter/second-wind-uses");
			expect(rest).toContain("srd/spell_slot_1");
			expect(rest).toContain("srd/magic_item/wand-of-magic-missiles/charges");
			expect(rest).toContain("srd/magic_item/wand-of-fireballs/charges");
		},
	);

	srdEvidence(
		{
			chapter: "playing-the-game",
			unit: "short-rest-resource-refill",
			aspect: "fixture",
			claim: "Short Rest consequence applies +1 partial recovery for gated class pools",
			references: [...REFS],
		},
		() => {
			const rest = readFixture("base/playing-the-game/rest.toml");
			expect(rest).toContain("srd/boundary/short_rest");
			expect(rest).toContain("srd/fighter/second-wind-uses");
			expect(rest).toContain("cond(actor.has_capability('srd/class-feature/fighter/second-wind')");
		},
	);

	srdEvidence(
		{
			chapter: "playing-the-game",
			unit: "short-rest-hit-point-dice",
			aspect: "fixture",
			claim:
				"A Short Rest spends one Hit Point Die (class die + Constitution modifier, capped at the real Hit Point maximum, one die per level); a Long Rest returns every spent die",
			references: [
				...REFS,
				"packages/spellkave-srd-cc/cache/markdown/rules-glossary.md:1283",
				"packages/spellkave-srd-cc/cache/markdown/rules-glossary.md:1035",
				"packages/spellkave-world-author/docs/patterns/derived-value-mechanism.md",
			],
		},
		() => {
			const manifest = parseSchemaManifestToml(readFixture("base/playing-the-game/rest.toml"));
			const writes = (manifest.consequence_frame_writes ?? []) as {
				template_id: string;
				ordinal: number;
				frame_write: { ModifyResource?: { resource: string; delta_source: string } };
			}[];
			const sources = (template: string, resource: string) =>
				writes
					.filter((row) => row.template_id === template)
					.sort((left, right) => left.ordinal - right.ordinal)
					.flatMap((row) =>
						row.frame_write.ModifyResource?.resource === resource
							? [row.frame_write.ModifyResource.delta_source]
							: [],
					);
			const short = "srd/rest/short/complete/success";
			// Both counters are created before the first read of either.
			expect(sources(short, HIT_DICE_SPENT_ID)).toEqual([
				"0",
				`cond(actor.stat('${HIT_DIE_HEAL_ID}') > 0, 1, 0)`,
			]);
			expect(sources(short, HIT_DIE_HEAL_ID)).toEqual([
				"0",
				`${hitDieHealExpr()} - actor.stat('${HIT_DIE_HEAL_ID}')`,
			]);
			expect(sources(short, "srd/hp")).toEqual([`actor.stat('${HIT_DIE_HEAL_ID}')`]);
			const heal = hitDieHealExpr();
			expect(heal).toContain("actor.has_tag('srd.player_character')");
			expect(heal).toContain(`actor.stat('${HIT_DICE_SPENT_ID}') < actor.stat('srd/level')`);
			expect(heal).toContain("macro('srd/hit_point_maximum') - actor.stat('srd/hp')");
			expect(sources("srd/rest/long/complete/success", HIT_DICE_SPENT_ID)).toEqual([
				"0",
				`0 - actor.stat('${HIT_DICE_SPENT_ID}')`,
			]);
			const resources = (manifest.resource_definitions ?? []) as {
				resource_definition_id: string;
				initial_value: number;
			}[];
			expect(
				resources
					.filter((row) =>
						[HIT_DICE_SPENT_ID, HIT_DIE_HEAL_ID].includes(row.resource_definition_id),
					)
					.map((row) => [row.resource_definition_id, row.initial_value]),
			).toEqual([
				[HIT_DICE_SPENT_ID, 0],
				[HIT_DIE_HEAL_ID, 0],
			]);
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "arcane-recovery-magical-cunning",
			aspect: "fixture",
			claim:
				"BL-70: Arcane Recovery + Magical Cunning actor-carried verbs with once/LR uses " +
				"(rest.ts long-rest refill charges the use pools)",
			references: [...REFS, "docs/caster-features-l1-4.md"],
		},
		() => {
			const caster = readFixture("base/classes/caster-features.toml");
			expect(caster).toContain("srd/wizard/arcane-recovery");
			expect(caster).toContain("srd/warlock/magical-cunning");
			expect(caster).toContain("wizard/arcane-recovery-uses");
			expect(caster).toContain("warlock/magical-cunning-uses");
		},
	);
});
