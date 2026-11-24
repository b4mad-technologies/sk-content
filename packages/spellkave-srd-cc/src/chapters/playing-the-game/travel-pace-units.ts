// Travel Pace (playing-the-game.md § Exploration > Travel > Travel Pace).
// Ledger row: `ledger/playing-the-game.md` "Travel Pace". Bundled with
// Vehicles in the SAME open5e Rule record (`srd-2024_exploration_travel`,
// index 6 of the RuleSet `srd-2024_exploration`) — this module owns only the
// Travel Pace half; Vehicles stays a pure pointer row, no parseable content
// (confirmed by reading the same desc: "Travelers in wagons... choose a pace
// as normal... 'Equipment' includes vehicles for sale" — a cross-chapter
// pointer, nothing numeric).
//
// DATA VS CONSTANTS DECISION (same precedent as ability-checks-units.ts's
// Typical Difficulty Classes ladder): the distance-per-time table is a
// PARSED CONSTANT TABLE, not a fixture row. Grepped for a consumer: no
// movement-cost predicate anywhere in this bundle or the sister reads a
// distance-per-time value at authoring time. The substrate's ONE real
// movement mechanism (`srd/speed_cells` / `movement_cost_cells`,
// `server/src/world_interaction/layer2/r_move.rs`) is COMBAT-GRID movement
// (5-ft cells, per-turn) — a structurally DIFFERENT concept from this
// section's abstract OUTSIDE-COMBAT travel pace (feet/minute, miles/hour,
// miles/day). The chapter's own source text draws this same line explicitly:
// "If you need to know how fast you can move when every second matters, see
// the movement rules in 'Combat'" — i.e. the SRD itself treats Travel Pace
// and grid Speed as two different rules for two different situations. No
// overland/abstracted-travel-time mechanism exists anywhere in the substrate
// (grepped server/src and world-fixtures/**) to compose this table against,
// so it ships as a row-less reference table — see
// `ledger/playing-the-game.md`.
//
// PER-PACE EFFECTS: read directly from the cached text rather than assumed.
// Fast imposes Disadvantage on Wisdom (Perception/Survival) AND Dexterity
// (Stealth) checks; Normal imposes Disadvantage on Dexterity (Stealth)
// checks only; Slow grants Advantage on Wisdom (Perception/Survival) checks.
// All three are Advantage/Disadvantage-SHAPED — confirmed by the actual
// cached text, not assumed. HISTORY: originally recorded as the 5th/6th
// confirmed consumer of finding #23 (bare `d20` never consulted
// `ComposedRollBias`) — #23 was CLOSED in bucket b7, so the bias channel is
// no longer the blocker. What actually remains (2026-07-28 maxim-audit
// correction, F5): NO travel-pace state axis exists anywhere — nothing
// represents "this actor currently travels Fast/Normal/Slow" (repo-wide
// grep: zero hits), so the pace-effect conditions have no fact to gate on.
// That is an AUTHORING-design follow-up, not a substrate gap: a pace state
// plus gate-predicated condition rows are expressible with existing rows
// (post-#23), but who WRITES the pace and where the condition vocabulary
// lives (Rules-Glossary chapter owns conditions, bucket-4 stance) is an
// open design decision — recorded in this unit's ledger row, deliberately
// not forced here.
import { ruleByPk } from "../../open5e/rule";

export const TRAVEL_RULE_PK = "srd-2024_exploration_travel";

const EXPECTED_PACES = ["Fast", "Normal", "Slow"] as const;
type PaceName = (typeof EXPECTED_PACES)[number];

/** One row of the Travel Pace table (Pace | Minute | Hour | Day). */
export interface TravelPaceRow {
	pace: PaceName;
	feetPerMinute: number;
	milesPerHour: number;
	milesPerDay: number;
}

/** This pace's SRD game effect — Advantage/Disadvantage-shaped, blocked on finding #23. */
export interface TravelPaceEffect {
	pace: PaceName;
	/** Verbatim (trimmed) SRD sentence for this pace. */
	effectText: string;
	biasKind: "advantage" | "disadvantage" | "mixed";
}

function numberFromUnitCell(cell: string, unitSuffix: RegExp, context: string): number {
	const match = cell.trim().match(unitSuffix);
	if (match === null) {
		throw new Error(`travel-pace-units: cell '${cell}' (${context}) does not match ${unitSuffix}.`);
	}
	const value = Number.parseInt(match[1] ?? "", 10);
	if (!Number.isFinite(value)) {
		throw new Error(
			`travel-pace-units: cell '${cell}' (${context}) parsed to a non-finite number.`,
		);
	}
	return value;
}

/**
 * Parse the Travel Pace distance table (Pace | Minute | Hour | Day) out of
 * the rule's own markdown-pipe-table desc. Throws loudly on any shape
 * surprise (AGENTS.md loud-fail parser posture) — never a silent partial
 * table.
 */
export function parseTravelPaceTable(desc: string): TravelPaceRow[] {
	const lines = desc.split("\n").map((line) => line.trim());
	const headerIndex = lines.findIndex((line) => /^\|Pace\|Minute\|Hour\|Day\|$/.test(line));
	if (headerIndex === -1) {
		throw new Error(
			"travel-pace-units: '|Pace|Minute|Hour|Day|' header not found in rule " +
				`'${TRAVEL_RULE_PK}'.`,
		);
	}
	const separatorLine = lines[headerIndex + 1];
	if (separatorLine === undefined || !/^\|-+\|-+\|-+\|-+\|$/.test(separatorLine)) {
		throw new Error(
			`travel-pace-units: no '|---|---|---|---|' separator immediately after the Travel Pace header.`,
		);
	}
	const rows: TravelPaceRow[] = [];
	for (let index = headerIndex + 2; index < lines.length; index += 1) {
		const line = lines[index];
		if (line === undefined || !/^\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|$/.test(line)) {
			break;
		}
		const cells = line
			.slice(1, -1)
			.split("|")
			.map((cell) => cell.trim());
		const [paceCell, minuteCell, hourCell, dayCell] = cells;
		if (
			paceCell === undefined ||
			minuteCell === undefined ||
			hourCell === undefined ||
			dayCell === undefined
		) {
			throw new Error("travel-pace-units: Travel Pace row missing a cell.");
		}
		if (!(EXPECTED_PACES as readonly string[]).includes(paceCell)) {
			throw new Error(
				`travel-pace-units: unexpected pace name '${paceCell}' — expected one of ${EXPECTED_PACES.join(", ")}.`,
			);
		}
		rows.push({
			pace: paceCell as PaceName,
			feetPerMinute: numberFromUnitCell(minuteCell, /^(\d+)\s*feet$/, `${paceCell} minute cell`),
			milesPerHour: numberFromUnitCell(hourCell, /^(\d+)\s*miles?$/, `${paceCell} hour cell`),
			milesPerDay: numberFromUnitCell(dayCell, /^(\d+)\s*miles?$/, `${paceCell} day cell`),
		});
	}
	if (rows.length !== EXPECTED_PACES.length) {
		throw new Error(
			`travel-pace-units: expected exactly ${EXPECTED_PACES.length} Travel Pace rows, got ${rows.length}.`,
		);
	}
	const seenPaces = new Set(rows.map((row) => row.pace));
	for (const pace of EXPECTED_PACES) {
		if (!seenPaces.has(pace)) {
			throw new Error(`travel-pace-units: Travel Pace table is missing the '${pace}' row.`);
		}
	}
	return rows;
}

/** The parsed Travel Pace distance table, read from the committed cache. */
export function travelPaceTable(): TravelPaceRow[] {
	return parseTravelPaceTable(ruleByPk(TRAVEL_RULE_PK).desc);
}

const EFFECT_BIAS_KIND: Record<PaceName, TravelPaceEffect["biasKind"]> = {
	Fast: "disadvantage",
	Normal: "disadvantage",
	Slow: "advantage",
};

/**
 * Parse the three "**Pace.** Traveling at a ... pace ..." sentences out of
 * the same rule's desc (bold-run-in markers, not italic — confirmed against
 * the actual cached JSON, not assumed). Throws loudly if any of the three
 * expected paces has no matching sentence.
 */
export function parseTravelPaceEffects(desc: string): TravelPaceEffect[] {
	return EXPECTED_PACES.map((pace) => {
		const pattern = new RegExp(`\\*\\*${pace}\\.\\*\\*\\s*([^\\n]+)`);
		const match = desc.match(pattern);
		if (match === null || match[1] === undefined || match[1].trim().length === 0) {
			throw new Error(
				`travel-pace-units: no '**${pace}.** ...' effect sentence found in rule '${TRAVEL_RULE_PK}'.`,
			);
		}
		return {
			pace,
			effectText: match[1].trim(),
			biasKind: EFFECT_BIAS_KIND[pace],
		};
	});
}

/** The parsed per-pace effect sentences, read from the committed cache. */
export function travelPaceEffects(): TravelPaceEffect[] {
	return parseTravelPaceEffects(ruleByPk(TRAVEL_RULE_PK).desc);
}
