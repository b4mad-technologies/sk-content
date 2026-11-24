// pattern: tag-membership-menu
// pattern: advancement-choice
// Classes chapter: `srd.advancement_grant` / `srd.advancement_choice`
// metadata (dm-generic-advancement-metadata M1/M4,
// `ledger/designs/dm-generic-advancement-metadata.md` §2/§4/§4a — operator
// rulings §5). ADR-0073 metadata attachments, rung 4 of the D-4 placement
// ladder: "at Fighter level 1 you gain Second Wind" is an SRD fact the world
// behaves identically without (D-1's world-behavior test) — only a DM-side
// reader (`src/dm/data/advancement.ts`, M2) consumes it, never the server.
//
// PLACEMENT (deliberately NOT a top-level `src/advancement-metadata/` root
// sibling to `src/ui/`): the design note's own worked example TOML lands at
// `fixtures/base/classes/advancement-metadata.toml`, and its own §3
// Sister-bundle-precedent paragraph frames these two namespaces as SCOPED TO
// `base/classes/` — the opposite of `ui.*`'s cross-chapter reach (`src/ui/
// index.ts`'s own header: ui membership "can span every chapter"). This
// module therefore lives INSIDE the classes chapter, registered in
// `./index.ts`'s `generateClasses()` the SAME way `hit-die.toml`/
// `tag-vocabulary.toml` are — a third shared (non-per-class) fragment file,
// not distributed into any one class' own `base/classes/<slug>.toml`.
//
// GROUNDING METHOD (generic, data-driven, all 12 classes, never a hand-typed
// per-class list): for every class (`classes-units.ts`'s own
// `buildClassUnits()`), every REAL (non-structural) `ClassFeature.json` row
// under that class' OWN pk (`open5e/class-feature.ts`'s
// `readClassFeaturesByParentPk` — the SAME parent-pk join
// `remaining-classes-units.ts` already established, never a prefix match,
// which would leak subclass rows), resolve the feature's OWN STATED level by
// matching its DISPLAY NAME (the alias-mapped name if one exists —
// {@link HEADING_ALIAS_BY_SLUG} — else the naive title-cased slug) against
// the real `#### Level N: <name>` markdown heading (`markdown/classes.ts`'s
// `featureHeadingLevel` — K2's own `featureHeadingAnchor`, generalized to
// also return the digit it previously discarded). A miss (neither the alias
// map nor naive title-casing reproduces the real heading text verbatim —
// K3's own module header flags this as a REAL risk for the 11 non-Fighter
// classes) is a GAP, reported via `advancementMetadataGapsByClass()` and
// surfaced as `deferred_with_owner` units in `./index.ts` — never guessed,
// never silently dropped, never treated as "level unknown, assume 1" (this
// module's own `scanClassFeatureLevels` docstring names the same risk
// `featureHeadingLevel` itself warns about).
//
// SCOPE (martial L1-4 lane, supersedes M4's level-1–3 ceiling): grant rows
// for LEVELS 1–4, ALL 12 classes ({@link AUTHORED_LEVEL_CEILING}) — every
// real base-class-own feature the generic scan resolves to a level at or
// below the ceiling is authored, mechanized or not (Q3's own "granting an
// identity-only capability is honest" ruling). M1's 26 title-casing heading
// mismatches are resolved where the mismatch is a REAL, unambiguous
// casing/apostrophe/hyphen/pluralization slip ({@link HEADING_ALIAS_BY_SLUG},
// 14 of the 26); the remaining 12 stay reported gaps, never guessed.
// Subclass features stay OUT OF the grant scan (a subclass's OWN per-level
// features ride the choice path) — but each class' own level-3 "choose a
// subclass" IDENTITY feature is base-class-owned and is authored like any
// other identity-only grant.
//
// `srd.advancement_choice` now carries REAL rows (martial lane / choice arc
// C1 + origins-and-feats L4): Fighter L1 Fighting Style (one member per
// `srd.feat.fighting_style` feat entity, recommended Defense), every class'
// L3 subclass menu (choose-1-of-1 over the SRD's single subclass entity),
// and every class' L4 ASI-or-General-Feat menu (ASI + Grappler, recommended
// ASI). Row shape: `docs/advancement-choice.md` +
// `bead sk-609b.3 (design trail)` +
// `bead sk-609b.5 (design trail)`.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SetMetadataUpdate } from "@spellkave/tool-authoring";
import { featureHeadingLevel } from "../../markdown/classes";
import { readClassFeaturesByParentPk } from "../../open5e/class-feature";
import type { ChapterUnitSummary } from "../chapter-types";
import { ASI_FEAT_ENTITY_ID, asiOrFeatChoiceGroup } from "../feats/asi-units";
import { buildRemainingFeatUnits } from "../feats/remaining-feats-units";
import { buildSkillUnits } from "../playing-the-game/skill-units";
import { driveUnitScene, metadataCall, type VerbCall } from "../verb-runner";
import {
	advancementChoiceOptionEntityId,
	advancementChoiceOptionLocalId,
} from "./choice-option-ids";
import { buildClassUnits, buildSubclassUnits } from "./classes-units";

export const BUNDLE_ID = "srd";

export const ADVANCEMENT_GRANT_NAMESPACE = "srd.advancement_grant";
export const ADVANCEMENT_CHOICE_NAMESPACE = "srd.advancement_choice";

const ADVANCEMENT_GRANT_DESCRIPTION =
	"class,level -> capability id: an unconditional grant a class receives at a given level. " +
	"target_kind = entity_definition, target_ref = the granted class-feature/capability entity's own " +
	'id, payload_json = {"class": <slug>, "level": <n>}. ADR-0073 rung 4 (D-4): the world behaves ' +
	"identically whether a row exists or not — only a DM-side reader consumes it " +
	"(`packages/spellkave-srd-cc/src/dm/data/advancement.ts`).";

const ADVANCEMENT_CHOICE_DESCRIPTION =
	"class,level,choice_group -> one MEMBER entity id of a choose-N menu at that level " +
	'(payload_json = {"class": <slug>, "level": <n>, "choice_group": <string>, "choose_n": <n>, ' +
	'"recommended"?: <member id>, "rechoose"?: "none"|"long_rest_one"}), grouped by choice_group so a ' +
	"reader can reconstruct one menu from its member rows. Real rows: Fighter L1 Fighting Style " +
	"(srd.feat.fighting_style members, recommended Defense), every class' L3 subclass menu " +
	"(choose-1-of-1), and every class' L4 ASI-or-feat menu (ASI + Grappler, recommended ASI). " +
	"Shape: docs/advancement-choice.md + bead sk-609b.3 (design trail) + " +
	"bead sk-609b.5 (design trail).";

/** `ClassFeature.json` feature_type values that are structural/table-data bookkeeping, never a feature a character discretely GAINS at a level — excluded from advancement scanning entirely (same distinction `remaining-classes-units.ts`'s own `buildFeatureDescription` draws). */
const REAL_FEATURE_TYPES: ReadonlySet<string | undefined> = new Set([
	undefined,
	"CLASS_FEATURE_OPTION_LIST",
]);

/**
 * Single LEVEL CEILING for `srd.advancement_grant` rows (martial L1-4 lane
 * raised M4's 3 → 4). SCOPE decision only: every real feature the generic
 * scan resolves to a level `<=` this ceiling is authored, mechanized or not.
 * L4 ASI identity grants remain; ASI *mechanics* and the L4 choose-N menu
 * live in feats/asi-units.ts + advancementChoicesToAuthor (lane L4).
 */
export const AUTHORED_LEVEL_CEILING = 4;

/** SRD recommended L4 choice member — Ability Score Improvement. */
export const ASI_OR_FEAT_RECOMMENDED_MEMBER_ID = ASI_FEAT_ENTITY_ID;

/** The other General Feat eligible at L4 (Grappler prereq Level 4+). */
export const ASI_OR_FEAT_GRAPPLER_MEMBER_ID = `${BUNDLE_ID}/feat/grappler`;

/** SRD "Defense is recommended" for Fighter Fighting Style (`classes.md:4788-4790`). */
export const FIGHTING_STYLE_RECOMMENDED_MEMBER_ID = `${BUNDLE_ID}/feat/defense`;
export const FIGHTING_STYLE_CHOICE_GROUP = `${BUNDLE_ID}/fighter/1/fighting-style`;

/**
 * Explicit, cited title-casing/apostrophe/hyphen/pluralization aliases
 * (M4, §4a: "resolve via an explicit, cited alias map in the generator"),
 * consulted BEFORE the naive {@link slugToTitleCase} guess. Each entry
 * reproduces ONE real `#### Level N: <name>` heading text verbatim — grounded
 * by grepping `cache/markdown/classes.md` and re-verified by re-running
 * {@link scanClassFeatureLevels} after adding the entry (never guessed). A
 * slug whose feature has NO `#### Level N:` heading anywhere in its own
 * class section (spell-list tables, option-list sub-catalogs, column-data
 * rows) gets NO alias — it stays a reported gap. Barbarian's own
 * `improved-brutal-strike-enhanced` ALSO gets no alias: its class section
 * carries the heading text "Improved Brutal Strike" TWICE (level 13 AND
 * level 17, `ClassFeature.json`'s own `name` field disambiguates them as
 * "Improved Brutal Strike" and "Improved Brutal Strike (Enhanced)" but the
 * MARKDOWN heading text is identical for both) — aliasing would silently
 * bind to whichever the regex matches first, which is guessing, not
 * resolving.
 */
export const HEADING_ALIAS_BY_SLUG: Readonly<Record<string, string>> = {
	// cache/markdown/classes.md:894 — "#### Level 2: Jack of All Trades"
	// (naive title-case: "Jack Of All Trades").
	"jack-of-all-trades": "Jack of All Trades",
	// cache/markdown/classes.md:908 — "#### Level 5: Font of Inspiration"
	// (naive title-case: "Font Of Inspiration").
	"font-of-inspiration": "Font of Inspiration",
	// cache/markdown/classes.md:930 — "#### Level 20: Words of Creation"
	// (naive title-case: "Words Of Creation").
	"words-of-creation": "Words of Creation",
	// cache/markdown/classes.md:2227 — "#### Level 3: Cleric Subclass"
	// (ClassFeature.json's own pk is the ONLY one of the 12 classes'
	// "<class>-subclass" rows spelled plural, "cleric-subclasses" — a
	// pluralization slip, not a casing slip; every sibling class' own
	// "<class>-subclass" pk already title-cases to its real heading verbatim).
	"cleric-subclasses": "Cleric Subclass",
	// cache/markdown/classes.md:5254 — "#### Level 20: Body and Mind"
	// (naive title-case: "Body And Mind").
	"body-and-mind": "Body and Mind",
	// cache/markdown/classes.md:5149 — "#### Level 2: Monk's Focus"
	// (naive title-case: "Monks Focus").
	"monks-focus": "Monk's Focus",
	// cache/markdown/classes.md:5226 — "#### Level 10: Self-Restoration"
	// (naive title-case: "Self Restoration" — hyphen, not a space).
	"self-restoration": "Self-Restoration",
	// cache/markdown/classes.md:5708 — "#### Level 10: Aura of Courage"
	// (naive title-case: "Aura Of Courage").
	"aura-of-courage": "Aura of Courage",
	// cache/markdown/classes.md:5696 — "#### Level 6: Aura of Protection"
	// (naive title-case: "Aura Of Protection").
	"aura-of-protection": "Aura of Protection",
	// cache/markdown/classes.md:5657 — "#### Level 2: Paladin's Smite"
	// (naive title-case: "Paladins Smite").
	"paladins-smite": "Paladin's Smite",
	// cache/markdown/classes.md:6473 — "#### Level 14: Nature's Veil"
	// (naive title-case: "Natures Veil").
	"natures-veil": "Nature's Veil",
	// cache/markdown/classes.md:7123 — "#### Level 20: Stroke of Luck"
	// (naive title-case: "Stroke Of Luck").
	"stroke-of-luck": "Stroke of Luck",
	// cache/markdown/classes.md:7045 — "#### Level 1: Thieves' Cant"
	// (naive title-case: "Thieves Cant").
	"thieves-cant": "Thieves' Cant",
	// cache/markdown/classes.md:7635 — "#### Level 2: Font of Magic"
	// (naive title-case: "Font Of Magic").
	"font-of-magic": "Font of Magic",
};

/** One resolved (class, feature, level) fact — grounded via {@link featureHeadingLevel}, never hand-typed. */
export interface AdvancementGrantCandidate {
	classSlug: string;
	classDisplayName: string;
	level: number;
	featureSlug: string;
	featureDisplayName: string;
	/** `srd/class-feature/<classSlug>/<featureSlug>` — same id shape both `fighter-units.ts`'s `FeatureIdentityUnit.entityId` and `remaining-classes-units.ts`'s `RemainingFeatureUnit.entityId` already use for this exact entity. */
	entityId: string;
	/** `classes.md:<line>` of the feature's own `#### Level N: <name>` heading. */
	anchor: string;
}

/** One real base-class-own feature this module could NOT resolve a level for — a title-casing/heading-text mismatch (K3's own named risk), reported rather than guessed. */
export interface AdvancementGrantGap {
	classSlug: string;
	classDisplayName: string;
	featureSlug: string;
	featureDisplayName: string;
	reason: string;
}

function slugToTitleCase(slug: string): string {
	const slotsMatch = /^slots-(\d+)(?:st|nd|rd|th)$/.exec(slug);
	if (slotsMatch?.[1] !== undefined) return `Level ${slotsMatch[1]} Spell Slots`;
	return slug
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/** {@link HEADING_ALIAS_BY_SLUG}'s own entry for `featureSlug`, else {@link slugToTitleCase}'s naive guess — the display name {@link featureHeadingLevel} matches against the real markdown heading. */
function resolveFeatureDisplayName(featureSlug: string): string {
	return HEADING_ALIAS_BY_SLUG[featureSlug] ?? slugToTitleCase(featureSlug);
}

/**
 * Every class' own REAL base-class-own features (subclass EXCLUDED —
 * `readClassFeaturesByParentPk(classUnit.sourcePk)` joins on the class' OWN
 * `CharacterClass.json` pk, the exact-parent-pk method
 * `remaining-classes-units.ts`'s own module header names as the ROBUST
 * choice over a prefix match), bucketed into resolved grant candidates and
 * unresolved gaps. Pure, deterministic, cache-cited — never re-run against a
 * live target, never memoized beyond one call (matches this package's
 * `classCreationData()`-style "read fresh each call" idiom for a static,
 * committed source).
 */
export function scanClassFeatureLevels(): {
	candidates: AdvancementGrantCandidate[];
	gaps: AdvancementGrantGap[];
} {
	const candidates: AdvancementGrantCandidate[] = [];
	const gaps: AdvancementGrantGap[] = [];
	for (const classUnit of buildClassUnits()) {
		const records = readClassFeaturesByParentPk(classUnit.sourcePk);
		if (records.length === 0) {
			throw new Error(
				`advancement-metadata-units: no ClassFeature.json rows found for '${classUnit.sourcePk}'.`,
			);
		}
		const realRecords = records.filter((record) => REAL_FEATURE_TYPES.has(record.featureType));
		// pk shape mirrors `remaining-classes-units.ts`'s own `commonPkPrefix`
		// derivation, but this module never needs the prefix beyond stripping
		// it off `classUnit.sourcePk + "_"` — every real base-class-own row's
		// pk is `<classUnit.sourcePk>_<slug>` (cache-verified: no class-own
		// row uses a longer/different prefix the way Champion's subclass rows
		// do under Fighter's own prefix).
		const ownPkPrefix = `${classUnit.sourcePk}_`;
		for (const record of realRecords) {
			if (!record.pk.startsWith(ownPkPrefix)) {
				throw new Error(
					`advancement-metadata-units: '${record.pk}' does not start with expected prefix ` +
						`'${ownPkPrefix}' — 'remaining-classes-units.ts's own parent-pk join may have changed shape.`,
				);
			}
			const featureSlug = record.pk.slice(ownPkPrefix.length);
			const featureDisplayName = resolveFeatureDisplayName(featureSlug);
			try {
				const { level, anchor } = featureHeadingLevel(classUnit.displayName, featureDisplayName);
				candidates.push({
					classSlug: classUnit.slug,
					classDisplayName: classUnit.displayName,
					level,
					featureSlug,
					featureDisplayName,
					entityId: `${BUNDLE_ID}/class-feature/${classUnit.slug}/${featureSlug}`,
					anchor,
				});
			} catch (err) {
				gaps.push({
					classSlug: classUnit.slug,
					classDisplayName: classUnit.displayName,
					featureSlug,
					featureDisplayName,
					reason: err instanceof Error ? err.message : String(err),
				});
			}
		}
	}
	return { candidates, gaps };
}

/** {@link scanClassFeatureLevels}'s candidates, filtered to the levels M4 authors grant rows for — every class, level `<=` {@link AUTHORED_LEVEL_CEILING} (3) — sorted deterministically (class slug, then level, then feature slug) so generated TOML byte-diffs stay stable across runs. */
export function advancementGrantsToAuthor(): AdvancementGrantCandidate[] {
	const { candidates } = scanClassFeatureLevels();
	const included = candidates.filter((candidate) => candidate.level <= AUTHORED_LEVEL_CEILING);
	return [...included].sort((a, b) => {
		if (a.classSlug !== b.classSlug) return a.classSlug.localeCompare(b.classSlug);
		if (a.level !== b.level) return a.level - b.level;
		return a.featureSlug.localeCompare(b.featureSlug);
	});
}

/** {@link scanClassFeatureLevels}'s gaps, grouped by class — the shape `./index.ts` turns into one `deferred_with_owner` unit per affected class. */
export function advancementMetadataGapsByClass(): Map<string, AdvancementGrantGap[]> {
	const { gaps } = scanClassFeatureLevels();
	const byClass = new Map<string, AdvancementGrantGap[]>();
	for (const gap of gaps) {
		const bucket = byClass.get(gap.classSlug) ?? [];
		bucket.push(gap);
		byClass.set(gap.classSlug, bucket);
	}
	return byClass;
}

function grantMetadataUpdate(candidate: AdvancementGrantCandidate): SetMetadataUpdate {
	return {
		target: { kind: "entity_definition", ref: candidate.entityId },
		key: ADVANCEMENT_GRANT_NAMESPACE,
		value: { class: candidate.classSlug, level: candidate.level },
	};
}

/** One member of an authored choose-N menu — see `docs/advancement-choice.md`. */
export interface AdvancementChoiceMember {
	classSlug: string;
	level: number;
	choiceGroup: string;
	chooseN: number;
	memberEntityId: string;
	/** Default entity_definition; expertise members are capability_definition. */
	targetKind?: "entity_definition" | "capability_definition";
	/** Optional SRD-recommended member (D-7 adoption option). */
	recommendedMemberId?: string;
	/** Default `none`. `long_rest_one` is documented intent only this lane. */
	rechoose?: "none" | "long_rest_one";
	/** Provenance anchor for the fixture header. */
	anchor: string;
}

/**
 * Real `srd.advancement_choice` member rows this lane authors:
 * - Fighter L1 Fighting Style — every remaining-feat unit whose category is
 *   Fighting Style (tag `srd.feat.fighting_style`), recommended Defense.
 * - Every class' L3 subclass menu — the one SRD subclass entity (choose-1-of-1).
 * - Every class' L4 ASI-or-feat menu — ASI + Grappler, recommended ASI
 *   (`bead sk-609b.5 (design trail)`).
 */
export function advancementChoicesToAuthor(): AdvancementChoiceMember[] {
	const fightingStyles = buildRemainingFeatUnits()
		.filter((unit) => unit.category === "Fighting Style")
		.map((unit) => unit.entityId)
		.sort((a, b) => a.localeCompare(b));
	if (fightingStyles.length === 0) {
		throw new Error(
			"advancement-metadata-units: no Fighting Style feats found — remaining-feats-units may have drifted.",
		);
	}
	if (!fightingStyles.includes(FIGHTING_STYLE_RECOMMENDED_MEMBER_ID)) {
		throw new Error(
			`advancement-metadata-units: recommended Fighting Style '${FIGHTING_STYLE_RECOMMENDED_MEMBER_ID}' ` +
				"is not in the fighting-style member set.",
		);
	}
	const fightingStyleMembers: AdvancementChoiceMember[] = fightingStyles.map((memberEntityId) => ({
		classSlug: "fighter",
		level: 1,
		choiceGroup: FIGHTING_STYLE_CHOICE_GROUP,
		chooseN: 1,
		memberEntityId,
		recommendedMemberId: FIGHTING_STYLE_RECOMMENDED_MEMBER_ID,
		rechoose: "none",
		anchor: "classes.md:4788-4790 (§ Fighter > Level 1: Fighting Style)",
	}));

	const subclassMembers: AdvancementChoiceMember[] = buildSubclassUnits()
		.map((unit) => ({
			classSlug: unit.parentSlug,
			level: 3,
			choiceGroup: `${BUNDLE_ID}/${unit.parentSlug}/3/subclass`,
			chooseN: 1,
			memberEntityId: unit.entityId,
			rechoose: "none" as const,
			anchor: `classes.md (§ ${unit.parentSlug} > Level 3: subclass → ${unit.displayName})`,
		}))
		.sort((a, b) => a.classSlug.localeCompare(b.classSlug));

	const l4Members = [ASI_OR_FEAT_RECOMMENDED_MEMBER_ID, ASI_OR_FEAT_GRAPPLER_MEMBER_ID];
	const asiOrFeatMembers: AdvancementChoiceMember[] = buildClassUnits()
		.flatMap((cls) =>
			l4Members.map((memberEntityId) => ({
				classSlug: cls.slug,
				level: 4,
				choiceGroup: asiOrFeatChoiceGroup(cls.slug),
				chooseN: 1,
				memberEntityId,
				recommendedMemberId: ASI_OR_FEAT_RECOMMENDED_MEMBER_ID,
				rechoose: "none" as const,
				anchor: `classes.md (§ ${cls.displayName} > Level 4: Ability Score Improvement) + feats.md:61-81`,
			})),
		)
		.sort(
			(a, b) =>
				a.classSlug.localeCompare(b.classSlug) || a.memberEntityId.localeCompare(b.memberEntityId),
		);

	// Weapon Mastery: one member per weapon entity that carries a mastery tag.
	// choose_n from class tables (Fighter 3, Barbarian/Rogue 2). Properties stay n/a.
	const masteryWeapons = listWeaponEntityIdsWithMastery();
	const weaponMasteryMenus: { classSlug: string; chooseN: number; anchor: string }[] = [
		{
			classSlug: "fighter",
			chooseN: 3,
			anchor: "classes.md:4790-4792 (§ Fighter > Level 1: Weapon Mastery)",
		},
		{
			classSlug: "barbarian",
			chooseN: 2,
			anchor: "classes.md:262-266 (§ Barbarian > Level 1: Weapon Mastery)",
		},
		{
			classSlug: "rogue",
			chooseN: 2,
			anchor: "classes.md:7049-7053 (§ Rogue > Level 1: Weapon Mastery)",
		},
	];
	const weaponMasteryMembers: AdvancementChoiceMember[] = weaponMasteryMenus.flatMap((menu) =>
		masteryWeapons.map((memberEntityId) => ({
			classSlug: menu.classSlug,
			level: 1,
			choiceGroup: `${BUNDLE_ID}/${menu.classSlug}/1/weapon-mastery`,
			chooseN: menu.chooseN,
			memberEntityId,
			rechoose: "long_rest_one" as const,
			anchor: menu.anchor,
		})),
	);

	// Expertise / Primal Knowledge: entity option rows (server rejects
	// capability_definition metadata target_kind — MF-APPLY-027).
	// Rogue Expertise: choose 2 skills (all 18 skill capabilities as members).
	const expertiseMembers: AdvancementChoiceMember[] = buildSkillUnits().map((skill) => ({
		classSlug: "rogue",
		level: 1,
		choiceGroup: `${BUNDLE_ID}/rogue/1/expertise`,
		chooseN: 2,
		memberEntityId: `${BUNDLE_ID}/expertise-option/${skill.slug}`,
		recommendedMemberId:
			skill.slug === "stealth" || skill.slug === "sleight-of-hand"
				? `${BUNDLE_ID}/expertise-option/${skill.slug}`
				: undefined,
		rechoose: "none",
		anchor: "classes.md:7033-7037 (§ Rogue > Level 1: Expertise)",
	}));

	const barbarianSkills = [
		"animal-handling",
		"athletics",
		"intimidation",
		"nature",
		"perception",
		"survival",
	];
	const primalKnowledgeMembers: AdvancementChoiceMember[] = barbarianSkills.map((slug) => ({
		classSlug: "barbarian",
		level: 3,
		choiceGroup: `${BUNDLE_ID}/barbarian/3/primal-knowledge`,
		chooseN: 1,
		memberEntityId: `${BUNDLE_ID}/skill-option/${slug}`,
		rechoose: "none",
		anchor: "classes.md:280-284 (§ Barbarian > Level 3: Primal Knowledge)",
	}));

	return [
		...fightingStyleMembers,
		...subclassMembers,
		...asiOrFeatMembers,
		...weaponMasteryMembers,
		...expertiseMembers,
		...primalKnowledgeMembers,
	];
}

/** Weapon entity ids under fixtures/base/equipment/weapons that carry a mastery tag. */
function listWeaponEntityIdsWithMastery(): string[] {
	const here = path.dirname(fileURLToPath(import.meta.url));
	const weaponsDir = path.resolve(here, "../../../fixtures/base/equipment/weapons");
	const ids = new Set<string>();
	for (const name of readdirSync(weaponsDir)) {
		if (!name.endsWith(".toml")) continue;
		const text = readFileSync(path.join(weaponsDir, name), "utf8");
		if (!text.includes("srd.weapon.mastery.")) continue;
		const match = /entity_def_id = "(srd\/weapon\/[^"]+)"/.exec(text);
		if (match?.[1] !== undefined) ids.add(match[1]);
	}
	return [...ids].sort((a, b) => a.localeCompare(b));
}

function choiceMetadataUpdate(member: AdvancementChoiceMember): SetMetadataUpdate {
	// Unique target_ref per (class, level, member) — live metadata_attachment
	// upserts on (target_kind, target_ref, namespace); shared feat/weapon/ASI
	// refs otherwise collapse (L5d / Aldwin live catalog empty for Fighter L1).
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
		// Real entity the option names (grant/confirm consumers may resolve).
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
		target: { kind: member.targetKind ?? "entity_definition", ref: optionId },
		key: ADVANCEMENT_CHOICE_NAMESPACE,
		value: payload,
	};
}

/** Menu-only entity_definitions backing unique choice attachment target_refs. */
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

/**
 * Typed, value-oriented metadata updates passed to `spellkave_set_metadata`.
 * Tests inspect these authoring inputs directly; manifest rows are an output
 * of the shared tool, not a second authoring API maintained by this package.
 */
export function advancementMetadataUpdates(): SetMetadataUpdate[] {
	return [
		{
			target: "namespace",
			key: ADVANCEMENT_GRANT_NAMESPACE,
			value: { audience: "public", description: ADVANCEMENT_GRANT_DESCRIPTION, on_demand: true },
		},
		{
			target: "namespace",
			key: ADVANCEMENT_CHOICE_NAMESPACE,
			value: { audience: "public", description: ADVANCEMENT_CHOICE_DESCRIPTION, on_demand: true },
		},
		...advancementGrantsToAuthor().map(grantMetadataUpdate),
		...advancementChoicesToAuthor().map(choiceMetadataUpdate),
	];
}

/**
 * Renders `base/classes/advancement-metadata.toml`: the two namespace
 * registrations plus one `srd.advancement_grant` attachment row per
 * {@link advancementGrantsToAuthor} candidate. Deliberately mirrors
 * `src/ui/self-summary.ts`'s own shape (no `target` parameter threaded
 * through `driveUnitScene` — that module's own precedent trusts its
 * hand-derived ids by construction rather than round-tripping through a
 * live/local target for cross-reference validation; this module's own
 * `entityId`s are built the SAME way K2/K3's own feature generators build
 * theirs, from the same cache-derived slug, so they resolve by construction).
 */
export async function buildAdvancementMetadataFragment(): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	const grants = advancementGrantsToAuthor();
	const choices = advancementChoicesToAuthor();
	const metadataUpdates = advancementMetadataUpdates();
	const calls: VerbCall[] = [
		...choiceOptionEntityCalls(choices),
		metadataCall("advancement-metadata", BUNDLE_ID, metadataUpdates),
	];
	const body = await driveUnitScene(BUNDLE_ID, calls);
	const grantCitationLines = grants.map(
		(grant) =>
			`#   GRANT ${grant.entityId} @ level ${grant.level} — ${grant.anchor} (§ ${grant.classDisplayName} > ` +
			`Level ${grant.level}: ${grant.featureDisplayName})`,
	);
	const choiceCitationLines = choices.map(
		(choice) =>
			`#   CHOICE ${choice.choiceGroup} → ${choice.memberEntityId} @ level ${choice.level} — ${choice.anchor}`,
	);
	const header = [
		"# GENERATED by src/chapters/classes/advancement-metadata-units.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"# pattern: advancement-choice",
		"#",
		"# ADR-0073 metadata attachments: srd.advancement_grant (unconditional) + srd.advancement_choice",
		"# (choose-N member rows). Inert DM-side facts (ADR-0073 D-1). Citations:",
		...grantCitationLines,
		...choiceCitationLines,
		"",
		"",
	].join("\n");
	return {
		toml: header + body,
		units: [
			{ kind: "metadata_namespaces", id: ADVANCEMENT_GRANT_NAMESPACE, sourcePk: "" },
			{ kind: "metadata_namespaces", id: ADVANCEMENT_CHOICE_NAMESPACE, sourcePk: "" },
			...grants.map((grant) => ({
				kind: "metadata_attachments",
				id: `${ADVANCEMENT_GRANT_NAMESPACE}:${grant.entityId}`,
				sourcePk: grant.anchor,
			})),
			...choices.map((choice) => ({
				kind: "metadata_attachments",
				id: `${ADVANCEMENT_CHOICE_NAMESPACE}:${choice.choiceGroup}:${choice.memberEntityId}`,
				sourcePk: choice.anchor,
			})),
		],
	};
}
