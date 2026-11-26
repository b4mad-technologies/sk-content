// sk-609b.16 K-C — offline pins for In Darkness / Invisible / See Invisibility.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FIXTURE = join(
	import.meta.dirname,
	"../../../fixtures/base/playing-the-game/perception-conditions.toml",
);

function toml(): string {
	return readFileSync(FIXTURE, "utf8");
}

describe("perception-conditions (sk-609b.16)", () => {
	it("ships In Darkness gated on darkvision capability with attack-roll Disadvantage", () => {
		const src = toml();
		expect(src).toContain('condition_definition_id = "srd/condition/in_darkness"');
		expect(src).toContain("actor.has_capability('srd/capability/darkvision') == false");
		expect(src).toContain('applies_to = "srd/attack_roll"');
		expect(src).toContain('delta_kind = "Disadvantage"');
		expect(src).toContain("# pattern: cross-party-capability-gate");
	});

	it("ships Invisible with ResolutionCheck Disadvantage gated on see_invisibility", () => {
		const src = toml();
		expect(src).toContain('condition_definition_id = "srd/condition/invisible"');
		expect(src).toContain("actor.has_capability('srd/capability/see_invisibility') == false");
		expect(src).toContain('applies_to = "ResolutionCheck"');
		expect(src).toContain('condition_definition_id = "srd/condition/invisible/attack-advantage"');
		expect(src).toContain('delta_kind = "Advantage"');
	});

	it("ships See Invisibility condition granting the counter-capability", () => {
		const src = toml();
		expect(src).toContain('condition_definition_id = "srd/condition/spell/see-invisibility"');
		expect(src).toContain("grants_capability_while_active");
		expect(src).toContain("srd/capability/see_invisibility");
		expect(src).toContain("# pattern: condition-grant-and-suppression");
		expect(src).toContain('action_id = "srd/spell/see-invisibility/cast"');
	});

	it("authors dark-area niche + on-entry ApplyStatus action", () => {
		const src = toml();
		expect(src).toContain('niche_id = "srd/niche/dark-area"');
		expect(src).toContain('action_id = "srd/apply-in-darkness"');
		expect(src).toContain('condition_definition_id = "srd/condition/in_darkness"');
	});
});
