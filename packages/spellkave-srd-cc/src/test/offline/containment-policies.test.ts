import { join } from "node:path";
import { inspectManifest, loadBundleChainDetailed, loadFlattened } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";
import { FIXTURES_DIR } from "../../fixture-paths";

type Row = Record<string, unknown>;
const manifest = loadBundleChainDetailed({
	rootManifestPath: join(FIXTURES_DIR, "manifest.toml"),
	resolveDependency: () => undefined,
}).manifest as Record<string, unknown>;
const rows = (kind: string): Row[] => (manifest[kind] as Row[] | undefined) ?? [];
const bindings = new Map(
	rows("entity_definition_containment_policy").map((r) => [r.entity_def_id, r.policy_id]),
);
const policies = new Map(rows("containment_policy_definition").map((r) => [r.policy_id, r]));

describe("shipped container policies", () => {
	it("covers empty container blueprints, bodies, initial contents and placed parents with resolvable policies", () => {
		const required = new Set(
			rows("entity_definition_tag")
				.filter((r) => r.tag === "srd.item.container" || r.tag === "srd.creature")
				.map((r) => r.entity_def_id),
		);
		for (const r of rows("entity_definition_initial_containment")) required.add(r.entity_def_id);
		const entities = new Map(rows("entities").map((r) => [r.entity_key, r.entity_def_id]));
		for (const r of rows("entity_containment")) required.add(entities.get(r.container_entity_key));
		expect(required.size).toBeGreaterThan(0);
		for (const id of required) {
			expect(policies.has(bindings.get(id)), `missing policy for ${id}`).toBe(true);
		}
		const definitions = new Set(rows("entity_definitions").map((r) => r.entity_def_id));
		for (const [id, policy] of bindings) {
			expect(definitions.has(id)).toBe(true);
			expect(policies.has(policy)).toBe(true);
		}
	});

	it("preserves ordinary chest and bag contents while living bodies require the existing dead condition", () => {
		for (const id of ["srd/item/chest", "srd/item/backpack", "srd/item/sack"]) {
			const p = policies.get(bindings.get(id));
			expect(p?.exposure_predicate_source).toBe("true == true");
			expect(p?.access_predicate_source).toBe("true == true");
		}
		for (const id of ["srd/pregen/fighter", "srd/creature/commoner"]) {
			const p = policies.get(bindings.get(id));
			expect(p?.exposure_predicate_source).toBe("target.status('srd/condition/dead') == true");
			expect(p?.access_predicate_source).toBe(p?.exposure_predicate_source);
		}
	});

	it("ships policy-only upgrades without replaying entity state or containment", () => {
		const delta = inspectManifest(
			loadFlattened(
				join(FIXTURES_DIR, "migrations"),
				"2026-11-16-containment-policies.manifest.toml",
			),
		).manifest as Record<string, unknown>;
		const nonempty = Object.entries(delta)
			.filter(([kind, value]) => kind !== "include" && Array.isArray(value) && value.length > 0)
			.map(([kind]) => kind)
			.sort();
		expect(nonempty).toEqual([
			"containment_policy_definition",
			"entity_definition_containment_policy",
		]);
	});
});
