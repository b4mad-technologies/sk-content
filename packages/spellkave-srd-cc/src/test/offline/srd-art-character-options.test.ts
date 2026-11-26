import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parse as parseToml } from "smol-toml";
import { describe, expect, it } from "vitest";

import { FIXTURES_DIR } from "../../pipeline";
import { expectedSkillIdentities } from "../shared/identity-expectations";

// sk-jay0.1.76.19.20 point 4: species, backgrounds, skills and divine orders
// get one catalog sprite each. The subject sets come from the fixtures (and
// the skill identity source), never from a local literal count.
const MANIFEST_PATH = join(FIXTURES_DIR, "..", "art", "art-manifest.json");

interface Entry {
	id: string;
	kind: string;
	prompt_inputs: { name?: string; descriptors?: string };
	size: { width: number; height: number };
	output_path: string;
	target_attachment_ref: string;
}

function entityRefs(fixture: string, prefix: string): string[] {
	const doc = parseToml(readFileSync(join(FIXTURES_DIR, "base", fixture), "utf8")) as {
		entity_definitions?: Array<{ entity_def_id?: string }>;
	};
	return (doc.entity_definitions ?? [])
		.map((row) => row.entity_def_id ?? "")
		.filter((ref) => ref.startsWith(prefix) && !ref.slice(prefix.length).includes("/"))
		.sort();
}

const FAMILIES = [
	{
		kind: "species",
		size: 96,
		targetKind: "",
		refs: () => entityRefs("character-origins/species.toml", "srd/species/"),
	},
	{
		kind: "background",
		size: 64,
		targetKind: "",
		refs: () => entityRefs("character-origins/backgrounds.toml", "srd/background/"),
	},
	{
		kind: "skill",
		size: 64,
		targetKind: "capability_definition:",
		refs: () => expectedSkillIdentities().map((row) => row.capabilityId),
	},
	{
		kind: "divine_order",
		size: 64,
		targetKind: "",
		refs: () => entityRefs("classes/caster-features.toml", "srd/divine-order/"),
	},
] as const;

describe("srd-art character-option families", () => {
	const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as { entries: Entry[] };

	for (const family of FAMILIES) {
		it(`plans exactly one ${family.kind} sprite per fixture subject`, () => {
			const refs = family.refs();
			expect(refs.length).toBeGreaterThan(0);
			const rows = manifest.entries.filter((entry) => entry.kind === family.kind);
			expect(
				rows.map((entry) => entry.target_attachment_ref.replace(/#srd\.art\.image$/, "")).sort(),
			).toEqual(refs.map((ref) => `${family.targetKind}${ref}`).sort());
			for (const entry of rows) {
				const stem = entry.target_attachment_ref.replace(/#.*$/, "").split("/").pop();
				expect(entry.output_path).toBe(
					`packages/spellkave-srd-cc/assets/srd-art/${family.kind}/${stem}.webp`,
				);
				expect(entry.size).toEqual({ width: family.size, height: family.size });
				expect(entry.prompt_inputs.descriptors?.length ?? 0).toBeGreaterThan(0);
				expect(entry.prompt_inputs.name).not.toMatch(/^(Skill|Divine Order): /);
			}
		});
	}
});
