// Compendium readers get the same named-entry links across repeated exports.
// Runs offline against the pure linkifier with an editable caller catalog.
// keep-file(K3): reused patterns must not carry match state between entries.
import { describe, expect, it } from "vitest";
import { catalogNamesForLinkify, createLinkifier, linkifyVerbatim } from "../../export/linkify";

const dex = { id: "srd/dex", name: "Dexterity", chapter: "playing-the-game", slug: "dex" };
const fireball = {
	id: "srd/spell/fireball",
	name: "Fireball",
	chapter: "spells",
	slug: "fireball",
};

describe("prepared compendium name links", () => {
	// keep(K3): repeated entries must not inherit regex state or a stale caller catalog.
	it("reuses prepared patterns across entries while ordinary calls read the current catalog", () => {
		const names = catalogNamesForLinkify([
			dex,
			fireball,
			{ id: "srd/spell/ward", name: "Ward (Greater)", chapter: "spells", slug: "ward" },
		]);
		const render = createLinkifier(names);
		const text = "Dexterity, Fireball and Ward (Greater).";
		const expected =
			"[Dexterity](/docs/srd/playing-the-game/dex), [Fireball](/docs/srd/spells/fireball) and [Ward (Greater)](/docs/srd/spells/ward).";
		expect(render(text, "srd/class/wizard")).toBe(expected);
		expect(render(text, fireball.id)).toBe(
			"[Dexterity](/docs/srd/playing-the-game/dex), Fireball and [Ward (Greater)](/docs/srd/spells/ward).",
		);
		expect(render(text, "srd/class/wizard")).toBe(expected);
		expect(render("Dexterity\nDexterity", "srd/class/wizard")).toBe(
			"[Dexterity](/docs/srd/playing-the-game/dex)\n[Dexterity](/docs/srd/playing-the-game/dex)",
		);
		const editable = names.find((entry) => entry.id === dex.id);
		if (editable === undefined) throw new Error("fixture is missing Dexterity");
		editable.name = "Agility";
		expect(linkifyVerbatim("Agility", names, "srd/class/wizard")).toBe(
			"[Agility](/docs/srd/playing-the-game/dex)",
		);
		expect(render("Dexterity", "srd/class/wizard")).toBe(
			"[Dexterity](/docs/srd/playing-the-game/dex)",
		);
	});
});
