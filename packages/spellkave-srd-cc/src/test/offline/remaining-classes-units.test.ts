import { describe, expect, it } from "vitest";
import { buildRemainingClassFeatureGroups } from "../../chapters/classes/remaining-classes-units";

describe("remaining class-feature identity descriptions", () => {
	it("prose features are a short line, not SRD dice (sk-jay0.3.5.103.3)", () => {
		const groups = buildRemainingClassFeatureGroups();
		const brutal = groups
			.flatMap((group) => [...group.classFeatures, ...group.subclassFeatures])
			.find((unit) => unit.slug === "brutal-strike");
		if (brutal === undefined) throw new Error("test setup: no brutal-strike unit.");
		expect(brutal.description).toBe("Brutal Strike — a Barbarian class feature.");
		expect(brutal.description).not.toMatch(/\d+d\d+/);
	});
});
