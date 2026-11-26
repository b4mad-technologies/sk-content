// sk-0m4.69 / WA-CAP-002 gate: every playable `capability:srd/*` affordance
// niche in the committed srd bundle must have a niche_definitions row with a
// non-empty provider. Proof-scene (`srd_proof/*`) niches are authored with
// provider = "place" in their own generator.
import { describe, expect, it } from "vitest";

import {
	buildTools,
	type QueryDetailResult,
	type QueryListResult,
	query,
} from "./fixtures-author-tool/harness";

describe("srd base capability:* niches have definitions (sk-0m4.69 / WA-NICHE-001)", () => {
	it("every affordance niche_id starting with capability:srd/ has a niche_definitions row", async () => {
		const tools = buildTools();
		const affordances = (await query(tools, {
			kind: "affordance_templates",
			bundle: "srd",
		})) as QueryListResult;
		const niches = (await query(tools, {
			kind: "niche_definitions",
			bundle: "srd",
		})) as QueryListResult;
		const defined = new Map<string, string>();
		for (const item of niches.items) {
			const detail = (await query(tools, {
				kind: "niche_definitions",
				id: item.id,
				refs: "none",
			})) as QueryDetailResult;
			if (!detail.found || detail.row === undefined) continue;
			defined.set(item.id, String(detail.row.provider ?? ""));
		}
		for (const item of affordances.items) {
			const detail = (await query(tools, {
				kind: "affordance_templates",
				id: item.id,
				refs: "none",
			})) as QueryDetailResult;
			if (!detail.found || detail.row === undefined) continue;
			const nicheId = String(detail.row.niche_id ?? "");
			if (!nicheId.startsWith("capability:srd/")) continue;
			expect(defined.has(nicheId), `${item.id} uses undefined ${nicheId}`).toBe(true);
			expect(
				defined.get(nicheId),
				`${item.id} / ${nicheId} is missing a required provider (WA-CAP-002)`,
			).not.toBe("");
		}
	});
});
