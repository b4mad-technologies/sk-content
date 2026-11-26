// DOC-PROMISE: srd-text#flavor-completeness
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "smol-toml";
import { describe, expect, it } from "vitest";
import {
	FLAVOR_EXEMPTIONS,
	type FlavorRow,
	type FlavorRowKind,
	flavorExemptionReason,
	flavorRelPath,
	unmappedPrefix,
} from "../../flavor/completeness";
import { FLAVOR_ROOT } from "../../flavor/read";
import { FIXTURES_DIR } from "../../pipeline";

const ROW_KINDS: Array<{ kind: FlavorRowKind; idField: string }> = [
	{ kind: "entity_definitions", idField: "entity_def_id" },
	{ kind: "resource_definitions", idField: "resource_definition_id" },
	{ kind: "capability_definitions", idField: "capability_id" },
	{ kind: "condition_definitions", idField: "condition_definition_id" },
	{ kind: "action_definitions", idField: "action_id" },
	{ kind: "tag_value_definitions", idField: "tag" },
	{ kind: "niche_definitions", idField: "niche_id" },
	{ kind: "dsl_macro_definitions", idField: "macro_id" },
	{ kind: "session_definitions", idField: "session_def_id" },
];

function walkToml(dir: string, files: string[]): void {
	for (const name of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, name.name);
		if (name.isDirectory()) walkToml(path, files);
		else if (name.name.endsWith(".toml")) files.push(path);
	}
}

function collectRows(): FlavorRow[] {
	const files: string[] = [];
	walkToml(join(FIXTURES_DIR, "base"), files);
	const rows: FlavorRow[] = [];
	for (const path of files) {
		const parsed = parse(readFileSync(path, "utf8")) as Record<string, unknown>;
		for (const spec of ROW_KINDS) {
			const table = parsed[spec.kind];
			if (!Array.isArray(table)) continue;
			for (const raw of table) {
				const rec = raw as Record<string, unknown>;
				const id = rec[spec.idField];
				if (typeof id === "string" && id.length > 0) {
					rows.push({ kind: spec.kind, id });
				}
			}
		}
	}
	return rows;
}

describe("authored flavor completeness", () => {
	const rows = collectRows();

	it("every required catalog/rule id has authored/flavor/en/<kind>/<slug>.md", () => {
		const missing: string[] = [];
		for (const row of rows) {
			const rel = flavorRelPath(row);
			if (rel === null) continue;
			const abs = join(FLAVOR_ROOT, "en", rel);
			try {
				readFileSync(abs, "utf8");
			} catch {
				missing.push(`${row.kind} ${row.id} → ${rel}`);
			}
		}
		expect({ missing: missing.slice(0, 40), missingCount: missing.length }).toEqual({
			missing: [],
			missingCount: 0,
		});
	});

	it("every remaining identity family is named in FLAVOR_EXEMPTIONS (or a dump reason)", () => {
		const unmapped = [
			...new Set(rows.map(unmappedPrefix).filter((prefix) => prefix !== null)),
		].sort();
		expect(unmapped).toEqual([]);
	});

	it("FLAVOR_EXEMPTIONS prefixes still match at least one entity", () => {
		const entityIds = rows.filter((row) => row.kind === "entity_definitions").map((row) => row.id);
		const stale = Object.keys(FLAVOR_EXEMPTIONS)
			.filter((prefix) => !entityIds.some((id) => id.startsWith(prefix)))
			.sort();
		expect(stale).toEqual([]);
	});

	it("overlayed niche/macro/session/consequence descriptions match flavor bodies", () => {
		const files: string[] = [];
		walkToml(join(FIXTURES_DIR, "base"), files);
		const mismatch: string[] = [];
		const extra: Array<{ kind: FlavorRowKind; idField: string }> = [
			{ kind: "niche_definitions", idField: "niche_id" },
			{ kind: "dsl_macro_definitions", idField: "macro_id" },
			{ kind: "session_definitions", idField: "session_def_id" },
			{ kind: "consequence_templates", idField: "template_id" },
		];
		for (const path of files) {
			const parsed = parse(readFileSync(path, "utf8")) as Record<string, unknown>;
			for (const spec of extra) {
				const table = parsed[spec.kind];
				if (!Array.isArray(table)) continue;
				for (const raw of table) {
					const rec = raw as Record<string, unknown>;
					const id = rec[spec.idField];
					if (typeof id !== "string" || id.length === 0) continue;
					const rel = flavorRelPath({ kind: spec.kind, id });
					if (rel === null) continue;
					const abs = join(FLAVOR_ROOT, "en", rel);
					let body: string;
					try {
						body = readFileSync(abs, "utf8").split("---").slice(2).join("---").trim();
					} catch {
						continue;
					}
					if (body.length === 0) continue;
					const description = typeof rec.description === "string" ? rec.description : "";
					if (description !== body) {
						mismatch.push(`${spec.kind} ${id}`);
					}
				}
			}
		}
		expect({ mismatch: mismatch.slice(0, 20), mismatchCount: mismatch.length }).toEqual({
			mismatch: [],
			mismatchCount: 0,
		});
	});

	it("identity-exempt rows do not require a flavor file", () => {
		const requiredAndExempt = rows.filter(
			(row) => flavorExemptionReason(row) !== null && flavorRelPath(row) !== null,
		);
		expect(requiredAndExempt).toEqual([]);
	});
});
