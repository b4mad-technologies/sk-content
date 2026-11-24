// pattern: derived-value-mechanism
// How many uses of a class pool a character has at its level, as DSL macros
// read by the rests (fragments/rest.ts). The numbers are never typed: each
// macro body is generated from the class's own Features table in the SRD
// (`cache/markdown/classes.md`, read through `markdown/classes.ts`), one
// `cond` step per level at which the table's value changes. Before these
// macros a rest refilled a pool to its resource ceiling (Rage 6 at level 1
// where the Barbarian Features table says 2; bead sk-jay0.1.55.11).
//
// Every macro reads `srd/level`, a seeded fact of a player character. The
// rests call a macro only behind the pool's own capability gate, so a
// creature without the feature never evaluates it.
import { classFeatureColumnMarkdownBlock } from "../../markdown/classes";
import { BUNDLE_ID } from "./constants";

export interface PoolMaxUnit {
	macroId: string;
	resourceId: string;
	className: string;
	/** `cache/markdown/classes.md:<start>-<end>` of the Features table. */
	source: string;
	/** Uses by level, index 0 = level 1. */
	byLevel: number[];
	description: string;
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };

function column(className: string, columnName: string): { cells: string[]; source: string } {
	const block = classFeatureColumnMarkdownBlock(className, columnName);
	const cells = block.text
		.split("\n")
		.filter((line) => /^\| \d+ \|/.test(line))
		.map((line) => (line.split("|")[2] ?? "").trim());
	if (cells.length !== 20) {
		throw new Error(
			`pool-max-units: ${className} '${columnName}' has ${cells.length} level rows, expected 20.`,
		);
	}
	return { cells, source: block.source };
}

/** A numeric column: the cell is the count; a dash means the class has none yet. */
function numericColumn(
	className: string,
	columnName: string,
): { byLevel: number[]; source: string } {
	const { cells, source } = column(className, columnName);
	return {
		source,
		byLevel: cells.map((cell) => {
			if (/^\d+$/.test(cell)) return Number(cell);
			if (cell === "—" || cell === "-" || cell === "") return 0;
			throw new Error(`pool-max-units: ${className} '${columnName}' cell '${cell}' is no count.`);
		}),
	};
}

/** A feature whose uses are named in the Class Features column, e.g.
 * "Action Surge (one use)" at one level and "(two uses)" at a later one. */
function featureUsesColumn(
	className: string,
	featureName: string,
): { byLevel: number[]; source: string } {
	const { cells, source } = column(className, "Class Features");
	let current = 0;
	const byLevel = cells.map((cell) => {
		const match = new RegExp(`${featureName} \\((\\w+) uses?\\)`).exec(cell);
		if (match) {
			const uses = NUMBER_WORDS[match[1] ?? ""];
			if (uses === undefined)
				throw new Error(`pool-max-units: '${match[0]}' names no known count.`);
			current = uses;
		}
		return current;
	});
	if (current === 0)
		throw new Error(`pool-max-units: ${className} Features never names '${featureName} (N uses)'.`);
	return { byLevel, source };
}

function unit(
	local: string,
	resourceLocal: string,
	className: string,
	what: string,
	table: { byLevel: number[]; source: string },
): PoolMaxUnit {
	return {
		macroId: `${BUNDLE_ID}/${local}`,
		resourceId: `${BUNDLE_ID}/${resourceLocal}`,
		className,
		source: table.source,
		byLevel: table.byLevel,
		// Player-facing: no source path here (rule-flavor-hygiene); `source` carries the citation.
		description: `How many ${what} a ${className} of this level has.`,
	};
}

let cached: PoolMaxUnit[] | undefined;
export function poolMaxUnits(): PoolMaxUnit[] {
	cached ??= [
		unit(
			"rage_uses_max",
			"barbarian/rage-uses",
			"Barbarian",
			"Rages",
			numericColumn("Barbarian", "Rages"),
		),
		unit(
			"second_wind_uses_max",
			"fighter/second-wind-uses",
			"Fighter",
			"uses of Second Wind",
			numericColumn("Fighter", "Second Wind"),
		),
		unit(
			"action_surge_uses_max",
			"fighter/action-surge-uses",
			"Fighter",
			"uses of Action Surge",
			featureUsesColumn("Fighter", "Action Surge"),
		),
		unit(
			"focus_points_max",
			"monk/focus-points",
			"Monk",
			"Focus Points",
			numericColumn("Monk", "Focus Points"),
		),
		unit(
			"cleric_channel_divinity_uses_max",
			"cleric/channel-divinity-uses",
			"Cleric",
			"uses of Channel Divinity",
			numericColumn("Cleric", "Channel Divinity"),
		),
		unit(
			"paladin_channel_divinity_uses_max",
			"paladin/channel-divinity-uses",
			"Paladin",
			"uses of Channel Divinity",
			numericColumn("Paladin", "Channel Divinity"),
		),
	];
	return cached;
}

export function poolMaxMacroId(resourceId: string): string {
	const found = poolMaxUnits().find((entry) => entry.resourceId === resourceId);
	if (!found) throw new Error(`pool-max-units: no maximum macro for '${resourceId}'.`);
	return found.macroId;
}

/** `cond(level >= L, value, …)` from the highest change point down; 0 below the first. */
export function poolMaxBodySource(byLevel: readonly number[]): string {
	const steps: { level: number; value: number }[] = [];
	byLevel.forEach((value, index) => {
		if (value !== (steps.at(-1)?.value ?? 0)) steps.push({ level: index + 1, value });
	});
	return steps.reduce(
		(rest, step) => `cond(actor.stat('srd/level') >= ${step.level}, ${step.value}, ${rest})`,
		"0",
	);
}

export function poolMaxMacroRows(): Record<string, unknown>[] {
	return poolMaxUnits().map((entry) => ({
		macro_id: entry.macroId,
		bundle_id: BUNDLE_ID,
		return_type: "Int",
		parameters: [],
		body_source: poolMaxBodySource(entry.byLevel),
		description: entry.description,
	}));
}
