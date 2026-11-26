// sk-0m4.19 follow-up: MF-VAL-217 then MF-VAL-214.
//
// Offline `validateManifestToml` on elven-mini ALONE treats a missing or
// foreign ModifyResource.resource as Info (incomplete depends_on closure).
// elven_mini.depends_on is ["srd", "dm"] so talker object_state may name
// dm/dialog/open; live apply is still strict:
// the resource must exist (MF-VAL-217) AND the writing bundle must depend
// on the defining bundle (MF-VAL-214). That boundary is deliberate —
// origin/main's elven_mini references ZERO dm/ ids.
//
// This test flattens srd + dm + elven-mini and asserts MF-VAL-214
// semantics: every ModifyResource.resource written by bundle X is defined
// in X or in X's depends_on closure.

import { join } from "node:path";
import { LEVEL_UP_OFFER_ACCEPTED_RESOURCE_ID } from "@spellkave/adventure-runtime/dm/level-up";
import { inspectManifest, loadFlattened } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";
import { FIXTURES_DIR } from "../../../spellkave-srd-cc/src/pipeline";
import { FIXTURE_ROOT } from "../../author/lib/paths";

interface Row {
	[key: string]: unknown;
}

function rowsOf(manifest: Record<string, unknown>, kind: string): Row[] {
	const value = manifest[kind];
	return Array.isArray(value) ? (value as Row[]) : [];
}

function collectModifyResources(node: unknown, into: Array<{ resource: string }>): void {
	if (node === null || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (const child of node) collectModifyResources(child, into);
		return;
	}
	const record = node as Record<string, unknown>;
	const modify = record.ModifyResource;
	if (modify !== null && typeof modify === "object") {
		const resource = (modify as Row).resource;
		if (typeof resource === "string" && resource.length > 0) {
			into.push({ resource });
		}
	}
	for (const child of Object.values(record)) collectModifyResources(child, into);
}

function resourceId(row: Row): string | undefined {
	const id = row.resource_definition_id ?? row.resource_id;
	return typeof id === "string" ? id : undefined;
}

function dependsOnOf(row: Row): string[] {
	const raw = row.depends_on;
	if (Array.isArray(raw)) return raw.filter((id): id is string => typeof id === "string");
	return [];
}

describe("ModifyResource.resource depends_on closure (MF-VAL-214)", () => {
	it("every seed-time write is defined in the writer bundle or its depends_on closure", () => {
		const tomls = [
			loadFlattened(FIXTURES_DIR, "manifest.toml"),
			loadFlattened(join(FIXTURES_DIR, "dm"), "manifest.toml"),
			loadFlattened(FIXTURE_ROOT, "adventure.manifest.toml"),
		];
		const manifests = tomls.map(
			(toml) => inspectManifest(toml).manifest as Record<string, unknown>,
		);

		const definedBy = new Map<string, string>();
		const dependsOn = new Map<string, string[]>();
		const templateBundle = new Map<string, string>();
		for (const manifest of manifests) {
			for (const row of rowsOf(manifest, "bundles")) {
				const id = row.bundle_id;
				if (typeof id === "string") dependsOn.set(id, dependsOnOf(row));
			}
			for (const row of rowsOf(manifest, "resource_definitions")) {
				const id = resourceId(row);
				const bundle = row.bundle_id;
				if (typeof id === "string" && typeof bundle === "string") definedBy.set(id, bundle);
			}
			for (const row of rowsOf(manifest, "consequence_templates")) {
				const templateId = row.template_id;
				const bundle = row.bundle_id;
				if (typeof templateId === "string" && typeof bundle === "string") {
					templateBundle.set(templateId, bundle);
				}
			}
		}

		function closure(bundleId: string, seen = new Set<string>()): Set<string> {
			if (seen.has(bundleId)) return new Set();
			seen.add(bundleId);
			const out = new Set<string>([bundleId]);
			for (const dep of dependsOn.get(bundleId) ?? []) {
				for (const id of closure(dep, seen)) out.add(id);
			}
			return out;
		}

		expect(definedBy.get(LEVEL_UP_OFFER_ACCEPTED_RESOURCE_ID)).toBe("dm");
		expect(dependsOn.get("elven_mini")).toEqual(["srd", "dm"]);

		const violations: string[] = [];
		for (const manifest of manifests) {
			for (const row of rowsOf(manifest, "consequence_frame_writes")) {
				const templateId = typeof row.template_id === "string" ? row.template_id : "";
				const writer =
					templateBundle.get(templateId) ??
					(templateId.includes("/") ? templateId.slice(0, templateId.indexOf("/")) : "");
				const writes: Array<{ resource: string }> = [];
				collectModifyResources(row.frame_write, writes);
				const allowed = closure(writer);
				for (const { resource } of writes) {
					const definer = definedBy.get(resource);
					if (definer === undefined || !allowed.has(definer)) {
						violations.push(
							`${writer} writes ${resource} (defined in ${definer ?? "NOWHERE"}) via ${templateId}`,
						);
					}
				}
			}
		}
		expect(violations, "MF-VAL-214: writer must depend on the resource's bundle").toEqual([]);
	});
});
