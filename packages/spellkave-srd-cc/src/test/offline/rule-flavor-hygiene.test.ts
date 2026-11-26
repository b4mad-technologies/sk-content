import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";
import { describe, expect, it } from "vitest";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/base");
const LEAK = /SRD:|classes\.md|cache\/|IDENTITY-TEXT|pk='|actor\.stat|CELL COUNT|sk-0m4/;

function walkToml(dir: string, files: string[]): void {
	for (const name of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, name.name);
		if (name.isDirectory()) walkToml(path, files);
		else if (name.name.endsWith(".toml")) files.push(path);
	}
}

function skip(_kind: string, _id: string): boolean {
	return false;
}

describe("player-facing rule descriptions", () => {
	it("keep compiler notes out of player-facing rule descriptions", () => {
		const files: string[] = [];
		walkToml(FIXTURES, files);
		const leaks: string[] = [];
		for (const path of files) {
			const parsed = parse(readFileSync(path, "utf8")) as Record<string, unknown>;
			const checks: Array<{ kind: string; idField: string; rows: unknown }> = [
				{ kind: "capability", idField: "capability_id", rows: parsed.capability_definitions },
				{
					kind: "condition",
					idField: "condition_definition_id",
					rows: parsed.condition_definitions,
				},
				{ kind: "action", idField: "action_id", rows: parsed.action_definitions },
				{ kind: "niche", idField: "niche_id", rows: parsed.niche_definitions },
				{ kind: "macro", idField: "macro_id", rows: parsed.dsl_macro_definitions },
				{ kind: "session", idField: "session_def_id", rows: parsed.session_definitions },
				{ kind: "consequence", idField: "template_id", rows: parsed.consequence_templates },
			];
			for (const check of checks) {
				if (!Array.isArray(check.rows)) continue;
				for (const row of check.rows) {
					const rec = row as Record<string, unknown>;
					const id = String(rec[check.idField] ?? "");
					if (!id || skip(check.kind, id)) continue;
					const description = String(rec.description ?? "");
					if (LEAK.test(description)) leaks.push(`${check.kind} ${id}`);
				}
			}
		}
		expect(leaks).toEqual([]);
	});
});
