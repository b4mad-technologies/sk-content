/**
 * Pure level-up wizard draft for character levels 2–4.
 * `bead sk-609b.7 (design trail)`.
 *
 * Latch rule (operator Q2): last-applied level is monotonic; a level-up to
 * `targetLevel` is legal when `lastAppliedLevel < targetLevel`. The seat
 * still owns world reads; this module only shapes the draft.
 */
import type { AuthorTarget } from "@spellkave/tool-authoring";
import {
	type AdvancementChoiceGroup,
	advancementChoicesForClassLevel,
	cantripsKnownAtLevel,
	grantableAdvancementCapabilities,
	preparedSpellsAtLevel,
	type SpellSlotGrant,
	spellcastingProfileForClass,
	spellSlotGrantsForClassLevel,
} from "../data";

export type HpPath = "steady" | "daring" | null;

export interface LevelUpDraftState {
	/** Hero class slug from identity tag — never a literal in engine code. */
	classSlug: string;
	/** Current character level before this wizard (1..3 for this slice). */
	fromLevel: number;
	/** Target level (= fromLevel + 1). */
	targetLevel: number;
	hpPath: HpPath;
	/** choice_group → member ids. */
	choicePicks: Readonly<Record<string, readonly string[]>>;
	/** Extra cantrips for this level-up (profile delta). */
	cantripIds: readonly string[];
	/** Extra prepared spells for this level-up. */
	preparedSpellIds: readonly string[];
	confirmed: boolean;
}

export type LevelUpPick =
	| { kind: "hp"; path: Exclude<HpPath, null> }
	| { kind: "choice-member"; choiceGroup: string; memberId: string }
	| { kind: "cantrip"; capabilityId: string }
	| { kind: "prepared"; capabilityId: string }
	| { kind: "confirm" }
	| { kind: "discard" };

export interface LevelUpCatalog {
	classSlug: string;
	fromLevel: number;
	targetLevel: number;
	choiceGroups: readonly AdvancementChoiceGroup[];
	grantableCapabilityIds: readonly string[];
	missingCapabilityDefinitions: readonly string[];
	/** Cantrips newly known at target vs from (profile ladder). */
	extraCantrips: number;
	extraPrepared: number;
	slotGrants: readonly SpellSlotGrant[];
}

export function buildLevelUpCatalog(
	target: AuthorTarget,
	classSlug: string,
	fromLevel: number,
): LevelUpCatalog {
	const targetLevel = fromLevel + 1;
	const choiceGroups = advancementChoicesForClassLevel(target, classSlug, targetLevel);
	const { grantable, missingCapabilityDefinitions } = grantableAdvancementCapabilities(
		target,
		classSlug,
		targetLevel,
	);
	const profile = spellcastingProfileForClass(classSlug);
	const cantripsFrom = profile === null ? 0 : cantripsKnownAtLevel(profile, fromLevel);
	const cantripsTo = profile === null ? 0 : cantripsKnownAtLevel(profile, targetLevel);
	const preparedFrom = profile === null ? 0 : preparedSpellsAtLevel(profile, fromLevel);
	const preparedTo = profile === null ? 0 : preparedSpellsAtLevel(profile, targetLevel);
	return {
		classSlug,
		fromLevel,
		targetLevel,
		choiceGroups,
		grantableCapabilityIds: grantable,
		missingCapabilityDefinitions,
		extraCantrips: Math.max(0, cantripsTo - cantripsFrom),
		extraPrepared: Math.max(0, preparedTo - preparedFrom),
		slotGrants: spellSlotGrantsForClassLevel(target, classSlug, targetLevel),
	};
}

export function initialLevelUpDraft(classSlug: string, fromLevel: number): LevelUpDraftState {
	return {
		classSlug,
		fromLevel,
		targetLevel: fromLevel + 1,
		hpPath: null,
		choicePicks: {},
		cantripIds: [],
		preparedSpellIds: [],
		confirmed: false,
	};
}

function appendUnique(list: readonly string[], id: string): readonly string[] {
	return list.includes(id) ? list : [...list, id];
}

export function reduceLevelUpDraft(state: LevelUpDraftState, pick: LevelUpPick): LevelUpDraftState {
	if (state.confirmed) return state;
	if (pick.kind === "discard") return initialLevelUpDraft(state.classSlug, state.fromLevel);
	if (pick.kind === "hp") {
		return state.hpPath === pick.path ? state : { ...state, hpPath: pick.path };
	}
	if (pick.kind === "choice-member") {
		const prior = state.choicePicks[pick.choiceGroup] ?? [];
		const next = appendUnique(prior, pick.memberId);
		if (next === prior) return state;
		return {
			...state,
			choicePicks: { ...state.choicePicks, [pick.choiceGroup]: next },
		};
	}
	if (pick.kind === "cantrip") {
		const cantripIds = appendUnique(state.cantripIds, pick.capabilityId);
		return cantripIds === state.cantripIds ? state : { ...state, cantripIds };
	}
	if (pick.kind === "prepared") {
		const preparedSpellIds = appendUnique(state.preparedSpellIds, pick.capabilityId);
		return preparedSpellIds === state.preparedSpellIds ? state : { ...state, preparedSpellIds };
	}
	// confirm
	if (state.hpPath === null) return state;
	return { ...state, confirmed: true };
}

export function levelUpDraftComplete(state: LevelUpDraftState, catalog: LevelUpCatalog): boolean {
	if (state.hpPath === null || state.confirmed) return false;
	for (const group of catalog.choiceGroups) {
		const picked = state.choicePicks[group.choiceGroup] ?? [];
		if (picked.length < group.chooseN) return false;
	}
	if (state.cantripIds.length < catalog.extraCantrips) return false;
	if (state.preparedSpellIds.length < catalog.extraPrepared) return false;
	return true;
}

/**
 * Whether the per-level latch allows a wizard for `targetLevel`.
 * `lastAppliedLevel` is the monotonic latch value (0 = never applied).
 */
export function levelUpLatchAllows(lastAppliedLevel: number, targetLevel: number): boolean {
	return lastAppliedLevel < targetLevel;
}

/** After a successful apply at `targetLevel`, the latch becomes that level. */
export function levelUpLatchAfterApply(targetLevel: number): number {
	return targetLevel;
}
