import { readFileSync } from "node:fs";
import path from "node:path";

import { loadBundleChainDetailed } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";

import { buildSpellUnits } from "../../chapters/spells/spell-units";
import { normalizeWhitespace } from "../../text";

const FIXTURES = path.join(import.meta.dirname, "../../../fixtures");
const SPELLS_MARKDOWN = path.join(FIXTURES, "../cache/markdown/spells.md");

function spellBoundary(lines: readonly string[], start: number): number {
	for (let index = start + 1; index < lines.length; index += 1) {
		if (!lines[index]?.startsWith("#### ")) continue;
		const signature = `${lines[index + 1] ?? ""}\n${lines[index + 2] ?? ""}`;
		if (/^\n(?:_Level \d|_[^\n]* Cantrip \()/.test(signature)) return index;
	}
	return lines.length;
}

/** Independent source oracle. It recognizes the cached spell level/cantrip
 * signature, so stat-block H2/H4 headings stay inside their owning spell. */
function canonicalSpellBlock(
	lines: readonly string[],
	title: string,
): { text: string; source: string } {
	const matches = lines.flatMap((line, index) => (line === `#### ${title}` ? [index] : []));
	if (matches.length !== 1) {
		throw new Error(
			`test source oracle: '${title}' has ${matches.length} exact H4 spell headings.`,
		);
	}
	const start = matches[0];
	if (start === undefined) throw new Error(`test source oracle: '${title}' is missing.`);
	let end = spellBoundary(lines, start);
	while (end > start + 1 && (lines[end - 1] ?? "").trim() === "") end -= 1;
	return {
		text: normalizeWhitespace(lines.slice(start, end).join("\n")),
		source: `cache/markdown/spells.md:${start + 1}-${end}`,
	};
}

function sourceSpellNames(lines: readonly string[]): string[] {
	return lines.flatMap((line, index) => {
		if (!line.startsWith("#### ")) return [];
		const signature = `${lines[index + 1] ?? ""}\n${lines[index + 2] ?? ""}`;
		return /^\n(?:_Level \d|_[^\n]* Cantrip \()/.test(signature) ? [line.slice(5)] : [];
	});
}

function spellAttachments(): Map<string, { text: string; source: string; license: string }> {
	const manifest = loadBundleChainDetailed({
		rootManifestPath: path.join(FIXTURES, "manifest.toml"),
		resolveDependency: () => undefined,
	}).manifest;
	return new Map(
		(manifest.metadata_attachments as Array<Record<string, unknown>>)
			.filter(
				(row) =>
					row.namespace === "srd.text" &&
					typeof row.target_ref === "string" &&
					row.target_ref.startsWith("srd/spell/") &&
					typeof row.payload_json === "string",
			)
			.map((row) => [
				row.target_ref as string,
				JSON.parse(row.payload_json as string) as { text: string; source: string; license: string },
			]),
	);
}

describe("canonical SRD spell text", () => {
	it("publishes all 339 exact canonical spell blocks without losing embedded stat blocks", () => {
		const lines = readFileSync(SPELLS_MARKDOWN, "utf8").split(/\r?\n/);
		const units = buildSpellUnits();
		expect(units).toHaveLength(339);
		expect(sourceSpellNames(lines).sort()).toEqual(units.map((unit) => unit.displayName).sort());
		for (const unit of units) {
			expect(unit.verbatim).toEqual(canonicalSpellBlock(lines, unit.displayName));
		}

		for (const [name, statBlock] of [
			["Find Steed", "## Otherworldly Steed"],
			["Giant Insect", "## Giant Insect"],
			["Summon Dragon", "## Draconic Spirit"],
		] as const) {
			const unit = units.find((candidate) => candidate.displayName === name);
			expect(unit?.verbatim.text).toContain(statBlock);
			expect(unit?.verbatim.text).toContain("#### Actions");
		}
	});

	// sk-content: needs the held SRD flavor texts (PROVENANCE.md).
	it.skip("uses authored flavor blurbs, not the SRD first sentence", () => {
		for (const unit of buildSpellUnits()) {
			expect(unit.description.length, unit.slug).toBeGreaterThan(40);
			expect(unit.description, unit.slug).not.toMatch(
				/\b(1st-level|2nd-level|3rd-level|Cantrip)\b/,
			);
			expect(unit.description, unit.slug).not.toMatch(/\b\d+d\d+\b/);
		}
	});

	// sk-content: needs the held SRD flavor texts (PROVENANCE.md).
	it.skip("keeps every generated spell runtime description equal to the current fixture row", () => {
		const manifest = loadBundleChainDetailed({
			rootManifestPath: path.join(FIXTURES, "manifest.toml"),
			resolveDependency: () => undefined,
		}).manifest;
		const descriptions = new Map(
			(manifest.entity_definitions as Array<Record<string, unknown>>)
				.filter(
					(row) =>
						typeof row.entity_def_id === "string" &&
						row.entity_def_id.startsWith("srd/spell/") &&
						typeof row.description === "string",
				)
				.map((row) => [row.entity_def_id as string, row.description as string]),
		);
		expect(descriptions).toHaveLength(339);
		for (const unit of buildSpellUnits()) {
			expect(unit.description).toBe(descriptions.get(unit.entityId));
		}
	});

	it("renders every canonical spell block into the current fixture attachment with source provenance", () => {
		const attachments = spellAttachments();
		expect(attachments).toHaveLength(339);
		for (const unit of buildSpellUnits()) {
			expect(attachments.get(unit.entityId)).toEqual({
				text: unit.verbatim.text,
				source: unit.verbatim.source,
				license: "CC-BY-4.0",
			});
		}
	});
});
