// Shared chapter-generator vocabulary (`src/chapters/index.ts`'s registry
// contract): one summary row per authored unit. Coverage now comes from
// executable test declarations in `ledger/<chapter>.md` and
// `fixtures/coverage.md`. Originally declared inline in
// `playing-the-game/index.ts`
// (the only chapter that existed); promoted here, unchanged in shape but with
// `kind` WIDENED from a two-literal union to a bare row-kind string, when the
// Equipment chapter's own units (`entity_definitions`/
// `modifier_target_definitions`/`modifier_templates`) needed the same
// contract — `ChapterEntry.generate`'s return type is shared across every
// registered chapter, so the summary shape can't stay scoped to one
// chapter's own row-kind vocabulary.
export interface ChapterUnitSummary {
	/** A manifest row kind, e.g. `resource_definitions` / `capability_definitions` / `entity_definitions`. */
	kind: string;
	id: string;
	sourcePk: string;
}

/**
 * A deterministic 1-based slice of a chapter's own leaf entity list
 * (`pipeline-shards.ts`'s `monsters/1of3` sub-unit ids). A chapter whose
 * `generate` accepts this narrows its per-entity work to `list[i]` where
 * `i % of === index - 1` — the SAME modulo convention `unitsForShard` uses,
 * so a chapter's own slicing composes with the outer pipeline-shard split.
 * Chapters that never register sub-units (most of them) ignore this
 * parameter entirely; passing it to one of those is a no-op.
 */
export interface ChapterSlice {
	/** 1-based slice index. */
	index: number;
	of: number;
}

/** Whether leaf-list index `i` (0-based) belongs to `slice` — `undefined` slice means "everything". */
export function inChapterSlice(i: number, slice: ChapterSlice | undefined): boolean {
	return slice === undefined || i % slice.of === slice.index - 1;
}
