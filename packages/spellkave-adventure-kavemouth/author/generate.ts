#!/usr/bin/env tsx
/**
 * // pattern: none — bundle generation runner for kavemouth
 *
 * Kavemouth adventure orchestrator — companion verbs only.
 *
 *   just srd-cc-author-kavemouth
 *   just srd-cc-author-kavemouth --check
 *
 * Plan: packages/spellkave-srd-cc/ledger/designs/kavemouth-adventure-plan.md
 * Verb rebuild: packages/spellkave-srd-cc/ledger/designs/spatial-generators-via-companion-verbs.md
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { driveManifestScene } from "@spellkave/adventure-runtime/dm/lib";
import { inspectManifest, renderSchemaManifest } from "@spellkave/world-author";
import { parse as parseToml } from "smol-toml";
import { renderManifestRoot } from "../../spellkave-srd-cc/src/chapters/verb-runner";
import { FIXTURES_DIR } from "../../spellkave-srd-cc/src/pipeline";
import { buildAdventure } from "./adventure.ts";
import { renderAdventureCast } from "./cast.ts";
import {
	assertKavemouthDocsTargets,
	buildKavemouthRootMetadata,
	catalogueSourcePaths,
} from "./docs.ts";
import { ADVENTURE_FRAGMENT_PATHS, CAST_MEMBERS, splitAdventureManifestRows } from "./layout.ts";
import { BUNDLE, GRAPHS, STORY_GRAPHS } from "./lib/ids.ts";
import { FIXTURE_ROOT } from "./lib/paths.ts";
import { kavemouthAuthorTarget } from "./lib/target.ts";

const CHECK = process.argv.includes("--check");

type Row = Record<string, unknown>;

function asRowTables(parsed: Record<string, unknown>): Record<string, Row[]> {
	const out: Record<string, Row[]> = {};
	for (const [k, v] of Object.entries(parsed)) {
		if (Array.isArray(v) && v.every((x) => x !== null && typeof x === "object")) {
			out[k] = v as Row[];
		}
	}
	return out;
}

function fragmentMaps(all: Record<string, Row[]>): Record<string, Record<string, Row[]>> {
	const byGraph = (graphId: string): Record<string, Row[]> => {
		const place_graphs = (all.place_graphs ?? []).filter((r) => r.place_graph_id === graphId);
		const place_nodes = (all.place_nodes ?? []).filter((r) => r.place_graph_id === graphId);
		const place_edges = (all.place_edges ?? []).filter((r) => r.place_graph_id === graphId);
		const edgeKeys = new Set(place_edges.map((e) => String(e.edge_key)));
		const place_edge_affordance = (all.place_edge_affordance ?? []).filter((r) =>
			edgeKeys.has(String(r.edge_key)),
		);
		const bundles = (all.bundles ?? []).filter((r) => r.bundle_id === BUNDLE);
		// ADR-0101 (task 6.2): the bundle-scoped [[movement_defaults]] row
		// (place_graph_id = "") every graph's edges now rely on for ordinary
		// walking — without it, a standalone `<graph>.manifest.toml` seeded
		// alone would carry zero traversal rows at all (place_edge_affordance
		// is now empty by design). A graph-scoped default (non-empty,
		// matching this graph) would also travel with it; none is authored
		// today.
		const movement_defaults = (all.movement_defaults ?? []).filter(
			(r) => r.bundle_id === BUNDLE && (r.place_graph_id === "" || r.place_graph_id === graphId),
		);
		return {
			bundles,
			place_graphs,
			place_nodes,
			place_edges,
			place_edge_affordance,
			movement_defaults,
		};
	};

	const fragments: Record<string, Record<string, Row[]>> = { adventure: all };
	for (const key of STORY_GRAPHS) {
		fragments[key] = byGraph(GRAPHS[key]);
	}
	return fragments;
}


function listFixtureFiles(root: string): string[] {
	const out: string[] = [];
	const walk = (dir: string, prefix: string) => {
		if (!existsSync(dir)) return;
		for (const ent of readdirSync(dir, { withFileTypes: true })) {
			if (ent.name.startsWith(".")) continue;
			const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
			if (ent.isDirectory()) walk(join(dir, ent.name), rel);
			else out.push(rel);
		}
	};
	walk(root, "");
	return out.sort();
}

async function main(): Promise<void> {
	const castPath = join(FIXTURE_ROOT, "../npcs/cast.toml");
	const cast = renderAdventureCast();
	if (CHECK) {
		if (readFileSync(castPath, "utf8") !== cast)
			throw new Error("NPC cast drift: run adventure author generation.");
	} else writeFileSync(castPath, cast);
	assertKavemouthDocsTargets();
	// sk-jay0.2.33.15.7 (ADR-0142): the quest prompts' `response_action_ids`
	// name the `dm` bundle's `dm/dialog/choice/N` — `kavemouthAuthorTarget`
	// (`./lib/target.ts`) wraps the plain `srd` target with THAT one kind's
	// rows read directly from `dm`'s own manifest (see its own doc comment
	// for why a straight `createLocalAuthorTarget(FIXTURES_DIR/"dm")` can't
	// resolve `dm`'s own `depends_on = ["srd"]`).
	const target = kavemouthAuthorTarget(FIXTURES_DIR);
	const adventureToml = await driveManifestScene(buildAdventure(target), target);
	// H3 origin/cells + parent_graph_id + portal cell_anchor come from author_place / link_places.
	const inspected = inspectManifest(adventureToml).manifest as Record<string, unknown>;
	const all = asRowTables(inspected);
	const graphFragments = fragmentMaps(all);
	const adventureFragments = splitAdventureManifestRows(adventureToml);
	const bundleRow = all.bundles?.[0];
	if (bundleRow === undefined || (all.bundles?.length ?? 0) !== 1) {
		throw new Error("kavemouth: authored adventure must contain exactly one bundle row.");
	}
	const descriptor = parseToml(
		readFileSync(new URL("../adventures/kavemouth.toml", import.meta.url), "utf8"),
	) as Record<string, unknown>;
	if (typeof descriptor.name !== "string" || typeof descriptor.description !== "string") {
		throw new Error("kavemouth: adventure descriptor requires string name and description.");
	}
	const adventureRootToml = await renderManifestRoot(
		bundleRow,
		ADVENTURE_FRAGMENT_PATHS,
		target,
		buildKavemouthRootMetadata(
			all,
			{
				name: descriptor.name,
				description: descriptor.description,
			},
			catalogueSourcePaths(adventureFragments),
		),
		"kavemouth",
	);

	const outDir = CHECK ? join(FIXTURE_ROOT, ".check-tmp") : FIXTURE_ROOT;
	if (CHECK) {
		rmSync(outDir, { recursive: true, force: true });
	} else {
		// This subtree is wholly generator-owned. Clearing its narrow root keeps
		// renamed or retired fragments from surviving a normal regeneration.
		rmSync(join(outDir, "adventure"), { recursive: true, force: true });
	}

	mkdirSync(outDir, { recursive: true });
	writeFileSync(
		join(outDir, "adventure.manifest.toml"),
		adventureRootToml.endsWith("\n") ? adventureRootToml : `${adventureRootToml}\n`,
	);

	for (const path of ADVENTURE_FRAGMENT_PATHS) {
		const outPath = join(outDir, path);
		mkdirSync(dirname(outPath), { recursive: true });
		const body = adventureFragments[path];
		writeFileSync(outPath, body.endsWith("\n") ? body : `${body}\n`);
	}

	for (const [name, rows] of Object.entries(graphFragments)) {
		if (name === "adventure") continue;
		const body = renderSchemaManifest({
			schema_version: "1.0.0",
			// ADR-0145: each standalone place root is its own applyset.
			applyset: `kavemouth.${name}`,
			metadata: { profile: `${BUNDLE}_${name}`, bundle: BUNDLE },
			...rows,
		});
		writeFileSync(join(outDir, `${name}.manifest.toml`), body.endsWith("\n") ? body : `${body}\n`);
	}

	// A preserve-state upgrade carries only the already-authored policy rows.
	// In particular it must never replay #4940's initial closed lid or loot seeds.
	mkdirSync(join(outDir, "migrations"), { recursive: true });
	writeFileSync(
		join(outDir, "migrations/2026-11-16-containment-policies.manifest.toml"),
		renderSchemaManifest({
			schema_version: "1.0.0",
			metadata: { bundle: BUNDLE },
			containment_policy_definition: all.containment_policy_definition,
			entity_definition_containment_policy: all.entity_definition_containment_policy,
			entity_containment_policy: all.entity_containment_policy,
		}),
	);

	if (CHECK) {
		const keep = (file: string) => file.endsWith(".toml");
		const expected = listFixtureFiles(FIXTURE_ROOT).filter(keep);
		const got = listFixtureFiles(outDir).filter(keep);
		const missing = expected.filter((f) => !got.includes(f));
		const extra = got.filter((f) => !expected.includes(f));
		const drifts: string[] = [];
		for (const f of expected) {
			if (!got.includes(f)) continue;
			const a = readFileSync(join(FIXTURE_ROOT, f));
			const b = readFileSync(join(outDir, f));
			if (!a.equals(b)) drifts.push(f);
		}
		rmSync(outDir, { recursive: true, force: true });
		if (missing.length || extra.length || drifts.length) {
			console.error("[kavemouth] CHECK failed");
			if (missing.length) console.error("  missing:", missing.join(", "));
			if (extra.length) console.error("  extra:", extra.join(", "));
			if (drifts.length) console.error("  drift:", drifts.join(", "));
			process.exit(1);
		}
		console.log("[kavemouth] OK — fixtures match generators");
		return;
	}

	console.log(`[kavemouth] wrote adventure under ${FIXTURE_ROOT}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
