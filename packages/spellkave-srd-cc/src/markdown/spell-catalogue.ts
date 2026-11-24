/**
 * A direct H4 child of Spells > Spell Descriptions is a spell only when its
 * source-owned block starts with the level or cantrip signature. Embedded
 * stat-block headings such as "Actions" and "Traits" therefore remain in
 * their owning spell's prose.
 */
export function isSpellCatalogueEntry(text: string, headingEnd: number): boolean {
	return /^\r?\n\r?\n(?:_Level \d|_[^\r\n]* Cantrip \()/.test(text.slice(headingEnd));
}
