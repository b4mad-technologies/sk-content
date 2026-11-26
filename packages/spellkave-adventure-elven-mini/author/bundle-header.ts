/**
 * // pattern: none — elven-mini bundle header definition
 *
 * The `elven_mini` bundle header — seed-time `buildAdventure` and every
 * runtime delta that lands more `elven_mini/*` rows (kill-time XP grant)
 * must prepend this exact call so a verb-layer scaffold cannot clobber
 * `depends_on: ["srd"]` with the unseen-bundle default `core`.
 *
 * Kept in its own file so `kill-xp.ts` can import it without cycling through
 * `adventure.ts` (which composes the seed-time capability grant).
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { BUNDLE } from "./lib/ids.ts";

export function elvenMiniBundleHeaderCall(): VerbCall {
	// Raw `[[bundles]]` row through the write_rows escape hatch rather than
	// `spellkave_define_bundle`: the verb schema still omits `tag_prefixes`
	// (srd-cc executable finding #20, #2018), and this bundle now owns a tag
	// namespace — the same header-row idiom srd-cc's `bundleHeaderCalls` and
	// `spellkave-mechanics/src/burning-room.ts` use. ONE call keeps every
	// caller (seed + every runtime delta) declaring the identical header.
	return {
		toolName: "spellkave_write_rows",
		label: "define-proof-bundle",
		params: {
			bundle: BUNDLE,
			kind: "bundles",
			rows: [
				{
					bundle_id: BUNDLE,
					// Talkers seed dm/dialog/open (and Aldwin dm/creation/phase) so
					// set-open/set-phase can read actor.stat without UnknownField.
					// Self-sufficiency forbids core, not dm; descriptors seed dm first.
					depends_on: ["srd", "dm"],
					display_name: "Playing the Game proof scene",
					author: "spellkave-srd-cc",
					version: "1.0.0",
					description: "Playing-the-Game proof mini-world (elven multi-graph).",
					// place-node-extent (sk-71u): region/hamlet/inn/tomb author position/
					// topology only, no per-node extent — a bundle default keeps every
					// node well-formed. core/area/cube is kernel vocabulary
					// (KNOWN_AREA_SHAPE_IDS), not `srd/*` content.
					default_extent_shape_id: "core/area/cube",
					default_extent_params_json: '{"extent_m": 4.5}',
					allow_flat_tags: false,
					// The bundle owns its dot-namespace (`<bundle_id>.*`, docs/data-model-
					// concepts/tagging.md) so adventure-owned membership tags such as
					// `elven_mini.companion.bond` (companion-stone.ts) are admitted by the
					// tag grammar (bare prefix, no exact-value vocabulary — MF-VAL-300
					// defers, sk-jay0.1.23.35.1). Seed and every runtime delta declare
					// this same row, so `mod_bundle.tag_prefixes` never flaps on apply.
					tag_prefixes: [{ prefix: BUNDLE }],
				},
			],
		},
	};
}
