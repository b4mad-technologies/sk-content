import { describe, expect, it } from "vitest";

import {
	ACTION_MECHANIC_DECISIONS,
	buildActionUnits,
} from "../../chapters/playing-the-game/actions-units";

const EXPECTED_SLUGS = [
	"attack",
	"dash",
	"disengage",
	"dodge",
	"help",
	"hide",
	"influence",
	"magic",
	"ready",
	"search",
	"study",
	"utilize",
];

describe("buildActionUnits", () => {
	it("emits exactly the 12 SRD named actions", () => {
		const units = buildActionUnits();
		expect(units).toHaveLength(12);
		expect(units.map((u) => u.slug).sort()).toEqual([...EXPECTED_SLUGS].sort());
	});

	it("sorts units by slug for deterministic output", () => {
		const units = buildActionUnits();
		const slugs = units.map((u) => u.slug);
		expect(slugs).toEqual([...slugs].sort());
	});

	it("carries a non-empty description and 'Action: ' display name for every unit", () => {
		for (const unit of buildActionUnits()) {
			expect(unit.description.trim().length).toBeGreaterThan(0);
			expect(unit.displayName).toMatch(/^Action: /);
		}
	});

	it("Hide's description carries no numeric DC (corrects the DC-15 assumption)", () => {
		const hide = buildActionUnits().find((u) => u.slug === "hide");
		expect(hide?.description).toBe("Make a Dexterity (Stealth) check.");
		expect(hide?.description).not.toMatch(/\bDC\b/);
	});
});

describe("ACTION_MECHANIC_DECISIONS", () => {
	it("has exactly one decision per action unit, no orphans on either side", () => {
		const unitSlugs = new Set(buildActionUnits().map((u) => u.slug));
		const decisionSlugs = new Set(Object.keys(ACTION_MECHANIC_DECISIONS));
		expect([...unitSlugs].sort()).toEqual([...decisionSlugs].sort());
	});

	it("marks Dodge shipped and Help's ability-check half explicitly partial", () => {
		expect(ACTION_MECHANIC_DECISIONS.dodge?.status).toBe("mechanic-shipped");
		expect(ACTION_MECHANIC_DECISIONS.help?.status).toBe("mechanic-partial");
	});

	it("marks Attack as shipped through the generic Unarmed Strike Damage variant", () => {
		expect(ACTION_MECHANIC_DECISIONS.attack?.status).toBe("mechanic-shipped");
	});

	it("marks the four bare-check actions (Hide/Influence/Search/Study) as no-dc-in-source", () => {
		for (const slug of ["hide", "influence", "search", "study"]) {
			expect(ACTION_MECHANIC_DECISIONS[slug]?.status).toBe("no-dc-in-source");
		}
	});
});
