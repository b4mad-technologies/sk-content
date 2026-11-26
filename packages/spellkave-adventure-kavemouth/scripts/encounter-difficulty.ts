import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parse } from "smol-toml";
import { combatantOccupancy } from "../author/combatants.ts";
import { cryptFight } from "../author/crypt-fight.ts";
import { ENCOUNTER_TARGETS } from "../author/encounter-targets.ts";
import { encounters } from "../author/encounters.ts";
import { q1Rats } from "../author/q1-rats.ts";

const srdRoot = new URL("../../spellkave-srd-cc/", import.meta.url);
type Row = Record<string, unknown>;

function required(value: string | undefined): string {
	if (value === undefined) throw new Error("Missing SRD table cell");
	return value;
}

/** Parse the cached SRD HTML table, never transcribe rule numbers.
 * SRD 5.2.1: cache/markdown/gameplay-toolbox.md:824-962 (per-character
 * budgets), :964-980 (sum unadjusted creature XP; no 2014 multipliers).
 * CR → XP: cache/markdown/monsters.md:203-324 (CR 0 permits 0 or 10).
 * All paths in these rule citations are relative to spellkave-srd-cc.
 */
function sourceTable(file: string, heading: string): string[][] {
	const source = readFileSync(new URL(`cache/markdown/${file}`, srdRoot), "utf8");
	const start = source.indexOf(`**${heading}**`);
	if (start < 0) throw new Error(`Missing SRD table ${heading}`);
	const table = source.slice(start).match(/<table>[\s\S]*?<\/table>/)?.[0];
	if (!table) throw new Error(`Missing table body ${heading}`);
	return [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
		.map((row) =>
			[...required(row[1]).matchAll(/<td>(.*?)<\/td>/g)].map((cell) => required(cell[1]).trim()),
		)
		.filter((cells) => cells.length > 0);
}

function integer(text: string): number {
	if (!/^\d[\d,]*$/.test(text)) throw new Error(`Invalid SRD integer: ${text}`);
	return Number(text.replaceAll(",", ""));
}

export const XP_BUDGETS = new Map(
	sourceTable("gameplay-toolbox.md", "XP Budget per Character").map((cells) => {
		if (cells.length !== 4) throw new Error("Malformed encounter budget row");
		return [
			integer(required(cells[0])),
			{
				low: integer(required(cells[1])),
				moderate: integer(required(cells[2])),
				high: integer(required(cells[3])),
			},
		];
	}),
);
const xpByCr = new Map<string, number[]>();
for (const cells of sourceTable("monsters.md", "Experience Points by Challenge Rating")) {
	if (cells.length !== 4) throw new Error("Malformed CR/XP row");
	for (const offset of [0, 2]) {
		xpByCr.set(
			required(cells[offset]).replaceAll("/", "-"),
			required(cells[offset + 1])
				.split(" or ")
				.map(integer),
		);
	}
}

export function creatureWorth(slug: string): { cr: string; xp: number } {
	const doc = parse(readFileSync(new URL(`fixtures/base/monsters/${slug}.toml`, srdRoot), "utf8"));
	const definition = `srd/creature/${slug}`;
	const states = doc.entity_definition_initial_state as Row[];
	const tags = doc.entity_definition_tag as Row[];
	const xp = states.find(
		(row) => row.entity_def_id === definition && row.state_id === "srd/xp_value",
	)?.value_int;
	const crTag = tags.find(
		(row) => row.entity_def_id === definition && String(row.tag).startsWith("srd.cr."),
	)?.tag;
	if (typeof xp !== "number" || typeof crTag !== "string")
		throw new Error(`Missing XP/CR fixture data for ${slug}`);
	const cr = crTag.slice("srd.cr.".length);
	if (!xpByCr.get(cr)?.includes(xp))
		throw new Error(`${slug}: fixture XP ${xp} disagrees with SRD CR ${cr}`);
	return { cr: cr.replaceAll("-", "/"), xp };
}

export function budgetTier(xp: number, level: number, partySize = 1): string {
	const budget = XP_BUDGETS.get(level);
	if (!budget || !Number.isInteger(partySize) || partySize < 1)
		throw new Error(`Invalid target L${level} × ${partySize}`);
	if (xp <= budget.low * partySize) return "Low";
	if (xp <= budget.moderate * partySize) return "Moderate";
	if (xp <= budget.high * partySize) return "High";
	return "Above High";
}

export function encounterDifficulty() {
	const groups = new Map<string, Map<string, number>>();
	// Consume actual generator placements, including Q1 and the entry Warden,
	// rather than the inventory prose or quest kill-XP summary lists.
	for (const call of [...q1Rats(), ...encounters(), ...cryptFight(), ...combatantOccupancy()]) {
		if (call.toolName !== "spellkave_place_actor") continue;
		const params = call.params as Row;
		const def = String(params.entity_def);
		if (!def.startsWith("srd/creature/")) throw new Error(`Uncatalogued actor ${def}`);
		const place = String(params.at);
		if (!(place in ENCOUNTER_TARGETS))
			throw new Error(`Missing authored encounter target: ${place}`);
		const count = params.count ?? 1;
		if (typeof count !== "number" || !Number.isInteger(count) || count < 1)
			throw new Error(`Invalid count at ${place}`);
		const group = groups.get(place) ?? new Map<string, number>();
		const slug = def.slice("srd/creature/".length);
		group.set(slug, (group.get(slug) ?? 0) + count);
		groups.set(place, group);
	}
	for (const place of Object.keys(ENCOUNTER_TARGETS)) {
		if (!groups.has(place)) throw new Error(`Authored target has no encounter: ${place}`);
	}
	return [...groups]
		.map(([place, group]) => {
			const target = ENCOUNTER_TARGETS[place];
			if (!target) throw new Error(`Missing authored target ${place}`);
			const creatures = [...group].map(([slug, count]) => ({
				slug,
				count,
				...creatureWorth(slug),
			}));
			// XP/HP instance overrides are rewards/tuning, not changes to SRD CR.
			const xp = creatures.reduce((total, creature) => total + creature.xp * creature.count, 0);
			return {
				place,
				creatures,
				xp,
				...target,
				solo: budgetTier(xp, target.level),
				duo: budgetTier(xp, target.level, 2),
				targetTier: budgetTier(xp, target.level, target.partySize),
			};
		})
		.sort((a, b) => a.place.localeCompare(b.place));
}

export function difficultyTable(): string {
	return [
		"| Place | Creatures (CR) | Level | XP | Party 1 | Party 2 | Authored party | Target tier |",
		"|---|---|---:|---:|---|---|---:|---|",
		...encounterDifficulty().map(
			(row) =>
				`| ${row.place.replace("kavemouth/", "")} | ${row.creatures.map((c) => `${c.count}× ${c.slug} (${c.cr})`).join(" + ")} | ${row.level} | ${row.xp} | ${row.solo} | ${row.duo} | ${row.partySize} | ${row.targetTier} |`,
		),
	].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
	console.log(difficultyTable());
