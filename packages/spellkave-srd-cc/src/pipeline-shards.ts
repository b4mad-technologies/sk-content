import { CHAPTERS } from "./chapters/index";

/** Synthetic unit rendered after the chapter walk (`generateUi`). */
export const UI_PIPELINE_UNIT = "ui";

/** `chapter/{i}of{n}` — a chapter's own deterministic slice (`ChapterEntry.subUnitCount`). */
const SUB_UNIT_ID_PATTERN = /^([a-z0-9-]+)\/([1-9]\d*)of([1-9]\d*)$/;

export interface ParsedSubUnitId {
	chapter: string;
	index: number;
	of: number;
}

/** Parse a `chapter/{i}of{n}` sub-unit id; `undefined` for a bare chapter slug or `"ui"`. */
export function parseSubUnitId(unit: string): ParsedSubUnitId | undefined {
	const match = SUB_UNIT_ID_PATTERN.exec(unit);
	if (match === null) return undefined;
	const [, chapter, index, of] = match;
	if (chapter === undefined || index === undefined || of === undefined) return undefined;
	return { chapter, index: Number(index), of: Number(of) };
}

function subUnitCountForChapter(slug: string): number {
	return CHAPTERS.find((chapter) => chapter.slug === slug)?.subUnitCount ?? 1;
}

/**
 * Pipeline unit ids owned by ONE registered chapter: the bare slug for a
 * chapter whose `subUnitCount` is 1 (default, most chapters), or
 * `slug/1ofN`..`slug/NofN` (`ChapterEntry.subUnitCount`, `pipeline.ts`'s
 * `renderAll` and the chapter's own `generate` share this same 1-based,
 * index-modulo-of convention — `ChapterSlice`/`inChapterSlice` in
 * `chapters/chapter-types.ts`).
 */
export function unitsForChapter(slug: string): string[] {
	const of = subUnitCountForChapter(slug);
	if (of <= 1) return [slug];
	return Array.from({ length: of }, (_, i) => `${slug}/${i + 1}of${of}`);
}

export function pipelineUnitIds(): string[] {
	return [...CHAPTERS.flatMap((chapter) => unitsForChapter(chapter.slug)), UI_PIPELINE_UNIT];
}
