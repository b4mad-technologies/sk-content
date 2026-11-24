// Creature Size and Space (playing-the-game.md § Combat > Movement and
// Position > Creature Size): the 6-row table mapping a size category to its
// square footprint in feet and grid squares. Ledger row: "Creature Size and
// Space" (`ledger/playing-the-game.md`).
//
// SOURCE: `cache/open5e/Rule.json`, pk `srd-2024_combat_movement-and-position`
// — the SAME record as the "Movement and Position" unit (both split out of
// one open5e record, same posture as Skills identity-list / Skill
// Proficiencies mechanic in the earlier slice). Unlike the D20 core-procedure
// unit's own step-3 gap, this record carries the Creature Size and Space
// table cleanly as a markdown pipe table — no markdown-cache fallback needed.
//
// DATA VS CONSTANTS DECISION (same precedent as ability-checks-units.ts /
// travel-pace-units.ts): PARSED CONSTANT TABLE, not a fixture row. Grepped
// for a consumer: no creature/monster fixture anywhere in the sister
// (`world-fixtures/srd/base/monsters.toml`) or this package authors a "size"
// field at all — `grep -ni '\bsize\b'` over the sister's own monsters.toml
// turns up nothing but a stray comment; every creature's footprint on the
// combat grid is implicitly Medium (1 cell) today, with no size-derived
// multi-cell occupancy anywhere in the substrate (grepped
// `server/src/world_interaction/layer2/tactical_grid.rs` and
// `combat_grid_blueprint.rs` — a spawned actor occupies exactly one grid cell,
// no multi-cell footprint concept exists). So there is genuinely nothing to
// compose this table against yet; it ships as a row-less reference table —
// see `ledger/playing-the-game.md`. The
// day a creature-footprint mechanic lands (a Large+ creature occupying a 2x2
// block of cells), this table is the ready-made lookup.
import { ruleByPk } from "../../open5e/rule";

export const MOVEMENT_AND_POSITION_RULE_PK = "srd-2024_combat_movement-and-position";

const EXPECTED_SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"] as const;
type SizeName = (typeof EXPECTED_SIZES)[number];

/** One row of the Creature Size and Space table (Size | Space (Feet) | Space (Squares)). */
export interface CreatureSizeRow {
	size: SizeName;
	/** Verbatim (trimmed) "Space (Feet)" cell, e.g. "5 by 5 feet" — a footprint description, not a single number. */
	spaceFeet: string;
	/** Verbatim (trimmed) "Space (Squares)" cell, e.g. "4 squares (2 by 2)" — kept as text; see `squareCount` for the parsed count. */
	spaceSquares: string;
	/**
	 * The square-count this size occupies, parsed from `spaceSquares`. Tiny is
	 * the one irregular row ("4 per square", i.e. 4 Tiny creatures share ONE
	 * square — the inverse of every other row) — represented as `0.25` (1/4 of
	 * a square), never silently coerced to a whole number.
	 */
	squareCount: number;
}

function parseSquareCount(cell: string, size: SizeName): number {
	if (size === "Tiny") {
		const match = cell.match(/^(\d+) per square$/);
		if (match === null) {
			throw new Error(
				`creature-size-units: Tiny row cell '${cell}' does not match 'N per square'.`,
			);
		}
		const perSquare = Number.parseInt(match[1] ?? "", 10);
		return 1 / perSquare;
	}
	if (cell === "1 square") {
		return 1;
	}
	const match = cell.match(/^(\d+) squares? \(\d+ by \d+\)$/);
	if (match === null) {
		throw new Error(
			`creature-size-units: ${size} row cell '${cell}' does not match '1 square' or 'N squares (A by A)'.`,
		);
	}
	return Number.parseInt(match[1] ?? "", 10);
}

/**
 * Parse the Creature Size and Space table (Size | Space (Feet) | Space
 * (Squares)) out of the rule's own markdown-pipe-table desc. Throws loudly on
 * any shape surprise (AGENTS.md loud-fail parser posture).
 */
export function parseCreatureSizeTable(desc: string): CreatureSizeRow[] {
	const lines = desc.split("\n").map((line) => line.trim());
	const headerIndex = lines.findIndex((line) =>
		/^\|Size\|Space \(Feet\)\|Space \(Squares\)\|$/.test(line),
	);
	if (headerIndex === -1) {
		throw new Error(
			"creature-size-units: '|Size|Space (Feet)|Space (Squares)|' header not found in rule " +
				`'${MOVEMENT_AND_POSITION_RULE_PK}'.`,
		);
	}
	const separatorLine = lines[headerIndex + 1];
	if (separatorLine === undefined || !/^\|-+\|-+\|-+\|$/.test(separatorLine)) {
		throw new Error(
			"creature-size-units: no '|---|---|---|' separator immediately after the Creature Size header.",
		);
	}
	const rows: CreatureSizeRow[] = [];
	for (let index = headerIndex + 2; index < lines.length; index += 1) {
		const line = lines[index];
		if (line === undefined || !/^\|[^|]+\|[^|]+\|[^|]+\|$/.test(line)) {
			break;
		}
		const cells = line
			.slice(1, -1)
			.split("|")
			.map((cell) => cell.trim());
		const [sizeCell, spaceFeet, spaceSquares] = cells;
		if (sizeCell === undefined || spaceFeet === undefined || spaceSquares === undefined) {
			throw new Error("creature-size-units: Creature Size row missing a cell.");
		}
		if (!(EXPECTED_SIZES as readonly string[]).includes(sizeCell)) {
			throw new Error(
				`creature-size-units: unexpected size name '${sizeCell}' — expected one of ${EXPECTED_SIZES.join(", ")}.`,
			);
		}
		const size = sizeCell as SizeName;
		rows.push({
			size,
			spaceFeet,
			spaceSquares,
			squareCount: parseSquareCount(spaceSquares, size),
		});
	}
	if (rows.length !== EXPECTED_SIZES.length) {
		throw new Error(
			`creature-size-units: expected exactly ${EXPECTED_SIZES.length} Creature Size rows, got ${rows.length}.`,
		);
	}
	const seenSizes = new Set(rows.map((row) => row.size));
	for (const size of EXPECTED_SIZES) {
		if (!seenSizes.has(size)) {
			throw new Error(`creature-size-units: Creature Size table is missing the '${size}' row.`);
		}
	}
	return rows;
}

/** The parsed Creature Size and Space table, read from the committed cache. */
export function creatureSizeTable(): CreatureSizeRow[] {
	return parseCreatureSizeTable(ruleByPk(MOVEMENT_AND_POSITION_RULE_PK).desc);
}
