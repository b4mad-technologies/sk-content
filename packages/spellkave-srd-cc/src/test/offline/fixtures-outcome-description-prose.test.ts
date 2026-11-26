// Offline gate: no `[[outcome_templates]]` `description` in the generated
// fixtures carries engineering vocabulary. That field is PLAYER-FACING — the
// gateway hands it back as the text of the affordance the player just used —
// so a spec id or a ledger reference parked in it reaches a human at the table
// verbatim. That is exactly how sk-0m4.114 (#2722) surfaced: a hosted run's
// "Look around" at elven_mini/creation_limbo/station returned
// `srd/sense/look/outcome`'s description, which at the time read "Universal
// baseline sensing outcome (… finding #49) — … `openspec/specs/…`; NOT
// ADR-0070/#1998 …". Authoring rationale belongs in the generator's comments
// (fragments/sensing.ts) and in the fixture HEADER comment; this test guards
// the data rows only.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { FIXTURES_DIR } from "../../pipeline";

/** Markers named by the finding's acceptance criterion. */
const ENGINEERING_MARKERS = ["finding #", "ADR-", "openspec/", "canon-warden", ".md`"];

function tomlFiles(dir: string): string[] {
	return readdirSync(dir, { recursive: true, withFileTypes: false })
		.map(String)
		.filter((p) => p.endsWith(".toml"))
		.map((p) => join(dir, p));
}

/** Line-oriented scan (same reason as fixtures-state-id-unique: some fixtures
 * carry literals a strict TOML parser rejects). Handles both `"…"` and
 * multi-line `"""…"""` description values, as a single forward state machine so
 * it never indexes back into the line array. */
function outcomeDescriptionsIn(toml: string): string[] {
	const found: string[] = [];
	let inBlock = false;
	let pending: string | null = null;
	for (const raw of toml.split("\n")) {
		if (pending !== null) {
			const continued: string = `${pending}\n${raw}`;
			const close = continued.lastIndexOf('"""');
			if (close === -1) {
				pending = continued;
				continue;
			}
			found.push(continued.slice(0, close));
			pending = null;
			continue;
		}
		const line = raw.trim();
		if (/^\[\[.+\]\]$/.test(line)) {
			inBlock = line === "[[outcome_templates]]";
			continue;
		}
		if (!inBlock) continue;
		const multi = /^description\s*=\s*"""([\s\S]*)$/.exec(line);
		if (multi) {
			const rest = multi[1] ?? "";
			const close = rest.lastIndexOf('"""');
			if (close === -1) pending = rest;
			else found.push(rest.slice(0, close));
			continue;
		}
		const single = /^description\s*=\s*"(.*)"\s*$/.exec(line);
		if (single) found.push(single[1] ?? "");
	}
	return found;
}

describe("fixtures/ outcome_templates descriptions", () => {
	it("read as player-facing prose — no spec ids, ADR numbers, openspec paths or ledger findings", () => {
		const offenders: string[] = [];
		for (const file of tomlFiles(FIXTURES_DIR)) {
			for (const description of outcomeDescriptionsIn(readFileSync(file, "utf8"))) {
				const hits = ENGINEERING_MARKERS.filter((m) => description.includes(m));
				if (hits.length > 0) {
					const relative = file.slice(FIXTURES_DIR.length + 1);
					offenders.push(`${relative} [${hits.join(", ")}] ← ${description.slice(0, 120)}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});
});
