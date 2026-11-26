// Offline proof for the Character Creation chapter's Choose Languages unit
// (C2, `ledger/character-creation.md`): the markdown-authoritative set/split,
// the JSON-augmented descriptions, and the secret-language markers — pinned
// exactly, not re-derived loosely, per this package's "rules are cited,
// never remembered" invariant.
import { describe, expect, it } from "vitest";
import {
	buildLanguageTagValueUnits,
	buildLanguageUnits,
	LANGUAGE_TAG_PREFIX,
	languageDescription,
	languageTag,
} from "../../chapters/character-creation/language-units";
import { readLanguages } from "../../open5e/language";
import {
	expectedLanguageIdentities,
	expectedRareLanguageSlugs,
	expectedSecretLanguageSlugs,
	expectedStandardLanguageSlugs,
	LANGUAGE_CLASS_TAG,
} from "../shared/identity-expectations";

describe("readLanguages (cache/open5e-core/Language.json)", () => {
	it("reads exactly 18 records", () => {
		expect(readLanguages()).toHaveLength(18);
	});

	it("flags exactly Druidic and Thieves' Cant as secret (is_secret=true)", () => {
		const secret = readLanguages()
			.filter((record) => record.isSecret)
			.map((record) => record.pk)
			.sort();
		expect(secret).toEqual(["druidic", "thieves-cant"]);
	});
});

describe("buildLanguageUnits (markdown-authoritative set/split, JSON-augmented)", () => {
	it("returns exactly 10 standard + 9 rare = 19 languages", () => {
		const units = buildLanguageUnits();
		expect(units).toHaveLength(19);
		expect(units.filter((u) => u.membership === "standard")).toHaveLength(10);
		expect(units.filter((u) => u.membership === "rare")).toHaveLength(9);
	});

	it("has exactly ONE markdown-only language (no Language.json match): Common Sign Language", () => {
		const markdownOnly = buildLanguageUnits().filter((u) => u.jsonRecord === undefined);
		expect(markdownOnly.map((u) => u.name)).toEqual(["Common Sign Language"]);
	});

	it("emits every one of the 18 Language.json records (none left unemitted)", () => {
		const emittedPks = buildLanguageUnits()
			.map((u) => u.jsonRecord?.pk)
			.filter((pk): pk is string => pk !== undefined)
			.sort();
		const allPks = readLanguages()
			.map((r) => r.pk)
			.sort();
		expect(emittedPks).toEqual(allPks);
	});

	it("Common is standard, automatically known (no roll)", () => {
		const common = buildLanguageUnits().find((u) => u.slug === "common");
		expect(common?.membership).toBe("standard");
		expect(common?.isAutomatic).toBe(true);
		expect(common?.d12).toBe("—");
	});

	it("marks only Druidic and Thieves' Cant secret, grounded in Language.json's own is_secret field", () => {
		const secret = buildLanguageUnits()
			.filter((u) => u.isSecret)
			.map((u) => u.slug)
			.sort();
		expect(secret).toEqual(["druidic", "thieves-cant"]);
	});

	it("marks only Primordial with the dialects footnote", () => {
		const footnoted = buildLanguageUnits().filter((u) => u.hasDialectFootnote);
		expect(footnoted.map((u) => u.slug)).toEqual(["primordial"]);
	});
});

describe("languageDescription", () => {
	it("is a short language identity without compiler provenance", () => {
		for (const unit of buildLanguageUnits()) {
			const description = languageDescription(unit);
			expect(description).toBe(
				`${unit.name} — a ${unit.membership === "standard" ? "standard" : "rare"} language.`,
			);
			expect(description).not.toContain("pk=");
			expect(description).not.toContain("Source:");
			expect(description).not.toContain("core/");
		}
	});
});

describe("buildLanguageTagValueUnits", () => {
	it("authors exactly 1 class row (bare 'srd' prefix) + 19 language rows (dedicated 'srd.language' prefix) = 20", () => {
		const definitions = buildLanguageTagValueUnits();
		expect(definitions).toHaveLength(20);
		const classRow = definitions.find((d) => d.tag === LANGUAGE_TAG_PREFIX);
		expect(classRow?.prefix).toBe("srd");
		const languageRows = definitions.filter((d) => d.tag !== LANGUAGE_TAG_PREFIX);
		expect(languageRows).toHaveLength(19);
		expect(languageRows.every((d) => d.prefix === LANGUAGE_TAG_PREFIX)).toBe(true);
		expect(definitions[0]?.tag).toBe(LANGUAGE_TAG_PREFIX);
	});

	it("the class row is a short identity without compiler provenance", () => {
		const classRow = buildLanguageTagValueUnits().find((d) => d.tag === LANGUAGE_TAG_PREFIX);
		expect(classRow?.description).toBe("Languages known at character creation.");
		expect(classRow?.description).not.toContain("Source:");
	});

	it("every language row's tag matches languageTag(unit) for the same unit", () => {
		const units = buildLanguageUnits();
		const tags = buildLanguageTagValueUnits()
			.filter((d) => d.tag !== LANGUAGE_TAG_PREFIX)
			.map((d) => d.tag)
			.sort();
		expect(tags).toEqual(units.map((u) => languageTag(u)).sort());
	});

	it("the class row's tag matches the shared LANGUAGE_CLASS_TAG constant (identity-expectations.ts)", () => {
		expect(LANGUAGE_TAG_PREFIX).toBe(LANGUAGE_CLASS_TAG);
	});
});

/**
 * Cross-check against `src/test/shared/identity-expectations.ts` — the same
 * single-source-of-truth discipline `ability`/`skill` identity already
 * follows (that file's own header comment): a future live-preseeded suite
 * consumes these exact helpers rather than re-deriving its own literal set.
 */
describe("identity-expectations.ts language helpers", () => {
	it("expectedStandardLanguageSlugs/expectedRareLanguageSlugs partition the 19 languages 10/9", () => {
		expect(expectedStandardLanguageSlugs()).toEqual(
			buildLanguageUnits()
				.filter((u) => u.membership === "standard")
				.map((u) => u.slug),
		);
		expect(expectedRareLanguageSlugs()).toEqual(
			buildLanguageUnits()
				.filter((u) => u.membership === "rare")
				.map((u) => u.slug),
		);
		expect(expectedStandardLanguageSlugs()).toHaveLength(10);
		expect(expectedRareLanguageSlugs()).toHaveLength(9);
	});

	it("expectedSecretLanguageSlugs pins exactly Druidic and Thieves' Cant", () => {
		expect(expectedSecretLanguageSlugs().sort()).toEqual(["druidic", "thieves-cant"]);
	});

	it("expectedLanguageIdentities carries a tag per slug, matching languageTag(unit)", () => {
		for (const expectation of expectedLanguageIdentities()) {
			expect(expectation.tag).toBe(`${LANGUAGE_TAG_PREFIX}.${expectation.slug}`);
		}
		expect(expectedLanguageIdentities()).toHaveLength(19);
	});
});
