// Documentation readers find resources in their authored sections, including fallback routes.
// Runs offline against the real routing table and classifier.
// keep-file(K1): enumerate route prefixes and catch-all ordering.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";
import { describe, expect, it } from "vitest";
import { resourceChapterForId } from "./catalogue";

/**
 * Resource placement lives in `sections.toml` and nowhere else.
 *
 * It used to be a code table (`CLASS_RESOURCE_PREFIXES` + a hand-written
 * `if`/`else` chain in `catalogue.ts`) whose fallback was SRD-shaped: any id
 * matching none of its branches landed in "playing-the-game", a section a
 * non-SRD bundle's own docs page does not have. `resource_routes` below
 * replaces it; an id no authored row matches now falls to the one authored
 * `mechanics_section` instead of a hard-coded SRD section — the same
 * fallback `[[kind_sections]]` gives every other mechanics row kind.
 */

const SECTIONS_FILE = parseToml(
	readFileSync(join(dirname(fileURLToPath(import.meta.url)), "sections.toml"), "utf8"),
) as {
	resource_routes: Array<{ prefix: string; section: string }>;
	mechanics_section: string;
};
const ROUTES = SECTIONS_FILE.resource_routes;

describe("resource routes", () => {
	it("places every route's own prefix in its declared section", () => {
		for (const route of ROUTES)
			expect(resourceChapterForId(`${route.prefix}anything`), route.prefix).toBe(route.section);
	});

	it("falls back to the mechanics section for an id no route matches", () => {
		// A non-SRD bundle's own resources (`dm/...`, `elven_mini/quest/...`)
		// never match an `srd/`-prefixed row, so they land beside that bundle's
		// other mechanics rows rather than in an SRD-only section their page
		// does not have.
		expect(resourceChapterForId("dm/dialog/open")).toBe(SECTIONS_FILE.mechanics_section);
		expect(resourceChapterForId("elven_mini/quest/Q1/accepted")).toBe(
			SECTIONS_FILE.mechanics_section,
		);
	});

	it("keeps the plain srd/ catch-all last, so more specific SRD rows win first", () => {
		const catchAll = ROUTES.at(-1);
		expect(catchAll).toEqual({ prefix: "srd/", section: "playing-the-game" });
		// A more specific row (a class, magic-item, or origin prefix) must sit
		// before the catch-all, or it would never be reached.
		for (const route of ROUTES.slice(0, -1)) expect(route.prefix.startsWith("srd/")).toBe(true);
	});
});
