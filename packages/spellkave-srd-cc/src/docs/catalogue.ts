import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ROW_KIND_NATURAL_KEY } from "@spellkave/world-author";
import { parse as parseToml } from "smol-toml";
import type { ChapterUnitSummary } from "../chapters/chapter-types";
import { armorWeightClass } from "../chapters/equipment/armor-units";
import { readSrdReaderPagesForSection } from "../markdown/docs-reader-pages";
import { readArmor } from "../open5e/armor";
import { readBaseCharacterClasses, readSubclasses } from "../open5e/character-class";
import { readFeats } from "../open5e/feat";
import { readItems } from "../open5e/item";
import { readWeapons } from "../open5e/weapon";
import { readWeaponProperties, readWeaponPropertyAssignments } from "../open5e/weapon-property";
import { entryKindForTable, pagedRowKinds, rowKindCoverageFor } from "./row-kind-coverage";

/** Root metadata identity for one editor-selected, real authored subject. */
export interface SrdCatalogueEntry {
	/**
	 * The catalogue entry kind. Deliberately not a closed union: which row kinds
	 * earn a page is authored in `row-kind-coverage.toml`, and restating the list
	 * here would recreate exactly the hand-synced copy that file removed.
	 */
	kind: string;
	ref: string;
	family: string;
	slug: string;
	facts?: readonly { label: string; value: string; tag?: string }[];
	/** Source-derived, plain one-line display copy when runtime text contains markup. */
	description?: string;
	tags?: readonly string[];
	/** Compiler-owned link to the corresponding authored reader page, when unique. */
	reader_page_id?: string;
	/**
	 * Compiler-derived display copy for kinds whose manifest row carries no
	 * `display_name` (currently only `tag_value_definition` — see
	 * `tagLabelFromId`). The website's `projectCatalogueEntry` already prefers
	 * this field over any row-sourced `display_name` for every kind.
	 */
	title?: string;
}

/** One compiler-authored target in the root documentation link profile. */
export interface SrdDocsLinkTarget {
	label: string;
	kind: "entity_definition" | "resource_definition" | "capability_definition";
	ref: string;
	/**
	 * `false` marks a lookup-only target: listed so a client can find the
	 * definition's page by `ref`, never matched in prose. Absent means the
	 * label also autolinks in prose (sk-jay0.1.76.19.20).
	 */
	autolink?: false;
}

/** Tag that admits a `capability_definitions` row as a lookup-only skill target. */
const SKILL_CAPABILITY_TAG = "srd.skill";

type ManifestRows = Record<string, unknown>;

export const REQUIRED_RESOURCES = [
	"srd/str",
	"srd/dex",
	"srd/con",
	"srd/int",
	"srd/wis",
	"srd/cha",
] as const;

interface FamilySection {
	family: string;
	section: string;
}

/** One `sections.toml` `[[resource_routes]]` row — see that table's own doc comment. */
interface ResourceRoute {
	prefix: string;
	section: string;
}

interface EntityRoute extends FamilySection {
	/**
	 * The fallback matcher, for an entity whose id matches no declared prefix.
	 * Optional: several families are generated under their own id namespace and
	 * carry no tag at all, and inventing one to satisfy this field would mint tag
	 * vocabulary that nothing in the world actually uses.
	 */
	tag?: string;
	prefix: string;
}

/** One `sections.toml` `[[fact_namespaces]]` row — see that table's own doc comment for the `derive` rule vocabulary. */
export interface FactNamespaceRule {
	label: string;
	namespace: string;
	derive: "title" | "kebab" | "sentence" | "level" | "cr" | "attunement";
}

interface KindSection {
	kind: string;
	path: string;
	family: string;
}

interface SectionsFile {
	resource_routes: readonly ResourceRoute[];
	entity_routes: readonly EntityRoute[];
	tags_section: string;
	mechanics_section: string;
	kind_sections: readonly KindSection[];
	class_feature_slug_overrides: ReadonlyArray<{ short_slug: string; ref: string }>;
	exempt_entity_ids: readonly string[];
	fact_namespaces: readonly FactNamespaceRule[];
	fact_value_overrides: ReadonlyArray<{ tag: string; value: string }>;
}

const SECTIONS_PATH = join(dirname(fileURLToPath(import.meta.url)), "sections.toml");

function loadSectionsFile(): SectionsFile {
	const parsed = parseToml(readFileSync(SECTIONS_PATH, "utf8")) as Record<string, unknown>;
	if (!Array.isArray(parsed.entity_routes) || parsed.entity_routes.length === 0) {
		throw new Error("SRD docs catalogue: sections.toml must contain [[entity_routes]].");
	}
	if (typeof parsed.tags_section !== "string" || parsed.tags_section.length === 0) {
		throw new Error("SRD docs catalogue: sections.toml must set tags_section.");
	}
	if (typeof parsed.mechanics_section !== "string" || parsed.mechanics_section.length === 0) {
		throw new Error("SRD docs catalogue: sections.toml must set mechanics_section.");
	}
	if (!Array.isArray(parsed.resource_routes) || parsed.resource_routes.length === 0) {
		throw new Error("SRD docs catalogue: sections.toml must contain [[resource_routes]].");
	}
	const seenResourcePrefixes = new Set<string>();
	for (const route of parsed.resource_routes as ReadonlyArray<Record<string, unknown>>) {
		if (typeof route.prefix !== "string" || typeof route.section !== "string") {
			throw new Error(
				"SRD docs catalogue: every sections.toml resource_routes row needs prefix/section.",
			);
		}
		if (seenResourcePrefixes.has(route.prefix)) {
			throw new Error(
				`SRD docs catalogue: sections.toml resource_routes has duplicate prefix '${route.prefix}'.`,
			);
		}
		seenResourcePrefixes.add(route.prefix);
	}
	const paged = new Set(pagedRowKinds());
	const seenKindPaths = new Set<string>();
	for (const row of Array.isArray(parsed.kind_sections) ? parsed.kind_sections : []) {
		const rule = row as Record<string, unknown>;
		if (
			typeof rule.kind !== "string" ||
			typeof rule.path !== "string" ||
			typeof rule.family !== "string"
		) {
			throw new Error(
				"SRD docs catalogue: every sections.toml kind_sections row needs kind/path/family.",
			);
		}
		// Placement may only be authored for a kind the classification already
		// says earns a page, so the two files can never disagree about what is
		// published.
		if (!paged.has(rule.kind)) {
			throw new Error(
				`SRD docs catalogue: sections.toml kind_sections places '${rule.kind}', which row-kind-coverage.toml does not classify as surface = "page".`,
			);
		}
		if (seenKindPaths.has(rule.path)) {
			throw new Error(
				`SRD docs catalogue: sections.toml kind_sections has duplicate path '${rule.path}'.`,
			);
		}
		seenKindPaths.add(rule.path);
	}
	const seenTags = new Set<string>();
	const seenPrefixes = new Set<string>();
	for (const route of parsed.entity_routes as ReadonlyArray<Record<string, unknown>>) {
		if (
			typeof route.prefix !== "string" ||
			typeof route.family !== "string" ||
			typeof route.section !== "string" ||
			(route.tag !== undefined && typeof route.tag !== "string")
		) {
			throw new Error(
				"SRD docs catalogue: every sections.toml entity_routes row needs prefix/family/section, and tag must be a string when present.",
			);
		}
		if (typeof route.tag === "string") {
			if (seenTags.has(route.tag)) {
				throw new Error(
					`SRD docs catalogue: sections.toml entity_routes has duplicate tag '${route.tag}'.`,
				);
			}
			seenTags.add(route.tag);
		}
		if (seenPrefixes.has(route.prefix)) {
			throw new Error(
				`SRD docs catalogue: sections.toml entity_routes has duplicate prefix '${route.prefix}'.`,
			);
		}
		seenPrefixes.add(route.prefix);
	}
	const seenFactNamespaces = new Set<string>();
	for (const rule of Array.isArray(parsed.fact_namespaces) ? parsed.fact_namespaces : []) {
		const row = rule as Record<string, unknown>;
		if (
			typeof row.label !== "string" ||
			typeof row.namespace !== "string" ||
			typeof row.derive !== "string"
		) {
			throw new Error(
				"SRD docs catalogue: every sections.toml fact_namespaces row needs label/namespace/derive.",
			);
		}
		if (seenFactNamespaces.has(row.namespace)) {
			throw new Error(
				`SRD docs catalogue: sections.toml fact_namespaces has duplicate namespace '${row.namespace}'.`,
			);
		}
		seenFactNamespaces.add(row.namespace);
	}
	const seenFactValueOverrideTags = new Set<string>();
	for (const override of Array.isArray(parsed.fact_value_overrides)
		? parsed.fact_value_overrides
		: []) {
		const row = override as Record<string, unknown>;
		if (typeof row.tag !== "string" || typeof row.value !== "string") {
			throw new Error(
				"SRD docs catalogue: every sections.toml fact_value_overrides row needs tag/value.",
			);
		}
		if (seenFactValueOverrideTags.has(row.tag)) {
			throw new Error(
				`SRD docs catalogue: sections.toml fact_value_overrides has duplicate tag '${row.tag}'.`,
			);
		}
		seenFactValueOverrideTags.add(row.tag);
	}
	return parsed as unknown as SectionsFile;
}

const SECTIONS_FILE = loadSectionsFile();

const ENTITY_ROUTES: readonly EntityRoute[] = SECTIONS_FILE.entity_routes;
const RESOURCE_ROUTES: readonly ResourceRoute[] = SECTIONS_FILE.resource_routes;

// Retained for the legacy export's independent completeness contract. The
// authored docs catalogue deliberately does not use either narrowing list.
export const EXEMPT_ENTITY_IDS = new Set(SECTIONS_FILE.exempt_entity_ids);

/**
 * Fact-value derivation data for the website projection (sk-jay0.3.5.54 step
 * 2) — see `sections.toml`'s `fact_namespaces`/`fact_value_overrides` doc
 * comment for the full contract. Exported (not just parsed) so `apps/website
 * /src/compendium/project-metadata-docs.ts` reads this ONE place rather than
 * re-parsing `sections.toml` itself.
 */
export const FACT_NAMESPACES: readonly FactNamespaceRule[] = SECTIONS_FILE.fact_namespaces ?? [];
export const FACT_VALUE_OVERRIDES: ReadonlyMap<string, string> = new Map(
	(SECTIONS_FILE.fact_value_overrides ?? []).map(({ tag, value }) => [tag, value]),
);

const KIND_SECTIONS: readonly KindSection[] = SECTIONS_FILE.kind_sections ?? [];

/**
 * Manifest table names that this catalogue actually publishes as pages —
 * `sections.toml`'s `[[kind_sections]]`, which is a subset of the kinds
 * `row-kind-coverage.toml` classifies as `surface = "page"`.
 *
 * Exported so the reader's own gate can assert that every published kind has a
 * component, rather than keeping a second list of what is published.
 */
export function publishedRowKinds(): readonly string[] {
	return KIND_SECTIONS.map((placement) => placement.kind);
}
const KIND_SECTIONS_BY_KIND: ReadonlyMap<string, KindSection> = new Map(
	KIND_SECTIONS.map((placement) => [placement.kind, placement]),
);

/**
 * Multi-segment route slug for a slash-separated manifest id, the sibling of
 * `tagPathSlug` for ids that use `/` rather than `.` as their separator:
 * drop the leading bundle segment, then each remaining segment becomes its own
 * path segment with underscores hyphenated WITHIN a segment (never across one —
 * a segment boundary is real structure, not punctuation to flatten away).
 *
 * `srd/attack/opportunity-attack` -> `attack/opportunity-attack`,
 * `srd/attack/unarmed-strike/damage/success` ->
 * `attack/unarmed-strike/damage/success`.
 *
 * A pure function of the id, so a new namespace never needs an authored row to
 * get a sensible route, and the namespace index pages fall out of the path
 * structure with no new page kind.
 */
export function idPathSlug(id: string): string {
	// `/` is not the only separator these ids use. A niche id is shaped
	// `capability:srd/action/heroic-inspiration/reroll`, where the part before
	// the colon names what kind of niche it is, and some are dot-separated
	// (`srd.creature`). All three are real structure, not punctuation to
	// hyphenate away: treating them as segment boundaries keeps the shape in the
	// route and keeps the slug URL-safe.
	const segments = id.split(/[/:.]/);
	// Drop the bundle segment wherever it sits — it leads a plain id but follows
	// the discriminator in a niche id, and the whole site is already inside that
	// bundle's namespace either way.
	const withoutBundle = segments.filter((segment) => segment !== "" && segment !== "srd");
	return withoutBundle.map((segment) => segment.toLowerCase().replaceAll("_", "-")).join("/");
}

/**
 * Display copy for a mechanics row whose manifest table carries no
 * `display_name` column — measured: all 478 `consequence_templates` rows.
 * Same job `tagLabelFromId` does for the tag vocabulary, and the same shape
 * of answer: derived from the id, never authored twice.
 *
 * The last segment alone is far too thin — 44 different consequences would
 * all be called "Success" — so the parent segment leads:
 * `srd/attack/opportunity-attack/success` -> `Opportunity Attack — Success`.
 * A single-segment id keeps its one word.
 */
export function idLabelFromPath(id: string): string {
	const segments = idPathSlug(id)
		.split("/")
		.filter((segment) => segment !== "");
	const titleCase = (segment: string): string =>
		segment
			.split("-")
			.map((word) => (word === "" ? word : word[0]?.toUpperCase() + word.slice(1)))
			.join(" ");
	if (segments.length === 0) return id;
	const last = segments[segments.length - 1] as string;
	const parent = segments.length > 1 ? (segments[segments.length - 2] as string) : undefined;
	return parent === undefined ? titleCase(last) : `${titleCase(parent)} — ${titleCase(last)}`;
}

/**
 * Editorial section placement for `tag_value_definitions` rows
 * (sk-jay0.3.5.66 — tags moved under their own `/docs/srd/tags/...` section,
 * see `tagPathSlug` below). Every tag gets the one authored `tags_section` id
 * (`sections.toml`) — including the adventure/runtime identity vocabulary
 * (`srd.dm_npc`, `srd.faction`, `srd.party`) that the retired
 * `no_page_namespaces` carve-out used to keep off the reader
 * (sk-jay0.3.5.76: the owner ruled those tags get pages like every other
 * tag). Placement does not depend on the tag's own namespace at all — the
 * former per-namespace `[[tag_sections]]` table (`srd.cr` -> monsters,
 * `srd.spell.school` -> spells, …) is retired along with the per-chapter tag
 * chips it produced.
 */
function tagSectionForId(_id: string): string {
	return SECTIONS_FILE.tags_section;
}

/**
 * Multi-segment route slug for a tag id, published under the `tags` section
 * (sk-jay0.3.5.66): drop the leading bundle segment (`srd`), then each
 * remaining dot-separated segment becomes its own path segment, with
 * underscores hyphenated within a segment (never across segments — a
 * segment boundary is real structure, not punctuation to flatten away).
 * `srd.monster` -> `monster`, `srd.subclass.path_of_the_berserker` ->
 * `subclass/path-of-the-berserker`, `srd.spell.range.self` ->
 * `spell/range/self`. A pure function of the id — no lookup table, so a new
 * namespace never needs an authored row to get a sensible route.
 *
 * Replaces the retired `slugFromTagId` (single flat `srd-...-...` slug,
 * every dot AND underscore flattened to one hyphen run): that shape only
 * ever served the old per-namespace section placement above, which this
 * change removes, so nothing keeps depending on the flat form.
 */
export function tagPathSlug(id: string): string {
	const segments = id.split(".");
	const withoutBundle = segments[0] === "srd" ? segments.slice(1) : segments;
	return withoutBundle.map((segment) => segment.toLowerCase().replaceAll("_", "-")).join("/");
}

/**
 * Derive display copy from a tag id since `tag_value_definitions` carries no
 * `display_name` column: the last dot segment, `-`/`_` replaced by spaces and
 * title-cased. `srd.cr.*` gets its own rule — `srd.cr.2` -> `CR 2`,
 * `srd.cr.1-2` -> `CR 1/2` — matching the SRD's own fractional CR notation.
 */
export function tagLabelFromId(id: string): string {
	const lastDot = id.lastIndexOf(".");
	const lastSegment = lastDot === -1 ? id : id.slice(lastDot + 1);
	if (id.startsWith("srd.cr.")) {
		const fraction = /^(\d+)-(\d+)$/u.exec(lastSegment);
		if (fraction) return `CR ${fraction[1]}/${fraction[2]}`;
		if (/^\d+$/u.test(lastSegment)) return `CR ${lastSegment}`;
	}
	return lastSegment
		.split(/[-_]/u)
		.filter((word) => word.length > 0)
		.map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
		.join(" ");
}

export interface KindChapter {
	kind: string;
	chapter: string;
}

export function slugFromId(id: string): string {
	const slash = id.lastIndexOf("/");
	return (slash === -1 ? id : id.slice(slash + 1)).replaceAll("_", "-");
}

/**
 * Existing short class-feature URLs that were actually served before the
 * metadata catalogue existed. They are an explicit compatibility decision,
 * not an exporter or UI winner-selection rule, authored in sections.toml's
 * `class_feature_slug_overrides`. Every other member of one of these
 * colliding feature names receives an owner-qualified slug below.
 */
const LEGACY_CLASS_FEATURE_WINNERS: Readonly<Record<string, string>> = Object.fromEntries(
	SECTIONS_FILE.class_feature_slug_overrides.map(({ short_slug, ref }) => [short_slug, ref]),
);

function classFeatureQualifiedSlug(id: string): string {
	const parts = id.split("/");
	// `srd/class-feature/<owner...>/<feature>` becomes one route segment.
	// Retaining every owner component makes a future nested owner unambiguous.
	return parts.slice(2).join("-");
}

function resolvedClassFeatureSlugs(ids: readonly string[]): ReadonlyMap<string, string> {
	const byShortSlug = new Map<string, string[]>();
	for (const id of ids) {
		const slug = slugFromId(id);
		const group = byShortSlug.get(slug) ?? [];
		group.push(id);
		byShortSlug.set(slug, group);
	}
	const result = new Map<string, string>();
	for (const [shortSlug, group] of byShortSlug) {
		if (group.length === 1) {
			const [id] = group;
			if (id !== undefined) result.set(id, shortSlug);
			continue;
		}
		const winner = LEGACY_CLASS_FEATURE_WINNERS[shortSlug];
		if (winner === undefined || !group.includes(winner)) {
			throw new Error(
				`SRD docs catalogue: colliding class feature '${shortSlug}' has no declared legacy winner.`,
			);
		}
		for (const id of group)
			result.set(id, id === winner ? shortSlug : classFeatureQualifiedSlug(id));
	}
	return result;
}

function resolvedUniqueSlugs(ids: readonly string[]): ReadonlyMap<string, string> {
	const byShortSlug = new Map<string, string[]>();
	for (const id of ids) {
		const shortSlug = slugFromId(id);
		const group = byShortSlug.get(shortSlug) ?? [];
		group.push(id);
		byShortSlug.set(shortSlug, group);
	}
	const result = new Map<string, string>();
	for (const [shortSlug, group] of byShortSlug) {
		if (group.length === 1) {
			const [id] = group;
			if (id !== undefined) result.set(id, shortSlug);
			continue;
		}
		// No historical resource route chose a winner. Every colliding resource
		// starts at an owner-qualified route from the first catalogue release.
		for (const id of group) result.set(id, id.split("/").slice(1).join("-").replaceAll("_", "-"));
	}
	return result;
}

/**
 * Id-prefix-only placement, kept for the legacy export API
 * (`src/export/*`), which has no manifest tag data to consult. The authored
 * docs catalogue builder below uses `placementForEntity` instead, which adds
 * a tag fallback for the rare id that matches no declared prefix — see
 * sections.toml's `entity_routes` doc comment.
 */
export function kindChapterForId(id: string): KindChapter | undefined {
	for (const route of ENTITY_ROUTES) {
		if (id.startsWith(route.prefix)) return { kind: route.family, chapter: route.section };
	}
	return undefined;
}

/**
 * Id-prefix-first editorial placement for one entity_definition catalogue
 * subject: the first `entity_routes` row whose `prefix` the entity's id
 * matches wins outright (the id namespace is the entity's authored
 * editorial home); otherwise the first row whose `tag` the entity carries
 * is the fallback, for entities whose id matches none of the declared
 * prefixes at all (see sections.toml's `entity_routes` doc comment).
 */
function placementForEntity(
	id: string,
	tags: ReadonlySet<string> | undefined,
): FamilySection | undefined {
	for (const route of ENTITY_ROUTES) {
		if (id.startsWith(route.prefix)) return { family: route.family, section: route.section };
	}
	if (tags !== undefined) {
		for (const route of ENTITY_ROUTES) {
			if (route.tag !== undefined && tags.has(route.tag))
				return { family: route.family, section: route.section };
		}
	}
	return undefined;
}

/**
 * Whether an `entity_definitions` id is considered for a catalogue page at all.
 *
 * Derived from the authored `entity_routes` prefixes, never from a list in this
 * file. It used to be one — fourteen strings that had to stay byte-identical to
 * `sections.toml`, with nothing checking that they did. Adding a route row and
 * forgetting the code table is silent: the entity matches no prefix here, never
 * reaches `placementForEntity`, and is skipped exactly like an entity that was
 * never authored. That is how 450 rows lost their pages (sk-jay0.3.5.72).
 *
 * Placement is an editorial decision and belongs in the authored file. One row
 * in `sections.toml` is now the whole change.
 */
export function isCatalogEntityId(id: string): boolean {
	return ENTITY_ROUTES.some((route) => id.startsWith(route.prefix));
}

/**
 * Id-prefix-first editorial placement for one `resource_definitions`
 * catalogue subject: the first `resource_routes` row (`sections.toml`) whose
 * `prefix` the id matches wins. An id matching none of them — every non-SRD
 * bundle's own resources, since none of those rows names a non-`srd/`
 * prefix — falls to the one authored `mechanics_section`, the same fallback
 * `[[kind_sections]]` gives every other mechanics row kind.
 */
export function resourceChapterForId(id: string): string {
	for (const route of RESOURCE_ROUTES) {
		if (id.startsWith(route.prefix)) return route.section;
	}
	return SECTIONS_FILE.mechanics_section;
}

/**
 * Facts a fixed, mechanical value-derivation from an entity's own tags
 * cannot honestly reproduce stay authored here from typed source rows, and
 * are delivered to the website as a slim `metadata_attachments` residual
 * (`srd.docs_facts`, `renderSrdFactsMetadataFragments` in
 * `compendium-metadata.ts`) rather than embedded on a catalogue listing row
 * — sk-jay0.3.5.59 stopped materializing the listing itself (kind/ref/
 * family/slug are mechanically derivable from `sections.toml`'s placement
 * rules, so the website derives them; see `srd-catalogue-listing.ts`).
 *
 * Spell/creature/magic-item facts (Level, School, Range, Duration, Size,
 * Type, Challenge Rating, Category, Rarity, Attunement) already had a tag
 * counterpart and moved to website-side derivation earlier (sk-jay0.3.5.54
 * step 2) — see `apps/website/src/compendium/project-metadata-docs.ts`'s
 * fact-namespace derivation and `sections.toml`'s `fact_namespaces`.
 *
 * **Weapon Category is the one equipment fact that joins that move here**
 * (sk-jay0.3.5.59): `srd.weapon.category.<simple|martial>` reproduces it
 * exactly (title-case, verified against all 38 weapons, zero mismatches),
 * with no self-identity collision (`srd.weapon.category` is never carried
 * bare on any weapon — only its `.simple`/`.martial` children are). It is
 * DROPPED from this function's own weapon branch below; the website
 * prepends the derived value back onto the residual array so the served
 * order stays exactly what it was (Category was always the first fact for
 * every equipment kind).
 *
 * **Everything else here was checked and found NOT safely derivable —
 * exhaustive per-row verification, not a sample:**
 * - **Range** (all 38 weapons): `srd.weapon.range.<melee|ranged>` is a
 *   binary classification; the served fact is the real distance ("20/60
 *   ft.", "90 ft.") for every one of the 16 non-melee weapons, which exists
 *   ONLY in `Weapon.json`, never in any tag. Deriving it would have
 *   silently replaced every ranged/thrown weapon's real range with the bare
 *   word "Ranged" — a genuine information loss, not a wording nit.
 * - **Property/Mastery** (108 rows = 70 Property + 38 Mastery,
 *   `srd.weapon.property.<slug>`/`srd.weapon.mastery.<slug>`): 38 Mastery +
 *   72 of 70 Property rows title-case cleanly, but 24 Property rows carry a
 *   `detail` (Versatile's die size, Thrown/Ammunition's range + ammo type,
 *   Lance's "Two-Handed (unless mounted)") that exists ONLY in the
 *   per-assignment source data — no tag encodes it — so those 24 cannot
 *   derive without real data loss. Of the remaining 46, 12 are all the SAME
 *   tag, `srd.weapon.property.two-handed`, and would need a
 *   `fact_value_overrides` row ("Two-Handed", not the space-joined "Two
 *   Handed" title-case produces) to derive cleanly. Kept ALL 108 rows here
 *   regardless (not just the 24 that must stay), because the served facts
 *   are `N` SEPARATE rows in the weapon's own assignment order, interleaved
 *   with Category/Damage/Range/Cost/Weight — not one joined string — and
 *   splitting "34+38 derive, 24 stay" while preserving that exact
 *   interleaved order needs a genuine multi-row-per-namespace derivation +
 *   order-preserving merge capability that does not exist today. Building
 *   it now would be thrown away once sk-jay0.3.5.62 (below) lands, since
 *   that also removes the reason Damage/Cost/Weight stay authored, at which
 *   point a single richer merge is worth designing once.
 * - **Cost, Weight, Damage dice, all armor numbers** (Armor Class, Stealth,
 *   Dexterity, Dexterity Cap, Strength Required): missing from the manifest
 *   entirely, not merely untagged — no `entity_definition_initial_state`
 *   row carries them for any weapon/armor/item today. Filed as
 *   sk-jay0.3.5.62 (item cost/weight/armor numbers missing from the world);
 *   once that lands these derive trivially and this residual shrinks a lot.
 * - **Plain-item Category** (`srd/item/*`, non-weapon/armor gear): no
 *   systematic tag exists for open5e's own item categories ("tools",
 *   "adventuring-gear", "mount", …).
 * - **Feat Category** (all 17 feats, `srd.feat.<general|origin|
 *   fighting_style|epic_boon>`): title-cases cleanly in isolation (checked,
 *   0/17 mismatches) but is NOT safely derivable — every feat entity ALSO
 *   carries the bare `srd.feat` tag as its own family identity (same shape
 *   `srd.class` has for class entities), so a `fact_namespaces` row with
 *   `namespace = "srd.feat"` collides with the website's own self-identity
 *   guard (`factTagForNamespace` in `project-metadata-docs.ts`) and silently
 *   derives NOTHING for every feat — or, without that guard, throws
 *   "ambiguous" for every one of them. Verified directly against the guard's
 *   own logic before ruling this out, the same way the class "Class" fact
 *   collision was caught. Feat Category stays authored here.
 * - **Feat Prerequisite**: free text, never vocabulary.
 */
function displayNumber(value: string): string {
	return value.includes(".") ? value.replace(/\.0+$/u, "") : value;
}

function equipmentFactsById(): ReadonlyMap<string, readonly { label: string; value: string }[]> {
	const pkSuffix = (pk: string) => pk.replace(/^srd-2024_/u, "");
	const itemsByPk = new Map(readItems().map((item) => [item.pk, item] as const));
	const itemFacts = (pk: string): readonly { label: string; value: string }[] => {
		const item = itemsByPk.get(pk);
		if (item === undefined)
			throw new Error(`SRD docs equipment: no Item.json row matching '${pk}'.`);
		return [
			{ label: "Cost", value: `${displayNumber(item.cost)} GP` },
			{ label: "Weight", value: `${displayNumber(item.weight)} lb.` },
		];
	};
	const propertiesByPk = new Map(
		readWeaponProperties().map((property) => [property.pk, property] as const),
	);
	const assignmentsByWeapon = new Map<string, ReturnType<typeof readWeaponPropertyAssignments>>();
	for (const assignment of readWeaponPropertyAssignments()) {
		const rows = assignmentsByWeapon.get(assignment.weaponPk) ?? [];
		rows.push(assignment);
		assignmentsByWeapon.set(assignment.weaponPk, rows);
	}
	const facts = new Map<string, readonly { label: string; value: string }[]>();
	for (const weapon of readWeapons()) {
		const assignments = assignmentsByWeapon.get(weapon.pk) ?? [];
		const assignmentFacts = assignments.map((assignment) => {
			const property = propertiesByPk.get(assignment.propertyPk);
			if (property === undefined) {
				throw new Error(
					`SRD docs equipment: assignment '${assignment.pk}' names unknown property '${assignment.propertyPk}'.`,
				);
			}
			return {
				label: property.type === "Mastery" ? "Mastery" : "Property",
				value:
					assignment.detail === null ? property.name : `${property.name} (${assignment.detail})`,
			};
		});
		facts.set(`srd/weapon/${pkSuffix(weapon.pk)}`, [
			// Category is deliberately NOT authored here — it derives from
			// `srd.weapon.category.<simple|martial>` at website projection
			// time, prepended back onto this residual array so served order
			// is unchanged (see this function's own header).
			{ label: "Damage", value: `${weapon.damageDice} ${weapon.damageType}` },
			{
				label: "Range",
				value:
					weapon.range === 0
						? "Melee"
						: weapon.longRange === 0
							? `${weapon.range} ft.`
							: `${weapon.range}/${weapon.longRange} ft.`,
			},
			...itemFacts(weapon.pk),
			...assignmentFacts,
		]);
	}
	for (const armor of readArmor()) {
		facts.set(`srd/armor/${pkSuffix(armor.pk)}`, [
			{ label: "Category", value: armorWeightClass(armor.pk) },
			{ label: "Armor Class", value: String(armor.acBase) },
			{
				label: "Dexterity",
				value: armor.acAddDexMod ? "Adds Dexterity modifier" : "No Dexterity modifier",
			},
			{
				label: "Stealth",
				value: armor.grantsStealthDisadvantage ? "Disadvantage" : "No disadvantage",
			},
			...(armor.acCapDexMod === null
				? []
				: [{ label: "Dexterity Cap", value: `+${armor.acCapDexMod}` }]),
			...(armor.strengthScoreRequired === null
				? []
				: [{ label: "Strength Required", value: String(armor.strengthScoreRequired) }]),
			...itemFacts(armor.pk),
		]);
	}
	for (const item of readItems()) {
		facts.set(`srd/item/${pkSuffix(item.pk)}`, [
			{ label: "Category", value: item.category },
			{ label: "Cost", value: item.cost },
			{ label: "Weight", value: item.weight },
		]);
	}
	return facts;
}

function featFactsById(): ReadonlyMap<string, readonly { label: string; value: string }[]> {
	return new Map(
		readFeats().map(
			(feat) =>
				[
					`srd/feat/${feat.pk.replace(/^srd-2024_/u, "")}`,
					[
						{ label: "Category", value: feat.type },
						...(feat.prerequisite.length === 0
							? []
							: [{ label: "Prerequisite", value: feat.prerequisite }]),
					],
				] as const,
		),
	);
}

function classFactsById(): ReadonlyMap<string, readonly { label: string; value: string }[]> {
	const bases = readBaseCharacterClasses();
	const baseNames = new Map(bases.map((row) => [row.pk, row.name]));
	const facts = new Map<string, readonly { label: string; value: string }[]>();
	for (const row of bases) {
		facts.set(`srd/class/${row.pk.replace(/^srd-2024_/u, "")}`, [
			...(row.hitDice === null ? [] : [{ label: "Hit Die", value: row.hitDice }]),
			{ label: "Caster Type", value: row.casterType },
		]);
	}
	for (const row of readSubclasses()) {
		facts.set(
			`srd/subclass/${row.pk.replace(/^srd-2024_/u, "")}`,
			row.subclassOf === null
				? []
				: [{ label: "Class", value: baseNames.get(row.subclassOf) ?? row.subclassOf }],
		);
	}
	return facts;
}

/**
 * The full typed-facts residual (equipment weapon [minus Category, see
 * `equipmentFactsById`'s own header] + armor + item, feat, class/subclass)
 * — exported for `renderSrdFactsMetadataFragments`
 * (`compendium-metadata.ts`), the sole consumer of this map for actual
 * emission (sk-jay0.3.5.59: no `catalogue.toml` scaffolding, just this).
 */
export function catalogueFactsById(): ReadonlyMap<
	string,
	readonly { label: string; value: string }[]
> {
	return new Map([...equipmentFactsById(), ...featFactsById(), ...classFactsById()]);
}

/**
 * Turn the chapter generators' typed emitted identities into editorial
 * membership. It never consumes an exported compendium artifact and it does
 * not infer identities in a UI.
 */
export function catalogueEntriesFromUnits(
	units: readonly ChapterUnitSummary[],
): ReadonlyMap<string, readonly SrdCatalogueEntry[]> {
	return catalogueEntriesFromIdentityRows(
		units.map(({ kind, id }) => ({ kind, id })),
		new Map(),
	);
}

/** Every root+value tag an entity_definition carries, from `entity_definition_tag` manifest rows. */
function tagsByEntityId(manifest: ManifestRows): ReadonlyMap<string, ReadonlySet<string>> {
	const result = new Map<string, Set<string>>();
	for (const row of Array.isArray(manifest.entity_definition_tag)
		? manifest.entity_definition_tag
		: []) {
		if (row === null || typeof row !== "object") continue;
		const entityDefId = (row as ManifestRows).entity_def_id;
		const tag = (row as ManifestRows).tag;
		if (typeof entityDefId !== "string" || typeof tag !== "string") continue;
		const tags = result.get(entityDefId) ?? new Set<string>();
		tags.add(tag);
		result.set(entityDefId, tags);
	}
	return result;
}

/**
 * Derive exact catalogue membership from the combined rendered manifest rows.
 * The pipeline feeds this the assembled current+committed shard view, which
 * keeps a shard root complete without consulting the retired compendium
 * export. Only string identity fields are read; gameplay values are never
 * transformed or rendered by this projection.
 */
export function catalogueEntriesFromManifest(
	manifest: ManifestRows,
): ReadonlyMap<string, readonly SrdCatalogueEntry[]> {
	const identities: Array<{ kind: string; id: string; title?: string }> = [];
	// `entity_definitions.description` is deliberately NOT read into a
	// catalogue entry here: the website projection (`apps/website/src/
	// compendium/project-metadata-docs.ts`) reads the entity's own manifest
	// row directly and applies its own markup-cleanup pass, so this
	// generator never carries a copy of runtime description text.
	const attachmentSources = new Map<string, string>();
	for (const row of Array.isArray(manifest.entity_definitions) ? manifest.entity_definitions : []) {
		if (
			row !== null &&
			typeof row === "object" &&
			typeof (row as ManifestRows).entity_def_id === "string"
		) {
			identities.push({
				kind: "entity_definitions",
				id: (row as ManifestRows).entity_def_id as string,
			});
		}
	}
	for (const row of Array.isArray(manifest.resource_definitions)
		? manifest.resource_definitions
		: []) {
		if (
			row !== null &&
			typeof row === "object" &&
			typeof (row as ManifestRows).resource_definition_id === "string"
		) {
			identities.push({
				kind: "resource_definitions",
				id: (row as ManifestRows).resource_definition_id as string,
			});
		}
	}
	for (const row of Array.isArray(manifest.tag_value_definitions)
		? manifest.tag_value_definitions
		: []) {
		if (
			row === null ||
			typeof row !== "object" ||
			typeof (row as ManifestRows).tag !== "string" ||
			typeof (row as ManifestRows).description !== "string"
		)
			continue;
		identities.push({
			kind: "tag_value_definitions",
			id: (row as ManifestRows).tag as string,
		});
	}
	// Mechanics kinds: one generic pass driven by authored placement, never a
	// branch per kind. The id column comes from the kernel registry, so adding a
	// kind is one `[[kind_sections]]` row plus its reader component — no change
	// here.
	for (const placement of KIND_SECTIONS) {
		// The kernel registry answers for every kind it knows; a kind it does not
		// register may author its own `id_field` in `row-kind-coverage.toml`
		// (today only `boundary_definitions`). A kind with neither has no
		// addressable identity, so nothing could route to it.
		const idField =
			ROW_KIND_NATURAL_KEY[placement.kind] ?? rowKindCoverageFor(placement.kind)?.id_field;
		if (idField === undefined) continue;
		const table = manifest[placement.kind];
		// One subject may be declared by several rows: authoring is upsert-by-key,
		// so `srd/attack_roll` is declared as a modifier target in all nine class
		// files that adjust it. Nine rows, one page.
		const seenIds = new Set<string>();
		const rowCount = Array.isArray(table) ? table.length : 0;
		for (const row of Array.isArray(table) ? (table as readonly unknown[]) : []) {
			if (row === null || typeof row !== "object") continue;
			const id = (row as ManifestRows)[idField];
			if (typeof id !== "string" || id === "") continue;
			if (seenIds.has(id)) continue;
			seenIds.add(id);
			// A kind whose table has no `display_name` column gets derived copy,
			// exactly as the tag vocabulary does. Measured: every one of the 478
			// consequence_templates rows, and none of the other four kinds.
			const displayName = (row as ManifestRows).display_name;
			const hasName = typeof displayName === "string" && displayName !== "";
			identities.push({
				kind: placement.kind,
				id,
				...(hasName ? {} : { title: idLabelFromPath(id) }),
			});
		}
		// A published kind whose rows exist but yield no identity is misconfigured,
		// and it fails SILENTLY: the kind simply publishes nothing and every gate
		// that counts pages still passes. That is exactly what happened to
		// `boundary_definitions`, whose authored `id_field` named a column
		// (`boundary_id`) that no row carries — the real one is `id`. A kind with
		// no rows at all is fine; several are registered in the kernel and simply
		// have no content yet.
		if (rowCount > 0 && seenIds.size === 0)
			throw new Error(
				`SRD docs catalogue: '${placement.kind}' has ${rowCount} rows but none carries '${idField}'. Fix the id_field in row-kind-coverage.toml, or the kernel registry entry.`,
			);
	}
	for (const row of Array.isArray(manifest.metadata_attachments)
		? manifest.metadata_attachments
		: []) {
		if (row === null || typeof row !== "object") continue;
		const attachment = row as ManifestRows;
		if (
			attachment.namespace !== "srd.text" ||
			typeof attachment.target_kind !== "string" ||
			typeof attachment.target_ref !== "string" ||
			typeof attachment.payload_json !== "string"
		)
			continue;
		let payload: unknown;
		try {
			payload = JSON.parse(attachment.payload_json);
		} catch {
			continue;
		}
		if (payload === null || typeof payload !== "object") continue;
		const source = (payload as ManifestRows).source;
		if (typeof source !== "string") continue;
		attachmentSources.set(`${attachment.target_kind}\0${attachment.target_ref}`, source);
	}
	const tagsByEntity = tagsByEntityId(manifest);
	const catalogue = catalogueEntriesFromIdentityRows(identities, tagsByEntity);
	const groupBy = <T>(values: readonly T[], key: (value: T) => string | undefined) => {
		const groups = new Map<string | undefined, T[]>();
		for (const value of values) {
			const groupKey = key(value);
			const group = groups.get(groupKey) ?? [];
			group.push(value);
			groups.set(groupKey, group);
		}
		return groups;
	};
	return new Map(
		[...catalogue].map(([section, entries]) => {
			const pagesBySource = groupBy(
				readSrdReaderPagesForSection(section).flatMap((page) =>
					page.attachment_sources.map((source) => ({ page, source })),
				),
				({ source }) => source,
			);
			const entriesBySource = groupBy(entries, (entry) =>
				attachmentSources.get(`${entry.kind}\0${entry.ref}`),
			);
			return [
				section,
				entries.map((entry) => {
					const source = attachmentSources.get(`${entry.kind}\0${entry.ref}`);
					if (source === undefined) return entry;
					const matchingPages = (pagesBySource.get(source) ?? []).map(({ page }) => page);
					const matchingEntries = entriesBySource.get(source) ?? [];
					if (matchingPages.length !== 1 || matchingEntries.length !== 1) return entry;
					const readerPage = matchingPages[0];
					return readerPage === undefined ? entry : { ...entry, reader_page_id: readerPage.id };
				}),
			] as const;
		}),
	);
}

/**
 * Preserve the legacy compendium's prose-link target selection as authored
 * root metadata, plus lookup-only targets (`autolink: false`) that a client
 * resolves by `ref` but prose never matches: short labels and skills. This
 * selects typed source rows, never a rendered JSON artifact; the website
 * resolves the explicit identities to its own routes.
 */
export function docsLinkTargetsFromManifest(manifest: ManifestRows): readonly SrdDocsLinkTarget[] {
	const candidates: SrdDocsLinkTarget[] = [];
	for (const row of Array.isArray(manifest.entity_definitions) ? manifest.entity_definitions : []) {
		if (row === null || typeof row !== "object") continue;
		const value = row as ManifestRows;
		const ref = value.entity_def_id;
		const label = value.display_name;
		if (typeof ref !== "string" || typeof label !== "string" || !isCatalogEntityId(ref)) continue;
		candidates.push({ label, kind: "entity_definition", ref });
	}
	for (const row of Array.isArray(manifest.resource_definitions)
		? manifest.resource_definitions
		: []) {
		if (row === null || typeof row !== "object") continue;
		const value = row as ManifestRows;
		const ref = value.resource_definition_id;
		const label = value.display_name;
		if (
			typeof ref !== "string" ||
			typeof label !== "string" ||
			!(REQUIRED_RESOURCES as readonly string[]).includes(ref)
		)
			continue;
		candidates.push({ label, kind: "resource_definition", ref });
	}
	const skillIds = new Set<string>();
	for (const row of Array.isArray(manifest.capability_definition_tag)
		? manifest.capability_definition_tag
		: []) {
		if (row === null || typeof row !== "object") continue;
		const value = row as ManifestRows;
		if (value.tag === SKILL_CAPABILITY_TAG && typeof value.capability_id === "string")
			skillIds.add(value.capability_id);
	}
	const seenSkills = new Set<string>();
	for (const row of Array.isArray(manifest.capability_definitions)
		? manifest.capability_definitions
		: []) {
		if (row === null || typeof row !== "object") continue;
		const value = row as ManifestRows;
		const ref = value.capability_id;
		const label = value.display_name;
		if (typeof ref !== "string" || typeof label !== "string" || !skillIds.has(ref)) continue;
		if (seenSkills.has(ref)) continue;
		seenSkills.add(ref);
		// Skills are rules terms ("Skill: Stealth"), not proper nouns: prose
		// autolinking them is a separate decision, so they are lookup-only.
		candidates.push({ label, kind: "capability_definition", ref, autolink: false });
	}
	// The prose guard: a label shorter than four letters ("Elf", "Orc") is too
	// likely to be an ordinary word fragment of a sentence, so it never
	// autolinks unless allow-listed. It still remains a lookup target by ref,
	// unless a prose target shares its label: labels stay unique because the
	// website refuses a duplicate (none collide in the SRD bundle today, pinned by
	// src/test/offline/choice-grant-references.test.ts).
	const shortNames = new Set(["Aid", "Bane"]);
	const seenLabels = new Set<string>();
	return candidates
		.map((candidate) =>
			candidate.label.length >= 4 || shortNames.has(candidate.label)
				? candidate
				: { ...candidate, autolink: false as const },
		)
		.sort(
			(left, right) =>
				right.label.length - left.label.length ||
				left.label.localeCompare(right.label) ||
				// On a shared label a prose target keeps its legacy win.
				Number(left.autolink === false) - Number(right.autolink === false) ||
				left.ref.localeCompare(right.ref),
		)
		.filter(({ label }) => {
			if (seenLabels.has(label)) return false;
			seenLabels.add(label);
			return true;
		});
}

function catalogueEntriesFromIdentityRows(
	identities: readonly { kind: string; id: string; title?: string }[],
	tagsByEntity: ReadonlyMap<string, ReadonlySet<string>> = new Map(),
): ReadonlyMap<string, readonly SrdCatalogueEntry[]> {
	const bySection = new Map<string, SrdCatalogueEntry[]>();
	const seen = new Set<string>();
	const classFeatureIds = identities
		.filter(({ kind, id }) => kind === "entity_definitions" && id.startsWith("srd/class-feature/"))
		.map(({ id }) => id);
	const classFeatureSlugs = resolvedClassFeatureSlugs(classFeatureIds);
	const factsById = catalogueFactsById();
	const resourceSlugsBySection = new Map<string, ReadonlyMap<string, string>>();
	// Every section a `resource_routes` row can land an id in, plus the
	// `mechanics_section` fallback for an id no row matches (dm/kavemouth's
	// own resources) — derived from the authored routes rather than
	// hand-listed, so a new route's section never needs a matching edit here.
	const resourceSections = new Set<string>([
		...RESOURCE_ROUTES.map((route) => route.section),
		SECTIONS_FILE.mechanics_section,
	]);
	for (const section of resourceSections) {
		const resourceIds = identities
			.filter(
				({ kind, id }) => kind === "resource_definitions" && resourceChapterForId(id) === section,
			)
			.map(({ id }) => id);
		resourceSlugsBySection.set(section, resolvedUniqueSlugs(resourceIds));
	}
	for (const unit of identities) {
		let entry: SrdCatalogueEntry | undefined;
		let section: string | undefined;
		if (unit.kind === "entity_definitions" && isCatalogEntityId(unit.id)) {
			const mapping = placementForEntity(unit.id, tagsByEntity.get(unit.id));
			const facts = factsById.get(unit.id);
			if (mapping !== undefined) {
				entry = {
					kind: "entity_definition",
					ref: unit.id,
					family: mapping.family,
					slug: classFeatureSlugs.get(unit.id) ?? slugFromId(unit.id),
					...(facts === undefined ? {} : { facts }),
				};
				section = mapping.section;
			}
		} else if (unit.kind === "resource_definitions") {
			section = resourceChapterForId(unit.id);
			entry = {
				kind: "resource_definition",
				ref: unit.id,
				family: (REQUIRED_RESOURCES as readonly string[]).includes(unit.id)
					? "ability"
					: "resource",
				slug: resourceSlugsBySection.get(section)?.get(unit.id) ?? slugFromId(unit.id),
			};
		} else if (KIND_SECTIONS_BY_KIND.has(unit.kind)) {
			// Every mechanics kind publishes under one section, with its own
			// authored path segment leading the route, so
			// `srd/attack/opportunity-attack` becomes
			// `/docs/srd/mechanics/actions/attack/opportunity-attack`.
			const placement = KIND_SECTIONS_BY_KIND.get(unit.kind);
			if (placement !== undefined) {
				section = SECTIONS_FILE.mechanics_section;
				// The catalogue entry kind is the SINGULAR form the docs consumer
				// keys on (`action_definition`), derived by the one shared rule
				// rather than restated — the manifest table stays plural.
				const coverage = rowKindCoverageFor(placement.kind);
				entry = {
					kind: coverage === undefined ? placement.kind : entryKindForTable(coverage),
					ref: unit.id,
					family: placement.family,
					slug: `${placement.path}/${idPathSlug(unit.id)}`,
					...(unit.title === undefined ? {} : { title: unit.title }),
				};
			}
		} else if (unit.kind === "tag_value_definitions") {
			section = tagSectionForId(unit.id);
			if (section !== undefined) {
				entry = {
					kind: "tag_value_definition",
					ref: unit.id,
					family: "tag",
					slug: tagPathSlug(unit.id),
					title: tagLabelFromId(unit.id),
				};
			}
		}
		if (entry === undefined || section === undefined) continue;
		const identity = `${entry.kind}\u0000${entry.ref}`;
		if (seen.has(identity))
			throw new Error(`SRD docs catalogue: duplicate emitted subject '${entry.ref}'.`);
		seen.add(identity);
		const entries = bySection.get(section) ?? [];
		entries.push(entry);
		bySection.set(section, entries);
	}
	for (const [section, entries] of bySection) {
		const bySlug = new Map<string, SrdCatalogueEntry[]>();
		for (const entry of entries) {
			const group = bySlug.get(entry.slug) ?? [];
			group.push(entry);
			bySlug.set(entry.slug, group);
		}
		for (const group of bySlug.values()) {
			if (group.length < 2) continue;
			// A resource and an independently addressable subject may share an
			// owner-qualified name (for example Paladin's Channel Divinity uses).
			// Resource routes had no served legacy alias, so prefixing their new
			// metadata alias preserves the existing subject destination.
			for (const entry of group) {
				if (entry.kind === "resource_definition") entry.slug = `resource-${entry.slug}`;
			}
		}
		const slugs = new Set<string>();
		for (const entry of entries) {
			if (slugs.has(entry.slug)) {
				throw new Error(
					`SRD docs catalogue: duplicate '${entry.slug}' route in section '${section}'.`,
				);
			}
			slugs.add(entry.slug);
		}
	}
	return bySection;
}
