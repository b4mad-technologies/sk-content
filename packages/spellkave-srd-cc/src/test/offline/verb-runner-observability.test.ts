import { join } from "node:path";

import { inspectManifest, loadFlattened } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";

import { metadataCall, VerbRunnerError } from "../../chapters/verb-runner";
import { FIXTURES_DIR } from "../../pipeline";

describe("verb-runner host diagnostics", () => {
	it("keeps singleton metadata calls flat and rejects empty batches", () => {
		expect(
			metadataCall("docs", undefined, [{ target: "manifest", key: "docs", value: {} }]),
		).toMatchObject({
			params: { target: "manifest", key: "docs", value: {} },
		});
		expect(() => metadataCall("empty", "srd", [])).toThrow(/has no metadata updates/);
	});

	it("keeps full diagnostics local while exposing the blocking failure dimensions", () => {
		const error = new VerbRunnerError("equip-creation-longsword", "spellkave_write_rows", [
			{
				code: "MF-VAL-298",
				severity: "warning",
				message: "SECRET-CANARY advisory detail",
			},
			{
				code: "MF-VAL-319",
				severity: "fatal",
				message: "SECRET-CANARY detailed manifest rejection",
			},
		]);

		expect(error).toMatchObject({
			name: "VerbRunnerError",
			step: "equip-creation-longsword",
			toolName: "spellkave_write_rows",
			failureClass: "authoring_rejected",
			errorCode: "MF-VAL-319",
		});
		expect(error.message).toContain("SECRET-CANARY");
		expect(error.message).toContain("MF-VAL-298");
		expect(
			JSON.stringify({
				step: error.step,
				tool_name: error.toolName,
				failure_class: error.failureClass,
				error_code: error.errorCode,
			}),
		).not.toContain("SECRET-CANARY");
	});
});

describe("live preserve-state equipment migration", () => {
	it("flattens the generator-owned main-hand slot required by creation confirmation", () => {
		const migrationDir = join(FIXTURES_DIR, "migrations");
		const flattened = loadFlattened(migrationDir, "2026-08-21-equipment-slots.manifest.toml");
		const manifest = inspectManifest(flattened).manifest as Record<string, unknown>;
		const slots = Array.isArray(manifest.equipment_slot_definitions)
			? (manifest.equipment_slot_definitions as Array<{ slot_id?: string }>).map(
					(row) => row.slot_id,
				)
			: [];

		expect(slots).toEqual(["srd/slot/chest", "srd/slot/main-hand", "srd/slot/off-hand"]);
	});
});
