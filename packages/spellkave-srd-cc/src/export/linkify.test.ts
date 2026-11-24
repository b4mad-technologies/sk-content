// Compendium readers get named-entry links without self-links or changed existing links.
// Runs offline against the pure linkifier.
// keep-file(K1): enumerate name boundaries, case and protected-text rules.
import { describe, expect, it } from "vitest";

import {
	catalogNamesForLinkify,
	hrefForCompendiumEntry,
	linkifyVerbatim,
	SHORT_EXACT_NAMES,
} from "./linkify";

const dex = {
	id: "srd/dex",
	name: "Dexterity",
	chapter: "playing-the-game",
	slug: "dex",
};
const fireball = {
	id: "srd/spell/fireball",
	name: "Fireball",
	chapter: "spells",
	slug: "fireball",
};
const aid = { id: "srd/spell/aid", name: "Aid", chapter: "spells", slug: "aid" };
const sphere = {
	id: "srd/spell/sphere",
	name: "Sphere",
	chapter: "spells",
	slug: "sphere",
};

describe("linkifyVerbatim", () => {
	const catalog = catalogNamesForLinkify([dex, fireball, aid, sphere]);

	it("links the longest catalog name at a word boundary once per paragraph", () => {
		const out = linkifyVerbatim(
			"Each creature in a Sphere makes a Dexterity saving throw. Dexterity again.",
			catalog,
			"srd/spell/fireball",
		);
		expect(out).toContain("[Dexterity](/docs/srd/playing-the-game/dex)");
		expect(out).toContain("[Sphere](/docs/srd/spells/sphere)");
		expect(out.match(/\[Dexterity\]/g)).toHaveLength(1);
	});

	it("never self-links and skips headings and existing links", () => {
		const out = linkifyVerbatim(
			"### Fireball\n\nSee [other](/srd/spells/aid). Fireball burns.\n\nFireball later.",
			catalog,
			"srd/spell/fireball",
		);
		expect(out).toContain("### Fireball");
		expect(out).toContain("[other](/srd/spells/aid)");
		expect(out).not.toContain("[Fireball]");
	});

	it("links Aid and Bane only at exact capitalisation", () => {
		expect(SHORT_EXACT_NAMES).toContain("Aid");
		const out = linkifyVerbatim(
			"Aid helps. The aid of friends does not.",
			catalog,
			"srd/spell/fireball",
		);
		expect(out).toContain("[Aid](/docs/srd/spells/aid)");
		expect(out).toContain("The aid of friends");
	});

	it("links spell names inside class prose", () => {
		const out = linkifyVerbatim("Wizards prepare Fireball.", catalog, "srd/class/wizard");
		expect(out).toContain("[Fireball](/docs/srd/spells/fireball)");
	});

	it("builds stable srd hrefs", () => {
		expect(hrefForCompendiumEntry(fireball)).toBe("/docs/srd/spells/fireball");
	});
});
