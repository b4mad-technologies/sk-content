// DOC-IMPL: character-creation#confirm-time-authored-acts
// pattern: derived-value-mechanism
/** Source-backed sheet values and receipt-ordered authored initialization. */
import type { AuthorTarget } from "@spellkave/tool-authoring";
import { SPEED_WALK_RESOURCE_ID } from "../../srd-ids.ts";
import {
	abilityModifier,
	classCreationData,
	classCreationDataBySlug,
	level1Hp,
} from "../data/index.ts";
import type { ActStep } from "../lib/act-port.ts";
import { setStateAct } from "../lib/dm-act-plan.ts";
import type { AbilityScores } from "./draft-state.ts";
import { ABILITY_KEYS, POINT_BUY_MIN_SCORE } from "./ids.ts";
import { pregenConfirmInstanceStates } from "./pregen-confirm.ts";

export function creationSheetValues(
	classSlug: string,
	speciesSlug: string,
	drafted: AbilityScores,
	options: { kitOption?: string; target?: AuthorTarget } = {},
): Map<string, number> {
	const scores = ABILITY_KEYS.every((key) => drafted[key] === POINT_BUY_MIN_SCORE)
		? classCreationDataBySlug(classSlug).standardArray
		: drafted;
	return new Map<string, number>([
		["srd/level", 1],
		["srd/hp", level1Hp(classSlug, abilityModifier(scores.con))],
		...ABILITY_KEYS.map((key) => [`srd/${key}`, scores[key]] as [string, number]),
		...pregenConfirmInstanceStates(classSlug, scores, { ...options, speciesSlug, level: 1 }).map(
			(row) => [row.state, row.value_int] as [string, number],
		),
	]);
}

/** Scores are committed before the initializer reads them. Species speed stays
 * a quantity write, avoiding a class × species × score template grid. */
export function creationSheetActs(
	targetId: string,
	classSlug: string,
	speciesSlug: string,
	drafted: AbilityScores,
	options: { kitOption?: string; target?: AuthorTarget } = {},
): ActStep[] {
	const values = creationSheetValues(classSlug, speciesSlug, drafted, options);
	return [
		...[...ABILITY_KEYS.map((key) => `srd/${key}`), SPEED_WALK_RESOURCE_ID].map((state) => {
			const value = values.get(state);
			if (value === undefined) throw new Error(`Creation sheet is missing '${state}'.`);
			return setStateAct(targetId, state, value);
		}),
		{ targetId, actionId: `srd/dm/creation-sheet/${classSlug}`, args: {} },
	];
}

/** All authored set/clear homes, computed from the same source-backed sheet builder. */
export function creationSheetStateIds(target?: AuthorTarget): string[] {
	const ids = new Set(["srd/level", "srd/hp", ...ABILITY_KEYS.map((key) => `srd/${key}`)]);
	for (const cls of classCreationData()) {
		for (let level = 1; level <= 20; level++) {
			for (const row of pregenConfirmInstanceStates(cls.slug, cls.standardArray, { target, level }))
				ids.add(row.state);
		}
	}
	return [...ids].sort();
}
