// Pins the class-less level-up gate statically against the committed `dm`
// fixture. The live proof (a class-less hero is rejected on steady-advance and
// accepted on daring-advance, driven by a neutral generic `createDmSeat`) is
// src/test/live-self-seeding/scenes/dm-level-up-classless.test.ts; this pin
// guards its only cause offline: steady-advance is gated on a seeded
// srd/hp_per_level, daring-advance is not.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "smol-toml";
import { describe, expect, it } from "vitest";

import { FIXTURES_DIR } from "../../pipeline";

interface AffordanceTemplate {
	template_id: string;
	predicate_source: string;
}

const manifest = parse(
	readFileSync(resolve(FIXTURES_DIR, "dm/manifest.toml"), "utf8"),
) as unknown as {
	affordance_templates: AffordanceTemplate[];
};

function gate(templateId: string): string {
	const row = manifest.affordance_templates.find((t) => t.template_id === templateId);
	if (row === undefined) throw new Error(`dm fixture has no affordance template ${templateId}`);
	return row.predicate_source;
}

describe("dm level-up HP-choice gates (class-less hero)", () => {
	it("steady-advance requires a seeded srd/hp_per_level", () => {
		// from packages/spellkave-srd-cc/src/test/live-preseeded/mechanics/aldwin-notify-only.test.ts:427-437
		// (static gate pin; the live receipt is scenes/dm-level-up-classless.test.ts)
		expect(gate("dm/level-up/steady-advance/affordance")).toContain(
			"actor.stat('srd/hp_per_level') >= 1",
		);
	});

	it("daring-advance is gated on the XP threshold only, so a class-less hero can take it", () => {
		// from packages/spellkave-srd-cc/src/test/live-preseeded/mechanics/aldwin-notify-only.test.ts:438-451
		const predicate = gate("dm/level-up/daring-advance/affordance");
		expect(predicate).toContain("actor.stat('srd/xp') >= macro('srd/xp_threshold'");
		expect(predicate).not.toContain("hp_per_level");
	});
});
