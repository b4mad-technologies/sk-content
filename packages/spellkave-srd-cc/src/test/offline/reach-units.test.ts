import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { MAX_REACH_MM, STANDARD_REACH_MM } from "../../chapters/playing-the-game/reach-units";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../");
const PRODUCER = path.join(REPO_ROOT, "server/src/world_interaction/layer2/reaction_producer.rs");

/**
 * sk-0m4.26 / D-OPEN-1: the kernel scan-radius and millimetre-per-square
 * constants must stay byte-identical to this package's authored reach ceiling.
 * The kernel names no `srd/` id; it only needs the numeric square size and
 * the 6-square neighborhood bound (`MAX_REACH_MM / STANDARD_REACH_MM`).
 */
describe("reach-units sync with reaction_producer scan bound", () => {
	it("STANDARD_REACH_MM is 1524 and MAX_REACH is 6 squares", () => {
		expect(STANDARD_REACH_MM).toBe(1524);
		expect(MAX_REACH_MM).toBe(STANDARD_REACH_MM * 6);
	});

	// sk-content: reads sk-server source, not in this repository.
	it.skip("reaction_producer GRID_SQUARE_MM / MAX_SCAN_RADIUS_CELLS match", () => {
		const src = readFileSync(PRODUCER, "utf8");
		expect(src).toMatch(/pub const GRID_SQUARE_MM: i64 = 1524;/);
		expect(src).toMatch(/pub const MAX_SCAN_RADIUS_CELLS: i64 = 6;/);
		expect(STANDARD_REACH_MM).toBe(1524);
		expect(MAX_REACH_MM / STANDARD_REACH_MM).toBe(6);
	});
});
