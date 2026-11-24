/** Build-time actor composition for authored NPC fixtures. Runtime creation uses
 * creationSheetActs, identity acts and the atomic starting-kit act on a spawned vessel. */
import type { AuthorTarget } from "@spellkave/tool-authoring";
import type { AbilityScores } from "../../dm/creation/draft-state";
import {
	equipmentChoiceMenus,
	selectedEquipmentChoices,
} from "../../dm/creation/equipment-choices.ts";
import { ABILITY_KEYS, DM_BUNDLE, POINT_BUY_MIN_SCORE } from "../../dm/creation/ids";
import { backgroundCreationDataBySlug, speciesCreationDataBySlug } from "../../dm/creation/origins";
import { pregenConfirmInstanceStates } from "../../dm/creation/pregen-confirm.ts";
import { abilityModifier, classCreationDataBySlug, level1Hp } from "../../dm/data";
import { SRD_BACKGROUND_CATALOG } from "../../dm/data/srd-catalog.ts";
import type { VerbCall } from "../../dm/lib/scene-driver.ts";
import {
	BACKGROUND_TAG_PREFIX,
	CLASS_TAG_PREFIX,
	HP_ID,
	LEVEL_ID,
	PARTY_HEROES_TAG,
	SPECIES_TAG_PREFIX,
	SRD_BUNDLE_ID,
} from "../../srd-ids.ts";
import { renderSelectedEquipment } from "./selected-equipment.ts";

/** Party-faction vocabulary used by authored fixture characters. */
export const PARTY_FACTION_TAG = "srd.faction.party";

/** Same values as `dm-npc.ts`'s PARTY_* (sk-ntz.7: the party extent's
 * `extent_ref` IS the membership tag `srd.party.heroes`). Declared here
 * from the shared vocabulary rather than imported from `dm-npc.ts` — that
 * file imports `../../dm/creation`. Offline test asserts byte-equality. */
export const PARTY_TAG = PARTY_HEROES_TAG;
export const PARTY_ID = PARTY_TAG;

/** Adventure context plus legacy kit for library callers without a kit selection. */
export interface CreationStarterKit {
	bundleId: string;
	bundleHeaderCall: () => VerbCall;
	starterKitDefinitions: () => VerbCall[];
	heroWeaponDefId: string;
	heroWeaponSlotId: string;
	fieldKitDefId: string;
	torchDefId: string;
	rationsDefId: string;
}

export function partySightCapabilityId(bundleId: string): string {
	return `${bundleId}/party/sight`;
}

/** Candidate-scoped longsword key — never `elven_mini/adventure/item/longsword_1`. */
export function candidateLongswordEntityKey(candidateActorEntityKey: string): string {
	return `${candidateActorEntityKey}/item/longsword`;
}

/** Candidate-scoped field-kit key — never `elven_mini/adventure/item/field_kit_1`. */
export function candidateFieldKitEntityKey(candidateActorEntityKey: string): string {
	return `${candidateActorEntityKey}/item/field_kit`;
}

export function candidateTorchEntityKey(candidateActorEntityKey: string): string {
	return `${candidateActorEntityKey}/item/torch`;
}

export function candidateRationsEntityKey(candidateActorEntityKey: string): string {
	return `${candidateActorEntityKey}/item/rations`;
}

export function classIdentityTag(classSlug: string): string {
	return `${CLASS_TAG_PREFIX}.${classSlug}`;
}

export function speciesIdentityTag(speciesSlug: string): string {
	return `${SPECIES_TAG_PREFIX}.${speciesSlug}`;
}

export function backgroundIdentityTag(backgroundSlug: string): string {
	return `${BACKGROUND_TAG_PREFIX}.${backgroundSlug}`;
}

export interface CreationCompletenessIdentity {
	classSlug: string;
	speciesSlug: string;
	backgroundSlug: string;
	/** Class skill picks (`srd/skill/<slug>`). */
	skillIds?: readonly string[];
	/** Flattened L1 choice member ids. */
	choiceMemberIds?: readonly string[];
	cantripIds?: readonly string[];
	preparedSpellIds?: readonly string[];
	/** Starting-kit letter controlling the physical equipment grant. */
	kitOption?: string | null;
	equipmentPicks?: Readonly<Record<string, string>>;
}

/**
 * `scores` at the untouched sentinel every draft starts at
 * (`draft-state.ts`'s `INITIAL_ABILITY_SCORES`, all six abilities at
 * `POINT_BUY_MIN_SCORE`) — the SAME equality check `draft-state.ts`'s own
 * `discard` pick already uses to detect "never touched", reused here rather
 * than importing that module's private helper.
 */
function scoresAreUntouched(scores: AbilityScores): boolean {
	return ABILITY_KEYS.every((key) => scores[key] === POINT_BUY_MIN_SCORE);
}

/**
 * Confirm-time score resolution (sk-jay0.1.23.36.13 / STOP finding: a
 * dragonborn barbarian confirmed at `srd/ac = 9`): a candidate who never
 * touched the ability-score contract (no `adopt-array`, no `adopt-parsed` —
 * the prompt-driven creation path has no phase-4 prompt for either,
 * ADR-0142 G-5, so an automated PLAYER brain never fires them) still gets
 * the class's own Standard Array by Class row
 * (`classCreationDataBySlug(classSlug).standardArray`,
 * `character-creation.md:355-479`) instead of six floor-value 8s. An
 * EXPLICIT player set — even a partial one that leaves some abilities at
 * the floor — always wins; this substitution only fires on the untouched
 * sentinel.
 */
function resolveCreationScores(
	classSlug: string,
	scores: AbilityScores | undefined,
): AbilityScores | undefined {
	if (scores === undefined || !scoresAreUntouched(scores)) return scores;
	return { ...classCreationDataBySlug(classSlug).standardArray };
}

/** Compose a fixture character's sheet, identity tags, grants and equipment.
 * The caller supplies authored placement and catalog choices at build time.
 * Runtime confirmation uses creationSheetActs and an atomic kit act instead.
 */
export function renderCreationCompleteness(
	placement: CandidatePlacement,
	identity: CreationCompletenessIdentity,
	kit: CreationStarterKit,
	adoptedName?: string,
	target?: AuthorTarget,
	scoresArg?: AbilityScores,
): VerbCall[] {
	const { classSlug, speciesSlug, backgroundSlug } = identity;
	const scores = resolveCreationScores(classSlug, scoresArg);
	const partySightId = partySightCapabilityId(kit.bundleId);
	// Fail closed on a typo'd slug — same posture as renderClassCapabilityGrant.
	classCreationDataBySlug(classSlug);
	speciesCreationDataBySlug(speciesSlug);
	const backgroundUnit = backgroundCreationDataBySlug(backgroundSlug);

	const candidateKey = placement.entityKey;
	// Older library callers without a kit selection retain their injected kit.
	// The creation wizard requires a letter and always takes the source-backed path.
	const legacyKit = identity.kitOption == null;
	let selectedEquipmentCalls: VerbCall[] = [];
	if (identity.kitOption != null) {
		if (target === undefined)
			throw new Error("creation: selected equipment requires an author target.");
		selectedEquipmentCalls = renderSelectedEquipment(
			candidateKey,
			placement.bundleId,
			classSlug,
			identity.kitOption,
			target,
			identity.equipmentPicks,
		);
	}
	const longswordKey = candidateLongswordEntityKey(candidateKey);
	const fieldKitKey = candidateFieldKitEntityKey(candidateKey);
	const torchKey = candidateTorchEntityKey(candidateKey);
	const rationsKey = candidateRationsEntityKey(candidateKey);
	const homeHeader = bundleHeaderForPlacement(placement, target, kit);
	// Skills come only from the draft — never a fighter-only perception fallback.
	const classSkills = identity.skillIds ?? [];
	const equipmentChoices =
		target !== undefined && identity.kitOption != null
			? selectedEquipmentChoices(
					equipmentChoiceMenus(target, classSlug, [identity.kitOption]),
					identity.kitOption,
					identity.equipmentPicks,
				)
			: { names: {}, proficiencyIds: [] };
	const originFeatId = backgroundOriginFeatCapabilityId(backgroundSlug);
	const rawCapabilityIds = [
		...classSkills,
		...equipmentChoices.proficiencyIds,
		...backgroundSkillCapabilityIds(backgroundSlug),
		...(identity.choiceMemberIds ?? []),
		...(identity.cantripIds ?? []),
		...(identity.preparedSpellIds ?? []),
		...(originFeatId === null ? [] : [originFeatId]),
	];
	// Origin feats are entity-defined; only some F1 rows also mint a capability
	// (e.g. Alert). Drop ids the target cannot back so confirm stays valid.
	const definedCaps =
		target === undefined
			? null
			: new Set(
					target
						.lookup("capability_definitions", { bundle: SRD_BUNDLE_ID })
						.map((row) => row.capability_id)
						.filter((id): id is string => typeof id === "string"),
				);
	const skillCapabilityIds =
		definedCaps === null ? rawCapabilityIds : rawCapabilityIds.filter((id) => definedCaps.has(id));
	void backgroundUnit;

	const calls: VerbCall[] = [
		kit.bundleHeaderCall(),
		...(placement.bundleId === kit.bundleId ? [] : [homeHeader]),
		...(legacyKit
			? [
					{
						toolName: "spellkave_write_rows",
						label: "creation-starter-pack-entities",
						params: {
							bundle: kit.bundleId,
							kind: "entities",
							rows: [
								{
									bundle_id: kit.bundleId,
									entity_key: longswordKey,
									entity_def_id: kit.heroWeaponDefId,
									name: "Longsword",
									kind: "item",
									place_node_id: "",
									quantity: 1,
								},
								{
									bundle_id: kit.bundleId,
									entity_key: fieldKitKey,
									entity_def_id: kit.fieldKitDefId,
									name: "Field Kit",
									kind: "item",
									place_node_id: "",
									quantity: 1,
								},
								{
									bundle_id: kit.bundleId,
									entity_key: torchKey,
									entity_def_id: kit.torchDefId,
									name: "Torch",
									kind: "item",
									place_node_id: "",
									quantity: 1,
								},
								{
									bundle_id: kit.bundleId,
									entity_key: rationsKey,
									entity_def_id: kit.rationsDefId,
									name: "Rations",
									kind: "item",
									place_node_id: "",
									quantity: 3,
								},
							],
						},
					},
				]
			: []),
		// Explicit instance rows let fixture composition resolve all tag and equipment references in one authoring workspace.
		{
			toolName: "spellkave_write_rows",
			label: "restate-creation-candidate-entity",
			params: {
				bundle: placement.bundleId,
				kind: "entities",
				rows: [
					{
						bundle_id: placement.bundleId,
						entity_key: candidateKey,
						entity_def_id: placement.entityDefId,
						name: adoptedName ?? candidateKey,
						kind: placement.kind,
						place_node_id: placement.placeNodeId,
						description: placement.description,
						owned_by_entity_key: placement.ownedByEntityKey,
						quantity: placement.quantity,
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "restate-creation-candidate-spatial",
			params: {
				bundle: placement.bundleId,
				kind: "actor_spatial_locations",
				rows: [
					{
						bundle_id: placement.bundleId,
						entity_key: candidateKey,
						place_node_id: placement.placeNodeId,
						selection_path: `manifest:${candidateKey}`,
					},
				],
			},
		},
		...(scores === undefined
			? []
			: [
					{
						toolName: "spellkave_write_rows",
						label: "creation-confirm-sheet-states",
						params: {
							bundle: placement.bundleId,
							kind: "object_state",
							rows: [
								{
									bundle_id: placement.bundleId,
									entity_key: candidateKey,
									source_template_id: `${DM_BUNDLE}/creation/confirm`,
									state_id: `${SRD_BUNDLE_ID}/${LEVEL_ID}`,
									value_int: 1,
									visibility: "Public",
								},
								{
									bundle_id: placement.bundleId,
									entity_key: candidateKey,
									source_template_id: `${DM_BUNDLE}/creation/confirm`,
									state_id: `${SRD_BUNDLE_ID}/${HP_ID}`,
									value_int: level1Hp(classSlug, abilityModifier(scores.con)),
									visibility: "Public",
								},
								...ABILITY_KEYS.map((key) => ({
									bundle_id: placement.bundleId,
									entity_key: candidateKey,
									source_template_id: `${DM_BUNDLE}/creation/confirm`,
									state_id: `${SRD_BUNDLE_ID}/${key}`,
									value_int: scores[key],
									visibility: "Public",
								})),
								...pregenConfirmInstanceStates(classSlug, scores, {
									speciesSlug: speciesSlug ?? undefined,
									kitOption: identity.kitOption ?? undefined,
									target,
									level: 1,
								}).map((row) => ({
									bundle_id: placement.bundleId,
									entity_key: candidateKey,
									source_template_id: `${DM_BUNDLE}/creation/confirm`,
									state_id: row.state,
									value_int: row.value_int,
									visibility: "Public",
								})),
							],
						},
					},
				]),
		{
			toolName: "spellkave_tag_entity",
			label: "tag-creation-candidate-identity",
			params: {
				bundle: placement.bundleId,
				entity_key: candidateKey,
				tags: [
					classIdentityTag(classSlug),
					speciesIdentityTag(speciesSlug),
					backgroundIdentityTag(backgroundSlug),
					PARTY_FACTION_TAG,
					PARTY_TAG,
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "grant-creation-pregen-and-background-skills",
			params: {
				bundle: kit.bundleId,
				kind: "actor_capabilities",
				rows: skillCapabilityIds.map((capabilityId) => ({
					actor_entity_key: candidateKey,
					bundle_id: kit.bundleId,
					capability_id: capabilityId,
					source: kit.bundleId,
					source_args_hash: "",
					elevation_class: "",
					extent_kind_ref: "",
					extent_ref: "",
				})),
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "grant-creation-party-sight",
			params: {
				bundle: kit.bundleId,
				kind: "actor_capabilities",
				rows: [
					{
						actor_entity_key: candidateKey,
						bundle_id: kit.bundleId,
						capability_id: partySightId,
						source: kit.bundleId,
						source_args_hash: "",
						elevation_class: "",
						extent_kind_ref: "party",
						extent_ref: PARTY_ID,
					},
				],
			},
		},
		...(legacyKit
			? [
					{
						toolName: "spellkave_stow_item",
						label: "stow-creation-field-kit",
						params: {
							bundle: kit.bundleId,
							actor_entity_key: candidateKey,
							item_entity_key: fieldKitKey,
							direction: "in",
						},
					},
					{
						toolName: "spellkave_stow_item",
						label: "stow-creation-torch",
						params: {
							bundle: kit.bundleId,
							actor_entity_key: candidateKey,
							item_entity_key: torchKey,
							container_entity_key: fieldKitKey,
							direction: "in",
						},
					},
					{
						toolName: "spellkave_stow_item",
						label: "stow-creation-rations",
						params: {
							bundle: kit.bundleId,
							actor_entity_key: candidateKey,
							item_entity_key: rationsKey,
							container_entity_key: fieldKitKey,
							direction: "in",
						},
					},
					{
						toolName: "spellkave_stow_item",
						label: "stow-creation-longsword",
						params: {
							bundle: kit.bundleId,
							actor_entity_key: candidateKey,
							item_entity_key: longswordKey,
							direction: "in",
						},
					},
					{
						toolName: "spellkave_equip_item",
						label: "equip-creation-longsword",
						params: {
							bundle: kit.bundleId,
							actor_entity_key: candidateKey,
							item_entity_key: longswordKey,
							slot_id: kit.heroWeaponSlotId,
						},
					},
				]
			: []),
		...selectedEquipmentCalls,
	];
	return calls;
}

function backgroundSkillCapabilityIds(backgroundSlug: string): readonly string[] {
	const unit = SRD_BACKGROUND_CATALOG.find((candidate) => candidate.slug === backgroundSlug);
	if (unit === undefined) {
		throw new Error(`backgroundSkillCapabilityIds: unknown background '${backgroundSlug}'.`);
	}
	return unit.skillCapabilityIds;
}

/** Origin feat entity id doubles as capability id when F1 authored one (Alert, …). */
function backgroundOriginFeatCapabilityId(backgroundSlug: string): string | null {
	const unit = SRD_BACKGROUND_CATALOG.find((candidate) => candidate.slug === backgroundSlug);
	if (unit === undefined) {
		throw new Error(`backgroundOriginFeatCapabilityId: unknown background '${backgroundSlug}'.`);
	}
	return unit.featEntityId;
}

/** Current authored placement of the creation candidate — restated on a
 * fixture composition so an authored character never writes another bundle's place node (finding:
 * prequel apply failed MF-APPLY-026 / MF-VAL-101 against
 * `elven_mini/creation_limbo/station`). */
export interface CandidatePlacement {
	bundleId: string;
	entityKey: string;
	entityDefId: string;
	placeNodeId: string;
	kind: string;
	description: string;
	quantity: number;
	ownedByEntityKey: string;
}

/** Construct an explicit authored placement for a fixture character.
 * The bare entity key keeps build-time tags and equipment on that fixture's
 * character. Runtime vessels are addressed by their live entity ids. */
export function placementFromStation(
	candidateActorEntityKey: string,
	placeNodeId: string,
	extras: Partial<Pick<CandidatePlacement, "entityDefId" | "description" | "kind">> = {},
): CandidatePlacement {
	const colon = candidateActorEntityKey.indexOf(":");
	const bareKey = colon === -1 ? candidateActorEntityKey : candidateActorEntityKey.slice(colon + 1);
	const slash = bareKey.indexOf("/");
	const bundleId =
		colon !== -1
			? candidateActorEntityKey.slice(0, colon)
			: slash === -1
				? bareKey
				: bareKey.slice(0, slash);
	return {
		bundleId,
		entityKey: bareKey,
		entityDefId: extras.entityDefId ?? bareKey.replace(/_\d+$/, ""),
		placeNodeId,
		kind: extras.kind ?? "player",
		description: extras.description ?? "",
		quantity: 1,
		ownedByEntityKey: "",
	};
}

function bundleHeaderForPlacement(
	placement: CandidatePlacement,
	target?: AuthorTarget,
	kit?: CreationStarterKit,
): VerbCall {
	if (kit !== undefined && placement.bundleId === kit.bundleId) return kit.bundleHeaderCall();
	const bundleRow = target?.lookup("bundles").find((row) => row.bundle_id === placement.bundleId);
	const dependsOnRaw = bundleRow?.depends_on;
	const dependsOn = Array.isArray(dependsOnRaw)
		? dependsOnRaw.map(String)
		: typeof dependsOnRaw === "string" && dependsOnRaw.length > 0
			? dependsOnRaw
					.split(",")
					.map((part) => part.trim())
					.filter((part) => part.length > 0)
			: ["srd"];
	return {
		toolName: "spellkave_define_bundle",
		label: "define-candidate-home-bundle",
		params: {
			bundle_id: placement.bundleId,
			depends_on: dependsOn,
			display_name: String(bundleRow?.display_name ?? placement.bundleId),
			author: String(bundleRow?.author ?? "spellkave"),
			version: String(bundleRow?.version ?? "1.0.0"),
			description: String(bundleRow?.description ?? ""),
			default_extent_shape_id: String(bundleRow?.default_extent_shape_id ?? "core/area/cube"),
			default_extent_params_json: String(
				bundleRow?.default_extent_params_json ?? '{"extent_m": 4.5}',
			),
		},
	};
}
