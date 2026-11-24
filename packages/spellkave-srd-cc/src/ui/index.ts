// UI-surface curation root (#2119 follow-up, operator-decided): membership
// in a PLAYER-facing surface — which resource/state rows appear in
// `spellkave_self_summary`, and in what order — is editorial curation with
// no SRD source. Unlike a chapter (`src/chapters/`), it has no coverage
// report (nothing SRD-sourced to cover) and its ordering is global rather
// than owned by one book chapter; future surfaces (`ui.scene`,
// `ui.inventory`) will span chapters too. `src/pipeline.ts` renders this
// module AFTER the chapter walk and includes its fragment(s) into
// `fixtures/ui/` (sibling to `base/`, `spatial/`, `elven-mini/`), never
// inside a chapter directory.
import type { ChapterUnitSummary } from "../chapters/chapter-types";
import { buildAffordanceCuesMetadataFragment } from "./affordance-cues";
import { buildAffordanceDefaultsMetadataFragment } from "./affordance-defaults";
import { buildAffordanceGroupsMetadataFragment } from "./affordance-groups";
import { buildSelfSummaryMetadataFragment } from "./self-summary";

export interface UiOutput {
	/** relPath (under `fixtures/ui/`, e.g. `ui/self-summary.toml`) -> content. */
	fragments: Record<string, string>;
	units: ChapterUnitSummary[];
}

export async function generateUi(): Promise<UiOutput> {
	const selfSummary = await buildSelfSummaryMetadataFragment();
	const affordanceGroups = await buildAffordanceGroupsMetadataFragment();
	const affordanceCues = await buildAffordanceCuesMetadataFragment();
	const affordanceDefaults = await buildAffordanceDefaultsMetadataFragment();
	return {
		fragments: {
			"ui/self-summary.toml": selfSummary.toml,
			"ui/affordance-groups.toml": affordanceGroups.toml,
			"ui/affordance-cues.toml": affordanceCues.toml,
			"ui/affordance-defaults.toml": affordanceDefaults.toml,
		},
		units: [
			...selfSummary.units,
			...affordanceGroups.units,
			...affordanceCues.units,
			...affordanceDefaults.units,
		],
	};
}
