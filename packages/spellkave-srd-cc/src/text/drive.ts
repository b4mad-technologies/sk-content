import { driveUnitScene, type VerbCall } from "../chapters/verb-runner";
import { srdTextAttachmentWriteCall, withSrdTextNamespace } from "./attachment";
import type { ExtractedSrdText, SrdTextTargetKind } from "./types";

/** Author one identity call plus its `srd.text` attachment in the same scene. */
export async function driveDefineWithSrdText(
	bundle: string,
	identityCall: VerbCall,
	args: {
		targetRef: string;
		extracted: ExtractedSrdText;
		targetKind?: SrdTextTargetKind;
		extraCalls?: readonly VerbCall[];
	},
): Promise<string> {
	return driveUnitScene(
		bundle,
		withSrdTextNamespace([
			identityCall,
			...(args.extraCalls ?? []),
			srdTextAttachmentWriteCall({
				targetKind: args.targetKind ?? "entity_definition",
				targetRef: args.targetRef,
				extracted: args.extracted,
			}),
		]),
	);
}
