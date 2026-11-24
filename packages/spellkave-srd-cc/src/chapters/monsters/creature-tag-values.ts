// pattern: tag-membership-menu
// Monsters chapter's OWN `tag_value_definitions` catalog: two NEW closed-
// choice axes neither existing chapter defines — `srd.size.<slug>` (creature
// Size, `ledger/designs/monsters-chapter-design.md` §3) and
// `srd.cr.<normalized>` (Challenge Rating, same §, kept as a documentary tag
// only — no `resource_definitions` row, since no DSL predicate reads CR
// today, same "don't invent uninvited" posture `hp-units.ts`'s own header
// warns against). MF-VAL-300 (`spell-tag-values.ts`'s own header has the
// full grounding): every `srd.*` tag emitted anywhere in this package must
// resolve against SOME `tag_value_definitions` row visible to the workspace
// that authors it — these two axes are genuinely NEW vocabulary (unlike
// `srd.alignment.*`/`srd.creature_type.*`/`srd.creature`, all already
// defined by other chapters and reused here by reference, never re-authored).
//
// SIZE — 5 values, not 6: `cache/open5e/Creature.json` carries no `tiny`
// creature (cache-verified, `size` field distinct-value scan), so this
// package ships only the 5 SRD size categories the dataset actually uses;
// `buildSizeTagValueUnits`'s own count guard fails loud if a future cache
// resync introduces a Tiny row this catalog doesn't yet cover. DELIBERATELY
// a NEW prefix, not `character-origins/species-units.ts`'s existing
// `srd.creature_size` (a numeric RANK resource for player-character sizing,
// a different mechanism/consumer) — see the design doc's own §3.
//
// CR — the raw `challenge_rating` field is an INCONSISTENT string: 329 rows
// use a zero-padded decimal (`"0.250"`, `"10.000"`), but 2 rows (Giant Fly,
// Octopus) use the bare `"0"` instead of `"0.000"` (cache-verified). ONE
// normalization table (`CR_SLUG_BY_RAW`) handles every raw string this
// dataset actually carries — both `"0"` and `"0.000"` map to the SAME `"0"`
// slug — rather than a per-row special case. A literal, closed lookup (not a
// parse-and-round-trip function) matches this codebase's own "closed,
// cache-verified set" idiom (`spell-units.ts`'s `CASTING_TIME_LABELS`): a
// future cache resync introducing an unrecognized raw string throws loudly
// here rather than silently minting an ungrounded slug.
import { readCreatures } from "../../open5e/creature";
import { buildCreatureRoleTagValueUnits } from "./creature-roles";

export interface CreatureTagValueUnit {
	tag: string;
	prefix: string;
	description: string;
	sourcePk: string;
}

const SRD_TAG_PREFIX = "srd";

export const SIZE_TAG_PREFIX = "srd.size";
export const CR_TAG_PREFIX = "srd.cr";

const EXPECTED_SIZE_SLUGS = ["small", "medium", "large", "huge", "gargantuan"] as const;
export type CreatureSizeSlug = (typeof EXPECTED_SIZE_SLUGS)[number];

function isSizeSlug(value: string): value is CreatureSizeSlug {
	return (EXPECTED_SIZE_SLUGS as readonly string[]).includes(value);
}

/** Throws unless `slug` is one of the 5 sourced Creature.json size categories. */
export function assertCreatureSizeSlug(slug: string): asserts slug is CreatureSizeSlug {
	if (!isSizeSlug(slug)) {
		throw new Error(
			`creature-tag-values: '${slug}' is not one of the 5 sourced Creature.json size categories ` +
				`[${EXPECTED_SIZE_SLUGS.join(", ")}].`,
		);
	}
}

/** The 5 sourced Size tag values + 1 class-level row (6 total) — `srd.size.<slug>`. */
export function buildSizeTagValueUnits(): CreatureTagValueUnit[] {
	const sizesInCache = new Set(readCreatures().map((creature) => creature.size));
	for (const size of sizesInCache) {
		if (!isSizeSlug(size)) {
			throw new Error(
				`creature-tag-values: Creature.json now carries an unrecognized size '${size}' — ` +
					`EXPECTED_SIZE_SLUGS [${EXPECTED_SIZE_SLUGS.join(", ")}] is stale.`,
			);
		}
	}
	if (sizesInCache.size !== EXPECTED_SIZE_SLUGS.length) {
		throw new Error(
			`creature-tag-values: expected exactly ${EXPECTED_SIZE_SLUGS.length} distinct Creature.json ` +
				`sizes, found ${sizesInCache.size} — a cache resync changed shape.`,
		);
	}
	const classUnit: CreatureTagValueUnit = {
		tag: SIZE_TAG_PREFIX,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity definition tag as one of the SRD creature Size categories " +
			"(playing-the-game.md § Combat > Movement and Position > Creature Size). This bundle's " +
			"Creature.json dataset carries no Tiny creature, so only 5 of the 6 SRD size categories " +
			"are represented as values under this prefix.",
		sourcePk: "",
	};
	const valueUnits: CreatureTagValueUnit[] = EXPECTED_SIZE_SLUGS.map((slug) => ({
		tag: `${SIZE_TAG_PREFIX}.${slug}`,
		prefix: SIZE_TAG_PREFIX,
		description: `Identifies a creature entity definition as ${slug === "large" || slug === "huge" ? "a" : "a"} ${slug[0]?.toUpperCase()}${slug.slice(1)} creature.`,
		sourcePk: "",
	}));
	return [classUnit, ...valueUnits];
}

/**
 * Every raw `Creature.json` `challenge_rating` string observed in this
 * dataset (cache-verified, module header) -> its normalized `srd.cr.<slug>`
 * suffix. `"0"` and `"0.000"` deliberately collide on the SAME `"0"` slug —
 * the one inconsistency the design doc's own §3 calls out.
 */
const CR_SLUG_BY_RAW: Readonly<Record<string, string>> = {
	"0": "0",
	"0.000": "0",
	"0.125": "1-8",
	"0.250": "1-4",
	"0.500": "1-2",
	"1.000": "1",
	"2.000": "2",
	"3.000": "3",
	"4.000": "4",
	"5.000": "5",
	"6.000": "6",
	"7.000": "7",
	"8.000": "8",
	"9.000": "9",
	"10.000": "10",
	"11.000": "11",
	"12.000": "12",
	"13.000": "13",
	"14.000": "14",
	"15.000": "15",
	"16.000": "16",
	"17.000": "17",
	"19.000": "19",
	"20.000": "20",
	"21.000": "21",
	"22.000": "22",
	"23.000": "23",
	"24.000": "24",
	"30.000": "30",
};

/** Human-readable label for a normalized CR slug (`"1-4"` -> `"1/4"`, `"5"` -> `"5"`). */
function crLabel(slug: string): string {
	return slug.includes("-") ? slug.replace("-", "/") : slug;
}

/** Normalize one raw `Creature.json` `challenge_rating` string to its `srd.cr.<slug>` suffix — throws loudly on an unrecognized raw value (module header: closed, cache-verified lookup, never a parse-and-round-trip). */
export function normalizeChallengeRating(raw: string): string {
	const slug = CR_SLUG_BY_RAW[raw];
	if (slug === undefined) {
		throw new Error(
			`creature-tag-values: unrecognized raw challenge_rating '${raw}' — CR_SLUG_BY_RAW is stale ` +
				"against cache/open5e/Creature.json (a cache resync may have introduced a new CR value).",
		);
	}
	return slug;
}

/** Every distinct `srd.cr.<slug>` tag value this dataset needs, plus 1 class-level row, derived mechanically from `readCreatures()` (never hand-typed — mirrors `spell-tag-values.ts`'s own derivation posture). */
export function buildCrTagValueUnits(): CreatureTagValueUnit[] {
	const rawValues = new Set(readCreatures().map((creature) => creature.challengeRating));
	const slugs = new Set([...rawValues].map((raw) => normalizeChallengeRating(raw)));
	const classUnit: CreatureTagValueUnit = {
		tag: CR_TAG_PREFIX,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity definition tag as a creature's SRD Challenge Rating (CR) — " +
			"documentary only, no resource_definitions row: no DSL predicate reads CR today " +
			"(ledger/designs/monsters-chapter-design.md §3).",
		sourcePk: "",
	};
	const valueUnits: CreatureTagValueUnit[] = [...slugs]
		.sort((a, b) => {
			const numericA = a.includes("-")
				? Number(a.split("-")[0]) / Number(a.split("-")[1])
				: Number(a);
			const numericB = b.includes("-")
				? Number(b.split("-")[0]) / Number(b.split("-")[1])
				: Number(b);
			return numericA - numericB;
		})
		.map((slug) => ({
			tag: `${CR_TAG_PREFIX}.${slug}`,
			prefix: CR_TAG_PREFIX,
			description: `Identifies a creature entity definition with Challenge Rating ${crLabel(slug)}.`,
			sourcePk: "",
		}));
	return [classUnit, ...valueUnits];
}

/** The Monsters chapter's own full tag_value_definitions catalog: Size + CR + combat-role. */
export function buildCreatureTagValueUnits(): CreatureTagValueUnit[] {
	return [
		...buildSizeTagValueUnits(),
		...buildCrTagValueUnits(),
		...buildCreatureRoleTagValueUnits(),
	];
}
