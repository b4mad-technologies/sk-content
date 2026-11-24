/**
 * Confirm-time instance state seeds (sk-jay0.7.21).
 *
 * Runtime copy of srd-cc `pregenConfirmInstanceStates` without chapter
 * imports. Must stay byte-identical in effect: only L1 grant-matched
 * resources, never dormant L2 pools (Action Surge initial 0).
 */
import type { AuthorTarget } from "@spellkave/tool-authoring";
import {
	AC_RESOURCE_ID,
	HP_PER_LEVEL_ID,
	PROFICIENCY_BONUS_STATE_ID,
	SPEED_WALK_INITIAL,
	SPEED_WALK_RESOURCE_ID,
	SRD_BUNDLE_ID,
	XP_ID,
} from "../../srd-ids.ts";
import { classCreationDataBySlug } from "../data/classes.ts";
import { abilityModifier } from "../data/derived.ts";
import { spellSlotGrantsForClassLevel } from "../data/spellcasting.ts";
import { SRD_SPELL_SLOT_GRANTS } from "../data/srd-catalog.ts";
import { speciesCreationData } from "./origins.ts";

export interface PregenConfirmStateRow {
	state: string;
	value_int: number;
}

export interface PregenConfirmOptions {
	speciesSlug?: string;
	kitOption?: string;
	target?: AuthorTarget;
	level?: number;
}

/** Ability scores AC needs: Dexterity always, plus whichever other ability a
 * class's own Unarmored Defense feature reads (Constitution or Wisdom, see
 * `classCreationDataBySlug`'s `unarmoredDefenseExtraAbility`). Optional so
 * callers who only track Dexterity keep compiling — they simply get the
 * plain `10 + Dex mod` floor with no Unarmored Defense credit. */
export interface PregenConfirmAcScores {
	dex: number;
	con?: number;
	wis?: number;
}

const ADVANCEMENT_GRANT_NAMESPACE = "srd.advancement_grant";
const STAT_RESOURCE_RE = /(?:actor|target)\.stat\('([^']+)'\)/g;

function expectedProficiencyBonus(level: number): number {
	if (level < 0 || level > 30) {
		throw new Error(`pregen-confirm: level ${level} is outside 0..30.`);
	}
	const n = Math.max(level, 1);
	return 2 + Math.floor((n - 1) / 4);
}

function speedWalkCellsForSpecies(speciesSlug?: string | null): number {
	if (speciesSlug === undefined || speciesSlug === null || speciesSlug === "") {
		return SPEED_WALK_INITIAL;
	}
	const unit = speciesCreationData().find((candidate) => candidate.slug === speciesSlug);
	return unit?.speedCells ?? SPEED_WALK_INITIAL;
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
	return typeof value === "number" ? value : undefined;
}

function parsePayload(payloadJson: unknown): Record<string, unknown> | undefined {
	const raw = asString(payloadJson);
	if (raw === undefined) return undefined;
	try {
		const parsed: unknown = JSON.parse(raw);
		return typeof parsed === "object" && parsed !== null
			? (parsed as Record<string, unknown>)
			: undefined;
	} catch {
		return undefined;
	}
}

/** Seed value for one resource_definitions row at a character level. */
function resourceSeedValue(def: Record<string, unknown>, level: number): number | null {
	const initial = asNumber(def.initial_value) ?? 0;
	const description = asString(def.description) ?? "";
	if (/seed\s*5\s*[×x*]\s*level/i.test(description) || /5\s*[×x]\s*level/i.test(description)) {
		if (initial === 0) return 5 * level;
	}
	if (/seed\s*=\s*level/i.test(description)) {
		return level;
	}
	// L2 Action Surge etc. keep initial 0 until charged — do not seed a dormant 0.
	if (initial <= 0) return null;
	return initial;
}

function featureSlugFromGrant(grantRef: string, classSlug: string): string | null {
	const prefix = `${SRD_BUNDLE_ID}/class-feature/${classSlug}/`;
	if (!grantRef.startsWith(prefix)) return null;
	return grantRef.slice(prefix.length);
}

function resourceMatchesFeature(resourceLocalId: string, featureSlug: string): boolean {
	if (resourceLocalId.includes(featureSlug)) return true;
	const featureCore = featureSlug.replace(/^monks-/, "").replace(/s$/, "");
	const resourceCore = resourceLocalId
		.replace(/-uses$/, "")
		.replace(/-dice$/, "")
		.replace(/-die-sides$/, "")
		.replace(/-points$/, "");
	return (
		resourceCore === featureSlug ||
		resourceCore === featureCore ||
		featureSlug.includes(resourceCore) ||
		resourceLocalId.includes(featureCore)
	);
}

function collectResourcesFromActions(
	target: AuthorTarget,
	grantIds: ReadonlySet<string>,
): Set<string> {
	const out = new Set<string>();
	const actionIds = new Set<string>();
	for (const row of target.lookup("action_definitions", { bundle: SRD_BUNDLE_ID })) {
		const req = asString(row.required_capability);
		if (req === undefined || !grantIds.has(req)) continue;
		const actionId = asString(row.action_id);
		if (actionId !== undefined) actionIds.add(actionId);
	}
	if (actionIds.size === 0) return out;

	const harvest = (text: string | undefined): void => {
		if (text === undefined) return;
		STAT_RESOURCE_RE.lastIndex = 0;
		let match: RegExpExecArray | null = STAT_RESOURCE_RE.exec(text);
		while (match !== null) {
			out.add(match[1]!);
			match = STAT_RESOURCE_RE.exec(text);
		}
	};

	for (const row of target.lookup("affordance_templates", { bundle: SRD_BUNDLE_ID })) {
		const cap = asString(row.capability_id);
		const templateId = asString(row.template_id) ?? "";
		const linked =
			(cap !== undefined && grantIds.has(cap)) ||
			[...actionIds].some((id) => templateId.startsWith(`${id}/`) || templateId.includes(id));
		if (!linked) continue;
		harvest(asString(row.predicate_source));
	}

	for (const row of target.lookup("consequence_frame_writes", { bundle: SRD_BUNDLE_ID })) {
		const templateId = asString(row.template_id) ?? "";
		if (![...actionIds].some((id) => templateId.startsWith(id))) continue;
		const resource = asString(row.resource);
		if (resource !== undefined) out.add(resource);
		harvest(asString(row.delta_source));
	}

	return out;
}

function advancementGrantRefs(target: AuthorTarget, classSlug: string, level: number): string[] {
	const out: string[] = [];
	for (const row of target.lookup("metadata_attachments", { bundle: SRD_BUNDLE_ID })) {
		if (asString(row.namespace) !== ADVANCEMENT_GRANT_NAMESPACE) continue;
		const payload = parsePayload(row.payload_json);
		if (payload === undefined) continue;
		if (payload.class !== classSlug || payload.level !== level) continue;
		const ref = asString(row.target_ref);
		if (ref !== undefined) out.push(ref);
	}
	return out;
}

/** Pure fallback when no AuthorTarget is available (unit tests): caster profile tables. */
function spellSlotSeedsFromProfiles(classSlug: string, level: number): PregenConfirmStateRow[] {
	return SRD_SPELL_SLOT_GRANTS.filter(
		(grant) => grant.classSlug === classSlug && grant.level === level,
	).map((grant) => ({
		state: `${SRD_BUNDLE_ID}/spell_slot_${grant.slotLevel}`,
		value_int: grant.count,
	}));
}

function classLevelResourceSeeds(
	classSlug: string,
	options: Pick<PregenConfirmOptions, "target" | "level"> = {},
): PregenConfirmStateRow[] {
	const level = options.level ?? 1;
	const target = options.target;
	const byState = new Map<string, number>();

	const slotRows =
		target === undefined
			? spellSlotSeedsFromProfiles(classSlug, level)
			: spellSlotGrantsForClassLevel(target, classSlug, level).map((row) => ({
					state: row.resourceId,
					value_int: row.count,
				}));
	// Live AuthorTargets sometimes omit srd.spell_slot_grant rows even when the
	// fixtures carry them — fall back to the pure profile table so casters still
	// receive L1 slots at confirm.
	const resolvedSlots =
		slotRows.length > 0 ? slotRows : spellSlotSeedsFromProfiles(classSlug, level);
	for (const row of resolvedSlots) {
		byState.set(row.state, row.value_int);
	}
	if (target === undefined) {
		return [...byState.entries()].map(([state, value_int]) => ({ state, value_int }));
	}

	const grants = advancementGrantRefs(target, classSlug, level);
	const grantSet = new Set(grants);
	const resourceDefs = target.lookup("resource_definitions", { bundle: SRD_BUNDLE_ID });
	const defById = new Map<string, Record<string, unknown>>();
	for (const row of resourceDefs) {
		const id = asString(row.resource_definition_id);
		if (id !== undefined) defById.set(id, row);
	}

	const classPrefix = `${SRD_BUNDLE_ID}/${classSlug}/`;
	const candidateIds = new Set<string>();

	for (const grant of grants) {
		const featureSlug = featureSlugFromGrant(grant, classSlug);
		if (featureSlug === null) continue;
		for (const id of defById.keys()) {
			if (!id.startsWith(classPrefix)) continue;
			const local = id.slice(classPrefix.length);
			if (resourceMatchesFeature(local, featureSlug)) candidateIds.add(id);
		}
	}

	for (const id of collectResourcesFromActions(target, grantSet)) {
		candidateIds.add(id);
	}

	for (const id of candidateIds) {
		const def = defById.get(id);
		if (def === undefined) continue;
		const seed = resourceSeedValue(def, level);
		if (seed === null) continue;
		byState.set(id, seed);
	}

	return [...byState.entries()]
		.map(([state, value_int]) => ({ state, value_int }))
		.sort((a, b) => a.state.localeCompare(b.state));
}

/**
 * The confirm-time `srd/ac` seed: `10 + Dex mod`, the SRD unarmored default
 * (`character-creation.md`'s own base), raised to a class's Unarmored
 * Defense floor when that class has the feature and the caller supplied the
 * extra ability score it reads (`classCreationDataBySlug`'s
 * `unarmoredDefenseExtraAbility`). This is only ever a FLOOR: worn armor's
 * own `entity_definition_equip_modifier` row is read live via
 * `target.effective('srd/ac')` (`equipment-ac-target-fact.md`) and overrides
 * this seed at combat time — seeding the Unarmored Defense value here never
 * double-counts an equipped kit's armor bonus, it only stops an unarmored
 * Barbarian/Monk from reading a worse AC than the SRD grants them for free.
 * Silently falls back to the plain unarmored floor when the caller did not
 * supply the extra ability's score (see {@link PregenConfirmAcScores}).
 */
function unarmoredAc(classSlug: string, scores: PregenConfirmAcScores): number {
	const base = 10 + abilityModifier(scores.dex);
	const extra = classCreationDataBySlug(classSlug).unarmoredDefenseExtraAbility;
	if (extra === null) return base;
	if (extra !== "con" && extra !== "wis") {
		// No class in the SRD grants Unarmored Defense off any ability but
		// Constitution (Barbarian) or Wisdom (Monk) — a third value here means
		// the catalog moved and this reader needs the caller-supplied score it
		// is now missing. Fail loud rather than silently under-computing AC.
		throw new Error(
			`pregen-confirm: unarmoredAc — class '${classSlug}' declares Unarmored Defense off ` +
				`'${extra}', which PregenConfirmAcScores does not carry.`,
		);
	}
	const extraScore = scores[extra];
	return extraScore === undefined ? base : base + abilityModifier(extraScore);
}

export function pregenConfirmInstanceStates(
	classSlug: string,
	scores: PregenConfirmAcScores,
	options: PregenConfirmOptions = {},
): readonly PregenConfirmStateRow[] {
	const level = options.level ?? 1;
	void options.kitOption;
	const universal: PregenConfirmStateRow[] = [
		{ state: PROFICIENCY_BONUS_STATE_ID, value_int: expectedProficiencyBonus(level) },
		{ state: `${SRD_BUNDLE_ID}/${XP_ID}`, value_int: 0 },
		{
			state: `${SRD_BUNDLE_ID}/${HP_PER_LEVEL_ID}`,
			value_int: classCreationDataBySlug(classSlug).fixedHpPerLevelBase,
		},
		{ state: AC_RESOURCE_ID, value_int: unarmoredAc(classSlug, scores) },
		{
			state: SPEED_WALK_RESOURCE_ID,
			value_int: speedWalkCellsForSpecies(options.speciesSlug),
		},
	];
	return [...universal, ...classLevelResourceSeeds(classSlug, { target: options.target, level })];
}
