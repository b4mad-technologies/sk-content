// Class pools refill to the class table's value for the level, on both rests
// (sk-jay0.1.55.11, sk-jay0.1.55.60.3). The macro bodies are generated from
// the Features tables in cache/markdown/classes.md; this file pins the
// generated shape and the table rows a regression would most likely move.
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseSchemaManifestToml } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";
import {
	poolMaxBodySource,
	poolMaxMacroRows,
	poolMaxUnits,
} from "../../chapters/playing-the-game/pool-max-units";

const FIXTURES = path.resolve(import.meta.dirname, "../../../fixtures/base/playing-the-game");
const manifest = (file: string) =>
	parseSchemaManifestToml(readFileSync(path.join(FIXTURES, file), "utf8"));
const byMacro = new Map(poolMaxUnits().map((unit) => [unit.macroId, unit]));
const at = (macroId: string, level: number) => byMacro.get(macroId)?.byLevel[level - 1];

describe("class pool maxima per level", () => {
	it("reads every value from a twenty-row Features table and cites it", () => {
		expect(poolMaxUnits().map((unit) => unit.macroId)).toEqual([
			"srd/rage_uses_max",
			"srd/second_wind_uses_max",
			"srd/action_surge_uses_max",
			"srd/focus_points_max",
			"srd/cleric_channel_divinity_uses_max",
			"srd/paladin_channel_divinity_uses_max",
		]);
		for (const unit of poolMaxUnits()) {
			expect(unit.byLevel).toHaveLength(20);
			expect(unit.source).toMatch(/^cache\/markdown\/classes\.md:\d+-\d+$/);
			expect(unit.description).not.toContain("cache/");
		}
	});

	it("matches the table rows the solo beta plays through", () => {
		// Barbarian Features, Rages: 2 at levels 1-2, 3 from level 3, 6 at 17.
		expect([1, 2, 3, 6, 12, 17, 20].map((level) => at("srd/rage_uses_max", level))).toEqual([
			2, 2, 3, 4, 5, 6, 6,
		]);
		// Fighter Features, Second Wind: 2, then 3 at 4, 4 at 10.
		expect([1, 3, 4, 10].map((level) => at("srd/second_wind_uses_max", level))).toEqual([
			2, 2, 3, 4,
		]);
		// Fighter Features, "Action Surge (one use)" at 2, "(two uses)" at 17.
		expect([1, 2, 16, 17].map((level) => at("srd/action_surge_uses_max", level))).toEqual([
			0, 1, 1, 2,
		]);
		// Monk Features, Focus Points: none at 1, then the level.
		expect([1, 2, 5, 20].map((level) => at("srd/focus_points_max", level))).toEqual([0, 2, 5, 20]);
		expect([1, 2, 6, 18].map((level) => at("srd/cleric_channel_divinity_uses_max", level))).toEqual(
			[0, 2, 3, 4],
		);
		expect([2, 3, 11].map((level) => at("srd/paladin_channel_divinity_uses_max", level))).toEqual([
			0, 2, 3,
		]);
	});

	it("renders one cond step per change point, 0 below the first", () => {
		expect(poolMaxBodySource([0, 2, 2, 3])).toBe(
			"cond(actor.stat('srd/level') >= 4, 3, cond(actor.stat('srd/level') >= 2, 2, 0))",
		);
		const rows = (manifest("macros.toml").dsl_macro_definitions ?? []) as {
			macro_id: string;
			body_source: string;
		}[];
		for (const generated of poolMaxMacroRows())
			expect(rows.find((row) => row.macro_id === generated.macro_id)?.body_source).toBe(
				generated.body_source,
			);
	});

	it("both rests refill a table pool to its macro, never to the resource ceiling", () => {
		const writes = (manifest("rest.toml").consequence_frame_writes ?? []) as {
			template_id: string;
			frame_write: { ModifyResource?: { resource: string; delta_source: string } };
		}[];
		for (const unit of poolMaxUnits()) {
			const sources = (template: string) =>
				writes
					.filter(
						(row) =>
							row.template_id === template &&
							row.frame_write.ModifyResource?.resource === unit.resourceId,
					)
					.map((row) => row.frame_write.ModifyResource?.delta_source ?? "");
			const long = sources("srd/rest/long/complete/success");
			expect(long, unit.resourceId).toHaveLength(1);
			expect(long[0]).toContain(
				`max(0, macro('${unit.macroId}') - actor.stat('${unit.resourceId}'))`,
			);
			expect(long[0]).not.toContain("resource_max");
			for (const source of sources("srd/rest/short/complete/success")) {
				expect(source).toContain(`macro('${unit.macroId}')`);
				expect(source).not.toContain("resource_max");
			}
		}
		// A Short Rest gives one use back, capped at the table value.
		const rage = writes.find(
			(row) =>
				row.template_id === "srd/rest/short/complete/success" &&
				row.frame_write.ModifyResource?.resource === "srd/barbarian/rage-uses",
		)?.frame_write.ModifyResource?.delta_source;
		expect(rage).toBe(
			"cond(actor.has_capability('srd/class-feature/barbarian/rage'), min(1, max(0, macro('srd/rage_uses_max') - actor.stat('srd/barbarian/rage-uses'))), 0)",
		);
	});
});
