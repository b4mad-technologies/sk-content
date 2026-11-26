// The DISCOVERY-CLOSURE test, offline half (operator decision, 2026-07-28,
// `ledger/archive/general-decisions.md`): drives the SHARED, content-agnostic funnel walk
// (`src/test/shared/discovery-closure.ts`) against the committed `fixtures/`
// through the EXACT same in-process mechanism `fixtures-author-tool/harness.ts`
// wires — `createLocalAuthorTarget` bound to `FIXTURES_DIR`, driving
// `createAuthorFacingBoundTools` (never a second engine, AGENTS.md "one authoring
// engine"). That donor file asks pointed, content-specific questions ("does
// srd/ac carry AC_RESOURCE_BOUNDS"); this file asks none — only the
// structural cold-start promise: summary -> list -> detail -> ref closure ->
// schema vocabulary, the SAME invariants a fresh agent/DM could rely on
// against ANY bundle.
import { join } from "node:path";

import {
	type AuthorToolContext,
	type AuthorWorkspace,
	queryToolDef,
} from "@spellkave/tool-authoring";
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { bindTool } from "@spellkave/tool-runtime";
import { describe, expect, it } from "vitest";

import { BUNDLE_ID } from "../../chapters/playing-the-game/index";
import { FIXTURES_DIR } from "../../pipeline";
import {
	DISCOVERY_CLOSURE_REF_EXCEPTIONS,
	type DiscoveryQueryResult,
	runDiscoveryClosureWalk,
} from "../shared/discovery-closure";
import { findingEvidence } from "../srd-coverage/evidence";

/** An always-empty scratch workspace: every assertion below reads through the
 * `target` (the committed `fixtures/` directory) only, never a workspace row —
 * same helper `fixtures-author-tool/harness.ts` uses. */
function emptyWorkspace(): AuthorWorkspace {
	return { readToml: () => null, writeToml: () => "(unused)" };
}

function buildQueryTool() {
	// Mirrors `sk --target fixtures/` (no `--fixtures-root` override needed:
	// this bundle's own `depends_on = []`).
	const target = createLocalAuthorTarget(FIXTURES_DIR);
	const context: AuthorToolContext = { workspace: emptyWorkspace(), target };
	return bindTool(queryToolDef, { context, capabilities: {} });
}

describe("discovery funnel (offline, target = committed fixtures/) — content-agnostic closure walk", () => {
	it("createLocalAuthorTarget resolves fixtures/ (sanity: dir exists, manifest.toml present)", () => {
		expect(FIXTURES_DIR.endsWith(join("spellkave-srd-cc", "fixtures"))).toBe(true);
	});

	findingEvidence(
		{
			id: "78",
			title: "Discovery treats place_nodes.local_id as identity, not a dangling reference",
			expected:
				"The public query funnel closes every fixture reference while narrowly exempting a place node's composite-key local_id.",
			observed:
				"The former generic *_id heuristic treated cell_a as an unresolved foreign reference and failed standalone discovery.",
			impact:
				"A self-contained bundle could not pass the same cold-start discovery walk used by fresh authoring sessions.",
			references: [
				"ledger/archive/findings-details.md",
				"https://github.com/b4arena/spellkave/issues/2081",
			],
		},
		async () => {
			const tool = buildQueryTool();
			const query = async (params: Record<string, unknown>): Promise<DiscoveryQueryResult> => {
				const result = (await tool.execute("discovery-closure-offline-test", params)).details;
				if (result.shape === "summary" || result.shape === "list" || result.shape === "detail") {
					return result;
				}
				if (result.shape === "schema" && !("found" in result)) return result;
				throw new Error(`discovery-closure test: unexpected query result '${result.shape}'.`);
			};

			const report = await runDiscoveryClosureWalk(query, { expectBundle: BUNDLE_ID });

			// Sanity on the report shape itself — the walk actually visited
			// something, rather than vacuously passing on an empty bundle.
			expect(report.bundleIds.length).toBeGreaterThan(0);
			expect(Object.keys(report.kindCounts).length).toBeGreaterThan(0);
			expect(report.totalRowsWalked).toBeGreaterThan(0);

			// Diagnostic only (runtime/counts for the FINAL REPORT), not an assertion.
			console.log(
				"[discovery-closure/offline]",
				JSON.stringify(
					{
						bundleIds: report.bundleIds,
						kindCounts: report.kindCounts,
						totalRowsWalked: report.totalRowsWalked,
						totalOutboundRefs: report.totalOutboundRefs,
						exceptedRefCounts: report.exceptedRefCounts,
						elapsedMs: report.elapsedMs,
					},
					null,
					2,
				),
			);
		},
		// Full fixture walk over a 3x larger bundle since sk-609b.13 (757 magic
		// items); default 5s flakes under parallel ci-js (sk-cr5). 90 s was the
		// budget until sk-jay0.1.23.36.22.17: an unloaded local run measured
		// 87.4 s, and the same walk timed out twice inside the pre-commit
		// generated-files check on a loaded machine.
		180_000,
	);
});

describe("DISCOVERY_CLOSURE_REF_EXCEPTIONS — place_nodes.local_id (#2081 / finding #78)", () => {
	it("excepts place_nodes.local_id as the row's own composite-PK fragment (not a dangling ref)", () => {
		const ex = DISCOVERY_CLOSURE_REF_EXCEPTIONS.find((e) =>
			e.name.startsWith("place_nodes.local_id"),
		);
		expect(ex, "local_id exception must stay registered").toBeDefined();
		// Exact sandwich failure shape from issue #2081.
		expect(
			ex?.matches({
				fromKind: "place_nodes",
				fromId: "srd_proof/scene/cell_a",
				field: "local_id",
				value: "cell_a",
			}),
		).toBe(true);
	});

	it("does NOT swallow other place_nodes *_id fields (narrow exception)", () => {
		const ex = DISCOVERY_CLOSURE_REF_EXCEPTIONS.find((e) =>
			e.name.startsWith("place_nodes.local_id"),
		);
		expect(ex).toBeDefined();
		expect(
			ex?.matches({
				fromKind: "place_nodes",
				fromId: "srd_proof/scene/cell_a",
				field: "place_graph_id",
				value: "srd_proof/scene",
			}),
		).toBe(false);
		expect(
			ex?.matches({
				fromKind: "entity_definitions",
				fromId: "anything",
				field: "local_id",
				value: "cell_a",
			}),
		).toBe(false);
	});
});
