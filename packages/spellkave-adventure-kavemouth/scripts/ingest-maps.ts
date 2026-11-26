/**
 * Take the generated backdrop images into the package and write one
 * provenance sidecar per image.
 *
 * Input: the run records `skgen image pixellab generate` leaves under
 * `pixellab-generations/kavemouth-maps/<place>/` at the repository root
 * (an ignored work directory). Output:
 * `assets/kavemouth-maps/maps/<place>.png` and `<place>.png.json`.
 *
 *   tsx scripts/ingest-maps.ts [place ...]     default: every place
 *
 * A place is skipped with a message when it has no completed run, or
 * when the run was made from a plan or request that has changed since.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { PLANS, type PlanKey } from "../author/lib/layouts.ts";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = join(PACKAGE_ROOT, "..", "..");
const MAPS_DIR = join(PACKAGE_ROOT, "assets", "kavemouth-maps", "maps");
const RUNS_DIR = join(REPO_ROOT, "pixellab-generations", "kavemouth-maps");

const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

type Run = {
	status: string;
	completed_at: string;
	provider: string;
	sdk: { package: string; version: string };
	api: { base_url: string; route: string };
	blueprint: string;
	blueprint_sha256: string;
	request: Record<string, unknown> & { init_image: string };
	usage: unknown;
	output: { path: string; sha256: string; dimensions: [number, number] };
};

const wanted = process.argv.slice(2);
const keys = (Object.keys(PLANS) as PlanKey[]).filter((k) => wanted.length === 0 || wanted.includes(k));
let taken = 0;
for (const key of keys) {
	const runDir = join(RUNS_DIR, key);
	const record = join(runDir, "manifest.json");
	if (!existsSync(record)) {
		console.log(`${key}: no run record, skipped`);
		continue;
	}
	const run = JSON.parse(readFileSync(record, "utf8")) as Run;
	if (run.status !== "completed") {
		console.log(`${key}: run is ${run.status}, skipped`);
		continue;
	}
	const blueprint = join(REPO_ROOT, run.blueprint);
	if (sha256(blueprint) !== run.blueprint_sha256) {
		console.log(`${key}: the request file changed after this run, skipped`);
		continue;
	}
	const image = join(runDir, run.output.path);
	if (sha256(image) !== run.output.sha256) throw new Error(`${key}: image does not match its run record`);
	const plan = join(REPO_ROOT, run.request.init_image);
	const target = join(MAPS_DIR, `${key}.png`);
	mkdirSync(MAPS_DIR, { recursive: true });
	copyFileSync(image, target);
	const sidecar = {
		schema: "spellkave-design-asset-provenance/v1",
		kind: "place-map",
		place_graph_id: `kavemouth/${key}`,
		provider: "pixellab-pixflux",
		tool: "skgen image pixellab generate",
		sdk: run.sdk,
		provider_ids: { api_base_url: run.api.base_url, route: run.api.route },
		prompt: run.request.description,
		request: run.request,
		source_blueprint: relative(REPO_ROOT, blueprint),
		source_blueprint_sha256: run.blueprint_sha256,
		source_plan: relative(REPO_ROOT, plan),
		source_plan_sha256: sha256(plan),
		provenance: {
			license: "CC-BY-4.0",
			source:
				"Generated with PixelLab over a first-party floor plan (author/lib/layouts.ts, scripts/build-map-inputs.ts)",
		},
		usage: run.usage,
		generated_at: run.completed_at,
		dimensions: run.output.dimensions,
		sha256: run.output.sha256,
	};
	writeFileSync(`${target}.json`, `${JSON.stringify(sidecar, null, "\t")}\n`);
	taken++;
	console.log(`${key}: taken (${run.output.sha256.slice(0, 12)})`);
}
console.log(`[kavemouth-maps] ${taken} of ${keys.length} images taken`);
