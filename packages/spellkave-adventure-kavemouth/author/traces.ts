/**
 * // pattern: none — trace definition fixtures for kavemouth
 *
 * Slime trail — one static, authored trace at the tomb entrance (story v2b,
 * option a: static carrier, no runtime inscription).
 *
 * First `trace_kind_definitions` row anywhere in srd-cc (coverage survey,
 * 2026-08-03: "Traces: zero vocabulary anywhere in srd-cc — first-of-kind
 * work"). Namespaced under this bundle's own `adventure/` slug convention
 * (mirrors `hero.ts`'s `adventure/hero`, `combatants.ts`'s slime-scout
 * instance key prefix) — never a new bundle prefix, never the
 * kernel-genesis `scrape_marks` kind (that's a *skirmish-scars* vocabulary;
 * this is a distinct, kavemouth-owned slime-trail vocabulary).
 *
 * Authored through `spellkave_define_trace_kind` (sk-9ll.8), the folding
 * verb that replaced this fragment's own two-call `spellkave_write_rows`
 * idiom (`trace_kind_definitions` parent + `place_node_traces` satellite,
 * the SAME shape `packages/spellkave-phandelver/src/author/
 * author-trail-omens.ts`'s `scrape_marks` row still uses raw, pre-sk-9ll.8).
 * `node_id` is validated against the target's own row at commit
 * (`insert_place_node_trace`, `server/src/manifest/commit.rs`) — an
 * unresolvable node now REJECTS the commit rather than silently falling
 * back to bundle 'core'; the resolved node's `bundle_id` still stamps the
 * `trace` row. Payload stays the bare `"{}"` convention (no structured
 * runtime consumer; the prose lives on the trace KIND's description).
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { BUNDLE, GRAPHS, nodeId } from "./lib/ids.ts";

export const SLIME_TRAIL_TRACE_KIND_ID = `${BUNDLE}/adventure/trace/slime_trail`;
export const TOMB_ENTRANCE_NODE_ID = nodeId(GRAPHS.tomb, "entrance");

export function traces(): VerbCall[] {
	return [
		{
			toolName: "spellkave_define_trace_kind",
			label: "slime-trail-at-tomb-entrance",
			params: {
				bundle: BUNDLE,
				id: "adventure/trace/slime_trail",
				location_kinds: "place_node",
				description:
					"A glistening trail of translucent slime, still faintly wet — something crawled through here.",
				schema_json: "{}",
				places: [{ node: TOMB_ENTRANCE_NODE_ID }],
			},
		},
	];
}
