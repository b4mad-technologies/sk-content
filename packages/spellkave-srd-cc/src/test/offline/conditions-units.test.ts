// Incapacitated + Dead offline proof: provenance sentences pinned against the
// committed cache, plus the two local-id stems' shape. Shipped ROW shapes
// (stacking/remove-policy references, implies edge) are pinned against the
// committed `fixtures/` in `fixtures-author-tool/equipment-cover.test.ts`
// (same file the sister condition rows — Cover/Dodging/Help — are already
// pinned in).
import { describe, expect, it } from "vitest";

import {
	assertConditionsProvenanceSource,
	DEAD_DESCRIPTION,
	DEAD_DISPLAY_NAME,
	DEAD_LOCAL_ID,
	INCAPACITATED_DESCRIPTION,
	INCAPACITATED_DISPLAY_NAME,
	INCAPACITATED_LOCAL_ID,
} from "../../chapters/playing-the-game/conditions-units";

describe("conditions-units provenance", () => {
	it("finds every Incapacitated/Dead source sentence in the committed cache", () => {
		expect(() => assertConditionsProvenanceSource()).not.toThrow();
	});
});

describe("conditions-units id stems", () => {
	it("Incapacitated and Dead carry distinct, non-empty local id stems", () => {
		expect(INCAPACITATED_LOCAL_ID).not.toBe(DEAD_LOCAL_ID);
		expect(INCAPACITATED_LOCAL_ID.length).toBeGreaterThan(0);
		expect(DEAD_LOCAL_ID.length).toBeGreaterThan(0);
	});

	it("display names are the SRD's own condition names, not paraphrased", () => {
		expect(INCAPACITATED_DISPLAY_NAME).toBe("Incapacitated");
		expect(DEAD_DISPLAY_NAME).toBe("Dead");
	});

	it("descriptions cite their own cache locations (file:line), never bare prose", () => {
		expect(INCAPACITATED_DESCRIPTION).toContain("rules-glossary.md:923-933");
		expect(DEAD_DESCRIPTION).toContain("playing-the-game.md:1217");
		expect(DEAD_DESCRIPTION).toContain("rules-glossary.md:670-674");
	});

	it("Dead's own description names the Incapacitated cascade explicitly", () => {
		expect(DEAD_DESCRIPTION.toLowerCase()).toContain("incapacitated");
	});
});
