import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "smol-toml";
import { describe, expect, it } from "vitest";
import { adventureArt } from "../../author/art.ts";

/** Packaged sprites whose subject is not adventure-seeded. Renn's golden
 * body lives in fixtures/reference/renn.toml and is not applied with the
 * adventure world, so an kavemouth.art.image row would MF-APPLY-026. */
const REFERENCE_ONLY_SPRITES = ["kavemouth-art/characters/renn-roadwarden.webp"] as const;

function packagedWebpRelatives(): string[] {
	const root = new URL("../../assets/kavemouth-art/", import.meta.url);
	const out: string[] = [];
	for (const dir of ["characters", "items", "creature", "person", "item"] as const) {
		for (const name of readdirSync(new URL(`${dir}/`, root)).sort()) {
			if (name.endsWith(".webp")) out.push(`kavemouth-art/${dir}/${name}`);
		}
	}
	return out;
}

function artAttachments(): {
	target_kind: string;
	target_ref: string;
	namespace: string;
	metadata: { path: string; hash: string; license: string };
}[] {
	const calls = adventureArt();
	const updates = calls.find((call) => call.label === "attach-adventure-art")?.params.updates as
		| Array<{
				target: { kind: string; ref: string };
				key: string;
				value: { path: string; hash: string; license: string };
		  }>
		| undefined;
	return (updates ?? []).map((update) => ({
		target_kind: update.target.kind,
		target_ref: update.target.ref,
		namespace: update.key,
		metadata: update.value,
	})) as {
		target_kind: string;
		target_ref: string;
		namespace: string;
		metadata: { path: string; hash: string; license: string };
	}[];
}

describe("adventure-owned art annotations", () => {
	it("coexists with core's frontier.apply_manifest-gated art.image registration", () => {
		const coreFixtures = process.env.SPELLKAVE_CORE_FIXTURES;
		if (!coreFixtures) throw new Error("Set SPELLKAVE_CORE_FIXTURES to sk-grimoire's core fixtures.");
		const core = parse(readFileSync(join(coreFixtures, "base/metadata-namespaces.toml"), "utf8"));
		const legacy = core.metadata_namespaces as { namespace: string; audience: string }[];
		// ADR-0130 D-3: the pre-ADR-0130 `"author"` audience word became the
		// `frontier.apply_manifest` capability id — whoever may change the
		// world may read its author-facing image references.
		expect(legacy.find((row) => row.namespace === "art.image")?.audience).toBe(
			"frontier.apply_manifest",
		);
		const calls = adventureArt();
		const namespaceCall = calls.find((call) => call.label === "register-public-adventure-art");
		const namespace = namespaceCall?.params as {
			bundle: string;
			key: string;
			value: { audience: string };
		};
		expect(legacy.some((existing) => existing.namespace === namespace.key)).toBe(false);
		expect(namespace.key).toBe(`${namespace.bundle}.art.image`);
		expect(namespace.value.audience).toBe("public");
		expect(artAttachments().every((row) => row.namespace === namespace.key)).toBe(true);
	});
	it("references packaged bytes with generic metadata and no app placement", () => {
		const rows = artAttachments();
		const sprites = packagedWebpRelatives();
		const referenceOnly = new Set<string>(REFERENCE_ONLY_SPRITES);
		expect(sprites.length).toBeGreaterThan(0);
		for (const path of REFERENCE_ONLY_SPRITES) {
			expect(sprites).toContain(path);
		}
		const required = sprites.filter((path) => !referenceOnly.has(path)).sort();
		const attachedPaths = new Set<string>();
		for (const row of rows) {
			const payload = row.metadata;
			expect(Object.keys(payload).sort()).toEqual(["hash", "license", "path"]);
			const bytes = readFileSync(new URL(`../../assets/${payload.path}`, import.meta.url));
			expect(createHash("sha256").update(bytes).digest("hex")).toBe(payload.hash);
			expect(payload.license).toBe("CC-BY-4.0");
			expect(referenceOnly.has(payload.path)).toBe(false);
			attachedPaths.add(payload.path);
		}
		expect([...attachedPaths].sort()).toEqual(required);
		// NPC art attaches to instances: sharing a Commoner definition must not
		// make every Commoner look like Mira or Aldwin.
		expect(rows.filter((row) => row.target_kind === "entity")).toHaveLength(14);
		expect(
			rows
				.filter((row) => row.target_kind === "entity_definition")
				.every(
					(row) =>
						row.target_ref.startsWith("kavemouth/item/") ||
						row.target_ref.startsWith("kavemouth/adventure/item/") ||
						row.target_ref.startsWith("srd/item/") ||
						row.target_ref.startsWith("srd/weapon/") ||
						row.target_ref.startsWith("srd/armor/") ||
						row.target_ref.startsWith("srd/creature/") ||
						row.target_ref.startsWith("srd/magic_item/"),
				),
		).toBe(true);
	});
});
