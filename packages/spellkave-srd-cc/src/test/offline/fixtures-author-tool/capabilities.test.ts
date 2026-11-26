// Capability, verb, and tag rows read through the author-facing query tool.
import { describe, expect, it } from "vitest";

import { CREATURE_NICHE_TAG } from "../../../chapters/playing-the-game/creature-type-units";
import { BUNDLE_ID } from "../../../chapters/playing-the-game/index";
import { ABILITY_CHECK_RESOLUTION_SCOPE_ID } from "../../../chapters/playing-the-game/resolution-scope-units";
import {
	ACTION_ACTOR_KIND,
	ACTION_DISPLAY_NAME_PREFIX,
	ACTION_SURGE_CAPABILITY_TAGS,
	ACTION_TAG,
	EQUIPMENT_PROFICIENCY_TAG,
	expectedAbilityIdentities,
	expectedActionIdentities,
	expectedActionSurgeCapabilityId,
	expectedCasterFeatureCapabilityIds,
	expectedEquipmentCapabilityIds,
	expectedFeatsCapabilityIds,
	expectedGenericCheckVerbIdentities,
	expectedMartialClassFeatureCapabilityIds,
	expectedOriginToolProficiencyCapabilityIds,
	expectedSecondWindCapabilityId,
	expectedSkillIdentities,
	expectedStarterCreatureCapabilityIds,
	expectedSupplementalCapabilityIds,
	expectedTraitCapabilityIds,
	expectedUntaggedSupplementalCapabilityIds,
	FEATS_CAPABILITY_TAGS,
	GENERIC_CHECK_VERB_ACTOR_KIND,
	GENERIC_CHECK_VERB_TAG,
	SECOND_WIND_CAPABILITY_TAGS,
	SKILL_ABILITY_TAG_PREFIX,
	SKILL_ACTOR_KIND,
	SKILL_DISPLAY_NAME_PREFIX,
	SKILL_TAG,
} from "../../shared/identity-expectations";
import {
	buildTools,
	type QueryDetailResult,
	type QueryListResult,
	query,
	splitTagCompositeId,
} from "./harness";

describe("fixtures/ capability identities read through spellkave_query", () => {
	it("kind=capability_definitions lists the skill, action, generic-check, and rest-completion capability ids", async () => {
		const tools = buildTools();
		const list = (await query(tools, {
			kind: "capability_definitions",
			bundle: BUNDLE_ID,
		})) as QueryListResult;
		expect(list.shape).toBe("list");
		const expected = [
			...expectedSkillIdentities().map((s) => s.capabilityId),
			...expectedActionIdentities().map((a) => a.capabilityId),
			...expectedGenericCheckVerbIdentities().map((g) => g.capabilityId),
			...expectedSupplementalCapabilityIds(),
			// D6 (actor-carried-verbs, sk-o8k): each starter creature's own
			// per-creature attack capability.
			...expectedStarterCreatureCapabilityIds(),
			...expectedUntaggedSupplementalCapabilityIds(),
			...expectedEquipmentCapabilityIds(),
			...expectedFeatsCapabilityIds(),
			...expectedOriginToolProficiencyCapabilityIds(),
			// K2 (Classes, Fighter vertical): Second Wind's own gate capability.
			expectedSecondWindCapabilityId(),
			// K2 (Classes, Fighter vertical, D10 rework): Action Surge's own gate
			// capability, mechanized LIVE alongside Second Wind.
			expectedActionSurgeCapabilityId(),
			// Martial L1-4 class-feature capabilities.
			...expectedMartialClassFeatureCapabilityIds(),
			// L3 caster non-spellcasting feature gate capabilities.
			...expectedCasterFeatureCapabilityIds(),
			// sk-609b.13: Curated wand spend capabilities.
			"srd/magic_item/wand-of-fireballs/cast",
			// sk-609b.16 K-C perception + sk-609b.18 death saves.
			"srd/action/apply-in-darkness",
			"srd/action/see-invisibility",
			"srd/capability/see_invisibility",
			"srd/capability/death_save",
			"srd/magic_item/wand-of-magic-missiles/cast",
			// L12e: Trait capabilities (Dragonborn Breath Weapon, Darkvision).
			...expectedTraitCapabilityIds(),
		];
		expect(list.items.map((i) => i.id).sort()).toEqual([...expected].sort());
	});

	it("kind+id detail carries the full skill identity row for every skill", async () => {
		const tools = buildTools();
		for (const skill of expectedSkillIdentities()) {
			const detail = (await query(tools, {
				kind: "capability_definitions",
				id: skill.capabilityId,
				refs: "none",
			})) as QueryDetailResult;
			expect(detail.found, `expected ${skill.capabilityId} to be found`).toBe(true);
			expect(detail.source).toBe("local");
			const row = detail.row as Record<string, unknown>;
			expect(row.capability_id).toBe(skill.capabilityId);
			expect(row.bundle_id).toBe(BUNDLE_ID);
			expect(row.actor_kind).toBe(SKILL_ACTOR_KIND);
			expect(String(row.display_name).startsWith(SKILL_DISPLAY_NAME_PREFIX)).toBe(true);
			expect(String(row.description).trim().length).toBeGreaterThan(0);
		}
	});

	it("kind+id detail carries the full action identity row for every action", async () => {
		const tools = buildTools();
		for (const action of expectedActionIdentities()) {
			const detail = (await query(tools, {
				kind: "capability_definitions",
				id: action.capabilityId,
				refs: "none",
			})) as QueryDetailResult;
			expect(detail.found, `expected ${action.capabilityId} to be found`).toBe(true);
			expect(detail.source).toBe("local");
			const row = detail.row as Record<string, unknown>;
			expect(row.capability_id).toBe(action.capabilityId);
			expect(row.bundle_id).toBe(BUNDLE_ID);
			expect(row.actor_kind).toBe(ACTION_ACTOR_KIND);
			expect(String(row.display_name).startsWith(ACTION_DISPLAY_NAME_PREFIX)).toBe(true);
			expect(String(row.description).trim().length).toBeGreaterThan(0);
		}
	});

	it("kind+id detail carries the full generic-check verb capability row for every verb", async () => {
		const tools = buildTools();
		for (const verb of expectedGenericCheckVerbIdentities()) {
			const detail = (await query(tools, {
				kind: "capability_definitions",
				id: verb.capabilityId,
				refs: "none",
			})) as QueryDetailResult;
			expect(detail.found, `expected ${verb.capabilityId} to be found`).toBe(true);
			expect(detail.source).toBe("local");
			const row = detail.row as Record<string, unknown>;
			expect(row.capability_id).toBe(verb.capabilityId);
			expect(row.bundle_id).toBe(BUNDLE_ID);
			expect(row.actor_kind).toBe(GENERIC_CHECK_VERB_ACTOR_KIND);
			expect(String(row.description).trim().length).toBeGreaterThan(0);
		}
	});

	it("kind+id detail carries the full action_definitions/affordance_templates row for every generic-check verb", async () => {
		const tools = buildTools();
		for (const verb of expectedGenericCheckVerbIdentities()) {
			const actionId = `${BUNDLE_ID}/check/${verb.slug}`;
			const actionDetail = (await query(tools, {
				kind: "action_definitions",
				id: actionId,
				refs: "none",
			})) as QueryDetailResult;
			expect(actionDetail.found, `expected action ${actionId} to be found`).toBe(true);
			const actionRow = actionDetail.row as Record<string, unknown>;
			expect(actionRow.required_capability).toBe(verb.capabilityId);
			expect(actionRow.on_success).toBe(`${actionId}/success`);
			expect(actionRow.resolution_scope).toBe(ABILITY_CHECK_RESOLUTION_SCOPE_ID);

			const affordanceDetail = (await query(tools, {
				kind: "affordance_templates",
				id: `${actionId}/affordance`,
				refs: "none",
			})) as QueryDetailResult;
			expect(affordanceDetail.found, `expected affordance ${actionId}/affordance to be found`).toBe(
				true,
			);
			const affordanceRow = affordanceDetail.row as Record<string, unknown>;
			expect(affordanceRow.capability_id).toBe(verb.capabilityId);
			// Slice 3.1: the shared SRD creature umbrella, not a per-verb label —
			// see `creature-type-units.ts`'s own module header.
			expect(affordanceRow.niche_id).toBe(CREATURE_NICHE_TAG);
			expect(String(affordanceRow.predicate_source).length).toBeGreaterThan(0);
		}
	});

	it("capability_definition_tag carries skill + srd.ability.<code> on every skill, srd.action on every action, and srd.check on every generic-check verb (finding #9)", async () => {
		const tools = buildTools();
		const list = (await query(tools, {
			kind: "capability_definition_tag",
			bundle: BUNDLE_ID,
		})) as QueryListResult;
		expect(list.shape).toBe("list");

		const tagsByCapability = new Map<string, Set<string>>();
		for (const item of list.items) {
			const { parentId, tag } = splitTagCompositeId(item.id);
			const set = tagsByCapability.get(parentId) ?? new Set<string>();
			set.add(tag);
			tagsByCapability.set(parentId, set);
		}
		const skills = expectedSkillIdentities();
		for (const skill of skills) {
			expect(tagsByCapability.get(skill.capabilityId)).toEqual(
				new Set([SKILL_TAG, `${SKILL_ABILITY_TAG_PREFIX}${skill.governingAbility}`]),
			);
		}
		const actions = expectedActionIdentities();
		for (const action of actions) {
			expect(tagsByCapability.get(action.capabilityId)).toEqual(new Set([ACTION_TAG]));
		}
		const genericCheckVerbs = expectedGenericCheckVerbIdentities();
		for (const verb of genericCheckVerbs) {
			expect(tagsByCapability.get(verb.capabilityId)).toEqual(new Set([GENERIC_CHECK_VERB_TAG]));
		}
		for (const capabilityId of expectedSupplementalCapabilityIds()) {
			expect(tagsByCapability.get(capabilityId)).toEqual(new Set([ACTION_TAG]));
		}
		expect(tagsByCapability.get(expectedEquipmentCapabilityIds()[0])).toEqual(
			new Set([EQUIPMENT_PROFICIENCY_TAG]),
		);
		expect(tagsByCapability.get(expectedEquipmentCapabilityIds()[1])).toEqual(
			new Set([GENERIC_CHECK_VERB_TAG]),
		);
		// F1 (Feats): Alert's gate capability carries BOTH srd.feat + srd.feat.origin.
		expect(tagsByCapability.get(expectedFeatsCapabilityIds()[0])).toEqual(
			new Set([...FEATS_CAPABILITY_TAGS]),
		);
		// L4: ASI gate capability carries srd.feat + srd.feat.general.
		expect(tagsByCapability.get(expectedFeatsCapabilityIds()[1])).toEqual(
			new Set(["srd.feat", "srd.feat.general"]),
		);
		// O1 (Character Origins): the 2 net-new tool-proficiency capabilities
		// carry the SAME srd.tool_proficiency tag as the existing Thieves' Tools one.
		for (const capabilityId of expectedOriginToolProficiencyCapabilityIds()) {
			expect(tagsByCapability.get(capabilityId)).toEqual(new Set([EQUIPMENT_PROFICIENCY_TAG]));
		}
		// K2 (Classes, Fighter vertical): Second Wind's own gate capability
		// carries srd.action PLUS the class-feature identity tags — its own
		// dedicated tag set, not the ACTION_TAG-only supplemental shape.
		expect(tagsByCapability.get(expectedSecondWindCapabilityId())).toEqual(
			new Set(SECOND_WIND_CAPABILITY_TAGS),
		);
		// K2 (Classes, Fighter vertical, D10 rework): Action Surge's own gate
		// capability carries the SAME tag shape.
		expect(tagsByCapability.get(expectedActionSurgeCapabilityId())).toEqual(
			new Set(ACTION_SURGE_CAPABILITY_TAGS),
		);
		// L3 caster feature capabilities carry srd.action only.
		for (const capabilityId of expectedCasterFeatureCapabilityIds()) {
			expect(tagsByCapability.get(capabilityId)).toEqual(new Set([ACTION_TAG]));
		}
		// The tagged-capability universe is EXACTLY skills + actions +
		// generic-check verbs — no orphan or missing capability_definition_tag
		// rows on either side.
		expect(tagsByCapability.size).toBe(
			skills.length +
				actions.length +
				genericCheckVerbs.length +
				expectedSupplementalCapabilityIds().length +
				expectedEquipmentCapabilityIds().length +
				expectedFeatsCapabilityIds().length +
				expectedOriginToolProficiencyCapabilityIds().length +
				// Second Wind + Action Surge + martial L1-4 + caster L1-4 class features.
				2 +
				expectedMartialClassFeatureCapabilityIds().length +
				expectedCasterFeatureCapabilityIds().length +
				// sk-609b.13 wand cast capability tags (magic missiles + fireballs).
				// sk-609b.16/.18: tagged perception/death-save capability.
				1 +
				2 +
				expectedTraitCapabilityIds().length,
		);
	});

	it("every skill's srd.ability.<code> tag resolves to a real outbound ref through spellkave_query ALONE — manifest-declared vocabulary, no caller-supplied family (finding #2/#9 handoff closed)", async () => {
		const tools = buildTools();
		// The #2/#9 handoff's end state (tag-vocabulary-declaration change,
		// #1994/PR #2008): the bundle's `[[bundles]]` header now DECLARES the
		// `srd.ability` ref family (`src/bundle-row.ts`), and `spellkave_query`'s
		// composite-key detail path resolves ref-typed tags via
		// `manifestTagPrefixFamilies(refsManifest)` on its own. This test
		// therefore asserts on the tool's OWN `outbound_refs` — the exact
		// `sk query` blind spot the ledger recorded (`outbound_refs: []`) —
		// with no `RefTagFamily[]` supplied from anywhere. The hand-written
		// `src/ref-tag-families.ts` this test used to feed the mechanism with
		// is retired.
		for (const skill of expectedSkillIdentities()) {
			const compositeId = `${skill.capabilityId}::${SKILL_ABILITY_TAG_PREFIX}${skill.governingAbility}`;
			const detail = (await query(tools, {
				kind: "capability_definition_tag",
				id: compositeId,
			})) as QueryDetailResult;
			expect(detail.found, `expected ${compositeId} to be found`).toBe(true);
			// The resolved ref names the FULL resource_definitions id (e.g.
			// "srd/wis"), not the bare tag value ("wis") — a caller can
			// re-query {kind: "resource_definitions", id: "srd/<code>"}
			// directly, no separate ref-chasing tool needed.
			const expectedAbilityId = expectedAbilityIdentities().find(
				(a) => a.code === skill.governingAbility,
			)?.resourceDefinitionId;
			expect(
				expectedAbilityId,
				`no ability identity for code ${skill.governingAbility}`,
			).toBeDefined();
			expect(detail.outbound_refs).toContainEqual({
				field: "tag:srd.ability",
				value: expectedAbilityId,
			});
		}
	});
});
