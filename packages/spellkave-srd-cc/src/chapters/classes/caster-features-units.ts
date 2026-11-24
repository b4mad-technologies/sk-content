// pattern: identity-tag-capability-grant
// Classes chapter — caster non-spellcasting features through character level 4
// (lane L3 / sk-609b.4). OWN generator unit deliberately separate from
// `advancement-metadata-units.ts` (L2 ceiling) and
// `spellcasting-substrate-units.ts` (L1 slots/profiles).
//
// Design: `bead sk-609b.4 (design trail)` +
// `docs/caster-features-l1-4.md`. Second Wind shape for spend resources;
// Help/Dodge for condition grants; shared `srd.advancement_choice` member rows (docs/advancement-choice.md).
import type { AuthorTarget, SetMetadataUpdate } from "@spellkave/tool-authoring";
import { readResourceFlavor, resourceFlavorSlug } from "../../flavor/read";
import {
	type ClassFeatureRecord,
	readClassFeatureItems,
	readClassFeaturesByParentPk,
} from "../../open5e/class-feature";
import type { ChapterUnitSummary } from "../chapter-types";
import { buildRemainingFeatUnits } from "../feats/remaining-feats-units";
import {
	BONUS_CHANNEL_ID,
	PRIMARY_CHANNEL_ID,
	TURN_START_BOUNDARY_ID,
} from "../playing-the-game/action-economy-units";
import {
	REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID,
	STACKING_SINGLE_LOCAL_ID,
} from "../playing-the-game/cover-units";
import { CREATURE_NICHE_TAG } from "../playing-the-game/creature-type-units";
import { damageRollExpr } from "../playing-the-game/damage-units";
import { cappedHealingExpr } from "../playing-the-game/healing-units";
import { HP_ID } from "../playing-the-game/hp-units";
import {
	ABILITY_CHECK_RESOLUTION_SCOPE_ID,
	resolutionScopeModifierTargetRow,
} from "../playing-the-game/resolution-scope-units";
import { buildSkillUnits } from "../playing-the-game/skill-units";
import { driveUnitScene, metadataCall, type VerbCall } from "../verb-runner";
import { ADVANCEMENT_CHOICE_NAMESPACE } from "./advancement-metadata-units";
import {
	buildCasterFeaturesL12cCalls,
	casterFeaturesL12cUnits,
} from "./caster-features-l12c-units";
import {
	advancementChoiceOptionEntityId,
	advancementChoiceOptionLocalId,
} from "./choice-option-ids";

export const BUNDLE_ID = "srd";

const HP_STATE_ID = `${BUNDLE_ID}/${HP_ID}`;

// ── Resource / action constants ────────────────────────────────────────────

export const CLERIC_CD_USES_LOCAL_ID = "cleric/channel-divinity-uses";
export const CLERIC_CD_USES_RESOURCE_ID = `${BUNDLE_ID}/${CLERIC_CD_USES_LOCAL_ID}`;
export const CLERIC_CD_USES_MIN = 0;
export const CLERIC_CD_USES_MAX = 3;
export const CLERIC_CD_USES_INITIAL = 2;
export const CLERIC_CD_RECOVERY_RULE = "short_rest_partial_long_rest_full";
export const CLERIC_CD_CAPABILITY_LOCAL_ID = "class-feature/cleric/channel-divinity";
export const CLERIC_CD_CAPABILITY_ID = `${BUNDLE_ID}/${CLERIC_CD_CAPABILITY_LOCAL_ID}`;
export const DIVINE_SPARK_HEAL_ACTION_LOCAL_ID = "cleric/divine-spark-heal";
export const DIVINE_SPARK_HEAL_ACTION_ID = `${BUNDLE_ID}/${DIVINE_SPARK_HEAL_ACTION_LOCAL_ID}`;
export const DIVINE_SPARK_HEAL_NICHE_ID = `capability:${CLERIC_CD_CAPABILITY_ID}`;

export const PALADIN_CD_USES_LOCAL_ID = "paladin/channel-divinity-uses";
export const PALADIN_CD_USES_RESOURCE_ID = `${BUNDLE_ID}/${PALADIN_CD_USES_LOCAL_ID}`;
export const PALADIN_CD_USES_MIN = 0;
export const PALADIN_CD_USES_MAX = 3;
export const PALADIN_CD_USES_INITIAL = 2;
export const PALADIN_CD_CAPABILITY_LOCAL_ID = "class-feature/paladin/channel-divinity";
export const PALADIN_CD_CAPABILITY_ID = `${BUNDLE_ID}/${PALADIN_CD_CAPABILITY_LOCAL_ID}`;
export const PALADIN_CD_SPEND_ACTION_LOCAL_ID = "paladin/channel-divinity-spend";
export const PALADIN_CD_SPEND_ACTION_ID = `${BUNDLE_ID}/${PALADIN_CD_SPEND_ACTION_LOCAL_ID}`;
export const PALADIN_CD_NICHE_ID = `capability:${PALADIN_CD_CAPABILITY_ID}`;

export const BARDIC_USES_LOCAL_ID = "bard/bardic-inspiration-uses";
export const BARDIC_USES_RESOURCE_ID = `${BUNDLE_ID}/${BARDIC_USES_LOCAL_ID}`;
export const BARDIC_USES_MIN = 0;
export const BARDIC_USES_MAX = 5;
export const BARDIC_USES_INITIAL = 1;
export const BARDIC_CAPABILITY_LOCAL_ID = "class-feature/bard/bardic-inspiration";
export const BARDIC_CAPABILITY_ID = `${BUNDLE_ID}/${BARDIC_CAPABILITY_LOCAL_ID}`;
export const BARDIC_ACTION_LOCAL_ID = "bard/bardic-inspiration";
export const BARDIC_ACTION_ID = `${BUNDLE_ID}/${BARDIC_ACTION_LOCAL_ID}`;
export const BARDIC_CONDITION_LOCAL_ID = "condition/bardic-inspiration";
export const BARDIC_CONDITION_ID = `${BUNDLE_ID}/${BARDIC_CONDITION_LOCAL_ID}`;

export const WILD_SHAPE_USES_LOCAL_ID = "druid/wild-shape-uses";
export const WILD_SHAPE_USES_RESOURCE_ID = `${BUNDLE_ID}/${WILD_SHAPE_USES_LOCAL_ID}`;
export const WILD_SHAPE_USES_MIN = 0;
export const WILD_SHAPE_USES_MAX = 4;
export const WILD_SHAPE_USES_INITIAL = 2;
export const WILD_SHAPE_CAPABILITY_LOCAL_ID = "class-feature/druid/wild-shape";
export const WILD_SHAPE_CAPABILITY_ID = `${BUNDLE_ID}/${WILD_SHAPE_CAPABILITY_LOCAL_ID}`;
export const WILD_SHAPE_ACTION_LOCAL_ID = "druid/wild-shape";
export const WILD_SHAPE_ACTION_ID = `${BUNDLE_ID}/${WILD_SHAPE_ACTION_LOCAL_ID}`;
export const WILD_SHAPE_NICHE_ID = `capability:${WILD_SHAPE_CAPABILITY_ID}`;

export const LAY_ON_HANDS_LOCAL_ID = "paladin/lay-on-hands";
export const LAY_ON_HANDS_RESOURCE_ID = `${BUNDLE_ID}/${LAY_ON_HANDS_LOCAL_ID}`;
export const LAY_ON_HANDS_MIN = 0;
export const LAY_ON_HANDS_MAX = 20;
export const LAY_ON_HANDS_INITIAL = 0;
export const LAY_ON_HANDS_UNIT = 5;
export const LAY_ON_HANDS_CAPABILITY_LOCAL_ID = "class-feature/paladin/lay-on-hands";
export const LAY_ON_HANDS_CAPABILITY_ID = `${BUNDLE_ID}/${LAY_ON_HANDS_CAPABILITY_LOCAL_ID}`;
export const LAY_ON_HANDS_ACTION_LOCAL_ID = "paladin/lay-on-hands";
export const LAY_ON_HANDS_ACTION_ID = `${BUNDLE_ID}/${LAY_ON_HANDS_ACTION_LOCAL_ID}`;
export const LAY_ON_HANDS_NICHE_ID = `capability:${LAY_ON_HANDS_CAPABILITY_ID}`;

export const FAVORED_ENEMY_USES_LOCAL_ID = "ranger/favored-enemy-uses";
export const FAVORED_ENEMY_USES_RESOURCE_ID = `${BUNDLE_ID}/${FAVORED_ENEMY_USES_LOCAL_ID}`;
export const FAVORED_ENEMY_USES_MIN = 0;
export const FAVORED_ENEMY_USES_MAX = 6;
export const FAVORED_ENEMY_USES_INITIAL = 2;
export const FAVORED_ENEMY_CAPABILITY_LOCAL_ID = "class-feature/ranger/favored-enemy";
export const FAVORED_ENEMY_CAPABILITY_ID = `${BUNDLE_ID}/${FAVORED_ENEMY_CAPABILITY_LOCAL_ID}`;
export const FAVORED_ENEMY_ACTION_LOCAL_ID = "ranger/favored-enemy";
export const FAVORED_ENEMY_ACTION_ID = `${BUNDLE_ID}/${FAVORED_ENEMY_ACTION_LOCAL_ID}`;
export const FAVORED_ENEMY_NICHE_ID = `capability:${FAVORED_ENEMY_CAPABILITY_ID}`;

export const INNATE_SORCERY_USES_LOCAL_ID = "sorcerer/innate-sorcery-uses";
export const INNATE_SORCERY_USES_RESOURCE_ID = `${BUNDLE_ID}/${INNATE_SORCERY_USES_LOCAL_ID}`;
export const INNATE_SORCERY_USES_MIN = 0;
export const INNATE_SORCERY_USES_MAX = 2;
export const INNATE_SORCERY_USES_INITIAL = 2;
export const INNATE_SORCERY_CAPABILITY_LOCAL_ID = "class-feature/sorcerer/innate-sorcery";
export const INNATE_SORCERY_CAPABILITY_ID = `${BUNDLE_ID}/${INNATE_SORCERY_CAPABILITY_LOCAL_ID}`;
export const INNATE_SORCERY_ACTION_LOCAL_ID = "sorcerer/innate-sorcery";
export const INNATE_SORCERY_ACTION_ID = `${BUNDLE_ID}/${INNATE_SORCERY_ACTION_LOCAL_ID}`;
export const INNATE_SORCERY_NICHE_ID = `capability:${INNATE_SORCERY_CAPABILITY_ID}`;
export const INNATE_SORCERY_CONDITION_LOCAL_ID = "condition/innate-sorcery";
export const INNATE_SORCERY_CONDITION_ID = `${BUNDLE_ID}/${INNATE_SORCERY_CONDITION_LOCAL_ID}`;

export const SORCERY_POINTS_LOCAL_ID = "sorcerer/sorcery-points";
export const SORCERY_POINTS_RESOURCE_ID = `${BUNDLE_ID}/${SORCERY_POINTS_LOCAL_ID}`;
export const SORCERY_POINTS_MIN = 0;
export const SORCERY_POINTS_MAX = 20;
export const SORCERY_POINTS_INITIAL = 0;

// Arcane Recovery / Magical Cunning (L12b / BL-70)
export const ARCANE_RECOVERY_USES_LOCAL_ID = "wizard/arcane-recovery-uses";
export const ARCANE_RECOVERY_USES_RESOURCE_ID = `${BUNDLE_ID}/${ARCANE_RECOVERY_USES_LOCAL_ID}`;
export const ARCANE_RECOVERY_CAPABILITY_LOCAL_ID = "class-feature/wizard/arcane-recovery";
export const ARCANE_RECOVERY_CAPABILITY_ID = `${BUNDLE_ID}/${ARCANE_RECOVERY_CAPABILITY_LOCAL_ID}`;
export const ARCANE_RECOVERY_ACTION_LOCAL_ID = "wizard/arcane-recovery";
export const ARCANE_RECOVERY_ACTION_ID = `${BUNDLE_ID}/${ARCANE_RECOVERY_ACTION_LOCAL_ID}`;
export const ARCANE_RECOVERY_NICHE_ID = `capability:${ARCANE_RECOVERY_CAPABILITY_ID}`;
export const ARCANE_RECOVERY_ANCHOR =
	"classes.md:10241-10245 (§ Wizard > Level 1: Arcane Recovery)";

export const MAGICAL_CUNNING_USES_LOCAL_ID = "warlock/magical-cunning-uses";
export const MAGICAL_CUNNING_USES_RESOURCE_ID = `${BUNDLE_ID}/${MAGICAL_CUNNING_USES_LOCAL_ID}`;
export const MAGICAL_CUNNING_CAPABILITY_LOCAL_ID = "class-feature/warlock/magical-cunning";
export const MAGICAL_CUNNING_CAPABILITY_ID = `${BUNDLE_ID}/${MAGICAL_CUNNING_CAPABILITY_LOCAL_ID}`;
export const MAGICAL_CUNNING_ACTION_LOCAL_ID = "warlock/magical-cunning";
export const MAGICAL_CUNNING_ACTION_ID = `${BUNDLE_ID}/${MAGICAL_CUNNING_ACTION_LOCAL_ID}`;
export const MAGICAL_CUNNING_NICHE_ID = `capability:${MAGICAL_CUNNING_CAPABILITY_ID}`;
export const MAGICAL_CUNNING_ANCHOR = "classes.md:8998-9000 (§ Warlock > Level 2: Magical Cunning)";

const SPELL_SLOT_1 = `${BUNDLE_ID}/spell_slot_1`;
const SPELL_SLOT_2 = `${BUNDLE_ID}/spell_slot_2`;
const LEVEL_STAT = `${BUNDLE_ID}/level`;

// ── Choice catalog (shared member-row shape — docs/advancement-choice.md) ─
// One metadata_attachments row PER MENU MEMBER. Payload:
//   { class, level, choice_group, choose_n, recommended?, rechoose? }
// target_ref = member entity id. Subclass L3 menus are NOT authored here —
// advancement-metadata-units.ts (martial/full-game) already emits choose-1-of-1
// for all 12 classes; duplicating them would double the reader groups.

/** Shared shape with martial lane / docs/advancement-choice.md. */
export interface AdvancementChoiceMember {
	classSlug: string;
	level: number;
	choiceGroup: string;
	chooseN: number;
	memberEntityId: string;
	recommendedMemberId?: string;
	rechoose?: "none" | "long_rest_one";
	anchor: string;
}

/** Alias kept for tests that still import the old name. */
export type AdvancementChoiceSpec = AdvancementChoiceMember;

/** Eldritch invocation count L1–4 from ClassFeatureItem (L1=1, L2=3). */
export function eldritchInvocationCountByLevel(): { level: number; count: number }[] {
	return readClassFeatureItems("srd-2024_warlock_eldritch-invocation-count")
		.filter((item) => item.level >= 1 && item.level <= 4)
		.map((item) => {
			if (item.columnValue === null) {
				throw new Error(
					`caster-features: eldritch-invocation-count level ${item.level} has null column_value`,
				);
			}
			return { level: item.level, count: Number.parseInt(item.columnValue, 10) };
		});
}

export function clericChannelDivinityUsesColumn(): { level: number; uses: number }[] {
	return readClassFeatureItems("srd-2024_cleric_channel-divinity-uses")
		.filter((item) => item.level >= 2 && item.level <= 4)
		.map((item) => ({
			level: item.level,
			uses: Number.parseInt(item.columnValue ?? "0", 10),
		}));
}

function classFeatureByPk(pk: string, parentPk: string): ClassFeatureRecord {
	const found = readClassFeaturesByParentPk(parentPk).find((row) => row.pk === pk);
	if (found === undefined) {
		throw new Error(`caster-features: missing ClassFeature.json row '${pk}' under '${parentPk}'.`);
	}
	return found;
}

/** Parse `### Option Name` headings from a CLASS_FEATURE_OPTION_LIST desc. */
export function optionListHeadings(featurePk: string, parentPk: string): string[] {
	return optionListSections(featurePk, parentPk).map((section) => section.name);
}

/** One ### section from a CLASS_FEATURE_OPTION_LIST desc (name + body prose). */
export interface OptionListSection {
	name: string;
	slug: string;
	body: string;
}

/** Parse `### Option Name` sections (heading + body) from ClassFeature desc. */
export function optionListSections(featurePk: string, parentPk: string): OptionListSection[] {
	const desc = classFeatureByPk(featurePk, parentPk).desc;
	const parts = desc.split(/^### /m).slice(1);
	const sections: OptionListSection[] = [];
	for (const part of parts) {
		const newline = part.indexOf("\n");
		const name = (newline === -1 ? part : part.slice(0, newline)).trim();
		if (name.length === 0) continue;
		const body = (newline === -1 ? "" : part.slice(newline + 1)).trim();
		sections.push({ name, slug: titleToSlug(name), body });
	}
	if (sections.length === 0) {
		throw new Error(`caster-features: no ### option headings in '${featurePk}'.`);
	}
	return sections;
}

function titleToSlug(title: string): string {
	return title
		.toLowerCase()
		.replace(/['']/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

/** Menu-member entity row the dialogue may grant (martial expertise-option idiom). */
export interface ChoiceOptionEntity {
	/** Local id under the bundle, e.g. `divine-order/protector`. */
	localId: string;
	displayName: string;
	description: string;
	/** Full entity id `srd/...`. */
	entityId: string;
	anchor: string;
}

/**
 * Option entity_definitions this lane must emit so `srd.advancement_choice`
 * member target_refs resolve at live apply (MF-APPLY-026). Bard Expertise +
 * Wizard Scholar retarget onto the shared martial `srd/expertise-option/*`
 * entities (already emitted by martial-slice2); fighting styles are real feat
 * entities. Everything else is authored here.
 */
export function choiceOptionEntitiesToAuthor(): ChoiceOptionEntity[] {
	const divineOrder: ChoiceOptionEntity[] = [
		{
			localId: "divine-order/protector",
			displayName: "Divine Order: Protector",
			description:
				"Cleric Divine Order option Protector (classes.md:2205-2211). " +
				"Trained for battle, you gain proficiency with Martial weapons and training with Heavy armor. " +
				"Menu member only — dialogue grants the mechanical benefits when chosen.",
			entityId: `${BUNDLE_ID}/divine-order/protector`,
			anchor: "classes.md:2205-2211",
		},
		{
			localId: "divine-order/thaumaturge",
			displayName: "Divine Order: Thaumaturge",
			description:
				"Cleric Divine Order option Thaumaturge (classes.md:2205-2211). " +
				"You know one extra cantrip from the Cleric spell list. In addition, your mystical connection " +
				"to the divine gives you a bonus to your Intelligence (Arcana or Religion) checks equal to " +
				"your Wisdom modifier (minimum of +1). Menu member only — dialogue grants the benefits when chosen.",
			entityId: `${BUNDLE_ID}/divine-order/thaumaturge`,
			anchor: "classes.md:2205-2211",
		},
	];
	const primalOrder: ChoiceOptionEntity[] = [
		{
			localId: "primal-order/magician",
			displayName: "Primal Order: Magician",
			description:
				"Druid Primal Order option Magician (classes.md:3521-3527). " +
				"You know one extra cantrip from the Druid spell list. In addition, your mystical connection " +
				"to nature gives you a bonus to your Intelligence (Arcana or Nature) checks equal to your " +
				"Wisdom modifier (minimum bonus of +1). Menu member only — dialogue grants the benefits when chosen.",
			entityId: `${BUNDLE_ID}/primal-order/magician`,
			anchor: "classes.md:3521-3527",
		},
		{
			localId: "primal-order/warden",
			displayName: "Primal Order: Warden",
			description:
				"Druid Primal Order option Warden (classes.md:3521-3527). " +
				"Trained for battle, you gain proficiency with Martial weapons and training with Medium armor. " +
				"Menu member only — dialogue grants the benefits when chosen.",
			entityId: `${BUNDLE_ID}/primal-order/warden`,
			anchor: "classes.md:3521-3527",
		},
	];
	const metamagic = optionListSections(
		"srd-2024_sorcerer_metamagic-options",
		"srd-2024_sorcerer",
	).map((section) => ({
		localId: `metamagic/${section.slug}`,
		displayName: `Metamagic: ${section.name}`,
		description: `${section.name} — a Sorcerer Metamagic option.`,
		entityId: `${BUNDLE_ID}/metamagic/${section.slug}`,
		anchor: "ClassFeature srd-2024_sorcerer_metamagic-options + classes.md:7722+",
	}));
	const invocations = optionListSections(
		"srd-2024_warlock_eldritch-invocation-options",
		"srd-2024_warlock",
	).map((section) => ({
		localId: `eldritch-invocation/${section.slug}`,
		displayName: `Eldritch Invocation: ${section.name}`,
		description: `${section.name} — a Warlock Eldritch Invocation.`,
		entityId: `${BUNDLE_ID}/eldritch-invocation/${section.slug}`,
		anchor: "ClassFeature srd-2024_warlock_eldritch-invocation-options + classes.md:9034+",
	}));
	return [...divineOrder, ...primalOrder, ...metamagic, ...invocations];
}

function optionEntityCalls(): VerbCall[] {
	return choiceOptionEntitiesToAuthor().map((option) => ({
		toolName: "spellkave_define_entity_type",
		label: `entity:${option.localId}`,
		params: {
			bundle: BUNDLE_ID,
			id: option.localId,
			display_name: option.displayName,
			description: option.description,
			// Empty tags: throwaway scene has no class-feature tag seed (MF-VAL-300);
			// identity lives in the id + description. Martial expertise-option tags
			// are optional for apply resolution — target_ref only needs the entity row.
			tags: [],
		},
	}));
}

function fightingStyleMemberIds(): string[] {
	const ids = buildRemainingFeatUnits()
		.filter((unit) => unit.category === "Fighting Style")
		.map((unit) => unit.entityId)
		.sort((a, b) => a.localeCompare(b));
	if (ids.length === 0) {
		throw new Error("caster-features: no Fighting Style feats found.");
	}
	return ids;
}

function membersForMenu(opts: {
	classSlug: string;
	level: number;
	choiceSlug: string;
	chooseN: number;
	memberEntityIds: readonly string[];
	recommendedMemberId?: string;
	anchor: string;
	rechoose?: "none" | "long_rest_one";
}): AdvancementChoiceMember[] {
	const choiceGroup = `${BUNDLE_ID}/${opts.classSlug}/${opts.level}/${opts.choiceSlug}`;
	return opts.memberEntityIds.map((memberEntityId) => ({
		classSlug: opts.classSlug,
		level: opts.level,
		choiceGroup,
		chooseN: opts.chooseN,
		memberEntityId,
		recommendedMemberId: opts.recommendedMemberId,
		rechoose: opts.rechoose ?? "none",
		anchor: opts.anchor,
	}));
}

/**
 * Caster-lane choice MENUS as member rows (shared shape with martial lane).
 * Excludes subclass L3 (owned by advancement-metadata-units on full-game).
 */
export function advancementChoiceMembers(): AdvancementChoiceMember[] {
	const invCounts = eldritchInvocationCountByLevel();
	const invL1 = invCounts.find((r) => r.level === 1)?.count ?? 1;
	const invL2 = invCounts.find((r) => r.level === 2)?.count ?? 3;
	const fightingStyles = fightingStyleMemberIds();
	// Expertise menus share martial `srd/expertise-option/<slug>` entity rows
	// (rogue.toml) — server rejects capability_definition target_kind
	// (MF-APPLY-027); skill capability ids are not entity_definitions.
	const expertiseOptionIds = buildSkillUnits().map(
		(u) => `${BUNDLE_ID}/expertise-option/${u.slug}`,
	);
	const scholarExpertiseOptionIds = [
		"arcana",
		"history",
		"investigation",
		"medicine",
		"nature",
		"religion",
	].map((slug) => `${BUNDLE_ID}/expertise-option/${slug}`);

	const metamagicIds = optionListSections(
		"srd-2024_sorcerer_metamagic-options",
		"srd-2024_sorcerer",
	).map((section) => `${BUNDLE_ID}/metamagic/${section.slug}`);

	const invocationIds = optionListSections(
		"srd-2024_warlock_eldritch-invocation-options",
		"srd-2024_warlock",
	).map((section) => `${BUNDLE_ID}/eldritch-invocation/${section.slug}`);

	return [
		...membersForMenu({
			classSlug: "cleric",
			level: 1,
			choiceSlug: "divine-order",
			chooseN: 1,
			memberEntityIds: [
				`${BUNDLE_ID}/divine-order/protector`,
				`${BUNDLE_ID}/divine-order/thaumaturge`,
			],
			anchor: "classes.md:2205-2211",
		}),
		...membersForMenu({
			classSlug: "druid",
			level: 1,
			choiceSlug: "primal-order",
			chooseN: 1,
			memberEntityIds: [`${BUNDLE_ID}/primal-order/magician`, `${BUNDLE_ID}/primal-order/warden`],
			anchor: "classes.md:3521-3527",
		}),
		...membersForMenu({
			classSlug: "paladin",
			level: 2,
			choiceSlug: "fighting-style",
			chooseN: 1,
			memberEntityIds: fightingStyles,
			recommendedMemberId: `${BUNDLE_ID}/feat/defense`,
			anchor: "classes.md:paladin-fighting-style",
		}),
		...membersForMenu({
			classSlug: "ranger",
			level: 2,
			choiceSlug: "fighting-style",
			chooseN: 1,
			memberEntityIds: fightingStyles,
			recommendedMemberId: `${BUNDLE_ID}/feat/defense`,
			anchor: "classes.md:ranger-fighting-style",
		}),
		...membersForMenu({
			classSlug: "bard",
			level: 2,
			choiceSlug: "expertise",
			chooseN: 2,
			memberEntityIds: expertiseOptionIds,
			recommendedMemberId: `${BUNDLE_ID}/expertise-option/performance`,
			anchor: "classes.md:888-892",
		}),
		// SRD Metamagic at L2: learn two options (classes.md Metamagic feature).
		...membersForMenu({
			classSlug: "sorcerer",
			level: 2,
			choiceSlug: "metamagic",
			chooseN: 2,
			memberEntityIds: metamagicIds,
			anchor: "classes.md:7688-7694 + ClassFeature metamagic-options",
		}),
		...membersForMenu({
			classSlug: "warlock",
			level: 1,
			choiceSlug: "eldritch-invocations",
			chooseN: invL1,
			memberEntityIds: invocationIds,
			anchor: `ClassFeatureItem eldritch-invocation-count L1=${invL1}`,
		}),
		...membersForMenu({
			classSlug: "warlock",
			level: 2,
			choiceSlug: "eldritch-invocations",
			chooseN: invL2,
			memberEntityIds: invocationIds,
			anchor: `ClassFeatureItem eldritch-invocation-count L2=${invL2}`,
		}),
		...membersForMenu({
			classSlug: "wizard",
			level: 2,
			choiceSlug: "scholar",
			chooseN: 1,
			memberEntityIds: scholarExpertiseOptionIds,
			anchor: "classes.md:10247-10249",
		}),
	];
}

/** Alias used by older call sites / tests. */
export function advancementChoiceSpecs(): AdvancementChoiceMember[] {
	return advancementChoiceMembers();
}

function choiceMetadataUpdate(member: AdvancementChoiceMember): SetMetadataUpdate {
	// Unique target_ref — see choice-option-ids.ts / L5d (shared feat/weapon/ASI
	// and cross-menu expertise-option refs collapse on live upsert).
	const optionId = advancementChoiceOptionEntityId(
		member.classSlug,
		member.level,
		member.memberEntityId,
	);
	const payload: Record<string, unknown> = {
		class: member.classSlug,
		level: member.level,
		choice_group: member.choiceGroup,
		choose_n: member.chooseN,
		rechoose: member.rechoose ?? "none",
		grants_ref: member.memberEntityId,
	};
	if (member.recommendedMemberId !== undefined) {
		payload.recommended = advancementChoiceOptionEntityId(
			member.classSlug,
			member.level,
			member.recommendedMemberId,
		);
	}
	return {
		target: { kind: "entity_definition", ref: optionId },
		key: ADVANCEMENT_CHOICE_NAMESPACE,
		value: payload,
	};
}

function choiceOptionEntityCalls(choices: readonly AdvancementChoiceMember[]): VerbCall[] {
	const seen = new Set<string>();
	const calls: VerbCall[] = [];
	for (const member of choices) {
		const optionId = advancementChoiceOptionEntityId(
			member.classSlug,
			member.level,
			member.memberEntityId,
		);
		if (seen.has(optionId)) continue;
		seen.add(optionId);
		const localId = advancementChoiceOptionLocalId(
			member.classSlug,
			member.level,
			member.memberEntityId,
		);
		const tail = member.memberEntityId.includes("/")
			? member.memberEntityId.slice(member.memberEntityId.indexOf("/") + 1)
			: member.memberEntityId;
		calls.push({
			toolName: "spellkave_define_entity_type",
			label: `entity:${localId}`,
			params: {
				bundle: BUNDLE_ID,
				id: localId,
				display_name: `Advancement choice: ${member.classSlug} L${member.level} → ${tail}`,
				description:
					`Menu member for ${member.choiceGroup} (unique under metadata_attachment natural key). ` +
					`Names ${member.memberEntityId}.`,
				tags: [],
			},
		});
	}
	return calls;
}

export function buildCasterFeaturesMetadataUpdates(): SetMetadataUpdate[] {
	return advancementChoiceMembers().map(choiceMetadataUpdate);
}

export function buildCasterFeaturesChoiceOptionCalls(): VerbCall[] {
	return choiceOptionEntityCalls(advancementChoiceMembers());
}

function gateUses(resourceId: string): string {
	return `actor.stat('${resourceId}') >= 1`;
}

function gatePool(resourceId: string, unit: number): string {
	return `actor.stat('${resourceId}') >= ${unit}`;
}

function actorNicheCall(nicheId: string, displayName: string, label: string): VerbCall {
	return {
		toolName: "spellkave_write_rows",
		label: `niche:${label}`,
		params: {
			bundle: BUNDLE_ID,
			kind: "niche_definitions",
			rows: [
				{
					niche_id: nicheId,
					bundle_id: BUNDLE_ID,
					display_name: displayName,
					description:
						"sk-0m4.69: class features are actor-carried — capability carries this niche everywhere.",
					predicate_source: "",
					provider: "actor",
				},
			],
		},
	};
}

function defineResourceCall(opts: {
	localId: string;
	displayName: string;
	min: number;
	max: number;
	initial: number;
	recovery: string;
	description: string;
}): VerbCall {
	return {
		toolName: "spellkave_define_resource",
		label: `resource:${opts.localId}`,
		params: {
			id: opts.localId,
			display_name: opts.displayName,
			min_value: opts.min,
			max_value: opts.max,
			initial_value: opts.initial,
			recovery_rule: opts.recovery,
			description: readResourceFlavor(resourceFlavorSlug(opts.localId)).body,
			tags: [],
		},
	};
}

function defineFeatureCapabilityCall(opts: {
	localId: string;
	displayName: string;
	description: string;
}): VerbCall {
	// Tags: srd.action only in this throwaway scene (MF-VAL-300). Class-feature
	// identity tags already live on the entity_definitions rows from K2/K3.
	return {
		toolName: "spellkave_define_capability",
		label: `capability:${opts.localId}`,
		params: {
			bundle: BUNDLE_ID,
			id: opts.localId,
			actor_kind: "entity",
			display_name: opts.displayName,
			description: opts.description,
			tags: ["srd.action"],
		},
	};
}

function spendActionCall(opts: {
	localId: string;
	capabilityId: string;
	nicheId: string;
	displayName: string;
	description: string;
	resourceId: string;
	channel: string;
	selfOnly?: boolean;
}): VerbCall {
	return {
		toolName: "spellkave_define_action_verb",
		label: `action:${opts.localId}`,
		params: {
			bundle: BUNDLE_ID,
			id: opts.localId,
			required_capability: opts.capabilityId,
			niche_id: opts.nicheId,
			display_name: opts.displayName,
			description: opts.description,
			self_eligible: true,
			self_only: opts.selfOnly ?? true,
			spends_channel: opts.channel,
			cost_time_ms: 0,
			predicate_source: gateUses(opts.resourceId),
			consequence: {
				description: `Spend one use of ${opts.resourceId}.`,
				frame_writes: [
					{
						ModifyResource: {
							actor: "Actor",
							resource: opts.resourceId,
							delta_source: "-1",
						},
					},
				],
			},
		},
	};
}

/** Build the caster-features fragment. Pass pipeline `target` so stacking/remove policies resolve. */
export async function buildCasterFeaturesFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const choiceUpdates = buildCasterFeaturesMetadataUpdates();
	const optionEntities = choiceOptionEntitiesToAuthor();
	const calls: VerbCall[] = [
		// Seed-then-strip: namespace already lives in advancement-metadata.toml.
		// Throwaway workspace needs it to accept choice attachments (WA-META-001).
		metadataCall("seed-namespace:advancement-choice", BUNDLE_ID, [
			{
				target: "namespace",
				key: ADVANCEMENT_CHOICE_NAMESPACE,
				value: {
					audience: "public",
					description:
						"Seed-then-strip for caster-features choice rows — real namespace row is " +
						"advancement-metadata.toml (do not emit a second copy).",
				},
			},
		]),
		// Option entity_definitions FIRST so choice member target_refs resolve
		// in the throwaway scene and in the committed fragment (MF-APPLY-026).
		// Unique advancement-choice-option/* wrappers (L5d) plus menu-only
		// divine-order/metamagic/… entities.
		...choiceOptionEntityCalls(advancementChoiceMembers()),
		...optionEntityCalls(),
		{
			toolName: "spellkave_write_rows",
			label: "modifier-target:ability-check",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [resolutionScopeModifierTargetRow(ABILITY_CHECK_RESOLUTION_SCOPE_ID)],
			},
		},
		metadataCall("caster-advancement-choices", BUNDLE_ID, choiceUpdates),

		// Cleric Channel Divinity + Divine Spark heal
		actorNicheCall(DIVINE_SPARK_HEAL_NICHE_ID, "Channel Divinity (Cleric)", "cleric-cd"),
		defineResourceCall({
			localId: CLERIC_CD_USES_LOCAL_ID,
			displayName: "Channel Divinity Uses (Cleric)",
			min: CLERIC_CD_USES_MIN,
			max: CLERIC_CD_USES_MAX,
			initial: CLERIC_CD_USES_INITIAL,
			recovery: CLERIC_CD_RECOVERY_RULE,
			description:
				"Cleric Channel Divinity uses (classes.md:2213-2217; ClassFeatureItem: 2 at L2-5). " +
				"max_value 3 is the L6 table rung. recovery_rule descriptive only.",
		}),
		defineFeatureCapabilityCall({
			localId: CLERIC_CD_CAPABILITY_LOCAL_ID,
			displayName: "Channel Divinity",
			description:
				"Cleric Channel Divinity (classes.md:2213). Option menu LIVE: Divine Spark heal/damage, Turn Undead, Preserve Life (L12c / BL-63).",
		}),
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${DIVINE_SPARK_HEAL_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: DIVINE_SPARK_HEAL_ACTION_LOCAL_ID,
				required_capability: CLERIC_CD_CAPABILITY_ID,
				niche_id: DIVINE_SPARK_HEAL_NICHE_ID,
				display_name: "Channel Divinity: Divine Spark (Heal)",
				description:
					"SRD Divine Spark heal path (classes.md:2221): Magic action, spend one Channel Divinity use, " +
					"restore 1d8 HP (omits Wisdom modifier — same simplification as Cure Wounds).",
				self_eligible: true,
				self_only: false,
				spends_channel: PRIMARY_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: gateUses(CLERIC_CD_USES_RESOURCE_ID),
				range_m: 9.144,
				consequence: {
					description: "Spend one Channel Divinity use; heal target 1d8 HP.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: CLERIC_CD_USES_RESOURCE_ID,
								delta_source: "-1",
							},
						},
						{
							ModifyResource: {
								actor: "TargetActor",
								resource: HP_STATE_ID,
								delta_source: cappedHealingExpr(damageRollExpr({ diceExpr: "1d8" }), "target"),
							},
						},
					],
				},
			},
		},

		// Paladin Channel Divinity spend
		actorNicheCall(PALADIN_CD_NICHE_ID, "Channel Divinity (Paladin)", "paladin-cd"),
		defineResourceCall({
			localId: PALADIN_CD_USES_LOCAL_ID,
			displayName: "Channel Divinity Uses (Paladin)",
			min: PALADIN_CD_USES_MIN,
			max: PALADIN_CD_USES_MAX,
			initial: PALADIN_CD_USES_INITIAL,
			recovery: CLERIC_CD_RECOVERY_RULE,
			description: "Paladin Channel Divinity uses (2 at L3-4). Option menu deferred.",
		}),
		defineFeatureCapabilityCall({
			localId: PALADIN_CD_CAPABILITY_LOCAL_ID,
			displayName: "Channel Divinity (Paladin)",
			description: "Paladin Channel Divinity spend stub LIVE; oath options deferred.",
		}),
		spendActionCall({
			localId: PALADIN_CD_SPEND_ACTION_LOCAL_ID,
			capabilityId: PALADIN_CD_CAPABILITY_ID,
			nicheId: PALADIN_CD_NICHE_ID,
			displayName: "Channel Divinity (spend)",
			description: "Spend one Paladin Channel Divinity use.",
			resourceId: PALADIN_CD_USES_RESOURCE_ID,
			channel: PRIMARY_CHANNEL_ID,
		}),

		// Bardic Inspiration
		defineResourceCall({
			localId: BARDIC_USES_LOCAL_ID,
			displayName: "Bardic Inspiration Uses",
			min: BARDIC_USES_MIN,
			max: BARDIC_USES_MAX,
			initial: BARDIC_USES_INITIAL,
			recovery: "long_rest",
			description:
				"Bardic Inspiration uses (classes.md:860): CHA mod (min 1). max 5 safety ceiling; initial 1 minimum.",
		}),
		defineFeatureCapabilityCall({
			localId: BARDIC_CAPABILITY_LOCAL_ID,
			displayName: "Bardic Inspiration",
			description:
				"Bardic Inspiration (classes.md:852-862). Banked die LIVE; ally spends via " +
				"srd/bard/spend-bardic-inspiration-die (L12c). Post-roll auto-add is substrate.",
		}),
		// pattern: condition-grant-and-suppression — banked die marker (no passive +3)
		{
			toolName: "spellkave_define_condition",
			label: "condition:bardic-inspiration",
			params: {
				bundle: BUNDLE_ID,
				id: BARDIC_CONDITION_LOCAL_ID,
				display_name: "Bardic Inspiration (banked die)",
				gate_predicate_source: "1 == 1",
				description:
					"Banked Bardic Inspiration die (classes.md:856-858). Holder spends it via " +
					"srd/bard/spend-bardic-inspiration-die for a short-lived +3 ability-check boost. " +
					"True post-roll auto-spend is substrate " +
					"(docs/substrate-verdicts/bardic-inspiration-post-roll-die.md).",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				// No passive modifier — the die is banked until spent (L12c).
				modifiers: [],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${BARDIC_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: BARDIC_ACTION_LOCAL_ID,
				required_capability: BARDIC_CAPABILITY_ID,
				niche_id: CREATURE_NICHE_TAG,
				display_name: "Bardic Inspiration",
				description:
					"Bonus Action: inspire another creature within 60 feet. Spends one use; grants Bardic Inspiration condition.",
				self_eligible: false,
				self_only: false,
				spends_channel: BONUS_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: gateUses(BARDIC_USES_RESOURCE_ID),
				range_m: 18.288,
				consequence: {
					description:
						"Spend one Bardic Inspiration use; bank a die on the ally (independent lifetime).",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: BARDIC_USES_RESOURCE_ID,
								delta_source: "-1",
							},
						},
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "TargetActor",
								condition_definition_id: BARDIC_CONDITION_ID,
							},
						},
					],
				},
			},
		},

		// Wild Shape uses
		actorNicheCall(WILD_SHAPE_NICHE_ID, "Wild Shape", "wild-shape"),
		defineResourceCall({
			localId: WILD_SHAPE_USES_LOCAL_ID,
			displayName: "Wild Shape Uses",
			min: WILD_SHAPE_USES_MIN,
			max: WILD_SHAPE_USES_MAX,
			initial: WILD_SHAPE_USES_INITIAL,
			recovery: CLERIC_CD_RECOVERY_RULE,
			description: "Druid Wild Shape uses (2 at L2-5). Form transform deferred (BL-65).",
		}),
		defineFeatureCapabilityCall({
			localId: WILD_SHAPE_CAPABILITY_LOCAL_ID,
			displayName: "Wild Shape",
			description:
				"Wild Shape uses spend LIVE; form-swap is substrate (docs/substrate-verdicts/wild-shape-form-swap.md). Wild Companion LIVE (BL-66).",
		}),
		spendActionCall({
			localId: WILD_SHAPE_ACTION_LOCAL_ID,
			capabilityId: WILD_SHAPE_CAPABILITY_ID,
			nicheId: WILD_SHAPE_NICHE_ID,
			displayName: "Wild Shape (spend use)",
			description: "Bonus Action: spend one Wild Shape use. No form swap (BL-65).",
			resourceId: WILD_SHAPE_USES_RESOURCE_ID,
			channel: BONUS_CHANNEL_ID,
		}),

		// Lay On Hands
		actorNicheCall(LAY_ON_HANDS_NICHE_ID, "Lay On Hands", "lay-on-hands"),
		defineResourceCall({
			localId: LAY_ON_HANDS_LOCAL_ID,
			displayName: "Lay On Hands Pool",
			min: LAY_ON_HANDS_MIN,
			max: LAY_ON_HANDS_MAX,
			initial: LAY_ON_HANDS_INITIAL,
			recovery: "long_rest",
			description: "Paladin Lay On Hands pool (5×level). max 20 = L4. initial 0; seed 5×level.",
		}),
		defineFeatureCapabilityCall({
			localId: LAY_ON_HANDS_CAPABILITY_LOCAL_ID,
			displayName: "Lay On Hands",
			description: "Lay On Hands menu LIVE: 1 / 5 / 10 HP spends (L12c / BL-67).",
		}),
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${LAY_ON_HANDS_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: LAY_ON_HANDS_ACTION_LOCAL_ID,
				required_capability: LAY_ON_HANDS_CAPABILITY_ID,
				niche_id: LAY_ON_HANDS_NICHE_ID,
				display_name: "Lay On Hands (5 HP)",
				description: `Spend ${LAY_ON_HANDS_UNIT} pool to restore ${LAY_ON_HANDS_UNIT} HP.`,
				self_eligible: true,
				self_only: false,
				spends_channel: PRIMARY_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: gatePool(LAY_ON_HANDS_RESOURCE_ID, LAY_ON_HANDS_UNIT),
				range_m: 1.524,
				consequence: {
					description: `Spend ${LAY_ON_HANDS_UNIT}; heal ${LAY_ON_HANDS_UNIT}.`,
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: LAY_ON_HANDS_RESOURCE_ID,
								delta_source: `-${LAY_ON_HANDS_UNIT}`,
							},
						},
						{
							ModifyResource: {
								actor: "TargetActor",
								resource: HP_STATE_ID,
								delta_source: cappedHealingExpr(`${LAY_ON_HANDS_UNIT}`, "target"),
							},
						},
					],
				},
			},
		},

		// Favored Enemy
		actorNicheCall(FAVORED_ENEMY_NICHE_ID, "Favored Enemy", "favored-enemy"),
		defineResourceCall({
			localId: FAVORED_ENEMY_USES_LOCAL_ID,
			displayName: "Favored Enemy Uses",
			min: FAVORED_ENEMY_USES_MIN,
			max: FAVORED_ENEMY_USES_MAX,
			initial: FAVORED_ENEMY_USES_INITIAL,
			recovery: "long_rest",
			description: "Ranger Favored Enemy uses (2 at L1-4).",
		}),
		defineFeatureCapabilityCall({
			localId: FAVORED_ENEMY_CAPABILITY_LOCAL_ID,
			displayName: "Favored Enemy",
			description: "Favored Enemy uses spend LIVE.",
		}),
		spendActionCall({
			localId: FAVORED_ENEMY_ACTION_LOCAL_ID,
			capabilityId: FAVORED_ENEMY_CAPABILITY_ID,
			nicheId: FAVORED_ENEMY_NICHE_ID,
			displayName: "Favored Enemy (spend use)",
			description: "Spend one Favored Enemy use.",
			resourceId: FAVORED_ENEMY_USES_RESOURCE_ID,
			channel: PRIMARY_CHANNEL_ID,
		}),

		// Innate Sorcery
		actorNicheCall(INNATE_SORCERY_NICHE_ID, "Innate Sorcery", "innate-sorcery"),
		defineResourceCall({
			localId: INNATE_SORCERY_USES_LOCAL_ID,
			displayName: "Innate Sorcery Uses",
			min: INNATE_SORCERY_USES_MIN,
			max: INNATE_SORCERY_USES_MAX,
			initial: INNATE_SORCERY_USES_INITIAL,
			recovery: "long_rest",
			description: "Sorcerer Innate Sorcery uses (2).",
		}),
		defineFeatureCapabilityCall({
			localId: INNATE_SORCERY_CAPABILITY_LOCAL_ID,
			displayName: "Innate Sorcery",
			description: "Innate Sorcery spend + self condition.",
		}),
		{
			toolName: "spellkave_define_condition",
			label: "condition:innate-sorcery",
			params: {
				bundle: BUNDLE_ID,
				id: INNATE_SORCERY_CONDITION_LOCAL_ID,
				display_name: "Innate Sorcery",
				gate_predicate_source: "1 == 1",
				description: "Innate Sorcery active marker until next turn_start.",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				modifiers: [],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${INNATE_SORCERY_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: INNATE_SORCERY_ACTION_LOCAL_ID,
				required_capability: INNATE_SORCERY_CAPABILITY_ID,
				niche_id: INNATE_SORCERY_NICHE_ID,
				display_name: "Innate Sorcery",
				description: "Bonus Action: spend one use; apply self buff condition.",
				self_eligible: true,
				self_only: true,
				spends_channel: BONUS_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: gateUses(INNATE_SORCERY_USES_RESOURCE_ID),
				consequence: {
					description: "Spend one Innate Sorcery use; apply self condition.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: INNATE_SORCERY_USES_RESOURCE_ID,
								delta_source: "-1",
							},
						},
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: INNATE_SORCERY_CONDITION_ID,
								expires_at_boundary: {
									boundary_id: TURN_START_BOUNDARY_ID,
									owner_actor: "Actor",
								},
							},
						},
					],
				},
			},
		},

		// pattern: actor-carried-feature-verb + rest-boundary-resource-refill (uses)
		// Arcane Recovery (BL-70)
		actorNicheCall(ARCANE_RECOVERY_NICHE_ID, "Arcane Recovery", "arcane-recovery"),
		defineResourceCall({
			localId: ARCANE_RECOVERY_USES_LOCAL_ID,
			displayName: "Arcane Recovery Uses",
			min: 0,
			max: 1,
			initial: 1,
			recovery: "long_rest",
			description: `Arcane Recovery uses (${ARCANE_RECOVERY_ANCHOR}). 1/Long Rest; long rest refill via rest.ts.`,
		}),
		{
			toolName: "spellkave_define_capability",
			label: `capability:${ARCANE_RECOVERY_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: ARCANE_RECOVERY_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Arcane Recovery",
				description: `Wizard Arcane Recovery (${ARCANE_RECOVERY_ANCHOR}).`,
				tags: ["srd.action"],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${ARCANE_RECOVERY_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: ARCANE_RECOVERY_ACTION_LOCAL_ID,
				required_capability: ARCANE_RECOVERY_CAPABILITY_ID,
				niche_id: ARCANE_RECOVERY_NICHE_ID,
				display_name: "Arcane Recovery",
				description:
					`Finish a Short Rest and recover spell slots of combined level ≤ half Wizard level ` +
					`round up (${ARCANE_RECOVERY_ANCHOR}). LIVE L1-4: restore into spell_slot_1 then spell_slot_2.`,
				self_eligible: true,
				self_only: true,
				spends_channel: PRIMARY_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: gateUses(ARCANE_RECOVERY_USES_RESOURCE_ID),
				consequence: {
					description:
						"Spend Arcane Recovery use; restore ceil(level/2) slot-levels into L1 then L2 pools.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: ARCANE_RECOVERY_USES_RESOURCE_ID,
								delta_source: "-1",
							},
						},
						// L1-4 simplification: put the entire recovered budget into spell_slot_1
						// (avoids sequential-overlay double-count if splitting across slot levels).
						{
							ModifyResource: {
								actor: "Actor",
								resource: SPELL_SLOT_1,
								delta_source: `min((actor.stat('${LEVEL_STAT}') + 1) / 2, actor.resource_max('${SPELL_SLOT_1}') - actor.stat('${SPELL_SLOT_1}'))`,
							},
						},
					],
				},
			},
		},

		// Magical Cunning (BL-70)
		actorNicheCall(MAGICAL_CUNNING_NICHE_ID, "Magical Cunning", "magical-cunning"),
		defineResourceCall({
			localId: MAGICAL_CUNNING_USES_LOCAL_ID,
			displayName: "Magical Cunning Uses",
			min: 0,
			max: 1,
			initial: 1,
			recovery: "long_rest",
			description: `Magical Cunning uses (${MAGICAL_CUNNING_ANCHOR}). 1/Long Rest.`,
		}),
		{
			toolName: "spellkave_define_capability",
			label: `capability:${MAGICAL_CUNNING_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: MAGICAL_CUNNING_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Magical Cunning",
				description: `Warlock Magical Cunning (${MAGICAL_CUNNING_ANCHOR}).`,
				tags: ["srd.action"],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${MAGICAL_CUNNING_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: MAGICAL_CUNNING_ACTION_LOCAL_ID,
				required_capability: MAGICAL_CUNNING_CAPABILITY_ID,
				niche_id: MAGICAL_CUNNING_NICHE_ID,
				display_name: "Magical Cunning",
				description:
					`1-minute rite: regain up to half your maximum Pact Magic slots round up ` +
					`(${MAGICAL_CUNNING_ANCHOR}). LIVE: applies to spell_slot_1 and spell_slot_2.`,
				self_eligible: true,
				self_only: true,
				spends_channel: PRIMARY_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: gateUses(MAGICAL_CUNNING_USES_RESOURCE_ID),
				consequence: {
					description: "Spend Magical Cunning use; restore ceil(max/2) of each pact slot pool.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: MAGICAL_CUNNING_USES_RESOURCE_ID,
								delta_source: "-1",
							},
						},
						{
							ModifyResource: {
								actor: "Actor",
								resource: SPELL_SLOT_1,
								delta_source: `min((actor.resource_max('${SPELL_SLOT_1}') + 1) / 2, actor.resource_max('${SPELL_SLOT_1}') - actor.stat('${SPELL_SLOT_1}'))`,
							},
						},
						{
							ModifyResource: {
								actor: "Actor",
								resource: SPELL_SLOT_2,
								delta_source: `min((actor.resource_max('${SPELL_SLOT_2}') + 1) / 2, actor.resource_max('${SPELL_SLOT_2}') - actor.stat('${SPELL_SLOT_2}'))`,
							},
						},
					],
				},
			},
		},

		// Font of Magic resource
		defineResourceCall({
			localId: SORCERY_POINTS_LOCAL_ID,
			displayName: "Sorcery Points",
			min: SORCERY_POINTS_MIN,
			max: SORCERY_POINTS_MAX,
			initial: SORCERY_POINTS_INITIAL,
			recovery: "long_rest",
			description:
				"Font of Magic sorcery points. initial 0; seed = level. Conversions LIVE (L12c / BL-69).",
		}),

		// L12c / sk-609b.12.3 — BL-61..71 expressible closures + Eldritch Invocation effects
		// pattern: resource-spend-with-option-menu / mastery-gated-attack-variant /
		// condition-grant-and-suppression / actor-carried-feature-verb
		...buildCasterFeaturesL12cCalls(),
	];

	const body = await driveUnitScene(BUNDLE_ID, calls, target, {
		omitRowKinds: ["metadata_namespaces"],
	});
	// pattern: resource-spend-with-option-menu
	const header = [
		"# GENERATED by src/chapters/classes/caster-features-units.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"# pattern: resource-spend-with-option-menu",
		"# pattern: actor-carried-feature-verb",
		"# pattern: rest-boundary-resource-refill",
		"# pattern: mastery-gated-attack-variant",
		"# pattern: condition-grant-and-suppression",
		"# pattern: condition-hook-on-event",
		"#",
		"# Caster non-spellcasting features L1-4 (docs/caster-features-l1-4.md).",
		"# Choice rows: srd.advancement_choice member shape (docs/advancement-choice.md).",
		"# Option entity_definitions resolve member target_refs (MF-APPLY-026 / martial idiom).",
		"",
		"",
	].join("\n");

	const optionUnits: ChapterUnitSummary[] = optionEntities.map((option) => ({
		kind: "entity_definitions",
		id: option.entityId,
		sourcePk: option.anchor,
	}));
	const choiceUnits: ChapterUnitSummary[] = advancementChoiceMembers().map((member) => ({
		kind: "metadata_attachments",
		id: `${ADVANCEMENT_CHOICE_NAMESPACE}:${member.choiceGroup}:${member.memberEntityId}`,
		sourcePk: member.anchor,
	}));

	return {
		toml: header + body,
		units: [
			...optionUnits,
			...choiceUnits,
			{
				kind: "resource_definitions",
				id: CLERIC_CD_USES_RESOURCE_ID,
				sourcePk: "classes.md:2213-2217",
			},
			{
				kind: "capability_definitions",
				id: CLERIC_CD_CAPABILITY_ID,
				sourcePk: "classes.md:2213",
			},
			{
				kind: "action_definitions",
				id: DIVINE_SPARK_HEAL_ACTION_ID,
				sourcePk: "classes.md:2221",
			},
			{
				kind: "resource_definitions",
				id: PALADIN_CD_USES_RESOURCE_ID,
				sourcePk: "srd-2024_paladin_channel-divinity-uses",
			},
			{
				kind: "resource_definitions",
				id: BARDIC_USES_RESOURCE_ID,
				sourcePk: "classes.md:852-862",
			},
			{
				kind: "condition_definitions",
				id: BARDIC_CONDITION_ID,
				sourcePk: "classes.md:856-858",
			},
			{ kind: "action_definitions", id: BARDIC_ACTION_ID, sourcePk: "classes.md:852-862" },
			{
				kind: "resource_definitions",
				id: WILD_SHAPE_USES_RESOURCE_ID,
				sourcePk: "srd-2024_druid_wild-shape-uses",
			},
			{
				kind: "resource_definitions",
				id: LAY_ON_HANDS_RESOURCE_ID,
				sourcePk: "srd-2024_paladin_lay-on-hands",
			},
			{
				kind: "resource_definitions",
				id: FAVORED_ENEMY_USES_RESOURCE_ID,
				sourcePk: "srd-2024_ranger_favored-enemy-uses",
			},
			{
				kind: "resource_definitions",
				id: INNATE_SORCERY_USES_RESOURCE_ID,
				sourcePk: "srd-2024_sorcerer_innate-sorcery",
			},
			{
				kind: "resource_definitions",
				id: SORCERY_POINTS_RESOURCE_ID,
				sourcePk: "srd-2024_sorcerer_font-of-magic",
			},
			{
				kind: "resource_definitions",
				id: ARCANE_RECOVERY_USES_RESOURCE_ID,
				sourcePk: ARCANE_RECOVERY_ANCHOR,
			},
			{
				kind: "capability_definitions",
				id: ARCANE_RECOVERY_CAPABILITY_ID,
				sourcePk: ARCANE_RECOVERY_ANCHOR,
			},
			{
				kind: "action_definitions",
				id: ARCANE_RECOVERY_ACTION_ID,
				sourcePk: ARCANE_RECOVERY_ANCHOR,
			},
			{
				kind: "resource_definitions",
				id: MAGICAL_CUNNING_USES_RESOURCE_ID,
				sourcePk: MAGICAL_CUNNING_ANCHOR,
			},
			{
				kind: "capability_definitions",
				id: MAGICAL_CUNNING_CAPABILITY_ID,
				sourcePk: MAGICAL_CUNNING_ANCHOR,
			},
			{
				kind: "action_definitions",
				id: MAGICAL_CUNNING_ACTION_ID,
				sourcePk: MAGICAL_CUNNING_ANCHOR,
			},
			...casterFeaturesL12cUnits(),
			{
				kind: "deferred_with_owner",
				id: "classes/caster/partial-encodings",
				sourcePk:
					"BL-65 Wild Shape form-swap + BL-61 post-roll auto-spend + BL-71 Sculpt cast-rider " +
					"remain substrate — docs/substrate-verdicts/ + docs/caster-features-l1-4.md",
			},
		],
	};
}
