// Offline assertions about the shared PLAYER tool surface
// (`createPlayerFacingToolMap`) srd-cc's own adventure story drives through
// `harness.player` (see `../live-preseeded/adventure-harness.ts`). No live
// node needed: the map is a pure object of bound tool factories — none of
// them touch `context.db()` until `.execute()` is actually called.
import {
	createPlayerFacingToolMap,
	type SpellkaveToolContext,
} from "@spellkave/session/player-tools";
import { describe, expect } from "vitest";

import { findingEvidence, findingGap } from "../srd-coverage/evidence";

function stubToolContext(): SpellkaveToolContext {
	return {
		db: () => {
			throw new Error(
				"player-tool-surface.test.ts: db() must not be called at map-construction time",
			);
		},
	};
}

describe("createPlayerFacingToolMap surface", () => {
	findingEvidence(
		{
			id: "94",
			title: "PLAYER exposes a direct NPC communication surface",
			expected:
				"createPlayerFacingToolMap exposes a communicate/talk tool, so a story chapter can speak to a co-located NPC (e.g. Mira, kavemouth's innkeeper) through a PLAYER-facing tool.",
			observed:
				"The PLAYER map exposes spellkave_communicate with explicit target and speech-act inputs.",
			impact:
				"Story callers can now attempt authored communication through the PLAYER map. This offline proof covers registration; live delivery is covered separately.",
			references: [
				"packages/spellkave-srd-cc/ledger/designs/adventure-story-buildout-plan.md",
				"packages/spellkave-tool-player/src/tools.ts",
			],
		},
		() => {
			const toolMap = createPlayerFacingToolMap(stubToolContext());
			expect(Object.keys(toolMap)).toContain("communicate");
		},
	);

	findingGap(
		{
			id: "95",
			title: "No session opening entry in the convenience PLAYER tool map",
			expected:
				"createPlayerFacingToolMap exposes a session-open tool, so a story chapter can start a turn-based grid fight (r_session_open) entirely through PLAYER-facing tools.",
			observed:
				"The session-open definition exists in the PLAYER tool registry, but createPlayerFacingToolMap does not expose a sessionOpen entry.",
			impact:
				"Convenience-map consumers cannot request session opening through that map. This finding does not claim that the separate list-based PLAYER registry lacks the tool.",
			references: [
				"packages/spellkave-srd-cc/ledger/designs/combat-on-authored-map.md",
				"packages/spellkave-tool-player/src/tools.ts",
			],
		},
		() => {
			const toolMap = createPlayerFacingToolMap(stubToolContext());
			expect(Object.keys(toolMap)).toContain("sessionOpen");
		},
	);
});
