// Documentation readers find entities under the routes authored in sections.toml.
// Runs offline against the real routing table and classifier.
// keep-file(K1): enumerate route prefixes and fallback ordering.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";
import { describe, expect, it } from "vitest";
import { isCatalogEntityId } from "./catalogue";

/**
 * Placement lives in `sections.toml` and nowhere else.
 *
 * It used to live in two places: the authored `[[entity_routes]]` rows and a
 * fourteen-entry `REQUIRED_ENTITY_PREFIXES` array in `catalogue.ts` that gated
 * whether an entity was considered for placement at all. They were identical
 * and nothing checked that they stayed identical, so adding a route without the
 * code table produced silence — the entity matched no gate prefix, never
 * reached `placementForEntity`, and vanished exactly like an entity nobody had
 * authored (sk-jay0.3.5.72, 450 rows).
 */

const ROUTES = (
	parseToml(
		readFileSync(join(dirname(fileURLToPath(import.meta.url)), "sections.toml"), "utf8"),
	) as { entity_routes: Array<{ prefix: string; tag?: string; family: string; section: string }> }
).entity_routes;

describe("entity routes", () => {
	it("gates on exactly the authored prefixes, with nothing to keep in sync", () => {
		for (const route of ROUTES)
			expect(isCatalogEntityId(`${route.prefix}anything`), route.prefix).toBe(true);
		expect(isCatalogEntityId("srd/not-a-declared-namespace/thing")).toBe(false);
	});

	it("lets a route declare a prefix without minting a tag for it", () => {
		// The four class-choice menus and the pregenerated character carry no tags
		// at all. Requiring a `tag` here would mean inventing vocabulary nothing in
		// the world wears, purely to satisfy a field that only ever acts as a
		// fallback matcher.
		const untagged = ROUTES.filter((route) => route.tag === undefined);
		expect([...untagged.map((route) => route.prefix)].sort()).toEqual([
			"srd/catalogue/",
			"srd/divine-order/",
			"srd/eldritch-invocation/",
			"srd/metamagic/",
			"srd/pregen/",
			"srd/primal-order/",
			"srd/service/",
			"srd/trinket/",
		]);
		for (const route of untagged) expect(isCatalogEntityId(`${route.prefix}x`)).toBe(true);
	});

	it("keeps the generic equipment tag last, so specific tags win the fallback", () => {
		// Documented in sections.toml and easy to undo by inserting a row at the
		// end: `srd.item` is the tag every weapon, armour and tool also carries.
		const tagged = ROUTES.filter((route) => route.tag !== undefined);
		expect(tagged.at(-1)?.tag).toBe("srd.item");
	});
});
