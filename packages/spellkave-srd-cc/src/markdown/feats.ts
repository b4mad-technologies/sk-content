// Reader for `cache/markdown/feats.md`'s four category sections (Origin
// `:19-57`, General `:59-81`, Fighting Style `:83-107`, Epic Boon `:109-183`
// — `ledger/feats.md`'s "Sources" note). Extracts, per feat, the ordered
// `_Label._` bold-italic sub-headings printed under its `#### <Name>` block
// (e.g. Alert's `_Initiative Proficiency._` / `_Initiative Swap._`) and
// whether a trailing `_Repeatable._` sub-heading is present.
//
// WHY THIS EXISTS (not just `Feat.json`/`FeatBenefit.json`): `FeatBenefit.
// json`'s own `name` field is untrustworthy in two ways `ledger/feats.md`
// pins — Savage Attacker's and Skilled's solo benefit rows carry an EMPTY
// name (`""`), and Magic Initiate's second benefit row is misnamed "Level
// One Spell" where the markdown heading reads "Level 1 Spell" (`:39`). This
// reader gives `../chapters/feats/feats-units.ts` the markdown's own heading
// text so it can prefer that over an empty/wrong JSON name — never by
// hardcoding the ONE known divergence, but by parsing every category's own
// section generically.
//
// F2 (Feats quick-win completion): generalized from the original Origin-only
// reader to cover all four `### <Category> Feats` sections in one pass —
// `feats.md`'s own category headings match `Feat.json`'s own `type` field
// exactly (`"General"`, `"Fighting Style"`, `"Epic Boon"`), so `category`
// below is read straight off the heading text, never hand-typed.
// `readOriginFeatSections`/`originFeatSectionByName` stay as thin filters
// over the general reader — F1's own call sites are untouched.
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_MARKDOWN_DIR } from "./paths";

/** One `#### <FeatName>` block, parsed from one of `feats.md`'s four category subsections. */
export interface FeatSection {
	/** The `####` heading text, e.g. `"Magic Initiate"`. */
	name: string;
	/** The enclosing `### <Category> Feats` heading's own category, e.g. `"Origin"` / `"General"` / `"Fighting Style"` / `"Epic Boon"` — matches `Feat.json`'s own `type` field verbatim. */
	category: string;
	/** Ordered `_Label._` sub-heading texts, EXCLUDING a trailing `_Repeatable._` (surfaced separately below). */
	benefitLabels: string[];
	/** Whether this feat's block carries a `_Repeatable._` sub-heading. */
	repeatable: boolean;
	/** The `_Repeatable._` sub-heading's own body text, when present. */
	repeatableText: string | undefined;
}

/** @deprecated kept for the F1 call sites' own naming — identical shape to {@link FeatSection}. */
export type OriginFeatSection = FeatSection;

const CATEGORY_HEADING_PATTERN = /^### (.+) Feats$/gm;
const FEAT_HEADING_PATTERN = /^#### (.+)$/gm;
const SUB_HEADING_PATTERN = /^_([^_]+)\._\s*(.*)$/gm;

/**
 * Parse every `#### <Name>` block across ALL FOUR of `feats.md`'s `###
 * <Category> Feats` sections. Throws loudly if no category heading or no
 * feat heading is found — a fork re-sync that reworks this chapter must fail
 * the generator, not silently emit stale data.
 */
export function readAllFeatSections(): FeatSection[] {
	const filePath = path.join(CACHE_MARKDOWN_DIR, "feats.md");
	const content = readFileSync(filePath, "utf8");

	const categoryMatches = [...content.matchAll(CATEGORY_HEADING_PATTERN)];
	if (categoryMatches.length === 0) {
		throw new Error(
			`feats markdown reader: no '### <Category> Feats' headings found in ${filePath} — the chapter's own category sections may have been reworded upstream.`,
		);
	}
	function categoryFor(index: number): string {
		let current: string | undefined;
		for (const match of categoryMatches) {
			if ((match.index ?? 0) > index) break;
			current = match[1]?.trim();
		}
		if (current === undefined) {
			throw new Error(
				`feats markdown reader: heading at index ${index} precedes every category heading.`,
			);
		}
		return current;
	}

	const headingMatches = [...content.matchAll(FEAT_HEADING_PATTERN)];
	if (headingMatches.length === 0) {
		throw new Error("feats markdown reader: no '#### <Name>' Feat headings parsed.");
	}

	return headingMatches.map((headingMatch, index) => {
		const name = headingMatch[1]?.trim();
		if (name === undefined || name.length === 0) {
			throw new Error(`feats markdown reader: empty Feat heading at match ${index}.`);
		}
		const blockStart = (headingMatch.index ?? 0) + headingMatch[0].length;
		const nextHeadingMatch = headingMatches[index + 1];
		const blockEnd =
			nextHeadingMatch === undefined ? content.length : (nextHeadingMatch.index ?? content.length);
		const block = content.slice(blockStart, blockEnd);

		const subHeadings = [...block.matchAll(SUB_HEADING_PATTERN)].map((match) => ({
			label: (match[1] ?? "").trim(),
			text: (match[2] ?? "").trim(),
		}));

		const repeatableEntry = subHeadings.find((entry) => entry.label === "Repeatable");
		const benefitLabels = subHeadings
			.filter((entry) => entry.label !== "Repeatable")
			.map((entry) => entry.label);

		return {
			name,
			category: categoryFor(headingMatch.index ?? 0),
			benefitLabels,
			repeatable: repeatableEntry !== undefined,
			repeatableText: repeatableEntry?.text,
		};
	});
}

/** Look up ONE Feat section (any category) by its exact `#### <Name>` heading text. Throws loudly if absent. */
export function featSectionByName(name: string): FeatSection {
	const section = readAllFeatSections().find((candidate) => candidate.name === name);
	if (section === undefined) {
		throw new Error(`feats markdown reader: no Feat section named '${name}'.`);
	}
	return section;
}

/** F1's own Origin-only view — filters {@link readAllFeatSections}, never a second parse. */
export function readOriginFeatSections(): OriginFeatSection[] {
	return readAllFeatSections().filter((section) => section.category === "Origin");
}

/** F1's own Origin-only lookup — same behavior as before generalization, now delegating to {@link featSectionByName}. */
export function originFeatSectionByName(name: string): OriginFeatSection {
	const section = featSectionByName(name);
	if (section.category !== "Origin") {
		throw new Error(
			`feats markdown reader: Feat section '${name}' is category '${section.category}', not 'Origin'.`,
		);
	}
	return section;
}
