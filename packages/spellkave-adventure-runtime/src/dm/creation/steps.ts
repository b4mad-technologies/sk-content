/**
 * // pattern: draft-then-confirm-wizard
 *
 * Ordered creation wizard steps for the current draft + class catalog.
 * Pure; no class-name branches.
 */
import { classCreationData } from "../data";
import { DIALOG_SLOT_COUNT } from "../dialog";
import type { CreationClassCatalog, CreationSpellOption } from "./catalog";
import { type CreationDraftState, type CreationPick, INITIAL_ABILITY_SCORES } from "./draft-state";
import { equipmentChoicePage, openEquipmentChoice } from "./equipment-choices.ts";
import { CREATION_CLASS_ALLOWLIST } from "./ids.ts";
import { backgroundCreationData, speciesCreationData } from "./origins.ts";
import {
	creationPresentationText,
	CREATION_PRESENTATION_VOCABULARY as vocabulary,
} from "./presentation-vocabulary";

function remainingSkillIds(
	state: CreationDraftState,
	catalog: CreationClassCatalog,
): readonly string[] {
	const chosen = new Set(state.skillIds);
	return catalog.skills.skillCapabilityIds.filter((id) => !chosen.has(id));
}

function remainingChoiceIds(
	state: CreationDraftState,
	group: { choiceGroup: string; memberCapabilityIds: readonly string[] },
): readonly string[] {
	const chosen = new Set(state.choicePicks[group.choiceGroup] ?? []);
	return group.memberCapabilityIds.filter((id) => !chosen.has(id));
}

function remainingSpellOptions(
	picked: readonly string[],
	options: readonly CreationSpellOption[],
): readonly CreationSpellOption[] {
	const chosen = new Set(picked);
	return options.filter((opt) => !chosen.has(opt.capabilityId));
}

export type CreationWizardStep =
	| { kind: "class" }
	| { kind: "species" }
	| { kind: "background" }
	| { kind: "skills" }
	| { kind: "choice"; groupIndex: number; choiceGroup: string; chooseN: number }
	| { kind: "cantrips" }
	| { kind: "prepared" }
	| { kind: "kit" }
	| { kind: "equipment" }
	| { kind: "contracts" };

/**
 * Next open list step, or `contracts` when only name/scores remain, or
 * `null` when every structured draft is filled (confirm may open).
 */
export function nextCreationStep(
	state: CreationDraftState,
	catalog: CreationClassCatalog | null,
): CreationWizardStep | null {
	if (state.confirmed) return null;
	if (state.classSlug === null) return { kind: "class" };
	if (state.backgroundSlug === null) return { kind: "background" };
	if (state.speciesSlug === null) return { kind: "species" };
	if (catalog === null || catalog.classSlug !== state.classSlug) {
		// Catalog not yet bound — treat identity as done, wait for catalog.
		return { kind: "skills" };
	}
	if (
		state.skillIds.length < catalog.skills.chooseN &&
		remainingSkillIds(state, catalog).length > 0
	) {
		return { kind: "skills" };
	}
	for (const [i, group] of catalog.choiceGroups.entries()) {
		const picked = state.choicePicks[group.choiceGroup] ?? [];
		if (picked.length < group.chooseN && remainingChoiceIds(state, group).length > 0) {
			return {
				kind: "choice",
				groupIndex: i,
				choiceGroup: group.choiceGroup,
				chooseN: group.chooseN,
			};
		}
	}
	if (
		state.cantripIds.length < catalog.cantripsKnown &&
		remainingSpellOptions(state.cantripIds, catalog.cantripOptions).length > 0
	) {
		return { kind: "cantrips" };
	}
	if (
		state.preparedSpellIds.length < catalog.preparedCount &&
		remainingSpellOptions(state.preparedSpellIds, catalog.preparedOptions).length > 0
	) {
		return { kind: "prepared" };
	}
	if (state.kitOption === null && catalog.kit.options.length > 0) return { kind: "kit" };
	if (openEquipmentChoice(state, catalog.equipmentChoices ?? [])) return { kind: "equipment" };
	if (state.name === null) return { kind: "contracts" };
	// Scores may stay at defaults — array-adopt is optional for completeness
	// gate (matches prior confirm keys: class, name, species, background + new).
	return null;
}

export function creationStructuredDraftsComplete(
	state: CreationDraftState,
	catalog: CreationClassCatalog | null,
): boolean {
	if (
		state.classSlug === null ||
		state.name === null ||
		state.speciesSlug === null ||
		state.backgroundSlug === null
	) {
		return false;
	}
	if (catalog === null || catalog.classSlug !== state.classSlug) return false;
	// Unfulfillable remainder (needed > 0, remaining options 0) is complete
	// — never hold confirm on an empty menu (sk-0m4.109 / #2511).
	if (
		state.skillIds.length < catalog.skills.chooseN &&
		remainingSkillIds(state, catalog).length > 0
	) {
		return false;
	}
	for (const group of catalog.choiceGroups) {
		const picked = state.choicePicks[group.choiceGroup] ?? [];
		if (picked.length < group.chooseN && remainingChoiceIds(state, group).length > 0) {
			return false;
		}
	}
	if (
		state.cantripIds.length < catalog.cantripsKnown &&
		remainingSpellOptions(state.cantripIds, catalog.cantripOptions).length > 0
	) {
		return false;
	}
	if (
		state.preparedSpellIds.length < catalog.preparedCount &&
		remainingSpellOptions(state.preparedSpellIds, catalog.preparedOptions).length > 0
	) {
		return false;
	}
	if (state.kitOption === null && catalog.kit.options.length > 0) return false;
	if (openEquipmentChoice(state, catalog.equipmentChoices ?? [])) return false;
	return !state.confirmed;
}

/**
 * One ordered, immutable bounded response set. `labels[index]` and
 * `picks[index]` are deliberately authored together: publishing only labels
 * and reconstructing picks in a second code path would let a runtime menu
 * display one choice while the brain consumes another after a restart.
 *
 * The world sees the generic `dm/dialog/choice/N` action ids. The creation
 * brain alone translates that closed vocabulary back to this offer's exact
 * domain pick after the corresponding occurrence is accepted.
 */
export interface CreationOffer {
	/** Slot-menu kind phrase ("skill (2 more)", "fighting style", "kit", …). */
	kind: string;
	/** 1-based Answer labels in slot order. */
	labels: readonly string[];
	definitionRefs?: readonly (string | null)[];
	/** Exact domain pick in the same slot order as {@link labels}. */
	picks: readonly CreationPick[];
	/** Stable key so a re-offer fires when remaining options change. */
	key: string;
	/** Picks still to make on this slot menu, this one included, when the
	 * menu is one of several (the "(N more)" in {@link kind}); absent on a
	 * single-pick menu. Published as `picks_remaining` so a player reads the
	 * count as a number, not from the question prose. */
	picksRemaining?: number;
}

/** @deprecated Use {@link CreationOffer}; kept for downstream source compatibility. */
export type StructuredMenuOffer = CreationOffer;

function titleCaseTail(id: string): string {
	const tail = id.includes("/") ? (id.split("/").pop() as string) : id;
	return tail
		.split("-")
		.map((part) => (part.length === 0 ? part : part[0]?.toUpperCase() + part.slice(1)))
		.join(" ");
}

function choiceGroupKind(choiceGroup: string): string {
	const tail = choiceGroup.includes("/") ? (choiceGroup.split("/").pop() as string) : choiceGroup;
	return tail.replace(/-/g, " ");
}

/** Empty remaining lists are never spoken (sk-0m4.109). */
function offerIfLabeled(offer: CreationOffer): CreationOffer | null {
	if (offer.labels.length !== offer.picks.length) {
		throw new Error("creation offer labels and picks must have identical lengths.");
	}
	return offer.labels.length === 0 ? null : offer;
}

function offerFromPairs(
	kind: string,
	key: string,
	pairs: readonly { label: string; pick: CreationPick; definitionRef?: string }[],
	picksRemaining?: number,
): CreationOffer | null {
	const capped = pairs.slice(0, DIALOG_SLOT_COUNT);
	return offerIfLabeled({
		kind,
		key,
		labels: capped.map((pair) => pair.label),
		picks: capped.map((pair) => pair.pick),
		...(capped.some((pair) => pair.definitionRef !== undefined)
			? { definitionRefs: capped.map((pair) => pair.definitionRef ?? null) }
			: {}),
		...(picksRemaining === undefined ? {} : { picksRemaining }),
	});
}

function scoresAreUntouched(state: CreationDraftState): boolean {
	return (
		state.scores.str === INITIAL_ABILITY_SCORES.str &&
		state.scores.dex === INITIAL_ABILITY_SCORES.dex &&
		state.scores.con === INITIAL_ABILITY_SCORES.con &&
		state.scores.int === INITIAL_ABILITY_SCORES.int &&
		state.scores.wis === INITIAL_ABILITY_SCORES.wis &&
		state.scores.cha === INITIAL_ABILITY_SCORES.cha
	);
}

/**
 * The sole bounded-answer inventory for Aldwin's creation dialogue.
 *
 * Class, background and species deliberately live beside the later dynamic
 * catalog menus. They no longer use their seed-time action ids as active
 * answers; those ids remain decoder-only for recorded historical traces.
 * Unbounded authored text (name, appearance, backstory, score proposals)
 * and standing Discard deliberately do not appear here.
 */
export function creationOffer(
	state: CreationDraftState,
	catalog: CreationClassCatalog | null,
	/** Engine-held proposals that are not draft state yet. `name`: the latest
	 * parsed, not-yet-adopted name (sk-jay0.3.21). */
	pending: { name?: string | null } = {},
): CreationOffer | null {
	const step = nextCreationStep(state, catalog);
	// sk-jay0.3.21: after a name proposal the next step used to be reachable
	// only by re-reading the action list — `creation/input/name/adopt` is not
	// prompt-bound, so a player following prompts[] waited for a prompt that
	// never opened. The adoption is now a one-label offer like confirm; the
	// stable adopt action stays for players that act on the action list.
	if (
		step?.kind === "contracts" &&
		state.name === null &&
		typeof pending.name === "string" &&
		pending.name.length > 0
	) {
		return offerFromPairs(vocabulary.menu_labels.name, `adopt:name:${pending.name}`, [
			{
				label: creationPresentationText(vocabulary.templates.adopt_name, { name: pending.name }),
				pick: { kind: "adopt-name", name: pending.name },
			},
		]);
	}
	if (step?.kind === "class") {
		const allowed = new Set<string>(CREATION_CLASS_ALLOWLIST);
		return offerFromPairs(
			vocabulary.menu_labels.class,
			"identity:class",
			classCreationData()
				.filter((choice) => allowed.has(choice.slug))
				.map((choice) => ({
					label: choice.displayName,
					definitionRef: choice.definitionRef,
					pick: { kind: "class", slug: choice.slug },
				})),
		);
	}
	if (step?.kind === "background") {
		return offerFromPairs(
			vocabulary.menu_labels.background,
			"identity:background",
			backgroundCreationData().map((choice) => ({
				label: choice.displayName,
				definitionRef: choice.definitionRef,
				pick: { kind: "background", slug: choice.slug },
			})),
		);
	}
	if (step?.kind === "species") {
		return offerFromPairs(
			vocabulary.menu_labels.species,
			"identity:species",
			speciesCreationData().map((choice) => ({
				label: choice.displayName,
				definitionRef: choice.definitionRef,
				pick: { kind: "species", slug: choice.slug },
			})),
		);
	}
	if (step?.kind === "contracts" && scoresAreUntouched(state)) {
		// A bounded recommendation is a question, unlike the free score/name
		// contracts that follow it. Once chosen it disappears because scores no
		// longer equal the untouched sentinel; the player is never stuck in a
		// repeating one-option occurrence.
		return offerFromPairs(vocabulary.menu_labels.ability_scores, "adopt:recommended-array", [
			{ label: vocabulary.templates.adopt_array, pick: { kind: "adopt-array" } },
		]);
	}
	if (step === null && creationStructuredDraftsComplete(state, catalog)) {
		return offerFromPairs(vocabulary.menu_labels.confirmation, "confirm:character", [
			{ label: vocabulary.templates.confirm, pick: { kind: "confirm" } },
		]);
	}
	if (step === null || catalog === null || step.kind === "contracts") return null;

	if (step.kind === "skills") {
		const chosen = new Set(state.skillIds);
		const pairs: { label: string; pick: CreationPick; definitionRef?: string }[] = [];
		for (let i = 0; i < catalog.skills.skillCapabilityIds.length; i++) {
			const id = catalog.skills.skillCapabilityIds[i] as string;
			if (chosen.has(id)) continue;
			pairs.push({
				label: catalog.skills.skillNames[i] as string,
				pick: { kind: "skill", capabilityId: id },
				definitionRef: id,
			});
		}
		const remaining = catalog.skills.chooseN - state.skillIds.length;
		const kind =
			remaining > 1
				? creationPresentationText(vocabulary.templates.count_kind, {
						kind: vocabulary.menu_labels.skill,
						remaining,
					})
				: vocabulary.menu_labels.skill;
		return offerFromPairs(
			kind,
			`skills:${remaining}:${pairs.map((pair) => pair.label).join("|")}`,
			pairs,
			catalog.skills.chooseN > 1 ? remaining : undefined,
		);
	}

	if (step.kind === "choice") {
		const group = catalog.choiceGroups.find((g) => g.choiceGroup === step.choiceGroup);
		if (group === undefined) return null;
		const chosen = new Set(state.choicePicks[group.choiceGroup] ?? []);
		const pairs = group.memberCapabilityIds
			.filter((id) => !chosen.has(id))
			.map((memberId) => ({
				label: titleCaseTail(memberId),
				definitionRef: memberId,
				pick: { kind: "choice-member" as const, choiceGroup: group.choiceGroup, memberId },
			}));
		const remaining = group.chooseN - (state.choicePicks[group.choiceGroup] ?? []).length;
		const kind =
			remaining > 1
				? creationPresentationText(vocabulary.templates.count_kind, {
						kind: choiceGroupKind(group.choiceGroup),
						remaining,
					})
				: choiceGroupKind(group.choiceGroup);
		return offerFromPairs(
			kind,
			`choice:${group.choiceGroup}:${remaining}:${pairs.map((pair) => pair.label).join("|")}`,
			pairs,
			group.chooseN > 1 ? remaining : undefined,
		);
	}

	if (step.kind === "cantrips") {
		const chosen = new Set(state.cantripIds);
		const pairs = catalog.cantripOptions
			.filter((opt) => !chosen.has(opt.capabilityId))
			.map((opt) => ({
				label: opt.displayName,
				definitionRef: opt.definitionRef,
				pick: { kind: "cantrip" as const, capabilityId: opt.capabilityId },
			}));
		const remaining = catalog.cantripsKnown - state.cantripIds.length;
		const kind =
			remaining > 1
				? creationPresentationText(vocabulary.templates.count_kind, {
						kind: vocabulary.menu_labels.cantrip,
						remaining,
					})
				: vocabulary.menu_labels.cantrip;
		return offerFromPairs(
			kind,
			`cantrips:${remaining}:${pairs.map((pair) => pair.label).join("|")}`,
			pairs,
			catalog.cantripsKnown > 1 ? remaining : undefined,
		);
	}

	if (step.kind === "prepared") {
		const chosen = new Set(state.preparedSpellIds);
		const pairs = catalog.preparedOptions
			.filter((opt) => !chosen.has(opt.capabilityId))
			.map((opt) => ({
				label: opt.displayName,
				definitionRef: opt.definitionRef,
				pick: { kind: "prepared" as const, capabilityId: opt.capabilityId },
			}));
		const remaining = catalog.preparedCount - state.preparedSpellIds.length;
		const kind =
			remaining > 1
				? creationPresentationText(vocabulary.templates.count_kind, {
						kind: vocabulary.menu_labels.prepared_spell,
						remaining,
					})
				: vocabulary.menu_labels.prepared_spell;
		return offerFromPairs(
			kind,
			`prepared:${remaining}:${pairs.map((pair) => pair.label).join("|")}`,
			pairs,
		);
	}

	if (step.kind === "kit") {
		const pairs = catalog.kit.options.map((opt) => ({
			label: creationPresentationText(vocabulary.templates.kit_option, {
				letter: opt.letter,
				description: opt.description,
			}),
			pick: { kind: "kit" as const, letter: opt.letter },
		}));
		return offerFromPairs(
			vocabulary.menu_labels.starting_kit,
			`kit:${pairs.map((pair) => pair.label).join("|")}`,
			pairs,
		);
	}
	if (step.kind === "equipment") {
		const menu = openEquipmentChoice(state, catalog.equipmentChoices ?? []);
		if (menu === undefined) return null;
		const page = equipmentChoicePage(state, menu);
		return offerFromPairs(
			creationPresentationText(vocabulary.templates.equipment_page, {
				source_text: menu.sourceText,
				page: page.page + 1,
				pages: page.pages,
			}),
			`equipment:${menu.sourceText}:${page.page}:${page.labels.join("|")}`,
			page.labels.map((label, index) => ({
				label,
				pick: page.picks[index] as CreationPick,
				definitionRef:
					page.picks[index]?.kind === "equipment"
						? (page.picks[index] as Extract<CreationPick, { kind: "equipment" }>).entityDefId
						: undefined,
			})),
		);
	}

	return null;
}

/** @deprecated Use {@link creationOffer}; source-compatible name for consumers. */
export const structuredMenuOffer = creationOffer;
