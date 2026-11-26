import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	buildChampionFeatureUnits,
	buildFighterFeatureUnits,
} from "../../chapters/classes/fighter-units";
import { buildRemainingClassFeatureGroups } from "../../chapters/classes/remaining-classes-units";
import { CACHE_MARKDOWN_DIR } from "../../markdown/paths";
import { canonicalClassFeatureText } from "../../text/class-feature-canonical";
import { normalizeWhitespace } from "../../text/normalize";
import { open5eRows } from "../../text/open5e";

function references(): Array<{
	unit: { sourcePk: string; slug: string };
	className: string;
	parentPk: string;
	subclassName?: string;
}> {
	const groups = buildRemainingClassFeatureGroups();
	return [
		...buildFighterFeatureUnits().map((unit) => ({
			unit,
			className: "Fighter",
			parentPk: "srd-2024_fighter",
		})),
		...buildChampionFeatureUnits().map((unit) => ({
			unit,
			className: "Fighter",
			parentPk: "srd-2024_champion",
			subclassName: "Champion",
		})),
		...groups.flatMap((group) => [
			...group.classFeatures.map((unit) => ({
				unit,
				className: group.classDisplayName,
				parentPk: group.classSourcePk,
			})),
			...group.subclassFeatures.map((unit) => ({
				unit,
				className: group.classDisplayName,
				parentPk: group.subclassSourcePk,
				subclassName: group.subclassDisplayName,
			})),
		]),
	];
}

describe("canonical class-feature reference text", () => {
	it("maps every exact compiler feature identity to one scoped canonical block", () => {
		const mapped = references().map(({ unit, className, parentPk, subclassName }) => ({
			unit,
			extracted: canonicalClassFeatureText({
				sourcePk: unit.sourcePk,
				parentPk,
				featureSlug: unit.slug,
				className,
				...(subclassName ? { subclassName } : {}),
			}),
		}));
		expect(mapped).toHaveLength(open5eRows("ClassFeature.json").length);
		expect(new Set(mapped.map(({ unit }) => unit.sourcePk)).size).toBe(mapped.length);
		for (const { extracted } of mapped) {
			expect(extracted.source).toMatch(/^cache\/markdown\/classes\.md:\d+-\d+$/);
			expect(extracted.text).not.toBe("");
			expect(extracted.text).not.toBe("[Column data]");
		}
		expect(
			open5eRows("ClassFeature.json").filter((row) => row.fields.desc === "[Column data]"),
		).toHaveLength(98);
	});

	it("reconstructs prose from each cited canonical source span", () => {
		const source = readFileSync(path.join(CACHE_MARKDOWN_DIR, "classes.md"), "utf8").split(/\r?\n/);
		for (const { unit, className, parentPk, subclassName } of references()) {
			const extracted = canonicalClassFeatureText({
				sourcePk: unit.sourcePk,
				parentPk,
				featureSlug: unit.slug,
				className,
				...(subclassName ? { subclassName } : {}),
			});
			if (!extracted.text.startsWith("####") && !extracted.text.startsWith("###")) continue;
			const range = /:(\d+)-(\d+)$/.exec(extracted.source);
			expect(range, extracted.source).not.toBeNull();
			const start = Number(range?.[1]);
			const end = Number(range?.[2]);
			expect(normalizeWhitespace(source.slice(start - 1, end).join("\n"))).toBe(extracted.text);
		}
	});

	it("keeps repeated headings scoped by parent and explicit level", () => {
		const mapped = references();
		const barbarian = mapped.find(
			({ unit }) => unit.sourcePk === "srd-2024_barbarian_improved-brutal-strike",
		);
		const enhanced = mapped.find(
			({ unit }) => unit.sourcePk === "srd-2024_barbarian_improved-brutal-strike-enhanced",
		);
		expect(barbarian).toBeDefined();
		expect(enhanced).toBeDefined();
		const first = canonicalClassFeatureText({
			sourcePk: barbarian?.unit.sourcePk ?? "",
			parentPk: "srd-2024_barbarian",
			featureSlug: barbarian?.unit.slug ?? "",
			className: "Barbarian",
		});
		const second = canonicalClassFeatureText({
			sourcePk: enhanced?.unit.sourcePk ?? "",
			parentPk: "srd-2024_barbarian",
			featureSlug: enhanced?.unit.slug ?? "",
			className: "Barbarian",
		});
		expect(first.text).toContain("#### Level 13: Improved Brutal Strike");
		expect(second.text).toContain("#### Level 17: Improved Brutal Strike");
		expect(first.source).not.toBe(second.source);
	});

	it("never resolves a feature from the wrong parent scope", () => {
		expect(() =>
			canonicalClassFeatureText({
				sourcePk: "srd-2024_path-of-the-berserker_frenzy",
				parentPk: "srd-2024_path-of-the-berserker",
				featureSlug: "frenzy",
				className: "Barbarian",
			}),
		).toThrow(/found 0/);
		expect(() =>
			canonicalClassFeatureText({
				sourcePk: "srd-2024_barbarian_rage",
				parentPk: "srd-2024_barbarian",
				featureSlug: "rage",
				className: "Barbarian",
				subclassName: "Path of the Berserker",
			}),
		).toThrow(/found 0/);
	});

	it("retains canonical prose omitted or corrupted by cached feature descriptions", () => {
		const cases = [
			[
				"srd-2024_fighter_champion_remarkable-athlete",
				"srd-2024_champion",
				"fighter/champion/remarkable-athlete",
				"Fighter",
				"Champion",
				"half your Speed",
			],
			[
				"srd-2024_fighter_indomitable",
				"srd-2024_fighter",
				"fighter/indomitable",
				"Fighter",
				undefined,
				"three times before a Long Rest",
			],
			[
				"srd-2024_druid_circle-of-the-land_natures-sanctuary",
				"srd-2024_circle-of-the-land",
				"druid/circle-of-the-land/natures-sanctuary",
				"Druid",
				"Circle of the Land",
				"spectral trees and vines",
			],
		] as const;
		for (const [sourcePk, parentPk, featureSlug, className, subclassName, expected] of cases) {
			expect(
				canonicalClassFeatureText({
					sourcePk,
					parentPk,
					featureSlug: featureSlug.split("/").at(-1) ?? featureSlug,
					className,
					...(subclassName ? { subclassName } : {}),
				}).text,
			).toContain(expected);
		}
	});

	it("uses canonical parent tables for structural feature rows", () => {
		const structural = canonicalClassFeatureText({
			sourcePk: "srd-2024_fighter_weapon-mastery-count",
			parentPk: "srd-2024_fighter",
			featureSlug: "weapon-mastery-count",
			className: "Fighter",
		});
		expect(structural.text).toContain("**Fighter Features — Weapon Mastery**");
		expect(structural.text).toContain("| Level | Weapon Mastery |");
		expect(structural.text).toContain("Weapon Mastery");
	});
});
