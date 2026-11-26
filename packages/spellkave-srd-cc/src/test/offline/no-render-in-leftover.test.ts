import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// sk-jay0.7.23.32: the leftover srd-cc vitest row (everything except
// pipeline.test.ts) must never render the SRD. A full renderAll() costs
// ~10 min on a CI slot and vitest attributes it to no test, so the row
// looked like "943 s for 120 s of tests". The render belongs to the
// pipeline shards (pipeline.test.ts → pipeline-check), whose clean-regen
// gate proves the committed fixtures/ tree byte for byte; every other test
// reads that committed tree.
const TEST_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWED = new Set(["offline/pipeline.test.ts"]);
// Import edges only (comments and strings may mention the names).
const FORBIDDEN = [
	/import\s*\{[^}]*\brenderAll\b[^}]*\}\s*from/,
	/import\s*\{[^}]*\bloadOrRenderAll\b[^}]*\}\s*from/,
	/from\s+["'][^"']*render-cache["']/,
];

function testFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...testFiles(abs));
		else if (entry.name.endsWith(".test.ts")) out.push(abs);
	}
	return out.sort();
}

describe("leftover srd-cc suite never renders the SRD", () => {
	it("no test file outside pipeline.test.ts calls renderAll or the render cache", () => {
		const offenders: string[] = [];
		for (const abs of testFiles(TEST_ROOT)) {
			const rel = relative(TEST_ROOT, abs).replaceAll("\\", "/");
			if (ALLOWED.has(rel)) continue;
			const source = readFileSync(abs, "utf8");
			for (const pattern of FORBIDDEN) {
				if (pattern.test(source)) offenders.push(`${rel}: ${pattern}`);
			}
		}
		expect(offenders).toEqual([]);
	});
});
