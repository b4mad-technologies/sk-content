import { describe, expect, it } from "vitest";

import {
	creatureMarkdownBlock,
	firstSentence,
	markdownHeadingBlock,
	normalizeWhitespace,
	open5eStringField,
	SRD_TEXT_LICENSE,
	SRD_TEXT_NAMESPACE,
	weaponTableText,
} from "../../text";

describe("srd.text extraction", () => {
	it("keeps Spell.json desc wording and only normalises whitespace", () => {
		const extracted = open5eStringField("Spell.json", "srd-2024_fire-bolt");
		expect(extracted.source).toBe("cache/open5e/Spell.json pk=srd-2024_fire-bolt");
		expect(extracted.text).toContain("You hurl a mote of fire");
		expect(extracted.text).not.toMatch(/\r/);
		expect(firstSentence(extracted.text)).toBe(
			"You hurl a mote of fire at a creature or an object within range.",
		);
	});

	it("records markdown line ranges for a unique heading", () => {
		const extracted = markdownHeadingBlock("feats.md", "Alert");
		expect(extracted.source).toMatch(/^cache\/markdown\/feats\.md:\d+-\d+$/);
		expect(extracted.text).toContain("Alert");
		expect(normalizeWhitespace(extracted.text)).toBe(extracted.text);
	});

	it("finds a creature stat block in the animals appendix when missing from A–Z", () => {
		const extracted = creatureMarkdownBlock("Cat");
		expect(extracted.source.startsWith("cache/markdown/animals.md:")).toBe(true);
		expect(extracted.text).toContain("Cat");
	});

	it("renders a Weapon.json table row when there is no desc", () => {
		const extracted = weaponTableText("srd-2024_club");
		expect(extracted.source).toBe("cache/open5e/Weapon.json pk=srd-2024_club");
		expect(extracted.text).toContain("Club");
		expect(extracted.text).toContain("1d4");
	});

	it("uses the public namespace and CC-BY-4.0 license constants", () => {
		expect(SRD_TEXT_NAMESPACE).toBe("srd.text");
		expect(SRD_TEXT_LICENSE).toBe("CC-BY-4.0");
	});
});
