import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { FIXTURES_DIR } from "../../pipeline";

const MANIFEST_PATH = join(FIXTURES_DIR, "..", "art", "art-manifest.json");

interface Entry {
	id: string;
	kind: string;
	prompt_inputs: { descriptors?: string };
}

describe("srd-art spell and feat glyph descriptors", () => {
	const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as { entries: Entry[] };
	const byId = new Map(manifest.entries.map((entry) => [entry.id, entry]));

	it("does not plan index fixtures as paintable subjects", () => {
		for (const id of [
			"spell-casting",
			"spell-spells",
			"spell-tag-values",
			"feat-feats",
			"feat-facts",
			"feat-asi-mechanics",
		]) {
			expect(byId.has(id)).toBe(false);
		}
	});

	it("uses icon nouns, not player-facing scene prose", () => {
		const fireball = byId.get("spell-fireball");
		const faerie = byId.get("spell-faerie-fire");
		const archery = byId.get("feat-archery");
		expect(fireball?.prompt_inputs.descriptors).toBe(
			"isolated icon of the Fireball effect, evocation magic, no person, no scenery, no letters",
		);
		expect(faerie?.prompt_inputs.descriptors).toBe(
			"isolated icon of the Faerie Fire effect, evocation magic, no person, no scenery, no letters",
		);
		expect(archery?.prompt_inputs.descriptors).toBe(
			"isolated icon of Archery, object or mark only, no person, no armor, no scenery, no letters",
		);
		expect(byId.get("feat-alert")?.prompt_inputs.descriptors).toBe(
			"isolated icon of Alert, object or mark only, no person, no armor, no scenery, no letters",
		);
		expect(fireball?.prompt_inputs.descriptors).not.toMatch(/breath|ash|swells|fireflies/i);
	});
});
