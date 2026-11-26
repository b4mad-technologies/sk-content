// sk-0m4.69 — Fighter class features are carrier-bound. The 2026-08-13 D2(c)
// ruling place-attached Action Surge at Aldwin's common room; 2026-08-20
// reversed it. This guard asserts the adventure fixture no longer spatially
// anchors either class-feature niche.
import { join } from "node:path";

import { loadFlattened } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";

import {
	ACTION_SURGE_NICHE_ID,
	SECOND_WIND_NICHE_ID,
} from "../../../spellkave-srd-cc/src/chapters/classes/fighter-units";
import { FIXTURES_DIR } from "../../../spellkave-srd-cc/src/pipeline";
import { FIXTURE_ROOT } from "../../author/lib/paths";

function spatialAttachments(toml: string): { nicheId: string; placeNodeId: string }[] {
	const rows: { nicheId: string; placeNodeId: string }[] = [];
	let inBlock = false;
	let nicheId: string | undefined;
	let placeNodeId: string | undefined;
	const flush = () => {
		if (inBlock && nicheId !== undefined && placeNodeId !== undefined) {
			rows.push({ nicheId, placeNodeId });
		}
	};
	for (const line of toml.split("\n")) {
		if (/^\[\[.+\]\]$/.test(line.trim())) {
			flush();
			inBlock = line.trim() === "[[spatial_niche_attachments]]";
			nicheId = undefined;
			placeNodeId = undefined;
			continue;
		}
		if (!inBlock) continue;
		const nicheMatch = /^niche_id\s*=\s*"([^"]*)"/.exec(line.trim());
		if (nicheMatch) {
			nicheId = nicheMatch[1];
			continue;
		}
		const placeMatch = /^place_node_id\s*=\s*"([^"]*)"/.exec(line.trim());
		if (placeMatch) placeNodeId = placeMatch[1];
	}
	flush();
	return rows;
}

describe("elven-mini — class features are not place-attached (sk-0m4.69)", () => {
	it("flattened adventure has no spatial_niche_attachment for Second Wind or Action Surge", () => {
		const toml = loadFlattened(FIXTURE_ROOT, "adventure.manifest.toml");
		const attached = spatialAttachments(toml).filter(
			(row) => row.nicheId === SECOND_WIND_NICHE_ID || row.nicheId === ACTION_SURGE_NICHE_ID,
		);
		expect(attached).toEqual([]);
	});
});
