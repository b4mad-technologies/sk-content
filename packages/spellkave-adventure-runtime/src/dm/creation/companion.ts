/**
 * Build-time companion sheet composition, configured by an adventure.
 * These helpers author the waiting L1 body and optional fixture updates. Live
 * invitation recovery dispatches authored HP and level acts instead. Separate
 * fixture deltas avoid duplicate state seeds in one apply (MF-VAL-270).
 */

import type { AuthorTarget } from "@spellkave/tool-authoring";
import {
	type CandidatePlacement,
	type CreationStarterKit,
	placementFromStation,
	renderCreationCompleteness,
} from "../../author/dm/creation-composition.ts";
import { HP_ID, LEVEL_ID, SRD_BUNDLE_ID } from "../../srd-ids";
import { abilityModifier, classCreationDataBySlug, fixedHpPerLevel, level1Hp } from "../data";
import type { VerbCall } from "../lib";
import type { AbilityScores } from "./draft-state";

export interface CompanionCreationConfig {
	/** Authoring bundle the companion rows land in. */
	bundle: string;
	/** Fully-qualified entity key of the companion body. */
	entityKey: string;
	classSlug: string;
	speciesSlug: string;
	backgroundSlug: string;
	/** The L1 skill package passed to completeness. */
	skillIds: readonly string[];
	/** Default display name (callers may override per call). */
	name: string;
	/** Entity definition the placed body is an instance of. */
	entityDefId: string;
	/** Placement description persisted on the body. */
	description: string;
	/** The target level the bump renders (must be >= 2). */
	targetLevel: number;
	starterKit: CreationStarterKit;
	/** Public catalogue descriptions for authored starting equipment. */
	kitDescriptions?: Readonly<Record<string, string>>;
	/** Bundle header prepended to each delta (a verb-layer scaffold must not
	 * clobber `depends_on` with the unseen-bundle default). */
	bundleHeaderCall: () => VerbCall;
}

/** Standard-array ability scores for a class (classCreationData). */
export function companionScores(classSlug: string): AbilityScores {
	const arr = classCreationDataBySlug(classSlug).standardArray;
	return { str: arr.str, dex: arr.dex, con: arr.con, int: arr.int, wis: arr.wis, cha: arr.cha };
}

function assertTargetLevel(targetLevel: number): void {
	if (!Number.isInteger(targetLevel) || targetLevel < 2) {
		throw new RangeError(`companion targetLevel must be an integer >= 2, got ${targetLevel}`);
	}
}

/** HP at `targetLevel`: L1 max + one fixed level-up die (average ladder) per
 * level above 1. At level 2 this is the original single-die bump. */
export function companionHpAtLevel(
	classSlug: string,
	targetLevel: number,
	scores: AbilityScores = companionScores(classSlug),
): number {
	assertTargetLevel(targetLevel);
	const conMod = abilityModifier(scores.con);
	return level1Hp(classSlug, conMod) + (targetLevel - 1) * fixedHpPerLevel(classSlug, conMod);
}

/**
 * Place the companion body + run creation completeness (party tags, kit,
 * sheet). Same engine path as hero confirm — lands the companion at L1.
 * See the module header for why the level bump is a separate delta.
 */
export function renderCompanionCreation(
	config: CompanionCreationConfig,
	args: {
		placeNodeId: string;
		/** Optional AuthorTarget so completeness can filter capability grants. */
		target?: AuthorTarget;
		name?: string;
	},
): VerbCall[] {
	const scores = companionScores(config.classSlug);
	const name = args.name ?? config.name;
	const placement: CandidatePlacement = placementFromStation(config.entityKey, args.placeNodeId, {
		entityDefId: config.entityDefId,
		kind: "npc",
		description: config.description,
	});

	const placeCalls: VerbCall[] = [
		config.bundleHeaderCall(),
		{
			toolName: "spellkave_place_actor",
			label: `place-${config.classSlug}-companion`,
			params: {
				bundle: config.bundle,
				kind: "npc",
				entity_def: placement.entityDefId,
				at: args.placeNodeId,
				entity_key: config.entityKey,
				name,
				description: placement.description,
			},
		},
	];

	const completeness = renderCreationCompleteness(
		placement,
		{
			classSlug: config.classSlug,
			speciesSlug: config.speciesSlug,
			backgroundSlug: config.backgroundSlug,
			skillIds: [...config.skillIds],
		},
		config.starterKit,
		name,
		args.target,
		scores,
	);

	if (config.kitDescriptions) {
		for (const call of completeness) {
			if (call.label !== "creation-starter-pack-entities") continue;
			if (!Array.isArray(call.params.rows)) throw new Error("Missing authored companion kit rows");
			for (const row of call.params.rows) {
				const description = config.kitDescriptions[String(row.name)];
				if (!description) throw new Error(`Missing companion kit description for ${row.name}`);
				row.description = description;
			}
		}
	}
	return [...placeCalls, ...completeness];
}

/**
 * L1 -> `targetLevel` bump: a SEPARATE manifest delta from
 * {@link renderCompanionCreation}, applied by the caller as its own later
 * `apply()` call (module header: MF-VAL-270).
 */
export function renderCompanionLevelBump(
	config: CompanionCreationConfig,
	args: { scores?: AbilityScores } = {},
): VerbCall[] {
	assertTargetLevel(config.targetLevel);
	const scores = args.scores ?? companionScores(config.classSlug);
	const hp = companionHpAtLevel(config.classSlug, config.targetLevel, scores);
	const sourceTemplateId = `${config.bundle}/companion/${config.classSlug}-l${config.targetLevel}`;
	const row = (stateId: string, value: number) => ({
		bundle_id: config.bundle,
		entity_key: config.entityKey,
		source_template_id: sourceTemplateId,
		state_id: stateId,
		value_int: value,
		visibility: "Public",
	});
	return [
		config.bundleHeaderCall(),
		{
			toolName: "spellkave_write_rows",
			label: `${config.classSlug}-companion-level-${config.targetLevel}-sheet`,
			params: {
				bundle: config.bundle,
				kind: "object_state",
				rows: [
					row(`${SRD_BUNDLE_ID}/${LEVEL_ID}`, config.targetLevel),
					row(`${SRD_BUNDLE_ID}/${HP_ID}`, hp),
				],
			},
		},
	];
}
