// Walk PLAYER identity, scene, independent manipulation facts and sensing syntax.
// Every disclosed capability, action and template round-trips through the author
// query tool. Discovery never asserts that a target/action combination is legal.
import type { ManipulationContext } from "@spellkave/sdk";
import { expect } from "vitest";

import type { DiscoveryDetailResult, DiscoveryQueryExecutor } from "./discovery-closure";

/** The abstract executor the shared walk drives — bound to
 * `createPlayerFacingTools`'s tool registry against a claimed actor's
 * connection; see the live-self-seeding tier's own test file for how it wires
 * this (mirrors `DiscoveryQueryExecutor`'s tier-agnostic-executor shape). */
export type PerceptionToolExecutor = (
	toolName: string,
	params: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

interface BoundedCollectionLike<T> {
	count: number;
	listing: "complete" | "examples";
	items: T[];
	continuation?: { tool: string; args: Record<string, unknown> };
}

interface SelfSummaryResult {
	self: {
		actor_id: string;
		entity_name: string;
		capabilities: BoundedCollectionLike<{ capability_id: string; display_name: string }>;
	} | null;
}

interface SelfCapabilityRow {
	capability_id: string;
	display_name: string;
}

interface SceneListItem {
	handle: string;
	/** The item's OWN per-target content rev (T12) — scene_detail requires
	 * THIS value, never the listing envelope's top-level `rev` (the tool's own
	 * doc: "copy that item's OWN rev+handle verbatim"). */
	rev: string;
	kind: "actor" | "entity" | "exit" | "trace";
	id: string;
	label: string;
}

interface SceneCounts {
	actor: number;
	entity: number;
	exit: number;
	trace: number;
}

interface ScenePage {
	scene_resolved: boolean;
	node_id: string | null;
	rev: string;
	counts: SceneCounts;
}

interface SceneDetailResult {
	target?: { kind: string; id: string };
}

export interface PerceptionWalkReport {
	identity: { actorId: string; entityName: string };
	capabilityCount: number;
	sceneCounts: SceneCounts;
	verbCount: number;
	targetCount: number;
	distinctTargetCount: number;
	actionCount: number;
	capabilityRoundTrips: number;
	templateRoundTrips: number;
	actionIdRoundTrips: number;
	exceptedTargets: { name: string; count: number }[];
	exceptedRoundTrips: { name: string; count: number }[];
	elapsedMs: number;
}

interface CollectablePage<T> {
	listing: string;
	items: T[];
	next_cursor?: string | null;
}

/** Follow `next_cursor` to exhaustion — full walk, no sampling, same
 * discipline `discovery-closure.ts`'s own full-listing walk uses. A
 * "complete" (unpaged) response is folded in as-is (its `items` already IS
 * the whole authorized set, no cursor to follow). */
async function collectAll<T>(
	fetchPage: (cursor: string | undefined) => Promise<CollectablePage<T>>,
): Promise<T[]> {
	const acc: T[] = [];
	let cursor: string | undefined;
	for (let guard = 0; guard < 1000; guard += 1) {
		const page = await fetchPage(cursor);
		acc.push(...page.items);
		if (page.listing !== "paginated" || !page.next_cursor) return acc;
		cursor = page.next_cursor;
	}
	throw new Error("perception-walk collectAll: did not terminate within 1000 pages.");
}

/**
 * Run the content-agnostic PLAYER-perception walk against `perceive`
 * (PLAYER-facing tools) and `authorQuery` (`spellkave_query`, for the closure
 * edge), asserting every structural invariant inline (vitest `expect`, so a
 * failure names exactly which tool/kind/id/ref broke). Returns a small report
 * for the caller to log (verb/target/action/round-trip counts, elapsed time)
 * — never itself a content-specific assertion surface.
 */
export async function runPerceptionWalk(
	perceive: PerceptionToolExecutor,
	authorQuery: DiscoveryQueryExecutor,
	selfEntityId?: string,
): Promise<PerceptionWalkReport> {
	const startedAt = Date.now();

	// ── (a) self_summary / self_states(kind=capability) coherence ──
	const summary = (await perceive("spellkave_self_summary", {})) as unknown as SelfSummaryResult;
	expect(
		summary.self,
		"spellkave_self_summary must resolve identity for a genuinely claimed PLAYER actor",
	).not.toBeNull();
	const self = summary.self;
	if (self === null) {
		throw new Error("unreachable: self_summary.self is null after the assertion above");
	}
	expect(self.actor_id, "self_summary.self.actor_id must be non-empty").not.toBe("");
	expect(self.entity_name, "self_summary.self.entity_name must be non-empty").not.toBe("");
	expect(
		self.capabilities.count,
		"self_summary's capabilities preview count must be > 0 — a claimed, placed body always " +
			"carries at least the baseline sensing capability grant",
	).toBeGreaterThan(0);

	const allCapabilities = await collectAll<SelfCapabilityRow>(
		(cursor) =>
			perceive("spellkave_self_states", {
				kind: "capability",
				...(cursor === undefined ? {} : { cursor }),
			}) as unknown as Promise<CollectablePage<SelfCapabilityRow>>,
	);
	expect(
		allCapabilities.length,
		"self_states(kind=capability)'s full paged walk must total exactly self_summary's reported " +
			"capabilities.count",
	).toBe(self.capabilities.count);
	for (const cap of allCapabilities) {
		expect(
			cap.capability_id,
			"every self_states(kind=capability) row must carry a non-empty capability_id",
		).not.toBe("");
		expect(
			cap.display_name,
			`capability '${cap.capability_id}' must carry a non-empty display_name`,
		).not.toBe("");
	}

	// ── (b) scene: internal consistency across a full, kind-by-kind walk ──
	const sceneUnfiltered = (await perceive("spellkave_scene", {})) as unknown as ScenePage;
	expect(
		sceneUnfiltered.scene_resolved,
		"spellkave_scene must resolve a current scene for a genuinely claimed, placed PLAYER actor",
	).toBe(true);
	const sceneKnownIds = new Set<string>();
	let totalSceneItems = 0;
	for (const kind of ["actor", "entity", "exit", "trace"] as const) {
		const items = await collectAll<SceneListItem>(
			(cursor) =>
				perceive("spellkave_scene", {
					kind,
					...(cursor === undefined ? {} : { cursor }),
				}) as unknown as Promise<CollectablePage<SceneListItem>>,
		);
		expect(
			items.length,
			`spellkave_scene(kind='${kind}')'s full paged walk must total exactly the unfiltered ` +
				`counts.${kind}`,
		).toBe(sceneUnfiltered.counts[kind]);
		for (const item of items) {
			expect(
				item.kind,
				`spellkave_scene(kind='${kind}') must return only ${kind}-kind targets`,
			).toBe(kind);
			if (kind === "actor" || kind === "entity") sceneKnownIds.add(item.id);
			// T12 latent regression, caught on the first live run of this walk
			// since per-target revs landed: scene_detail gates freshness on the
			// ITEM's own rev — passing the listing envelope's top-level rev is a
			// guaranteed stale_handle for every target.
			const detail = (await perceive("spellkave_scene_detail", {
				handle: item.handle,
				rev: item.rev,
			})) as unknown as SceneDetailResult;
			expect(
				detail.target,
				`spellkave_scene_detail(handle='${item.handle}') must resolve the SAME handle ` +
					`spellkave_scene just returned (got: ${JSON.stringify(detail)})`,
			).toBeDefined();
			expect(detail.target?.id).toBe(item.id);
			expect(detail.target?.kind).toBe(item.kind);
		}
		totalSceneItems += items.length;
	}
	const unfilteredTotal =
		sceneUnfiltered.counts.actor +
		sceneUnfiltered.counts.entity +
		sceneUnfiltered.counts.exit +
		sceneUnfiltered.counts.trace;
	expect(
		totalSceneItems,
		"the sum of every supported kind-filtered scene walk must equal the same four " +
			"unfiltered scene counts",
	).toBe(unfilteredTotal);

	// Independently disclosed syntax and targets; no target/action product.
	const contextResult = await perceive("spellkave_manipulation_context", { detail: "full" });
	const context = contextResult.manipulation_context as ManipulationContext;
	expect(context.status).toBe("ready");
	if (context.status !== "ready") throw new Error("Manipulation context unavailable");
	const sensing = (await perceive("spellkave_sense_context", {})).sense_context as {
		status: string;
		queries?: Array<{ query_kind: string; visibility: string; outcome_template_id: string }>;
	};
	expect(sensing.status).toBe("ready");
	expect(sensing.queries?.length ?? 0).toBeGreaterThan(0);
	const distinctTargetRefs = new Set(context.targets.map((target) => target.target_ref));
	expect(distinctTargetRefs.size, "one factual row per observed target").toBe(
		context.targets.length,
	);
	for (const target of context.targets) {
		expect(target.target_fact_id).not.toBe("");
		expect(target.target_ref, "target references carry their type").toMatch(/^[a-z_]+:.+/);
		if (target.target_ref.startsWith("entity:")) {
			const id = target.target_ref.slice("entity:".length);
			if (!sceneKnownIds.has(id) && id !== selfEntityId) {
				const detail = await perceive("spellkave_entity", { entity_id: target.target_ref });
				expect(
					detail.entity,
					`Observed target ${target.target_ref} must have an authorized entity detail`,
				).toBeDefined();
				expect(detail.entity).not.toBeNull();
			}
		}
	}
	let capabilityRoundTrips = 0;
	for (const cap of allCapabilities) {
		const detail = (await authorQuery({
			kind: "capability_definitions",
			id: cap.capability_id,
			refs: "none",
		})) as DiscoveryDetailResult;
		expect(detail.found, `Capability ${cap.capability_id} must resolve in authored content`).toBe(
			true,
		);
		capabilityRoundTrips += 1;
	}
	let actionIdRoundTrips = 0;
	const templateIds = new Set<string>();
	const verbClasses = new Set<string>();
	if (sensing.queries?.length) verbClasses.add("sensing");
	for (const action of context.actions) {
		expect(action.action_id).not.toBe("");
		expect(action.display_name).not.toBe("");
		verbClasses.add(action.communication_speech_act_id ? "communicate" : "manipulate");
		const detail = (await authorQuery({
			kind: "action_definitions",
			id: action.action_id,
			refs: "none",
		})) as DiscoveryDetailResult;
		expect(detail.found, `Action ${action.action_id} must resolve in authored content`).toBe(true);
		actionIdRoundTrips += 1;
		for (const templateId of action.template_ids) templateIds.add(templateId);
	}
	for (const query of sensing.queries ?? []) {
		expect(query.query_kind).not.toBe("");
		const detail = (await authorQuery({
			kind: "outcome_templates",
			id: query.outcome_template_id,
			refs: "none",
		})) as DiscoveryDetailResult;
		expect(detail.found, `Sensing outcome ${query.outcome_template_id} must resolve`).toBe(true);
	}
	for (const templateId of templateIds) {
		const detail = (await authorQuery({
			kind: "affordance_templates",
			id: templateId,
			refs: "none",
		})) as DiscoveryDetailResult;
		expect(detail.found, `Disclosed template ${templateId} must resolve`).toBe(true);
	}
	return {
		identity: { actorId: self.actor_id, entityName: self.entity_name },
		capabilityCount: self.capabilities.count,
		sceneCounts: sceneUnfiltered.counts,
		verbCount: verbClasses.size,
		targetCount: context.targets.length,
		distinctTargetCount: distinctTargetRefs.size,
		actionCount: context.actions.length,
		capabilityRoundTrips,
		templateRoundTrips: templateIds.size,
		actionIdRoundTrips,
		exceptedTargets: [],
		exceptedRoundTrips: [],
		elapsedMs: Date.now() - startedAt,
	};
}
