// Bundle-owned exact tag vocabulary for the values this package currently
// emits. Membership remains plain tag data: these rows describe vocabulary;
// they do not create capabilities, niches, or server behaviour.

import { buildBackgroundUnits } from "../character-origins/background-units";
import { ABILITY_CHECKS_RULE_PK, typicalDifficultyClasses } from "./ability-checks-units";
import { ABILITY_SCORES_RULE_PK, abilityScoreBands } from "./ability-units";
import {
	buildCreatureTypeUnits,
	CREATURE_NICHE_TAG,
	CREATURE_TYPE_TAG_PREFIX,
	MONSTER_TAG,
	PLAYER_CHARACTER_TAG,
} from "./creature-type-units";
import { TRAVEL_RULE_PK, travelPaceEffects, travelPaceTable } from "./travel-pace-units";
import { VOCAL_COMMUNICATION_TAG } from "./vocal-communication-identity-units";

export interface TagValueDefinitionUnit {
	tag: string;
	prefix: string;
	description: string;
	sourcePk: string;
}

const SRD_TAG_PREFIX = "srd";
export const DIFFICULTY_CLASS_TAG = "srd.difficulty_class";
export const ROLL_BIAS_ADVANTAGE_TAG = "srd.roll_bias.advantage";
export const ROLL_BIAS_DISADVANTAGE_TAG = "srd.roll_bias.disadvantage";
export const TRAVEL_PACE_TAG_PREFIX = "srd.travel_pace";
/** Character Origins (O1): the class-level background tag, plus `${BACKGROUND_TAG_PREFIX}.<slug>` per background. */
export const BACKGROUND_TAG_PREFIX = "srd.background";
/** sk-ntz.3 (content hygiene): the combat_grid party/monster faction instance
 * tags, renamed from the legacy colon-shaped `faction:party`/`faction:monsters`
 * (MF-VAL-296/297/298). Single source of truth — `combat-arena.ts`'s
 * `ARENA_PARTY_FACTION_TAG`/`ARENA_MONSTERS_FACTION_TAG` and `crypt-fight.ts`'s
 * `CRYPT_FIGHT_PARTY_FACTION_TAG`/`CRYPT_FIGHT_MONSTERS_FACTION_TAG` re-export
 * these values verbatim rather than re-declaring the literal a third place. */
export const FACTION_PARTY_TAG = "srd.faction.party";
export const FACTION_MONSTERS_TAG = "srd.faction.monsters";

/** sk-ntz.7 (content hygiene): kavemouth field-kit / torch / rations
 * definition tags, renamed from the legacy flat `container` / `gear` /
 * `food` / `light` (MF-VAL-297/298). Documentary membership only — no DSL
 * or kernel reader today; catalogued so the closed `srd` vocabulary stays
 * exact (MF-VAL-306). */
export const ITEM_CONTAINER_TAG = "srd.item.container";
export const ITEM_GEAR_TAG = "srd.item.gear";
export const ITEM_FOOD_TAG = "srd.item.food";
export const ITEM_LIGHT_TAG = "srd.item.light";

/** sk-ntz.7: Aldwin's persona / creation-station role tags, renamed from
 * the slash-flat `dm-npc/aldwin` / `dm-npc/creation` (MF-VAL-297). Live
 * readers: `dm/level-up` and `dm/creation` niche predicates
 * (`target.has_niche`). */
export const DM_NPC_ALDWIN_TAG = "srd.dm_npc.aldwin";
export const DM_NPC_CREATION_TAG = "srd.dm_npc.creation";
/** Live reader: entity-provided `dm/niche/dialog` + `tag_capability_grant` for set-open. */
export const DM_NPC_TALKER_TAG = "srd.dm_npc.talker";

/** sk-ntz.7: the kavemouth heroes party membership tag, renamed from the
 * legacy colon-shaped `member_of:kavemouth/party/heroes` (MF-VAL-296).
 * The party extent's `extent_ref` IS this tag — the kernel no longer
 * prefixes `member_of:`. */
export const PARTY_HEROES_TAG = "srd.party.heroes";

/** sk-0f5: identity tag marking a trainer that affords `srd/advancement/level-up`.
 * The niche_definitions row still lives in `character-creation/advancement-units.ts`;
 * this catalog only declares closed-vocabulary membership (MF-VAL-300). */
export const ADVANCEMENT_TRAINER_TAG = "srd.advancement_trainer";

/** Render the source-derived 1–30 meaning table into the shared ability-score tag metadata. */
export function abilityScoreTagDescription(): string {
	const meanings = abilityScoreBands()
		.map(({ minScore, maxScore, meaning }) => {
			const score = minScore === maxScore ? `${minScore}` : `${minScore}–${maxScore}`;
			return `${score} — ${meaning}`;
		})
		.join(" ");
	return `Identifies a resource definition as one of the six SRD ability scores. Score meanings: ${meanings}`;
}

/** Render the source-derived Typical Difficulty Classes ladder into shared DC tag metadata. */
export function difficultyClassTagDescription(): string {
	const ladder = typicalDifficultyClasses()
		.map(({ taskDifficulty, dc }) => `${taskDifficulty} — ${dc}`)
		.join(". ");
	return (
		"Identifies a resource definition as an SRD Difficulty Class. " +
		`Typical Difficulty Classes: ${ladder}.`
	);
}

/** Render each source-derived Travel Pace row as one catalog tag description. */
export function buildTravelPaceTagUnits(): TagValueDefinitionUnit[] {
	const effectsByPace = new Map(
		travelPaceEffects().map((effect) => [effect.pace, effect.effectText]),
	);
	return travelPaceTable().map((row) => {
		const effect = effectsByPace.get(row.pace);
		if (effect === undefined) {
			throw new Error(`tag-value-vocabulary: no Travel Pace effect found for '${row.pace}'.`);
		}
		return {
			tag: `${TRAVEL_PACE_TAG_PREFIX}.${row.pace.toLowerCase()}`,
			prefix: TRAVEL_PACE_TAG_PREFIX,
			description:
				`${row.pace} Travel Pace. Distance: ${row.feetPerMinute} feet per minute; ` +
				`${row.milesPerHour} miles per hour; ${row.milesPerDay} miles per day. ${effect}`,
			sourcePk: TRAVEL_RULE_PK,
		};
	});
}

const CURRENT_TAG_VALUE_UNITS: readonly TagValueDefinitionUnit[] = [
	{
		tag: "srd.ability_score",
		prefix: SRD_TAG_PREFIX,
		description: abilityScoreTagDescription(),
		sourcePk: ABILITY_SCORES_RULE_PK,
	},
	{
		tag: DIFFICULTY_CLASS_TAG,
		prefix: SRD_TAG_PREFIX,
		description: difficultyClassTagDescription(),
		sourcePk: ABILITY_CHECKS_RULE_PK,
	},
	{
		tag: "srd.skill",
		prefix: SRD_TAG_PREFIX,
		description: "Identifies a capability definition as an SRD skill.",
		sourcePk: "",
	},
	{
		tag: "srd.action",
		prefix: SRD_TAG_PREFIX,
		description: "Identifies a capability definition as one of the named SRD actions.",
		sourcePk: "",
	},
	{
		tag: "srd.check",
		prefix: SRD_TAG_PREFIX,
		description: "Identifies a capability definition as an SRD ability or skill check.",
		sourcePk: "",
	},
	{
		tag: "srd.item",
		prefix: SRD_TAG_PREFIX,
		description: "Identifies an entity definition as an SRD item.",
		sourcePk: "",
	},
	{
		tag: "srd.consumable",
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity definition as a consumable used through the srd/consume verb " +
			"(one dose per use; fragments/consume.ts).",
		sourcePk: "",
	},
	{
		tag: "srd.tool",
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity definition as an SRD tool. Tool identity is separate from the " +
			"actor capability that represents proficiency with that tool.",
		sourcePk: "",
	},
	{
		tag: "srd.tool_proficiency",
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies a capability definition as an SRD tool proficiency. Future Character " +
			"Creation class/background generation grants this capability; the tag itself is metadata only.",
		sourcePk: "",
	},
	{
		tag: "srd.lock",
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity definition as a lock target for the sourced Thieves' Tools " +
			"lock-picking check. SRD source: Item.json pk srd-2024_lock.",
		sourcePk: "srd-2024_lock",
	},
	{
		tag: "srd.armor",
		prefix: SRD_TAG_PREFIX,
		description: "Identifies an entity definition or modifier template as SRD armor.",
		sourcePk: "",
	},
	{
		tag: "srd.armor.heavy",
		prefix: SRD_TAG_PREFIX,
		description: "Identifies an entity definition or modifier template as SRD heavy armor.",
		sourcePk: "",
	},
	{
		// Equipment E2 (`ledger/equipment.md`): the remaining 3 weight classes
		// `equipment.md`'s own Armor table subsections carry — `srd.armor.heavy`
		// above already covers Heavy; `.light`/`.medium` are the other two body
		// classes and `.shield` is the table's own separate Shield subsection
		// (`armor-units.ts`'s `ArmorWeightClass`, `equipment/index.ts`'s
		// remaining-armor fragment).
		tag: "srd.armor.light",
		prefix: SRD_TAG_PREFIX,
		description: "Identifies an entity definition or modifier template as SRD light armor.",
		sourcePk: "",
	},
	{
		tag: "srd.armor.medium",
		prefix: SRD_TAG_PREFIX,
		description: "Identifies an entity definition or modifier template as SRD medium armor.",
		sourcePk: "",
	},
	{
		tag: "srd.armor.shield",
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity definition or modifier template as an SRD Shield. Distinct " +
			"table subsection from Light/Medium/Heavy armor (equipment.md's own 'Shield' heading).",
		sourcePk: "",
	},
	{
		tag: ROLL_BIAS_ADVANTAGE_TAG,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies a modifier template that grants Advantage on a ResolutionCheck. " +
			"SRD source: playing-the-game.md:395-399.",
		sourcePk: "",
	},
	{
		tag: ROLL_BIAS_DISADVANTAGE_TAG,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies a modifier template that imposes Disadvantage on a ResolutionCheck. " +
			"SRD source: playing-the-game.md:395-399.",
		sourcePk: "",
	},
	{
		tag: CREATURE_NICHE_TAG,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies a creature-shaped entity. The entity tag supplies target-niche " +
			"membership and derives the bundle's implemented universal creature attempts through " +
			"tag_capability_grant.",
		sourcePk: "",
	},
	{
		tag: MONSTER_TAG,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies a monster entity definition — Monster Death (playing-the-game.md:1217) " +
			"applies only to a tagged actor: a monster dies the instant it drops to 0 Hit Points, " +
			"where a character instead falls Unconscious and makes Death Saving Throws (:1229-1247). " +
			"Omitting this tag on a specific monster is the SRD's own documented escape hatch " +
			"('a Game Master can ignore this rule for an individual monster and treat it like a " +
			"character', :1217). Player characters and all other actors carry no tag under this prefix.",
		sourcePk: "",
	},
	{
		tag: PLAYER_CHARACTER_TAG,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies a player-character entity definition and anchors its PC-only " +
			"identity->capability bridge (tag_capability_grant): a player character may Level Up, " +
			"Claim Victory, and spend Heroic Inspiration to reroll. Universal creature attempts " +
			"derive separately from srd.creature. It does NOT " +
			"ship the character death branch: Death Saving Throws (playing-the-game.md:1229-1247) " +
			"remain unshipped and the Monster Death guard still keys on srd.monster alone, so this " +
			"tag is not its negation. Never authored on a monster or ordinary NPC.",
		sourcePk: "",
	},
	{
		tag: VOCAL_COMMUNICATION_TAG,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity definition with an established vocal communication modality and " +
			"grants the shipped Speak capability through tag_capability_grant. It is independent of " +
			"srd.creature target identity, srd.language.* competence, and non-vocal modalities.",
		sourcePk: "",
	},
	{
		// Feats chapter (F1, `ledger/feats.md`): registered HERE, not in
		// `feats/index.ts`, same pattern as `srd.item`/`srd.armor` above —
		// this bundle's bare `"srd"` tag_prefixes entry is REF-TYPED
		// (`target_kind: "tag_value_definitions"`, `bundle-row.ts`), so every
		// `srd.*` tag emitted anywhere in this package (any chapter) must
		// resolve to a row in THIS ONE closed catalog (MF-VAL-300) — a new
		// chapter's own tags register here, they don't grow a second
		// vocabulary file.
		tag: "srd.feat",
		prefix: SRD_TAG_PREFIX,
		description: "Identifies an entity definition as an SRD feat.",
		sourcePk: "",
	},
	{
		tag: "srd.feat.origin",
		prefix: SRD_TAG_PREFIX,
		description: "Identifies a feat entity definition (or its gate capability) as an Origin feat.",
		sourcePk: "",
	},
	{
		// F2 (Feats quick-win completion, `ledger/feats.md`): the remaining 3
		// categories `feats.md`'s own table of contents names (`srd.feat.origin`
		// above already covers Origin) — same registration posture, this
		// bundle's bare "srd" prefix.
		tag: "srd.feat.general",
		prefix: SRD_TAG_PREFIX,
		description: "Identifies a feat entity definition as a General feat.",
		sourcePk: "",
	},
	{
		tag: "srd.feat.fighting_style",
		prefix: SRD_TAG_PREFIX,
		description: "Identifies a feat entity definition as a Fighting Style feat.",
		sourcePk: "",
	},
	{
		tag: "srd.feat.epic_boon",
		prefix: SRD_TAG_PREFIX,
		description: "Identifies a feat entity definition as an Epic Boon feat.",
		sourcePk: "",
	},
	{
		// Character Origins chapter (O1, `ledger/character-origins.md`):
		// registered HERE, not in `character-origins/index.ts`, same pattern as
		// `srd.feat`/`srd.feat.origin` above — every `srd.*` tag emitted
		// anywhere in this package resolves against this ONE closed catalog
		// (MF-VAL-300).
		tag: BACKGROUND_TAG_PREFIX,
		prefix: SRD_TAG_PREFIX,
		description: "Identifies an entity definition as an SRD background.",
		sourcePk: "",
	},
	{
		tag: `${BACKGROUND_TAG_PREFIX}.acolyte`,
		prefix: SRD_TAG_PREFIX,
		description: "Identifies a background entity definition as the Acolyte background.",
		sourcePk: "srd-2024_acolyte",
	},
	{
		tag: `${BACKGROUND_TAG_PREFIX}.criminal`,
		prefix: SRD_TAG_PREFIX,
		description: "Identifies a background entity definition as the Criminal background.",
		sourcePk: "srd-2024_criminal",
	},
	{
		tag: `${BACKGROUND_TAG_PREFIX}.sage`,
		prefix: SRD_TAG_PREFIX,
		description: "Identifies a background entity definition as the Sage background.",
		sourcePk: "srd-2024_sage",
	},
	{
		tag: `${BACKGROUND_TAG_PREFIX}.soldier`,
		prefix: SRD_TAG_PREFIX,
		description: "Identifies a background entity definition as the Soldier background.",
		sourcePk: "srd-2024_soldier",
	},
	{
		// sk-ntz.3 (content hygiene): registered HERE, not in `combat-arena.ts`/
		// `crypt-fight.ts`, same pattern as `srd.feat`/`srd.background` above —
		// every `srd.*` tag emitted anywhere in this package resolves against
		// this ONE closed catalog (MF-VAL-300). Renamed from the legacy
		// colon-shaped `faction:party` (MF-VAL-296/297/298): the proof-scene
		// combat arena's and kavemouth's own crypt-fight instance tag
		// identifying an entity as standing with the player's own party for a
		// combat_grid session's termination/winner predicates.
		tag: FACTION_PARTY_TAG,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity instance as standing with the player's own party — a combat_grid " +
			"session's termination/winner predicates group participants by this tag's prefix " +
			"('srd.faction.'). Renamed from the legacy colon-shaped 'faction:party' (sk-ntz.3).",
		sourcePk: "",
	},
	{
		tag: FACTION_MONSTERS_TAG,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity instance as standing with the opposing monster faction — the same " +
			"combat_grid termination/winner grouping as srd.faction.party, the other side. Renamed " +
			"from the legacy colon-shaped 'faction:monsters' (sk-ntz.3).",
		sourcePk: "",
	},
	{
		// sk-ntz.7 (content hygiene): the remaining flat item tags the
		// kavemouth starter kit carried (`container`/`gear`/`food`/`light`).
		// Documentary membership under the existing `srd.item` family — no
		// runtime reader today; catalogued so the closed `srd` vocabulary
		// stays exact (MF-VAL-306).
		tag: ITEM_CONTAINER_TAG,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity definition as a container item — a pack or other vessel that " +
			"can hold other items. Renamed from the legacy flat 'container' (sk-ntz.7).",
		sourcePk: "",
	},
	{
		tag: ITEM_GEAR_TAG,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity definition as adventuring gear. Renamed from the legacy flat " +
			"'gear' (sk-ntz.7).",
		sourcePk: "",
	},
	{
		tag: ITEM_FOOD_TAG,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity definition as food (rations or similar). Renamed from the " +
			"legacy flat 'food' (sk-ntz.7).",
		sourcePk: "",
	},
	{
		tag: ITEM_LIGHT_TAG,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity definition as a light source (a torch or similar). Distinct " +
			"from srd.armor.light. Renamed from the legacy flat 'light' (sk-ntz.7).",
		sourcePk: "",
	},
	{
		// sk-ntz.7: Aldwin's persona / creation-station role tags. Live
		// readers are the dm/level-up and dm/creation niche predicates.
		tag: DM_NPC_ALDWIN_TAG,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity instance as Aldwin (the hearth-ledger keeper) — the level-up " +
			"wizard's directed target. Renamed from the legacy slash-flat 'dm-npc/aldwin' (sk-ntz.7).",
		sourcePk: "",
	},
	{
		tag: DM_NPC_CREATION_TAG,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity instance as a character-creation station — the creation " +
			"wizard's directed target. Renamed from the legacy slash-flat 'dm-npc/creation' (sk-ntz.7).",
		sourcePk: "",
	},
	{
		tag: DM_NPC_TALKER_TAG,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an NPC that provides numbered dialog answers (entity-provided dm/niche/dialog). " +
			"tag_capability_grant on this tag composes the self-only set-open verb; Answer k is gated " +
			"on the NPC's dm/dialog/open count.",
		sourcePk: "",
	},
	{
		// sk-ntz.7: party membership. The party extent's extent_ref IS this
		// tag (the kernel no longer prefixes member_of:).
		tag: PARTY_HEROES_TAG,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity instance as a member of the kavemouth heroes party. A party " +
			"extent grant names this same string as extent_ref; membership is every body " +
			"carrying the tag, plus their current session peers. Renamed from the legacy " +
			"colon-shaped 'member_of:kavemouth/party/heroes' (sk-ntz.7).",
		sourcePk: "",
	},
	{
		// sk-0f5: registered HERE, not in `character-creation/advancement-units.ts`.
		// Leaf identity tag under the bare `srd` prefix — structurally identical to
		// `srd.feat` / `srd.background` / `srd.item`. The niche that affords
		// level-up still ships beside the action; this row is vocabulary only.
		tag: ADVANCEMENT_TRAINER_TAG,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identity tag marking an entity as a trainer that affords " +
			"srd/advancement/level-up to a co-located eligible actor " +
			"(character-creation.md:769-810 (§ Gaining a Level)). Carries identity only — " +
			"the affordance rides the same-named niche_definitions row, never this " +
			"vocabulary entry.",
		sourcePk: "character-creation.md:769-810 (§ Gaining a Level)",
	},
];

/** The current general values plus 3 Travel Paces and 14 sourced Creature Types. */
export function buildTagValueDefinitionUnits(): TagValueDefinitionUnit[] {
	const backgrounds = new Map(
		buildBackgroundUnits().map((unit) => [
			`${BACKGROUND_TAG_PREFIX}.${unit.slug}`,
			`${unit.displayName} background. Skill proficiencies: ${unit.skillNames.join(" and ")}. ` +
				`Origin feat: ${unit.featName}${unit.featQualifier ? ` (${unit.featQualifier})` : ""}.`,
		]),
	);
	const generalValues = CURRENT_TAG_VALUE_UNITS.map((unit) => ({
		...unit,
		description: backgrounds.get(unit.tag) ?? unit.description,
	}));
	const travelPaces = buildTravelPaceTagUnits();
	const creatureTypes = buildCreatureTypeUnits().map((unit) => ({
		tag: `${CREATURE_TYPE_TAG_PREFIX}.${unit.slug}`,
		prefix: CREATURE_TYPE_TAG_PREFIX,
		description: unit.description,
		sourcePk: unit.pk,
	}));
	return [...generalValues, ...travelPaces, ...creatureTypes];
}
