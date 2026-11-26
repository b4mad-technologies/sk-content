// Public action cues are authored presentation facts. This proves the committed
// fixture contains exactly the bounded speech/movement examples emitted by the
// generator, rather than merely exercising a private helper.
import { inspectManifest, loadFlattened } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";
import { STEP_AFFORDANCE_ID } from "../../chapters/playing-the-game/fragments/grid";
import { SPEAK_TO_AFFORDANCE_ID } from "../../chapters/playing-the-game/fragments/speech";
import { FIXTURES_DIR } from "../../pipeline";
import { AFFORDANCE_CUE_NAMESPACE } from "../../ui/affordance-cues";

type Row = Record<string, unknown>;

function rows(manifest: Record<string, unknown>, kind: string): Row[] {
	const value = manifest[kind];
	return Array.isArray(value) ? (value as Row[]) : [];
}

describe("ui.affordance_cue", () => {
	const manifest = inspectManifest(loadFlattened(FIXTURES_DIR)).manifest as Record<string, unknown>;
	const attachments = rows(manifest, "metadata_attachments").filter(
		(row) => row.namespace === AFFORDANCE_CUE_NAMESPACE,
	);

	it("registers a public namespace", () => {
		expect(
			rows(manifest, "metadata_namespaces").filter(
				(row) => row.namespace === AFFORDANCE_CUE_NAMESPACE,
			),
		).toEqual([expect.objectContaining({ audience: "public", bundle_id: "srd" })]);
	});

	it("attaches bounded, presentation-only speech and movement examples", () => {
		expect(attachments).toHaveLength(2);
		expect(attachments).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					target_kind: "affordance_template",
					target_ref: SPEAK_TO_AFFORDANCE_ID,
					payload_json: JSON.stringify({ rank: 4, hint: "Speak directly to a visible person." }),
				}),
				expect.objectContaining({
					target_kind: "affordance_template",
					target_ref: STEP_AFFORDANCE_ID,
					payload_json: JSON.stringify({ rank: 2, hint: "A visible exit can take you onward." }),
				}),
			]),
		);
	});
});
