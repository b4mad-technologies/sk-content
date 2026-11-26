// sk-dms.28 — a second actor_capabilities grant row on an ALREADY-existing
// capability id silently REPLACES the first one, not adds to it:
// server/src/manifest/commit.rs (~L2005, ADR-0085 D-1) upserts
// actor_capabilities on the pair (entity_id, capability_id) alone. Two rows
// authored in fixtures/ sharing (actor_entity_key, capability_id) but
// different extents therefore commit to exactly ONE live row (whichever
// applies last), silently dropping the other's extent — the exact bug that
// made Aldwin's initiative watch stop seeing the region the moment
// dm-threshold.ts's limbo watch grant (commit a916340fb, sk-h6d) reused his
// existing DM_WATCH_CAPABILITY_ID for a second row instead of minting its
// own (kavemouth/dm/watch-limbo).
//
// This test asserts the invariant the ADR-0085 upsert key requires but the
// authoring surface never enforced: no two [[actor_capabilities]] rows in
// the rendered kavemouth fixture share (actor_entity_key, capability_id).
// It is a regression guard for the fix, not a re-derivation of the incident
// — the incident itself is recorded in bead sk-dms.28.
//
// The shared authoring harness first flattens the committed adventure root and
// its `[[include]]` closure with the same concatenation semantics as a seed.
// The result is then parsed by hand (a small line-oriented scan over
// `[[actor_capabilities]]` blocks), NOT a general TOML library: this fixture
// also authors a `cell_anchor` u64 literal (`622215095455449087`) that a full
// parse (`smol-toml`) refuses outright ("integer value
// cannot be represented losslessly") — this test only ever needs two string
// fields off one row kind, so a full-document parse is both unnecessary and
// (today) impossible without a lossy custom bigint reviver.
import { join } from "node:path";

import { loadFlattened } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";

import { FIXTURES_DIR } from "../../../spellkave-srd-cc/src/pipeline";
import { FIXTURE_ROOT } from "../../author/lib/paths";

interface ActorCapabilityRow {
	actorEntityKey: string;
	capabilityId: string;
	extentRef: string;
}

/** Line-oriented `[[actor_capabilities]]` block scan — see this file's own
 * header for why a full TOML parse is avoided here. */
function parseActorCapabilities(toml: string): ActorCapabilityRow[] {
	const lines = toml.split("\n");
	const rows: ActorCapabilityRow[] = [];
	let inBlock = false;
	let current: Partial<ActorCapabilityRow> = {};
	const flush = () => {
		if (inBlock && current.actorEntityKey !== undefined && current.capabilityId !== undefined) {
			rows.push({
				actorEntityKey: current.actorEntityKey,
				capabilityId: current.capabilityId,
				extentRef: current.extentRef ?? "",
			});
		}
	};
	for (const line of lines) {
		if (/^\[\[.+\]\]$/.test(line.trim())) {
			flush();
			inBlock = line.trim() === "[[actor_capabilities]]";
			current = {};
			continue;
		}
		if (!inBlock) continue;
		const actorMatch = /^actor_entity_key\s*=\s*"([^"]*)"/.exec(line.trim());
		if (actorMatch) {
			current.actorEntityKey = actorMatch[1];
			continue;
		}
		const capMatch = /^capability_id\s*=\s*"([^"]*)"/.exec(line.trim());
		if (capMatch) {
			current.capabilityId = capMatch[1];
			continue;
		}
		const extentMatch = /^extent_ref\s*=\s*"([^"]*)"/.exec(line.trim());
		if (extentMatch) {
			current.extentRef = extentMatch[1];
		}
	}
	flush();
	return rows;
}

describe(
	"kavemouth actor_capabilities rows never share (actor_entity_key, capability_id) " +
		"(offline, read path = committed fixtures/kavemouth/adventure.manifest.toml)",
	() => {
		it("has no duplicate (actor_entity_key, capability_id) pair across [[actor_capabilities]]", () => {
			const toml = loadFlattened(FIXTURE_ROOT, "adventure.manifest.toml");
			const rows = parseActorCapabilities(toml);

			// Guard against a vacuous pass: the fixture must actually author some
			// actor_capabilities rows (Aldwin alone grants several).
			expect(rows.length).toBeGreaterThan(0);

			const seen = new Map<string, ActorCapabilityRow>();
			const dupes: string[] = [];
			for (const row of rows) {
				const key = `${row.actorEntityKey}::${row.capabilityId}`;
				const prior = seen.get(key);
				if (prior !== undefined) {
					dupes.push(
						`(${row.actorEntityKey}, ${row.capabilityId}) — rows with extent_ref ` +
							`'${prior.extentRef}' and '${row.extentRef}' collide on the ADR-0085 upsert key ` +
							"(entity_id, capability_id); the second silently replaces the first at apply " +
							"time instead of adding a second extent.",
					);
				}
				seen.set(key, row);
			}

			expect(
				dupes,
				"every duplicate pair silently loses one authored extent to the ADR-0085 upsert " +
					"(server/src/manifest/commit.rs ~L2005) — mint a distinct capability id per extent " +
					"instead (sk-dms.28's fix)",
			).toEqual([]);
		});

		it("seeds reach exactly once on every concrete srd.creature definition", () => {
			const toml = loadFlattened(FIXTURE_ROOT, "adventure.manifest.toml");
			const creatureDefs = new Set<string>();
			const reachCounts = new Map<string, number>();
			for (const block of toml.split(/^\[\[/m)) {
				const entityDefId = /entity_def_id\s*=\s*"([^"]+)"/.exec(block)?.[1];
				if (entityDefId === undefined) continue;
				if (block.startsWith("entity_definition_tag") && /tag\s*=\s*"srd\.creature"/.test(block))
					creatureDefs.add(entityDefId);
				if (
					block.startsWith("entity_definition_initial_state") &&
					/state_id\s*=\s*"srd\/reach_mm"/.test(block)
				)
					reachCounts.set(entityDefId, (reachCounts.get(entityDefId) ?? 0) + 1);
			}
			for (const entityDefId of creatureDefs)
				expect(reachCounts.get(entityDefId), entityDefId).toBe(1);
		});
	},
);
