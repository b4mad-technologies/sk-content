// Self-sufficiency tripwire (AGENTS.md "Self-sufficiency" binding invariant;
// `ledger/archive/general-decisions.md`'s 2026-07-28 operator ruling): this bundle depends_on
// nothing — `depends_on` stays `[]` AND the fixtures carry ZERO `core/*`
// references, in any form, EXCEPT the narrow kernel-vocabulary carve-out
// below. A content-agnostic grep-style walk over every committed `fixtures/`
// file (row values, comments, coverage prose alike — deliberately not
// scoped to typed reference fields only, so a stray explanatory mention
// would ALSO trip this and force a reword rather than slide by unnoticed)
// asserting zero literal `core/` substring occurrences once the carve-out
// strings are scrubbed out first.
//
// Kernel-genesis substrate/coordinate-kind ids this bundle DOES legitimately
// reference (`outdoor`, `tactical_grid`, `h3_cell`, … —
// `server/src/spatial/bootstrap.rs`'s `SUBSTRATES`/`COORDINATE_KINDS`
// consts, seeded on every node regardless of any bundle) carry no
// `core/`-style prefix at all, so THOSE need no exception list.
//
// `KNOWN_AREA_SHAPE_IDS` (finding #67, 2026-07-31 operator
// ruling) is a DIFFERENT case: `server/src/spatial/vocabulary.rs:87-93`'s
// closed, kernel-seeded `ForEachActorInRadius` shape-id constant — same
// genesis class as the substrate/coordinate-kind ids above (a closed Rust
// list, never an authored row, seeded on every node regardless of any
// bundle) — happens to carry the `core/area/` prefix. The operator ruling:
// "everything we can author ourselves, we build ourselves — migrating or
// re-authoring things FROM the core [...] bundle is fine [...] what we do
// NOT want are server-code changes" (`ledger/archive/general-decisions.md`) — since growing
// `KNOWN_AREA_SHAPE_IDS` is server territory (a §17 K-5 patch, off the
// table), referencing the existing kernel vocabulary as-is is the correct,
// sanctioned shape. This carve-out is NARROW and EXPLICIT — exactly these 5
// strings, nothing broader — so any OTHER `core/` reference (a real `core`
// BUNDLE dependency) still trips the tripwire below.
//
// `KERNEL_CONDITION_CARVE_OUT` (N3b, 2026-08-05) is a THIRD case, same
// genesis class again: `r_claim_actor`'s steering claim-lock condition,
// `core/condition/controlled` — this package's own `CLAUDE.md`
// ("Verification" section, #2031/finding #48) already establishes that its
// `ConditionDefinition` row (plus `stacking_rule`/`remove_time_policy`
// closure) lives in KERNEL GENESIS, byte-identical to
// `world-fixtures/core/base/conditions.toml`'s own authored row — seeded on
// every node regardless of any bundle, never a `core` bundle dependency.
// First tripped live authoring the elven-mini crypt fight (N3b): claiming
// the Warden's own actor for its seat applies this condition, and a
// `spellkave_self_summary` call captured into the committed story after
// that claim surfaces its `condition_definition_id` literally — a true
// positive for "this string is present," a false positive for "this is an
// undeclared core bundle dependency."
//
// `KERNEL_SPATIAL_FACT_CARVE_OUT` is the corresponding reserved runtime
// fact family. `collect_spatial_inputs` computes `core/distance_to_actor_mm`;
// the reaction producer computes `core/distance_to_departed_mm` and
// `core/distance_to_destination_mm` (sk-0m4.26 / D-OPEN-1). No manifest row
// or `core` bundle owns any of them. Authored predicates consume that kernel
// API, so the literals are not a bundle dependency either.
//
// K-A Fact 1 (`ledger/designs/sneak-attack-kernel-design.md`, sk-609b)
// widened this SAME carve-out family (kept the array's original name — the
// family is "kernel-genesis reserved runtime fact", not spatial-only) with
// `core/resolution_roll_modifier`: `build_actor_subject_facts` pushes it
// only at apply time, from `ResolutionApplyFacts`, the same "kernel computes
// it, no manifest row owns it" shape as the distance facts above.
//
// `KERNEL_DISTANCE_METRIC_ID_CARVE_OUT` (ADR-0134 D-1/D-5) is the area-shape
// case again, one table over: `server/src/spatial/distance_metric.rs`'s
// `CORE_DISTANCE_METRICS` seeds the three `distance_metric_definitions`
// rows (`core/metric/{euclidean,chebyshev,manhattan}`) on every node
// regardless of any bundle, the offline validator treats them as always
// visible (`spellkave_schema::CORE_DISTANCE_METRIC_IDS`, MF-VAL-332), and
// growing the closed `DistanceMetricShape` behind them is §17 K-5 server
// territory. `srd/combat-grid/standard-10x10` names `core/metric/chebyshev`
// (SRD 5.2: every grid step is 5 ft) — referencing the existing kernel
// vocabulary as-is, never a `core` bundle dependency.
//
// `KERNEL_AUDIENCE_KIND_ID_CARVE_OUT` (ADR-0142 D-1/D-4) is the same
// area-shape/distance-metric case again: `server/src/world_interaction/
// layer3/audience_kind_definition.rs`'s `CORE_AUDIENCE_KINDS` seeds the two
// `audience_kind_definitions` rows (`core/audience/{directed_trace,
// broadcast}`) on every node regardless of any bundle, and the offline
// validator treats them as always visible (proven in
// `crates/spellkave-validate/src/lib.rs`'s
// `prompt_definition_audience_and_response_action_refs_are_checked` test).
// `dm/prompt/creation/*`'s `audience_kind_ref` names `core/audience/
// directed_trace` — referencing the existing kernel vocabulary as-is, never
// a `core` bundle dependency.
//
// `KERNEL_TARGET_HOME_FACT_CARVE_OUT` (sk-jay0.1.23.36.22.4, operator
// decision 2026-09-23) is the same genesis case again: `server/src/
// world_interaction/target_niches.rs`'s `TARGET_GROUNDED_STATE`/
// `TARGET_CONTAINED_STATE`/`TARGET_OWNED_STATE` literals — the reducer populates these facts on
// EVERY target on every node, no manifest row or `core` bundle owns them.
// `packages/spellkave-srd-cc/CLAUDE.md`'s self-sufficiency section names
// this exact exception. `srd/pickup`'s predicate reads `core/grounded` and
// `core/contained`, and the `srd/consumable` niche reads `core/owned` —
// referencing the existing kernel vocabulary as-is, never a `core` bundle
// dependency.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { FIXTURES_DIR } from "../../pipeline";

const KERNEL_AREA_SHAPE_ID_CARVE_OUT = [
	"core/area/sphere",
	"core/area/cone",
	"core/area/line",
	"core/area/cube",
	"core/area/node_ball",
] as const;

/** Kept as its own list, never merged into `KERNEL_AREA_SHAPE_ID_CARVE_OUT`
 * above — that array's own exact-match test (below) pins it to precisely
 * the 5 `server/src/spatial/vocabulary.rs` strings; this is a SEPARATE
 * kernel-genesis exception (see this file's own header comment). */
const KERNEL_CONDITION_CARVE_OUT = ["core/condition/controlled"] as const;

const KERNEL_SPATIAL_FACT_CARVE_OUT = [
	"core/distance_to_actor_mm",
	"core/distance_to_departed_mm",
	"core/distance_to_destination_mm",
	"core/resolution_roll_modifier",
	// K-B Part A: holder identity fact for condition hooks. Recorded in
	// ADR-0049's postscript (`:151`, `:198`), NOT ADR-0106 — that one is
	// K-B Part B, the `Layer2.ConditionDelta` event leaf (canon-warden,
	// sk-awlo.3, 2026-08-25).
	"core/entity_id",
	// K-D (sk-609b.22, ADR-0045 postscript 2026-08-23): dispatch's
	// `ManipulationArgs.quantity`, projected from `args_json` — same
	// "kernel computes it, no manifest row owns it" shape as the facts above.
	"core/dispatch_arg_quantity",
] as const;

/** ADR-0134 D-1: the closed, kernel-seeded distance-metric vocabulary a
 * `combat_grid_blueprints.distance_metric_id` may name — exactly the three
 * `server/src/spatial/distance_metric.rs` `CORE_DISTANCE_METRICS` ids, kept
 * as its own pinned list like the area shapes above. */
const KERNEL_DISTANCE_METRIC_ID_CARVE_OUT = [
	"core/metric/euclidean",
	"core/metric/chebyshev",
	"core/metric/manhattan",
] as const;

/** ADR-0142 D-1/D-4: the closed, kernel-seeded audience vocabulary a
 * `prompt_definitions.audience_kind_ref` may name without an authored
 * `audience_kind_definitions` row — exactly the two
 * `server/src/world_interaction/layer3/audience_kind_definition.rs`
 * `CORE_AUDIENCE_KINDS` ids, kept as its own pinned list like the area
 * shapes and distance metrics above. */
const KERNEL_AUDIENCE_KIND_ID_CARVE_OUT = [
	"core/audience/directed_trace",
	"core/audience/broadcast",
] as const;

/** sk-jay0.1.23.36.22.4: the kernel-derived target-home facts this bundle
 * references — `core/grounded`/`core/contained` (`srd/pickup`'s predicate) and,
 * since sk-jay0.1.23.36.22.17, `core/owned` (the `srd/consumable` niche that
 * `srd/consume` targets). The closed set named by this file's own header
 * comment and the srd-cc CLAUDE.md self-sufficiency exception. */
const KERNEL_TARGET_HOME_FACT_CARVE_OUT = [
	"core/grounded",
	"core/contained",
	"core/owned",
] as const;

/** Every file under `dir`, recursively (no directory entries, no filtering — a content-agnostic walk). */
function walkFiles(dir: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		const fullPath = join(dir, entry);
		if (statSync(fullPath).isDirectory()) {
			files.push(...walkFiles(fullPath));
		} else {
			files.push(fullPath);
		}
	}
	return files;
}

/** `line` with every carve-out string removed — any `core/` surviving this scrub is a genuine offender. */
function scrubCarveOut(line: string): string {
	// The Open5e credit in the SRD attribution names upstream paths, not kernel refs.
	let scrubbed = line.replaceAll("open5e-core/", "").replaceAll("open5e/core/", "");
	for (const exempt of [
		...KERNEL_AREA_SHAPE_ID_CARVE_OUT,
		...KERNEL_CONDITION_CARVE_OUT,
		...KERNEL_SPATIAL_FACT_CARVE_OUT,
		...KERNEL_DISTANCE_METRIC_ID_CARVE_OUT,
		...KERNEL_AUDIENCE_KIND_ID_CARVE_OUT,
		...KERNEL_TARGET_HOME_FACT_CARVE_OUT,
	]) {
		scrubbed = scrubbed.split(exempt).join("");
	}
	return scrubbed;
}

interface CoreRefOffender {
	file: string;
	line: number;
	text: string;
}

describe("self-sufficiency (AGENTS.md, ledger/archive/general-decisions.md's 2026-07-28 operator ruling)", () => {
	it("carries ZERO literal `core/` occurrences anywhere under the committed fixtures/ tree, outside the pinned kernel-vocabulary carve-outs (finding #67)", () => {
		const offenders: CoreRefOffender[] = [];
		for (const filePath of walkFiles(FIXTURES_DIR)) {
			const content = readFileSync(filePath, "utf8");
			content.split("\n").forEach((line, index) => {
				// Path-segment match only: `manticore/action` contains the letters
				// "core/" as a substring and must not trip the self-sufficiency gate
				// (L7 bestiary baked multiattack for srd/creature/manticore/…).
				if (/(^|[^a-zA-Z])core\//.test(scrubCarveOut(line))) {
					offenders.push({
						file: relative(FIXTURES_DIR, filePath),
						line: index + 1,
						text: line.trim(),
					});
				}
			});
		}
		if (offenders.length > 0) {
			console.error(
				"self-sufficiency tripwire: literal `core/` occurrence(s) found outside the " +
					"pinned kernel-vocabulary carve-outs —\n" +
					JSON.stringify(offenders, null, 2),
			);
		}
		expect(offenders).toEqual([]);
	});

	it("the KNOWN_AREA_SHAPE_IDS carve-out is exactly the 5 strings server/src/spatial/vocabulary.rs:87-93 seeds (no broader drift)", () => {
		expect(KERNEL_AREA_SHAPE_ID_CARVE_OUT).toEqual([
			"core/area/sphere",
			"core/area/cone",
			"core/area/line",
			"core/area/cube",
			"core/area/node_ball",
		]);
	});

	it("the non-area kernel carve-outs pin exactly the steering-lock condition and reserved spatial-distance facts (no broader drift)", () => {
		expect(KERNEL_CONDITION_CARVE_OUT).toEqual(["core/condition/controlled"]);
		expect(KERNEL_SPATIAL_FACT_CARVE_OUT).toEqual([
			"core/distance_to_actor_mm",
			"core/distance_to_departed_mm",
			"core/distance_to_destination_mm",
			"core/resolution_roll_modifier",
			"core/entity_id",
			"core/dispatch_arg_quantity",
		]);
	});

	it("the distance-metric carve-out is exactly the 3 ids server/src/spatial/distance_metric.rs's CORE_DISTANCE_METRICS seeds (no broader drift)", () => {
		expect(KERNEL_DISTANCE_METRIC_ID_CARVE_OUT).toEqual([
			"core/metric/euclidean",
			"core/metric/chebyshev",
			"core/metric/manhattan",
		]);
	});

	it("the audience-kind carve-out is exactly the 2 ids server/src/world_interaction/layer3/audience_kind_definition.rs's CORE_AUDIENCE_KINDS seeds (no broader drift)", () => {
		expect(KERNEL_AUDIENCE_KIND_ID_CARVE_OUT).toEqual([
			"core/audience/directed_trace",
			"core/audience/broadcast",
		]);
	});

	it("the target-home-fact carve-out is exactly the 3 kernel-derived facts srd/pickup and srd/consumable reference (no broader drift)", () => {
		expect(KERNEL_TARGET_HOME_FACT_CARVE_OUT).toEqual([
			"core/grounded",
			"core/contained",
			"core/owned",
		]);
	});
});
