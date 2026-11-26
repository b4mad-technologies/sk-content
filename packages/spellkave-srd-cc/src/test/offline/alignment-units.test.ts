// Offline proof for "The Nine Alignments" catalog vocabulary
// (character-creation.md:542-568, slice C1 — `ledger/character-creation.md`).
// Same posture as `creature-type-units.test.ts`: pins the exact 9-member set,
// at least one description verbatim against the JSON source, the source pks,
// and the class-level tag's Unaligned Creatures callout.
import { describe, expect, it } from "vitest";

import {
	ALIGNMENT_CLASS_TAG,
	ALIGNMENT_TAG_PREFIX,
	alignmentClassTagDescription,
	buildAlignmentTagValueUnits,
	buildAlignmentUnits,
} from "../../chapters/character-creation/alignment-units";
import { readUnalignedCreaturesCallout } from "../../markdown/character-creation";
import { readAlignmentDescriptions } from "../../open5e/alignment-description";

const EXPECTED_SLUGS = [
	"chaotic-evil",
	"chaotic-good",
	"chaotic-neutral",
	"lawful-evil",
	"lawful-good",
	"lawful-neutral",
	"neutral",
	"neutral-evil",
	"neutral-good",
] as const;

describe("buildAlignmentUnits", () => {
	it("emits exactly the 9 SRD alignments, sorted by slug", () => {
		const units = buildAlignmentUnits();
		expect(units).toHaveLength(9);
		expect(units.map((u) => u.slug)).toEqual([...EXPECTED_SLUGS]);
	});

	it("carries a non-empty description and open5e pk for every unit", () => {
		for (const unit of buildAlignmentUnits()) {
			expect(unit.description.trim().length).toBeGreaterThan(0);
			expect(unit.pk).toBe(`srd-2024_${unit.slug}`);
		}
	});

	it("renders Lawful Good's description verbatim from AlignmentDescription.json (no hand-typed prose)", () => {
		const sourceRecord = readAlignmentDescriptions().find(
			(record) => record.describes === "lawful-good",
		);
		expect(sourceRecord).toBeDefined();
		const unit = buildAlignmentUnits().find((u) => u.slug === "lawful-good");
		expect(unit?.description).toBe(sourceRecord?.desc);
		expect(unit?.description).toBe(
			"Lawful Good creatures endeavor to do the right thing as expected by society. Someone " +
				"who fights injustice and protects the innocent without hesitation is probably Lawful Good.",
		);
	});

	it("throws if AlignmentDescription.json ever stops carrying exactly 9 records", () => {
		expect(readAlignmentDescriptions()).toHaveLength(9);
	});
});

describe("readUnalignedCreaturesCallout", () => {
	it("parses the exact Unaligned Creatures callout body (character-creation.md:558-560)", () => {
		expect(readUnalignedCreaturesCallout()).toBe(
			"Most creatures that lack the capacity for rational thought don't have alignments; " +
				"they are unaligned. Sharks are savage predators, for example, but they aren't evil; " +
				"they are unaligned.",
		);
	});
});

describe("buildAlignmentTagValueUnits", () => {
	it("emits exactly 10 rows: the class-level srd.alignment tag plus 9 per-alignment values", () => {
		const definitions = buildAlignmentTagValueUnits();
		expect(definitions).toHaveLength(10);
		expect(definitions.map((d) => d.tag)).toEqual([
			ALIGNMENT_CLASS_TAG,
			...EXPECTED_SLUGS.map((slug) => `${ALIGNMENT_TAG_PREFIX}.${slug}`),
		]);
	});

	it("qualifies every per-alignment value under the exact srd.alignment prefix, carrying its open5e pk", () => {
		expect(ALIGNMENT_TAG_PREFIX).toBe("srd.alignment");
		const byTag = new Map(buildAlignmentTagValueUnits().map((d) => [d.tag, d]));
		for (const unit of buildAlignmentUnits()) {
			const definition = byTag.get(`${ALIGNMENT_TAG_PREFIX}.${unit.slug}`);
			expect(definition).toMatchObject({
				prefix: ALIGNMENT_TAG_PREFIX,
				description: unit.description,
				sourcePk: unit.pk,
			});
		}
	});

	it("carries the class-level srd.alignment row under the bare srd prefix, not its own family prefix", () => {
		const classDefinition = buildAlignmentTagValueUnits().find(
			(d) => d.tag === ALIGNMENT_CLASS_TAG,
		);
		expect(classDefinition).toMatchObject({
			tag: "srd.alignment",
			prefix: "srd",
			description: alignmentClassTagDescription(),
		});
	});

	it("embeds the two-axis framing and the verbatim Unaligned Creatures callout in the class-level description", () => {
		const description = alignmentClassTagDescription();
		expect(description).toContain("morality (good, evil, or neutral)");
		expect(description).toContain("order (lawful, chaotic, or neutral)");
		expect(description).toContain(readUnalignedCreaturesCallout());
		expect(description).toContain("character-creation.md:542-568");
		expect(description).toContain("character-creation.md:558-560");
	});
});
