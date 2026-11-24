/**
 * The `dm` bundle's own reader page.
 *
 * WHY IT EXISTS. Until this file, every row this bundle authors reached no
 * reader at all: 242 of them — the numbered dialog answers, the creation
 * handles, the consent latch — all classified as subjects that get a page, and
 * none of them having one. Placement was authored once, in srd-cc's
 * `sections.toml`, and mounted only under the SRD; a bundle with no
 * `[metadata.docs]` page of its own has nowhere for its subjects to land
 * (sk-jay0.3.5.76).
 *
 * WHY `runtime` AND NOT `dm`. This bundle is not a ruleset and not an
 * adventure: it is the machinery every adventure reuses, generated here in
 * `@spellkave/adventure-runtime` and only committed under srd-cc's fixtures.
 * The website mounts it at `/docs/adventures/runtime`, one level above the
 * adventures that depend on it, so a DM following a `dm/dialog/choice/1` link
 * out of an adventure stays in the same branch. The `bundle_id` stays `dm` in
 * every row, as authored — a mount is a route, not a rename, and the title is
 * what a reader actually reads.
 *
 * The section id `mechanics` is not arbitrary: srd-cc's `sections.toml`
 * declares `mechanics_section = "mechanics"`, and its `[[kind_sections]]` rows
 * place every mechanics row kind under that id. Declaring a section with the
 * same id is what lets this bundle's actions, affordances, consequences and
 * outcomes be placed by the same rules the SRD's are, rather than needing a
 * second set.
 *
 * WHY NO srd-cc IMPORT. `aldwin.ts` imports this file, and the shared DM seed generator
 * consumes it. The
 * packaged `/world/npc` deploy ships no srd-cc source, so the call is built
 * here in the `spellkave_set_metadata` shape srd-cc's `metadataCall` emits for
 * a single update (sk-jay0.3.9; gated by npc-host-import-check.mjs).
 */

import type { VerbCall } from "../../dm/lib/scene-driver.ts";

const DM_DOCS_PAGE = {
	version: 1,
	page_id: "runtime",
	title: "Adventure runtime",
	nav_group: "adventure",
	intro:
		"The shared machinery every adventure reuses: the DM's numbered dialog answers, the " +
		"character-creation and level-up handles, and the consent latch they write. Authored once " +
		"here rather than in each adventure, and depended on by all of them. Rows carry the " +
		"`dm` bundle id.",
	sections: [
		{
			id: "mechanics",
			title: "Runtime rules",
			intro:
				"What the DM's own seat can offer, resolve and change. These follow the same " +
				"offer/resolution/consequence shape as the SRD's own rules, and are placed by the " +
				"same rules, so an action here reads the way an action there does.",
		},
	],
};

/** The `[metadata.docs]` block for the `dm` bundle's root manifest. */
export function dmDocsMetadataCall(): VerbCall {
	return {
		toolName: "spellkave_set_metadata",
		label: "dm-docs",
		params: { target: "manifest", key: "docs", value: DM_DOCS_PAGE },
	};
}
