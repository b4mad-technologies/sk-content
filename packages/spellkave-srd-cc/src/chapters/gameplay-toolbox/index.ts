/** Gameplay Toolbox catalogue. Sample poisons are identity rows only. */
import type { AuthorTarget } from "@spellkave/tool-authoring";
import {
	type ChapterReaderProseResult,
	type ReaderSubjectAttachment,
	renderReaderProseForDocuments,
} from "../../compendium-metadata";
import type { ChapterUnitSummary } from "../chapter-types.ts";
import { buildSamplePoisonFragments } from "./sample-poisons.ts";

export const HAS_BEHAVIOR = false;

export async function generateGameplayToolbox(
	target?: AuthorTarget,
): Promise<{ fragments: Record<string, string>; units: ChapterUnitSummary[] }> {
	return buildSamplePoisonFragments(target);
}

export function generateGameplayToolboxReaderProse(
	attachments: readonly ReaderSubjectAttachment[],
): Promise<ChapterReaderProseResult> {
	return renderReaderProseForDocuments(["gameplay-toolbox"], attachments);
}
