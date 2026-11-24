/** Shared DM vocabulary is authored at build time (ADR-0154).
 * Adventures place the persona and attach its niches. Authored acts change
 * per-play state; each menu captures its presentation on a directed trace.
 */

import type { AuthorTarget } from "@spellkave/tool-authoring";
import { renderCreationOwnedHandles } from "../../dm/creation/seed";
import { renderNpcProvidedDialogDefinitions } from "../../dm/dialog";
import type { VerbCall } from "../../dm/lib/scene-driver.ts";
import { dmActDefinitions } from "./act-definitions.ts";
import { creationKitDefinitions } from "./creation-kits.ts";
import { dmDocsMetadataCall } from "./docs.ts";
import { renderLevelUpOwnedHandles } from "./level-up";
import { BUNDLE } from "./lib/ids.ts";

/** Shared publisher-authored DM bundle header. */
export function dmBundleHeaderCall(): VerbCall {
	return {
		toolName: "spellkave_define_bundle",
		label: "define-dm-bundle",
		params: {
			bundle_id: BUNDLE,
			depends_on: ["srd"],
			display_name: "DM NPCs and mechanics",
			author: "spellkave-srd-cc",
			version: "1.0.0",
			description:
				"Reusable authored DM dialogue, creation and advancement vocabulary. Adventures own persona placement and per-play state (ADR-0154).",
		},
	};
}

/** Shared authored DM definitions, generated into the DM fixture. */
export function dmAldwin(target: AuthorTarget): VerbCall[] {
	return [
		dmBundleHeaderCall(),
		...renderLevelUpOwnedHandles(),
		...renderNpcProvidedDialogDefinitions(),
		...renderCreationOwnedHandles(),
		...dmActDefinitions(),
		...creationKitDefinitions(target),
		// Last, so the bundle's rows are declared before the page that lists them.
		dmDocsMetadataCall(),
	];
}
