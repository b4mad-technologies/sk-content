// Character Level offline proof: the module's own provenance guard
// (`assertLevelProvenanceSource`) is exercised directly here — everything
// else about this unit (the fixture row's actual bounds/id) is proven by
// `fixtures-author-tool/resources.test.ts` reading the committed fixture back, same
// posture as the ability/skill identity units.
import { describe, expect, it } from "vitest";

import {
	assertLevelProvenanceSource,
	INITIAL_CHARACTER_LEVEL,
	LEVEL_DISPLAY_NAME,
	LEVEL_ID,
	MAX_CHARACTER_LEVEL,
	MIN_CHARACTER_LEVEL,
} from "../../chapters/playing-the-game/level-units";

describe("level-units", () => {
	it("provenance sentence is present in the cached chapter markdown", () => {
		expect(() => assertLevelProvenanceSource()).not.toThrow();
	});

	it("bounds match the sister precedent (world-fixtures/srd/base/advancement.toml's srd/level row)", () => {
		expect(MIN_CHARACTER_LEVEL).toBe(1);
		expect(MAX_CHARACTER_LEVEL).toBe(20);
		expect(INITIAL_CHARACTER_LEVEL).toBe(1);
	});

	it("id/display name are the expected identity", () => {
		expect(LEVEL_ID).toBe("level");
		expect(LEVEL_DISPLAY_NAME).toBe("Character Level");
	});
});
