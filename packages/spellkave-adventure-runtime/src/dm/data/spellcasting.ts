/**
 * DM-side readers over `srd.spell_slot_grant` / `srd.spellcasting_profile`
 * and class spell-list tags — creation + level-up casters.
 * `docs/spellcasting-substrate.md`.
 */
import type { AuthorTarget } from "@spellkave/tool-authoring";
import { SPELL_SLOT_GRANT_NAMESPACE, SPELLCASTING_PROFILE_NAMESPACE } from "../../srd-ids.ts";
import { SRD_CASTER_PAYLOADS, SRD_CASTER_PROFILES } from "./srd-catalog.ts";

export type SpellcastingProfilePayload = Record<string, unknown> & {
	class: string;
	ability: string;
	feature: string;
	ritual_casting: boolean;
	prepared_spells_by_level: Record<string, number>;
	cantrips_known_by_level?: Record<string, number>;
};

const SRD_BUNDLE = "srd";
const METADATA_ATTACHMENTS_ROW_KIND = "metadata_attachments";
/** Singular TOML table name (`[[entity_definition_tag]]`). */
const ENTITY_DEFINITION_TAG_ROW_KIND = "entity_definition_tag";

function asString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null
		? (value as Record<string, unknown>)
		: undefined;
}

function parsePayload(payloadJson: unknown): Record<string, unknown> | undefined {
	const raw = asString(payloadJson);
	if (raw === undefined) return undefined;
	try {
		return asRecord(JSON.parse(raw));
	} catch {
		return undefined;
	}
}

export function preparedSpellCapabilityId(spellSlug: string): string {
	return `${SRD_BUNDLE}/spell/${spellSlug}/prepared`;
}

export function cantripCapabilityId(spellSlug: string): string {
	return `${SRD_BUNDLE}/spell/${spellSlug}/cantrip`;
}

export function spellListTag(classSlug: string): string {
	return `srd.spell.list.${classSlug}`;
}

/** Cache-backed profile for a caster class, or `null` for non-casters. */
export function spellcastingProfileForClass(classSlug: string): SpellcastingProfilePayload | null {
	if (SRD_CASTER_PROFILES.find((row) => row.classSlug === classSlug) === undefined) return null;
	const payload = SRD_CASTER_PAYLOADS[classSlug];
	if (payload === undefined) return null;
	return payload as SpellcastingProfilePayload;
}

export interface SpellSlotGrant {
	resourceId: string;
	count: number;
	kind: string;
	recovery: string;
}

interface SpellSlotGrantPayload {
	class: string;
	level: number;
	count: number;
	kind?: string;
	recovery?: string;
}

function parseSlotGrantPayload(
	payload: Record<string, unknown>,
	resourceId: string,
): readonly SpellSlotGrantPayload[] {
	const rawGrants = payload.grants;
	const candidates = rawGrants === undefined ? [payload] : rawGrants;
	if (!Array.isArray(candidates))
		throw new Error(
			`spell slot metadata for '${resourceId}' has grants that is not an array; expected an array of grant objects.`,
		);
	return candidates.map((candidate, index) => {
		const grant = asRecord(candidate);
		if (
			grant === undefined ||
			typeof grant.class !== "string" ||
			typeof grant.level !== "number" ||
			typeof grant.count !== "number"
		)
			throw new Error(
				`spell slot metadata for '${resourceId}' has malformed grant at grants[${index}]; ` +
					"expected class, level, and count.",
			);
		if (
			(grant.kind !== undefined && typeof grant.kind !== "string") ||
			(grant.recovery !== undefined && typeof grant.recovery !== "string")
		)
			throw new Error(
				`spell slot metadata for '${resourceId}' has malformed grant at grants[${index}]; ` +
					"kind and recovery must be strings when present.",
			);
		return {
			class: grant.class,
			level: grant.level,
			count: grant.count,
			...(typeof grant.kind === "string" ? { kind: grant.kind } : {}),
			...(typeof grant.recovery === "string" ? { recovery: grant.recovery } : {}),
		};
	});
}

/**
 * Absolute slot grants at `(class, level)` from an AuthorTarget (or empty).
 * Accepts deployed scalar payloads and the lossless `{ grants: [...] }`
 * aggregation; duplicate resource/class/level grants reject rather than
 * depending on attachment iteration order.
 */
export function spellSlotGrantsForClassLevel(
	target: AuthorTarget,
	classSlug: string,
	level: number,
): readonly SpellSlotGrant[] {
	const rows = target.lookup(METADATA_ATTACHMENTS_ROW_KIND, { bundle: SRD_BUNDLE });
	const out: SpellSlotGrant[] = [];
	const seen = new Set<string>();
	for (const row of rows) {
		if (asString(row.namespace) !== SPELL_SLOT_GRANT_NAMESPACE) continue;
		const payload = parsePayload(row.payload_json);
		if (payload === undefined) continue;
		const resourceId = asString(row.target_ref);
		if (resourceId === undefined) continue;
		for (const grant of parseSlotGrantPayload(payload, resourceId)) {
			if (grant.class !== classSlug || grant.level !== level) continue;
			const identity = JSON.stringify([resourceId, grant.class, grant.level]);
			if (seen.has(identity))
				throw new Error(
					`spell slot metadata declares duplicate grant for resource '${resourceId}', class '${grant.class}', ` +
						`level ${grant.level}; repair the attachment instead of relying on row order.`,
				);
			seen.add(identity);
			out.push({
				resourceId,
				count: grant.count,
				kind: grant.kind ?? "spell_slot",
				recovery: grant.recovery ?? "long_rest",
			});
		}
	}
	return out;
}

/**
 * Spell entity ids on a class list at a given spell level (0 = cantrip),
 * derived from `entity_definition_tags` membership on `srd.spell.list.<class>`.
 * Spell level is read from the entity id only when the caller filters further;
 * this returns all tagged spell entity ids for the class list.
 */
export function spellEntityIdsOnClassList(
	target: AuthorTarget,
	classSlug: string,
): readonly string[] {
	const tag = spellListTag(classSlug);
	const rows = target.lookup(ENTITY_DEFINITION_TAG_ROW_KIND, { bundle: SRD_BUNDLE });
	const out: string[] = [];
	for (const row of rows) {
		if (asString(row.tag) !== tag) continue;
		const defId = asString(row.entity_def_id) ?? asString(row.entity_definition_id);
		if (defId !== undefined) out.push(defId);
	}
	return out;
}

/** Spell slugs (last path segment) on the class list whose entity carries level. */
export function spellSlugsOnClassListAtLevel(
	target: AuthorTarget,
	classSlug: string,
	spellLevel: number,
): readonly string[] {
	const entityIds = spellEntityIdsOnClassList(target, classSlug);
	const levelTag = `srd.spell.level.${spellLevel}`;
	const levelRows = target.lookup(ENTITY_DEFINITION_TAG_ROW_KIND, { bundle: SRD_BUNDLE });
	const atLevel = new Set<string>();
	for (const row of levelRows) {
		if (asString(row.tag) !== levelTag) continue;
		const defId = asString(row.entity_def_id) ?? asString(row.entity_definition_id);
		if (defId !== undefined) atLevel.add(defId);
	}
	const slugs: string[] = [];
	for (const id of entityIds) {
		if (!atLevel.has(id)) continue;
		const slug = id.split("/").pop();
		if (slug !== undefined) slugs.push(slug);
	}
	return slugs.sort((a, b) => a.localeCompare(b));
}

export function cantripsKnownAtLevel(
	profile: SpellcastingProfilePayload,
	characterLevel: number,
): number {
	const map = profile.cantrips_known_by_level;
	if (map === undefined) return 0;
	return map[String(characterLevel)] ?? 0;
}

export function preparedSpellsAtLevel(
	profile: SpellcastingProfilePayload,
	characterLevel: number,
): number {
	return profile.prepared_spells_by_level[String(characterLevel)] ?? 0;
}

/** Profile row namespace constant re-export for tests. */
export { SPELLCASTING_PROFILE_NAMESPACE, SPELL_SLOT_GRANT_NAMESPACE };
