import { readFileSync } from "node:fs";
import path from "node:path";

import { loadBundleChainDetailed } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";
import { magicItemSrdText } from "../../chapters/magic-items";
import { buildMagicItemUnits } from "../../chapters/magic-items/magic-item-units";
import { normalizeWhitespace } from "../../text";

const FIXTURES = path.join(import.meta.dirname, "../../../fixtures");
const MARKDOWN = path.join(FIXTURES, "../cache/markdown");
const OPEN5E = path.join(FIXTURES, "../cache/open5e");
const markdownLines = new Map<string, string[]>();
let attachmentIndex: Map<string, { text: string; source: string; license: string }> | undefined;
let magicItemDescriptions: Map<string, { name: string; description: string }> | undefined;

const CANONICAL_FEATS = [
	"Alert",
	"Magic Initiate",
	"Savage Attacker",
	"Skilled",
	"Ability Score Improvement",
	"Grappler",
	"Archery",
	"Defense",
	"Great Weapon Fighting",
	"Two-Weapon Fighting",
	"Boon of Combat Prowess",
	"Boon of Dimensional Travel",
	"Boon of Fate",
	"Boon of Irresistible Offense",
	"Boon of Spell Recall",
	"Boon of the Night Spirit",
	"Boon of Truesight",
] as const;

function slug(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

function levelFourHeadings(file: string): string[] {
	const cached = markdownLines.get(file);
	const lines = cached ?? readFileSync(path.join(MARKDOWN, file), "utf8").split(/\r?\n/);
	if (cached === undefined) markdownLines.set(file, lines);
	return lines.flatMap((line) => {
		const match = /^#### (.+)$/.exec(line);
		return match?.[1] === undefined ? [] : [match[1].trim()];
	});
}

/** Test-local source oracle: exact level-four block, through the next heading
 * at the same or higher level. It deliberately does not call the production
 * heading extractor under test. */
function canonicalHeadingBlock(file: string, title: string): { text: string; source: string } {
	const cached = markdownLines.get(file);
	const lines = cached ?? readFileSync(path.join(MARKDOWN, file), "utf8").split(/\r?\n/);
	if (cached === undefined) markdownLines.set(file, lines);
	const start = lines.findIndex((line) => line === `#### ${title}`);
	if (start === -1) throw new Error(`test source oracle: missing '${title}' in ${file}.`);
	let end = lines.length;
	for (let index = start + 1; index < lines.length; index += 1) {
		if (/^#{1,4}\s+\S/.test(lines[index] ?? "")) {
			end = index;
			break;
		}
	}
	while (end > start + 1 && (lines[end - 1] ?? "").trim() === "") end -= 1;
	return {
		text: normalizeWhitespace(lines.slice(start, end).join("\n")),
		source: `cache/markdown/${file}:${start + 1}-${end}`,
	};
}

function textAttachment(targetRef: string): { text: string; source: string; license: string } {
	if (attachmentIndex === undefined) {
		const manifest = loadBundleChainDetailed({
			rootManifestPath: path.join(FIXTURES, "manifest.toml"),
			resolveDependency: () => undefined,
		}).manifest;
		attachmentIndex = new Map(
			(manifest.metadata_attachments as Array<Record<string, unknown>>)
				.filter(
					(row) =>
						row.namespace === "srd.text" &&
						typeof row.target_ref === "string" &&
						typeof row.payload_json === "string",
				)
				.map((row) => [
					row.target_ref as string,
					JSON.parse(row.payload_json as string) as {
						text: string;
						source: string;
						license: string;
					},
				]),
		);
	}
	const payload = attachmentIndex.get(targetRef);
	if (payload === undefined) {
		throw new Error(`test fixture: missing srd.text attachment for ${targetRef}.`);
	}
	return payload;
}

/** Test-local raw-cache reader: validates the exact source field consumed by
 * retained variants without calling the generator's Open5E text extractor. */
function magicItemDescriptionByPk(): Map<string, { name: string; description: string }> {
	if (magicItemDescriptions !== undefined) return magicItemDescriptions;
	const rows = JSON.parse(readFileSync(path.join(OPEN5E, "MagicItem.json"), "utf8")) as unknown[];
	magicItemDescriptions = new Map(
		rows.map((row, index) => {
			const candidate = row as {
				pk?: unknown;
				fields?: { name?: unknown; desc?: unknown };
			};
			if (
				typeof candidate.pk !== "string" ||
				typeof candidate.fields?.name !== "string" ||
				typeof candidate.fields.desc !== "string"
			) {
				throw new Error(`test source oracle: malformed MagicItem.json row ${index}.`);
			}
			return [candidate.pk, { name: candidate.fields.name, description: candidate.fields.desc }];
		}),
	);
	return magicItemDescriptions;
}

describe("canonical SRD source text", () => {
	it("publishes all seventeen complete feat blocks, including benefits omitted by Feat.json", () => {
		const sourceHeadings = levelFourHeadings("feats.md");
		// Keep the source inventory explicit, but derive the checked identity
		// set from the cached chapter so an added or omitted heading fails.
		expect(sourceHeadings).toEqual(CANONICAL_FEATS);
		for (const title of sourceHeadings) {
			const expected = canonicalHeadingBlock("feats.md", title);
			expect(textAttachment(`srd/feat/${slug(title)}`)).toEqual({
				text: expected.text,
				source: expected.source,
				license: "CC-BY-4.0",
			});
		}
	});

	it("classifies canonical magic-item heading coverage without treating a length delta as proof", () => {
		const headings = new Map<string, number>();
		for (const line of readFileSync(path.join(MARKDOWN, "magic-items.md"), "utf8").split(/\r?\n/)) {
			const match = /^#### (.+)$/.exec(line);
			if (match?.[1] === undefined) continue;
			const title = match[1].trim();
			headings.set(title, (headings.get(title) ?? 0) + 1);
		}
		const units = buildMagicItemUnits();
		const exact = units.filter((unit) => headings.get(unit.displayName) === 1);
		const unmatched = units.filter((unit) => !headings.has(unit.displayName));
		const ambiguous = units.filter((unit) => (headings.get(unit.displayName) ?? 0) > 1);
		expect(exact).toHaveLength(206);
		expect(unmatched).toHaveLength(551);
		expect(ambiguous).toHaveLength(0);

		// Exact title matches are intentionally selected from the canonical
		// chapter; unmatched variants remain an explicit future reconciliation
		// set rather than receiving an inferred heading.
		for (const unit of exact) {
			const expected = canonicalHeadingBlock("magic-items.md", unit.displayName);
			expect(textAttachment(unit.entityId)).toEqual({
				text: expected.text,
				source: expected.source,
				license: "CC-BY-4.0",
			});
		}
	});

	it("retains every unmatched magic-item variant as its complete declared Open5E text", () => {
		const headings = new Set(levelFourHeadings("magic-items.md"));
		const declared = magicItemDescriptionByPk();
		const unmatched = buildMagicItemUnits().filter((unit) => !headings.has(unit.displayName));
		expect(unmatched).toHaveLength(551);

		for (const unit of unmatched) {
			const record = declared.get(unit.sourcePk);
			expect(record, `missing declared source for ${unit.entityId}`).toBeDefined();
			expect(record?.name).toBe(unit.displayName);
			expect(textAttachment(unit.entityId)).toEqual({
				text: record?.description,
				source: `cache/open5e/MagicItem.json pk=${unit.sourcePk}`,
				license: "CC-BY-4.0",
			});
		}
	});

	it("rejects an ambiguous canonical magic-item heading instead of silently downgrading it", () => {
		const unit = buildMagicItemUnits().find(
			(candidate) => candidate.slug === "adamantine-armor-breastplate",
		);
		expect(unit).toBeDefined();
		expect(() =>
			magicItemSrdText(unit!, () => {
				throw new Error(
					"srd-text: heading 'Adamantine Armor (Breastplate)' is not unique in cache/markdown/magic-items.md (2 level-4 matches).",
				);
			}),
		).toThrow("is not unique");
	});

	it("repairs Wand of Web from its exact canonical block, not the mismatched Open5e record", () => {
		const expected = canonicalHeadingBlock("magic-items.md", "Wand of Web");
		expect(textAttachment("srd/magic_item/wand-of-web")).toEqual({
			text: expected.text,
			source: expected.source,
			license: "CC-BY-4.0",
		});
		expect(expected.text).toContain("cast _Web_ (save DC 13)");
		expect(expected.text).not.toContain('Command ("flee" or "grovel" only)');
	});
});
