// sk-jay0.1.23.21: the authored half of the companion command ingress.
// These constants are what a seat passes INTO
// `translateAddressedTraces` (`@spellkave/npc-brains`), so the pairing that
// matters is authored verb -> brain command kind, and it must stay total:
// every shipped command verb needs a mapping, or a player-issued command
// silently becomes "unknown-command" at ingress.
import { describe, expect, it } from "vitest";

import {
	COMPANION_COMMAND_KINDS,
	COMPANION_COMMAND_STALE_AFTER_TICKS,
	COMPANION_COMMAND_TRACE_KIND_ID,
	COMPANION_COMMAND_VERBS,
} from "../../author/companion-commands.ts";

describe("companion command ingress constants", () => {
	it("maps every shipped verb to a brain command kind", () => {
		for (const verb of COMPANION_COMMAND_VERBS) {
			expect(COMPANION_COMMAND_KINDS[verb]).toBeDefined();
		}
		expect(Object.keys(COMPANION_COMMAND_KINDS).sort()).toEqual(
			[...COMPANION_COMMAND_VERBS].sort(),
		);
	});

	it("keeps staleness far below the trace's arrival-discovery window", () => {
		// 2 ticks of validity against 30 ticks of perceptibility: the row stays
		// discoverable long after the command it carries has stopped counting.
		expect(COMPANION_COMMAND_STALE_AFTER_TICKS).toBe(2);
	});

	it("names the trace kind the ingress matches on", () => {
		expect(COMPANION_COMMAND_TRACE_KIND_ID).toBe("elven_mini/adventure/trace/companion_command");
	});
});
