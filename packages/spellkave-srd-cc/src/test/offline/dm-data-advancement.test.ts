// Offline proof for dm-generic-advancement-metadata M2
// (`ledger/designs/dm-generic-advancement-metadata.md`) —
// `src/dm/data/advancement.ts`. Built the SAME way the design note's own
// §4 M2 slice instruction reads: "unit-tested against an in-memory/local
// AuthorTarget fixture ... via `createLocalAuthorTarget`" — but assembled
// from M1's own typed metadata authoring inputs (`advancementMetadataUpdates()`),
// never the live node, never the (this pass, ungenerated) committed
// `fixtures/` directory. `driveUnitScene`'s own header-stripped fragment
// TOML is NOT standalone-parseable (no `schema_version`/`[[bundles]]`, by
// design — meant to be `[[include]]`d by the pipeline's own root manifest
// render), so this test projects a small STANDALONE manifest from those typed
// updates instead of round-tripping through that fragment text.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	advancementChoicesForClassLevel,
	advancementGrantsForClassLevel,
	grantableAdvancementCapabilities,
} from "@spellkave/adventure-runtime/dm/data/advancement";
import type { AuthorTarget } from "@spellkave/tool-authoring";
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { renderSchemaManifest, validateManifestToml } from "@spellkave/world-author";
import { beforeAll, describe, expect, it } from "vitest";
import { BUNDLE_ROW } from "../../bundle-row";
import { advancementMetadataUpdates } from "../../chapters/classes/advancement-metadata-units";
import { FIXTURES_DIR } from "../../pipeline";

let target: AuthorTarget;

/**
 * {@link grantableAdvancementCapabilities}'s own split needs REAL
 * `capability_definitions` rows to classify against — `target` above is
 * built purely from M1's own metadata rows (no capability content at all),
 * so the split coverage below instead reads the FULL committed package
 * `fixtures/` (metadata rows AND capability_definitions rows both generated
 * together by the pipeline) — the SAME `createLocalAuthorTarget(FIXTURES_DIR)`
 * idiom `../../../src/test/offline/dm-creation.test.ts`'s own `BASE_TARGET`
 * already establishes.
 */
const FIXTURES_TARGET: AuthorTarget = createLocalAuthorTarget(FIXTURES_DIR);

beforeAll(() => {
	const updates = advancementMetadataUpdates();
	const manifest = {
		schema_version: "1.0.0",
		bundles: [BUNDLE_ROW],
		metadata_namespaces: updates
			.filter((update) => update.target === "namespace")
			.map((update) => ({ namespace: update.key, ...update.value, bundle_id: "srd" })),
		metadata_attachments: updates
			.filter((update) => typeof update.target === "object")
			.map((update) => ({
				target_kind: typeof update.target === "object" ? update.target.kind : "",
				target_ref: typeof update.target === "object" ? update.target.ref : "",
				namespace: update.key,
				payload_json: JSON.stringify(update.value),
				bundle_id: "srd",
				source: "manifest",
			})),
	};
	const rendered = renderSchemaManifest(manifest);
	const diagnostics = validateManifestToml(rendered);
	const fatal = diagnostics.filter((d) => d.severity === "fatal");
	if (fatal.length > 0) {
		throw new Error(
			`dm-data-advancement test setup: in-memory manifest failed validation: ${JSON.stringify(fatal)}`,
		);
	}
	const dir = mkdtempSync(join(tmpdir(), "advancement-metadata-target-"));
	const file = join(dir, "manifest.toml");
	writeFileSync(file, rendered, "utf8");
	target = createLocalAuthorTarget(file);
});

describe("advancementGrantsForClassLevel: generic (class, level) query", () => {
	it("Fighter level 1: Fighting Style, Second Wind, Weapon Mastery", () => {
		expect([...advancementGrantsForClassLevel(target, "fighter", 1)].sort()).toEqual([
			"srd/class-feature/fighter/fighting-style",
			"srd/class-feature/fighter/second-wind",
			"srd/class-feature/fighter/weapon-mastery",
		]);
	});

	it("Fighter level 2: Action Surge AND Tactical Mind", () => {
		expect([...advancementGrantsForClassLevel(target, "fighter", 2)].sort()).toEqual([
			"srd/class-feature/fighter/action-surge",
			"srd/class-feature/fighter/tactical-mind",
		]);
	});

	it("Wizard level 1: Arcane Recovery, Ritual Adept, Spellcasting — the SAME two functions answer a DIFFERENT class with no new code", () => {
		expect([...advancementGrantsForClassLevel(target, "wizard", 1)].sort()).toEqual([
			"srd/class-feature/wizard/arcane-recovery",
			"srd/class-feature/wizard/ritual-adept",
			"srd/class-feature/wizard/spellcasting",
		]);
	});

	it("returns an empty array (never throws) for a class/level with no authored rows", () => {
		expect(advancementGrantsForClassLevel(target, "wizard", 5)).toEqual([]);
		expect(advancementGrantsForClassLevel(target, "fighter", 20)).toEqual([]);
	});

	it("returns an empty array for an unknown class slug rather than throwing", () => {
		expect(advancementGrantsForClassLevel(target, "not-a-real-class", 1)).toEqual([]);
	});
});

describe("advancementChoicesForClassLevel: Fighting Style + subclass menus (martial L1-4)", () => {
	it("Fighter L1 Fighting Style is one choose-1 group over the four fighting-style feats", () => {
		const groups = advancementChoicesForClassLevel(target, "fighter", 1);
		const fs = groups.find((g) => g.choiceGroup === "srd/fighter/1/fighting-style");
		expect(fs).toBeDefined();
		expect(fs?.chooseN).toBe(1);
		// Unique choice-option wrappers (L5d) — live metadata_attachment natural key
		// cannot share srd/feat/* across Fighter/Paladin/Ranger menus.
		expect([...(fs?.memberCapabilityIds ?? [])].sort()).toEqual([
			"srd/advancement-choice-option/fighter/1/feat/archery",
			"srd/advancement-choice-option/fighter/1/feat/defense",
			"srd/advancement-choice-option/fighter/1/feat/great-weapon-fighting",
			"srd/advancement-choice-option/fighter/1/feat/two-weapon-fighting",
		]);
		// Slice 2 also authors Weapon Mastery at Fighter L1.
		expect(groups.some((g) => g.choiceGroup.includes("weapon-mastery"))).toBe(true);
	});

	it("Sorcerer L3 has a choose-1-of-1 subclass menu", () => {
		const groups = advancementChoicesForClassLevel(target, "sorcerer", 3);
		expect(groups).toHaveLength(1);
		expect(groups[0]?.chooseN).toBe(1);
		expect(groups[0]?.memberCapabilityIds).toHaveLength(1);
		expect(groups[0]?.memberCapabilityIds[0]?.startsWith("srd/advancement-choice-option/")).toBe(
			true,
		);
		expect(groups[0]?.memberCapabilityIds[0]).toContain("subclass/");
	});
});

describe("grantableAdvancementCapabilities: split by capability_definitions existence (§4a M3 baseline split)", () => {
	it("Fighter level 1: only Second Wind has a capability_definitions row today — Fighting Style and Weapon Mastery are gaps", () => {
		const { grantable, missingCapabilityDefinitions } = grantableAdvancementCapabilities(
			FIXTURES_TARGET,
			"fighter",
			1,
		);
		expect([...grantable].sort()).toEqual(["srd/class-feature/fighter/second-wind"]);
		expect([...missingCapabilityDefinitions].sort()).toEqual(
			[
				"srd/class-feature/fighter/fighting-style",
				"srd/class-feature/fighter/weapon-mastery",
			].sort(),
		);
	});

	it("Fighter level 2: only Action Surge has a capability_definitions row today — Tactical Mind is a gap", () => {
		const { grantable, missingCapabilityDefinitions } = grantableAdvancementCapabilities(
			FIXTURES_TARGET,
			"fighter",
			2,
		);
		expect([...grantable].sort()).toEqual(["srd/class-feature/fighter/action-surge"]);
		expect([...missingCapabilityDefinitions].sort()).toEqual([
			"srd/class-feature/fighter/tactical-mind",
		]);
	});

	it("returns empty grantable/gaps (never throws) for a class/level with no authored grant rows", () => {
		expect(grantableAdvancementCapabilities(FIXTURES_TARGET, "wizard", 5)).toEqual({
			grantable: [],
			missingCapabilityDefinitions: [],
		});
	});
});
