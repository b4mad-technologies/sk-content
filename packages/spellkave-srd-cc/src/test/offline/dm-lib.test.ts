// DM Runtime Library core, offline coverage (ADR-0096 "Runtime-Rendered DM
// Content from a Typed Component Library", S2 — `ledger/designs/
// dm-runtime-library-arc.md`). MINIMAL by the operator's own D-2.2 ruling:
// the playthrough is the true test for this arc, not this suite — these
// three assertions cover exactly what ADR-0096 D-2.2 leaves to unit tests
// (render determinism) plus this file's own honest slice of the SRD-
// boundary-by-construction argument (D-3) and one round-trip sanity check
// that a composed sequence actually renders parseable rows of the expected
// kinds. Every DM-lib building block gets its REAL exercise through a
// recorded playthrough or live test (S4/S5), not exhaustive unit coverage
// here.

import * as dmLib from "@spellkave/adventure-runtime/dm/lib";
import {
	buildCapabilityGrant,
	buildDialogueAction,
	buildMarkerResource,
	buildNicheDefinition,
	buildSpatialNicheAttachment,
	modifyResourceWrite,
	renderRuntimeDelta,
	setToExactValueDeltaSource,
} from "@spellkave/adventure-runtime/dm/lib";
import { inspectManifest } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";

const TEST_BUNDLE = "test_dm_lib";

interface Row {
	[key: string]: unknown;
}

function rows(manifest: Record<string, unknown>, kind: string): Row[] {
	const value = manifest[kind];
	return Array.isArray(value) ? (value as Row[]) : [];
}

/** One self-contained composed scene (niche + marker resource + a gated
 * dialogue action reading/writing that resource + a capability grant + the
 * niche's own spatial placement) — every reference resolves WITHIN this one
 * call list, so it renders with no `AuthorTarget` (mirrors `aldwin.ts`'s own
 * self-contained per-unit pattern, `dialogue.ts`'s own doc comment). */
function buildTestScene() {
	const niche = buildNicheDefinition({
		bundle: TEST_BUNDLE,
		localId: "niche/trainee",
		description: "Any creature co-located with the test DM.",
		predicateSource: "target.has_niche('creature')",
	});
	const marker = buildMarkerResource({
		bundle: TEST_BUNDLE,
		localId: "test/marker",
		displayName: "Test Marker",
		description: "A persistent exactly-once latch, DM-lib round-trip coverage only.",
		minValue: 0,
		maxValue: 1,
		initialValue: 0,
	});
	const dialogue = buildDialogueAction({
		bundle: TEST_BUNDLE,
		actionLocalId: "test/ask",
		nicheId: niche.nicheId,
		displayName: "Ask The Test DM",
		description: "A gated dialogue action exercising a late-bound literal delta.",
		gatePredicateSource: `actor.stat('${marker.resourceId}') == 0`,
		frameWrites: [
			modifyResourceWrite({
				actor: "Actor",
				resourceId: marker.resourceId,
				deltaSource: setToExactValueDeltaSource(marker.resourceId, 1),
			}),
		],
	});
	const grant = buildCapabilityGrant({
		bundle: TEST_BUNDLE,
		actorEntityKey: "entity:test-hero",
		capabilityId: dialogue.capabilityId,
		source: TEST_BUNDLE,
	});
	const attachment = buildSpatialNicheAttachment({
		bundle: TEST_BUNDLE,
		nicheId: niche.nicheId,
		placeNodeId: "place:test-node",
	});

	return { niche, marker, dialogue, grant, attachment };
}

describe("DM Runtime Library (S2) — render determinism (ADR-0096 D-2.2)", () => {
	it("renders the SAME composed scene byte-identical across two independent calls", async () => {
		const sceneA = buildTestScene();
		const callsA = [
			sceneA.niche.call,
			sceneA.marker.call,
			...sceneA.dialogue.calls,
			sceneA.grant,
			sceneA.attachment,
		];
		const tomlA = await renderRuntimeDelta(callsA);

		// A SECOND, independently-built scene (not the same object references)
		// with identical inputs — proves the builders themselves are pure, not
		// merely that re-rendering the same in-memory array is stable.
		const sceneB = buildTestScene();
		const callsB = [
			sceneB.niche.call,
			sceneB.marker.call,
			...sceneB.dialogue.calls,
			sceneB.grant,
			sceneB.attachment,
		];
		const tomlB = await renderRuntimeDelta(callsB);

		expect(tomlB).toBe(tomlA);
		expect(tomlA.length).toBeGreaterThan(0);
	});
});

describe("DM Runtime Library (S2) — SRD boundary by construction (ADR-0096 D-3)", () => {
	it("exports ONLY DM-tier wiring/marker builders — no SRD-tier definition-authoring surface", () => {
		const exportedNames = Object.keys(dmLib).sort();

		// Non-vacuous: the module actually exports the wiring/marker builders
		// this slice built, not an accidentally-empty barrel.
		expect(exportedNames).toEqual(
			expect.arrayContaining([
				"applyBeforeLatch",
				"applyPortFromExecute",
				"buildCapabilityGrant",
				"buildCapabilityGrants",
				"buildDialogueAction",
				"buildMarkerResource",
				"buildNicheDefinition",
				"buildSpatialNicheAttachment",
				"inscribeSpeechTraceWrite",
				"modifyResourceWrite",
				"renderRuntimeDelta",
				"setToExactValueDeltaSource",
			]),
		);

		// No exported name names an SRD-tier RULE-DEFINITION kind — the exact
		// vocabulary ADR-0096 D-3 forbids this library from authoring (spells,
		// feats, weapons, backgrounds, species, class features, or a generic
		// "define a rule" verb). Case-insensitive substring match: catches both
		// a literal `buildSpell(...)` and a disguised `defineSpellSlot(...)`.
		const FORBIDDEN_SRD_DEFINITION_VOCABULARY = [
			"spell",
			"feat",
			"weapon",
			"background",
			"species",
			"classfeature",
			"macro",
		];
		for (const name of exportedNames) {
			const lower = name.toLowerCase();
			for (const forbidden of FORBIDDEN_SRD_DEFINITION_VOCABULARY) {
				expect(
					lower.includes(forbidden),
					`exported name '${name}' contains forbidden SRD-definition vocabulary '${forbidden}' (ADR-0096 D-3)`,
				).toBe(false);
			}
		}
	});
});

describe("DM Runtime Library (S2) — round-trip render", () => {
	it("a composed scene parses and carries the expected row kinds", async () => {
		const scene = buildTestScene();
		const calls = [
			scene.niche.call,
			scene.marker.call,
			...scene.dialogue.calls,
			scene.grant,
			scene.attachment,
		];
		const toml = await renderRuntimeDelta(calls);

		const manifest = inspectManifest(toml).manifest as Record<string, unknown>;

		expect(rows(manifest, "niche_definitions")).toHaveLength(1);
		expect(rows(manifest, "niche_definitions")[0]?.niche_id).toBe(scene.niche.nicheId);

		expect(rows(manifest, "resource_definitions")).toHaveLength(1);
		expect(rows(manifest, "resource_definitions")[0]?.resource_definition_id).toBe(
			scene.marker.resourceId,
		);

		expect(rows(manifest, "capability_definitions")).toHaveLength(1);
		expect(rows(manifest, "capability_definitions")[0]?.capability_id).toBe(
			scene.dialogue.capabilityId,
		);

		expect(rows(manifest, "action_definitions")).toHaveLength(1);
		expect(rows(manifest, "action_definitions")[0]?.action_id).toBe(scene.dialogue.actionId);

		const outcomeRows = rows(manifest, "outcome_templates");
		expect(outcomeRows.length).toBeGreaterThanOrEqual(1);
		expect(
			outcomeRows.some((row) => row.communication_speech_act_id === scene.dialogue.actionId),
		).toBe(true);

		expect(rows(manifest, "actor_capabilities")).toHaveLength(1);
		expect(rows(manifest, "actor_capabilities")[0]?.capability_id).toBe(
			scene.dialogue.capabilityId,
		);

		expect(rows(manifest, "spatial_niche_attachments")).toHaveLength(1);
		expect(rows(manifest, "spatial_niche_attachments")[0]?.niche_id).toBe(scene.niche.nicheId);
	});
});
