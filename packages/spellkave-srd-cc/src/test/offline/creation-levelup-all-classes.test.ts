/**
 * L5 — creation + level-up dialogue data for all 12 classes (sk-609b.7).
 * Offline behaviour-tree style: drive pure reducers / catalogs, no node.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
	buildCreationClassCatalog,
	CREATION_CLASS_ALLOWLIST,
	choiceMemberPickActionId,
	creationClassMenu,
	creationStructuredDraftsComplete,
	INITIAL_DRAFT_STATE,
	kitPickActionId,
	nextCreationStep,
	recognizePick,
	reduceCreationDraft,
	skillPickActionId,
} from "@spellkave/adventure-runtime/dm/creation";
import {
	assertAllClassChoicesParse,
	classCreationData,
	classKitChoice,
	classSkillChoice,
} from "@spellkave/adventure-runtime/dm/data";
import { DIALOG_SLOT_COUNT } from "@spellkave/adventure-runtime/dm/dialog";
import {
	buildLevelUpCatalog,
	initialLevelUpDraft,
	levelUpDraftComplete,
	levelUpLatchAfterApply,
	levelUpLatchAllows,
	reduceLevelUpDraft,
} from "@spellkave/adventure-runtime/dm/level-up";
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { describe, expect, it } from "vitest";
import { buildBackgroundUnits } from "../../chapters/character-origins/background-units";
import { FIXTURES_DIR } from "../../pipeline";

const TARGET = createLocalAuthorTarget(FIXTURES_DIR);
const DM_SRC = join(FIXTURES_DIR, "..", "..", "spellkave-adventure-runtime", "src", "dm");

function walkTsFiles(dir: string): string[] {
	const out: string[] = [];
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		const st = statSync(path);
		if (st.isDirectory()) out.push(...walkTsFiles(path));
		else if (name.endsWith(".ts") || name.endsWith(".mdsl")) out.push(path);
	}
	return out;
}

describe("creation class choices parse for all 12", () => {
	it("skill + kit cells parse without throw", () => {
		assertAllClassChoicesParse();
		expect(classCreationData()).toHaveLength(12);
		expect(CREATION_CLASS_ALLOWLIST).toHaveLength(12);
		expect(creationClassMenu()).toHaveLength(12);
	});
});

describe("creation behaviour-tree — each allowlisted class", () => {
	for (const classSlug of CREATION_CLASS_ALLOWLIST) {
		it(`drafts a complete L1 sheet for ${classSlug}`, () => {
			const catalog = buildCreationClassCatalog(TARGET, classSlug);
			const skills = classSkillChoice(classSlug);
			const kit = classKitChoice(classSlug);
			const background = buildBackgroundUnits()[0]!;
			let state = INITIAL_DRAFT_STATE;
			const apply = (text: string) => {
				const pick = recognizePick(text, null);
				expect(pick, text).not.toBeNull();
				state = reduceCreationDraft(state, pick!);
			};

			apply(`dm/creation/class/${classSlug}`);
			apply("dm/creation/species/human");
			apply(`dm/creation/background/${background.slug}`);
			for (let i = 0; i < skills.chooseN; i++) {
				apply(skillPickActionId(skills.skillCapabilityIds[i]!));
			}
			// Required groups == offered groups: walk nextCreationStep through
			// every catalog.choiceGroup (Weapon Mastery included for Fighter).
			const offeredGroups: string[] = [];
			for (const group of catalog.choiceGroups) {
				const step = nextCreationStep(state, catalog);
				expect(step, `${classSlug} next step before ${group.choiceGroup}`).toEqual(
					expect.objectContaining({ kind: "choice", choiceGroup: group.choiceGroup }),
				);
				offeredGroups.push(group.choiceGroup);
				// Offered Answer count never exceeds the dialog slot ceiling.
				const remaining = group.memberCapabilityIds.length;
				expect(Math.min(remaining, DIALOG_SLOT_COUNT)).toBeLessThanOrEqual(DIALOG_SLOT_COUNT);
				const member = group.recommended ?? group.memberCapabilityIds[0]!;
				for (let n = 0; n < group.chooseN; n++) {
					const id = group.memberCapabilityIds[n] ?? member;
					apply(choiceMemberPickActionId(group.choiceGroup, id));
				}
			}
			expect(offeredGroups).toEqual(catalog.choiceGroups.map((g) => g.choiceGroup));
			for (let i = 0; i < catalog.cantripsKnown; i++) {
				const opt = catalog.cantripOptions[i];
				expect(opt, `${classSlug} cantrip ${i}`).toBeDefined();
				apply(`dm/creation/cantrip/${opt?.capabilityId}`);
			}
			for (let i = 0; i < catalog.preparedCount; i++) {
				const opt = catalog.preparedOptions[i];
				expect(opt, `${classSlug} prepared ${i}`).toBeDefined();
				apply(`dm/creation/prepared/${opt?.capabilityId}`);
			}
			const kitLetter = kit.options[0]?.letter;
			expect(kitLetter, `${classSlug} kit letter`).toBeDefined();
			if (kitLetter === undefined) throw new Error(`expected kit letter for ${classSlug}`);
			apply(kitPickActionId(kitLetter));
			state = reduceCreationDraft(state, {
				kind: "adopt-name",
				name: `Hero ${classSlug}`,
			});
			state = reduceCreationDraft(state, { kind: "adopt-array" });
			for (const menu of catalog.equipmentChoices ?? []) {
				if (menu.letter !== kitLetter) continue;
				expect(creationStructuredDraftsComplete(state, catalog)).toBe(false);
				expect(reduceCreationDraft(state, { kind: "confirm" }).confirmed).toBe(false);
				const option = menu.options[0];
				if (option === undefined) throw new Error(`Missing equipment options for ${classSlug}`);
				state = reduceCreationDraft(state, {
					kind: "equipment",
					requirement: menu.sourceText,
					entityDefId: option.entityDefId,
				});
			}
			expect(creationStructuredDraftsComplete(state, catalog)).toBe(true);
			state = reduceCreationDraft(state, { kind: "confirm" });

			expect(state.confirmed).toBe(true);
			expect(state.classSlug).toBe(classSlug);
			expect(state.speciesSlug).toBe("human");
			expect(state.backgroundSlug).toBe(background.slug);
			expect(state.skillIds).toHaveLength(skills.chooseN);
			expect(state.kitOption).toBe(kit.options[0]?.letter);
			expect(state.cantripIds).toHaveLength(catalog.cantripsKnown);
			expect(state.preparedSpellIds).toHaveLength(catalog.preparedCount);
			expect(background.featEntityId.length).toBeGreaterThan(0);
			for (const group of catalog.choiceGroups) {
				expect(state.choicePicks[group.choiceGroup]?.length).toBe(group.chooseN);
			}
		});
	}
});

describe("level-up 1→4 — martial + caster", () => {
	it("fighter climbs 1→4 with subclass + L4 choice", () => {
		const classSlug = CREATION_CLASS_ALLOWLIST.find((s) => s === "fighter") ?? "fighter";
		let latch = 0;
		let level = 1;
		for (const from of [1, 2, 3] as const) {
			const catalog = buildLevelUpCatalog(TARGET, classSlug, from);
			expect(catalog.targetLevel).toBe(from + 1);
			expect(levelUpLatchAllows(latch, catalog.targetLevel)).toBe(true);
			let draft = initialLevelUpDraft(classSlug, from);
			draft = reduceLevelUpDraft(draft, { kind: "hp", path: "steady" });
			for (const group of catalog.choiceGroups) {
				const member = group.recommended ?? group.memberCapabilityIds[0]!;
				for (let n = 0; n < group.chooseN; n++) {
					draft = reduceLevelUpDraft(draft, {
						kind: "choice-member",
						choiceGroup: group.choiceGroup,
						memberId: group.memberCapabilityIds[n] ?? member,
					});
				}
			}
			expect(levelUpDraftComplete(draft, catalog)).toBe(true);
			draft = reduceLevelUpDraft(draft, { kind: "confirm" });
			expect(draft.confirmed).toBe(true);
			latch = levelUpLatchAfterApply(catalog.targetLevel);
			level = catalog.targetLevel;
		}
		expect(level).toBe(4);
		expect(latch).toBe(4);
		expect(levelUpLatchAllows(latch, 4)).toBe(false);
	});

	it("wizard climbs 1→4 with slot grants + L4 choice", () => {
		const classSlug = "wizard";
		let latch = 0;
		for (const from of [1, 2, 3] as const) {
			const catalog = buildLevelUpCatalog(TARGET, classSlug, from);
			expect(catalog.slotGrants.length).toBeGreaterThan(0);
			expect(levelUpLatchAllows(latch, catalog.targetLevel)).toBe(true);
			let draft = initialLevelUpDraft(classSlug, from);
			draft = reduceLevelUpDraft(draft, { kind: "hp", path: "daring" });
			for (const group of catalog.choiceGroups) {
				const member = group.recommended ?? group.memberCapabilityIds[0]!;
				draft = reduceLevelUpDraft(draft, {
					kind: "choice-member",
					choiceGroup: group.choiceGroup,
					memberId: member,
				});
			}
			// Extra cantrips/prepared may be 0 on some rungs — only confirm when complete.
			if (levelUpDraftComplete(draft, catalog)) {
				draft = reduceLevelUpDraft(draft, { kind: "confirm" });
				expect(draft.confirmed).toBe(true);
			} else {
				// Fill remaining spell picks if the ladder grew.
				for (let i = draft.cantripIds.length; i < catalog.extraCantrips; i++) {
					draft = reduceLevelUpDraft(draft, {
						kind: "cantrip",
						capabilityId: `srd/spell/placeholder-cantrip-${i}/cantrip`,
					});
				}
				for (let i = draft.preparedSpellIds.length; i < catalog.extraPrepared; i++) {
					draft = reduceLevelUpDraft(draft, {
						kind: "prepared",
						capabilityId: `srd/spell/placeholder-prepared-${i}/prepared`,
					});
				}
				expect(levelUpDraftComplete(draft, catalog)).toBe(true);
				draft = reduceLevelUpDraft(draft, { kind: "confirm" });
				expect(draft.confirmed).toBe(true);
			}
			latch = levelUpLatchAfterApply(catalog.targetLevel);
		}
		expect(latch).toBe(4);
	});
});

describe("grep-invariant: no class-name literal in src/dm/** or aldwin/**", () => {
	const ALLOWED_FILES = new Set([
		// Allowlist constant itself.
		join(DM_SRC, "creation", "ids.ts"),
		// Runtime catalog snapshot (sk-jay0.7.21) — class rows, not wizard logic.
		join(DM_SRC, "data", "srd-catalog.ts"),
	]);
	const CLASS_SLUGS = [
		"barbarian",
		"bard",
		"cleric",
		"druid",
		"fighter",
		"monk",
		"paladin",
		"ranger",
		"rogue",
		"sorcerer",
		"warlock",
		"wizard",
	];

	function collectOffenders(root: string): string[] {
		const offenders: string[] = [];
		for (const file of walkTsFiles(root)) {
			if (ALLOWED_FILES.has(file)) continue;
			// The gate guards wizard LOGIC (every class must flow from the
			// allowlist + catalog data). A colocated unit test that drives one
			// recorded wizard run legitimately names the class it recorded
			// (src/dm/creation/seat-steps.test.ts, #3024).
			if (file.endsWith(".test.ts")) continue;
			const raw = readFileSync(file, "utf8");
			// Strip block comments + line comments so JSDoc examples do not trip the gate.
			const text = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
			for (const slug of CLASS_SLUGS) {
				const re = new RegExp(`['"]${slug}['"]`, "g");
				if (re.test(text)) {
					offenders.push(`${file}: ${slug}`);
				}
			}
		}
		return offenders;
	}

	it("src/dm has no class slug string literals outside the allowlist constant", () => {
		expect(collectOffenders(DM_SRC)).toEqual([]);
	});
});
