// Offline gate: every `[[spatial_state_definitions]]` `state_id` across the
// generated fixtures is unique. The server's `spatial_state_definition` table
// keys on it, and the first duplicate fails the WHOLE live seed with
// `MF-APPLY-028 … duplicate unique column` — which is exactly how this gap
// surfaced on 2026-08-23 (Arcane Lock + Knock both emitted
// `srd/object/arcane_locked`; only the flag SETTER owns the definition now,
// `chapters/spells/spell-behaviors.ts` objectFlagBehavior). Generators that
// share a flag/state must share ONE owner; this test is the forcing function.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { FIXTURES_DIR } from "../../pipeline";

function tomlFiles(dir: string): string[] {
	return readdirSync(dir, { recursive: true, withFileTypes: false })
		.map(String)
		.filter((p) => p.endsWith(".toml"))
		.map((p) => join(dir, p));
}

/** Line-oriented scan (same reason as kavemouth-actor-capabilities-no-dup:
 * some fixtures carry integer literals a strict TOML parser rejects). */
function stateIdsIn(toml: string): string[] {
	const ids: string[] = [];
	let inBlock = false;
	for (const raw of toml.split("\n")) {
		const line = raw.trim();
		if (/^\[\[.+\]\]$/.test(line)) {
			inBlock = line === "[[spatial_state_definitions]]";
			continue;
		}
		if (!inBlock) continue;
		const id = /^state_id\s*=\s*"([^"]+)"/.exec(line)?.[1];
		if (id !== undefined) ids.push(id);
	}
	return ids;
}

describe("fixtures/ spatial_state_definitions", () => {
	it("declares every state_id exactly once across all fixture bundles", () => {
		const owners = new Map<string, string[]>();
		for (const file of tomlFiles(FIXTURES_DIR)) {
			for (const id of stateIdsIn(readFileSync(file, "utf8"))) {
				owners.set(id, [...(owners.get(id) ?? []), file.slice(FIXTURES_DIR.length + 1)]);
			}
		}
		const duplicates = [...owners.entries()]
			.filter(([, files]) => files.length > 1)
			.map(([id, files]) => `${id} ← ${files.join(", ")}`);
		expect(duplicates).toEqual([]);
	});
});
