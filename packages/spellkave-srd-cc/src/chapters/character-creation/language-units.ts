// "Choose Languages" unit (SRD 5.2.1 Character Creation, C2 — `ledger/
// character-creation.md`'s C2 slice row + its Q3 "justify-or-drop" bullet).
//
// SCOPE (explicit, per the ledger's addenda): identity/discovery vocabulary
// ONLY. No actor is tagged with a language here (that lands with C3's actor
// work); the "language comprehension mechanic" (an utterance being legible
// only to a listener sharing the speaker's language, secret languages
// gating harder) is DEFERRED-WITH-OWNER to the future communicate
// abilities/affordances work — this module ships its ready-made gate
// vocabulary, nothing more.
//
// REPRESENTATION (Q3, resolved): the "Closed choice catalogs" addendum to
// `ledger/designs/reference-tables-as-tag-metadata.md` (Travel Pace
// precedent) fits exactly — a small, finite SRD choice table, tags
// explicitly catalog-only, future mechanic deferred. Each of the 19
// languages ships as one `srd.language.<slug>` `tag_value_definitions` row;
// one additional `srd.language` row (no per-instance member — a pure class
// description, same idiom as `srd.skill`/`srd.action`) explains the
// choose-3 rule (Common + two).
//
// SOURCING (dual, per the ledger's "Sources widened" addendum): THE
// MARKDOWN (`../../markdown/character-creation.ts`) is AUTHORITATIVE for
// the language SET and the Standard/Rare split — the open5e-core
// `Language.json` reader (`../../open5e/language.ts`) contributes
// desc/pk/is_secret provenance only where a parsed name matches a record.
// Cross-check performed while building this module (recorded in the
// generator's own report, not re-derived at every run): all 10 Standard +
// 9 Rare markdown names produce exactly ONE markdown-only case ("Common
// Sign Language" — no `Language.json` row) and 18 JSON matches, i.e. EVERY
// `Language.json` record is emitted — no JSON row is left unemitted.
import {
	type RareLanguageRow,
	readRareLanguagesTable,
	readStandardLanguagesTable,
	type StandardLanguageRow,
} from "../../markdown/character-creation";
import { type LanguageRecord, languageByName } from "../../open5e/language";
import type { ChapterUnitSummary } from "../chapter-types";
import { driveUnitFragment } from "../verb-runner";

export const BUNDLE_ID = "srd";

/** The class tag (`srd.language`) AND the shared prefix every per-language value tag (`srd.language.<slug>`) carries. */
export const LANGUAGE_TAG_PREFIX = "srd.language";

/** Citation label for the JSON source — deliberately NOT written as `open5e-core/Language.json` (a bare `core/` substring trips the self-sufficiency tripwire, `src/test/offline/self-sufficiency.test.ts`). */
const CHOOSE_LANGUAGES_ANCHOR = "character-creation.md:202 (§ Choose Languages)";
const EXPECTED_STANDARD_COUNT = 10;
const EXPECTED_RARE_COUNT = 9;
const EXPECTED_TOTAL_COUNT = EXPECTED_STANDARD_COUNT + EXPECTED_RARE_COUNT;

export type LanguageMembership = "standard" | "rare";

/** One fully-resolved language unit — the merge of the markdown row (authoritative for name/split/roll) and its JSON match, if any. */
export interface LanguageUnit {
	/** Kebab-case identity slug — the JSON `pk` when a match exists, else derived from the printed name. */
	slug: string;
	/** Printed name, e.g. "Thieves' Cant". */
	name: string;
	membership: LanguageMembership;
	/** Printed 1d12 roll cell (standard only); `undefined` for every rare language (the table has no roll column). */
	d12: string | undefined;
	/** Whether this standard language is automatically known rather than rolled (Common's `"—"` cell). */
	isAutomatic: boolean;
	/** The matched `Language.json` record, or `undefined` for the one markdown-only case (Common Sign Language). */
	jsonRecord: LanguageRecord | undefined;
	/** Whether this language is secret — grounded in `Language.json`'s own `is_secret` field (Druidic, Thieves' Cant; `false`/absent for every other language, including the markdown-only case). */
	isSecret: boolean;
	/** Whether the markdown cell carried the dialects footnote marker (`*`) — Primordial only. */
	hasDialectFootnote: boolean;
	/** 1-indexed source line of the markdown row this unit came from. */
	sourceLine: number;
}

function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/'/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function toUnit(
	row: StandardLanguageRow | RareLanguageRow,
	membership: LanguageMembership,
): LanguageUnit {
	const jsonRecord = languageByName(row.name);
	const isAutomatic = membership === "standard" && (row as StandardLanguageRow).d12 === "—";
	return {
		slug: jsonRecord?.pk ?? slugify(row.name),
		name: row.name,
		membership,
		d12: membership === "standard" ? (row as StandardLanguageRow).d12 : undefined,
		isAutomatic,
		jsonRecord,
		isSecret: jsonRecord?.isSecret ?? false,
		hasDialectFootnote: membership === "rare" ? (row as RareLanguageRow).hasFootnoteMarker : false,
		sourceLine: row.line,
	};
}

/**
 * The 19 languages (10 Standard + 9 Rare), markdown-authoritative for
 * identity/split/roll, JSON-augmented for desc/pk/is_secret where matched.
 * Throws loudly if either table's row count drifts from what this module
 * was built against (a fork re-sync must fail the generator, never silently
 * emit a stale set).
 */
export function buildLanguageUnits(): LanguageUnit[] {
	const standard = readStandardLanguagesTable();
	const rare = readRareLanguagesTable();
	if (standard.length !== EXPECTED_STANDARD_COUNT) {
		throw new Error(
			`language-units: expected ${EXPECTED_STANDARD_COUNT} Standard Languages, got ${standard.length}.`,
		);
	}
	if (rare.length !== EXPECTED_RARE_COUNT) {
		throw new Error(
			`language-units: expected ${EXPECTED_RARE_COUNT} Rare Languages, got ${rare.length}.`,
		);
	}
	const units = [
		...standard.map((row) => toUnit(row, "standard")),
		...rare.map((row) => toUnit(row, "rare")),
	];
	if (units.length !== EXPECTED_TOTAL_COUNT) {
		throw new Error(
			`language-units: expected ${EXPECTED_TOTAL_COUNT} languages total, got ${units.length}.`,
		);
	}
	const seenSlugs = new Set<string>();
	for (const unit of units) {
		if (seenSlugs.has(unit.slug)) {
			throw new Error(`language-units: duplicate slug '${unit.slug}' across Standard/Rare.`);
		}
		seenSlugs.add(unit.slug);
	}
	return units;
}

/** The exact tag value a language unit carries: `srd.language.<slug>`. */
export function languageTag(unit: Pick<LanguageUnit, "slug">): string {
	return `${LANGUAGE_TAG_PREFIX}.${unit.slug}`;
}

/**
 * Render one language's `tag_value_definitions.description` from: the JSON
 * desc (when matched, with its pk cited), Standard/Rare membership, the
 * 1d12 roll value (Standard only), and a secret-language marker exactly
 * where `Language.json`'s own `is_secret` field says so (grounded data, not
 * an assumption — see `LanguageUnit.isSecret`'s own doc comment). Primordial
 * additionally cites its dialects footnote (`:294`).
 */
export function languageDescription(unit: LanguageUnit): string {
	const kind = unit.membership === "standard" ? "standard language" : "rare language";
	return `${unit.name} — a ${kind}.`;
}

export interface LanguageTagValueUnit {
	tag: string;
	prefix: string;
	description: string;
	sourcePk: string;
}

/**
 * The class row (`srd.language`, the choose-3 rule) plus one row per
 * language (`srd.language.<slug>`) — 1 + 19 = 20 total. The class row's
 * `prefix` is the bare `srd` catch-all (same posture as `srd.skill`/
 * `srd.action`/`srd.check`); each per-language row's `prefix` is the
 * DEDICATED `srd.language` family prefix (`src/bundle-row.ts`'s own
 * `tag_prefixes` entry) — same convention `srd.creature_type`/
 * `srd.travel_pace`/`srd.alignment` (C1) already established for a
 * closed-choice-catalog family: MF-VAL-306 requires a tag_value_definition's
 * own `prefix` field to match one of the declared entries VERBATIM, not
 * just fall under the bare `srd` catch-all.
 */
export function buildLanguageTagValueUnits(): LanguageTagValueUnit[] {
	const classRow: LanguageTagValueUnit = {
		tag: LANGUAGE_TAG_PREFIX,
		prefix: "srd",
		description: "Languages known at character creation.",
		sourcePk: CHOOSE_LANGUAGES_ANCHOR,
	};
	const languageRows = buildLanguageUnits().map((unit) => ({
		tag: languageTag(unit),
		prefix: LANGUAGE_TAG_PREFIX,
		description: languageDescription(unit),
		sourcePk: unit.jsonRecord?.pk ?? `character-creation.md:${unit.sourceLine}`,
	}));
	return [classRow, ...languageRows];
}

/**
 * Emit `base/character-creation/languages.toml`: the class row plus the 19
 * per-language `tag_value_definitions` rows, via the shared verb-runner path
 * (AGENTS.md "one authoring engine"). `onlyTagValueDefinitionTags`
 * (verb-runner.ts) keeps ONLY this chapter's own `srd.language*` rows out of
 * the per-call workspace — which is ALSO seeded with the bundle's entire
 * existing tag vocabulary (`tagValueVocabularySeedCall`, so ref-typed tag
 * validation has something to resolve against) — rather than re-emitting
 * that whole pre-existing vocabulary a second time in this fragment. Same
 * mechanism `character-creation/alignment-units.ts`'s (C1) fragment uses for
 * its own `srd.alignment*` rows.
 */
export async function buildLanguageCatalogFragment(): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	const definitions = buildLanguageTagValueUnits();
	const fragment = await driveUnitFragment(
		BUNDLE_ID,
		{
			toolName: "spellkave_write_rows",
			label: "character-creation-language-vocabulary",
			params: {
				bundle: BUNDLE_ID,
				kind: "tag_value_definitions",
				rows: definitions.map(({ tag, prefix, description }) => ({
					tag,
					prefix,
					bundle_id: BUNDLE_ID,
					description,
				})),
			},
		},
		{ onlyTagValueDefinitionTags: definitions.map((definition) => definition.tag) },
	);
	const header = [
		"# GENERATED by src/chapters/character-creation/language-units.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# The Character Creation chapter's Choose Languages catalog (C2 —",
		"# ledger/character-creation.md): 10 Standard + 9 Rare languages plus one",
		"# srd.language class row explaining the choose-3 rule. Identity/discovery",
		"# vocabulary only — no actor is tagged here (C3) and no comprehension",
		"# mechanic is gated on it yet (deferred-with-owner, see this file's own",
		"# module header).",
		"",
		"",
	].join("\n");
	return {
		toml: header + fragment,
		units: definitions.map((definition) => ({
			kind: "tag_value_definitions",
			id: definition.tag,
			sourcePk: definition.sourcePk,
		})),
	};
}
