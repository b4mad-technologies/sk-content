// embedded-manifest: {"category": "exact_parser_oracle", "rationale": "the author-tool contract strips one exact bundle envelope before asserting the remaining TOML rows"}
// Bundle-level inventory read through the author-facing query tool.
// ci-allow(embedded-manifest-schema): author-tool malformed bundle inputs - deliberately broken TOML
import { join } from "node:path";

import * as companionAgent from "@spellkave/tool-authoring";
import { describe, expect, it } from "vitest";

import { BUNDLE_ID } from "../../../chapters/playing-the-game/index";
import { FIXTURES_DIR } from "../../../pipeline";
import {
	expectedAbilityIdentities,
	expectedActionIdentities,
	expectedCasterFeatureCapabilityIds,
	expectedEquipmentCapabilityIds,
	expectedFeatsCapabilityIds,
	expectedGenericCheckDcIdentities,
	expectedGenericCheckVerbIdentities,
	expectedMartialClassFeatureCapabilityIds,
	expectedOriginToolProficiencyCapabilityIds,
	expectedSkillIdentities,
	expectedStarterCreatureCapabilityIds,
	expectedSupplementalCapabilityIds,
	expectedTraitCapabilityIds,
	expectedUntaggedSupplementalCapabilityIds,
} from "../../shared/identity-expectations";
import { findingGap } from "../../srd-coverage/evidence";
import { buildTools, type QuerySummaryResult, query } from "./harness";

const FINDING_DETAILS = "ledger/archive/findings-details.md";

describe("fixtures/ bundle inventory read through spellkave_query", () => {
	it("createLocalAuthorTarget resolves fixtures/ (sanity: dir exists, manifest.toml present)", () => {
		expect(FIXTURES_DIR.endsWith(join("spellkave-srd-cc", "fixtures"))).toBe(true);
	});

	findingGap(
		{
			id: "20",
			title: "Bundle vocabulary is not fully authorable through the public surface",
			expected:
				"spellkave_define_bundle accepts tag_prefixes and allow_flat_tags, and stripManifestHeaders removes their nested bundle tables.",
			observed:
				"The verb schema omits both fields and the shared stripping helper leaves [[bundles.tag_prefixes]] in generated fragments.",
			impact:
				"A package must use spellkave_write_rows plus a private regex to declare bundle-owned tag vocabulary without leaking header rows.",
			references: [FINDING_DETAILS, "spellkave monorepo issue 2018"],
		},
		() => {
			const defineBundle = companionAgent.authorFacingToolDefinitions.find(
				(tool) => tool.name === "spellkave_define_bundle",
			);
			const properties = (
				defineBundle?.parameters as {
					properties?: Record<string, unknown>;
				}
			)?.properties;
			const stripped =
				companionAgent.stripManifestHeaders(`#:schema https://spellkave.dev/schema/world-manifest-1.0.0.json
schema_version = "1.0.0"

[[bundles]]
bundle_id = "demo"
depends_on = []
allow_flat_tags = false

[[bundles.tag_prefixes]]
prefix = "demo"
target_kind = "tag_value_definitions"
natural_key_field = "tag"

[[resource_definitions]]
resource_definition_id = "demo/hp"
bundle_id = "demo"
display_name = "HP"
description = "Hit points"
value_kind = "int"
min_value = 0
max_value = 10
initial_value = 10
recovery_rule = "persistent"
`);

			expect({
				defineBundleAcceptsTagPrefixes: properties?.tag_prefixes !== undefined,
				defineBundleAcceptsFlatTagPolicy: properties?.allow_flat_tags !== undefined,
				strippedBundleTablesRemain: stripped.includes("[[bundles"),
			}).toEqual({
				defineBundleAcceptsTagPrefixes: true,
				defineBundleAcceptsFlatTagPolicy: true,
				strippedBundleTablesRemain: false,
			});
		},
	);

	it("bundle summary reports the complete resource and capability inventory", async () => {
		const tools = buildTools();
		const summary = (await query(tools, { bundle: BUNDLE_ID })) as QuerySummaryResult;
		expect(summary.shape).toBe("summary");
		expect(summary.source).toBe("workspace+local");
		expect(summary.bundle_ids).toEqual([BUNDLE_ID]);
		expect(summary.row_kinds.resource_definitions).toBe(
			// +4: level/hp/temp_hp/ac. +1: heroic_inspiration. +1: srd/reach_mm.
			// +1: srd/speed-walk
			// (combat-arena proof Slice A, grid-units.ts). +2: srd/xp +
			// srd/hp_per_level (C4, advancement-units.ts). +1: srd/size (O2,
			// Character Origins Species, species-units.ts). +1: srd/hit-die (K1,
			// Classes, classes-units.ts). +1: srd/fighter/second-wind-uses (K2,
			// Classes Fighter vertical, fighter-units.ts). +1: srd/fighter/action-
			// surge-uses (K2, Classes Fighter vertical, D10 rework, fighter-
			// units.ts). +2: srd/barbarian/rage-uses + srd/monk/focus-points
			// (martial L1-4). +2: sneak-attack-dice + martial-arts-die-sides (slice 2).
			// +2: srd/spell_slot_1 + srd/spell_slot_2 (P1b, Spells,
			// spell-slots.ts). +1: srd/xp_value (level-up DM arc S1, advancement-
			// units.ts's own Building Block 5). +1: srd/proficiency_bonus (sk-84i.4,
			// modifier-units.ts's own PROFICIENCY_BONUS_STATE_ID, fragments/identity.ts's
			// buildLevelFragment). +2: srd/speed-swim + srd/speed-fly (ADR-0101 task
			// 6.1, fragments/grid.ts). +8: L3 caster feature resources
			// (docs/caster-features-l1-4.md).
			// 6.1, fragments/grid.ts). +1: srd/asi_points (origins L4, asi-units.ts).
			expectedAbilityIdentities().length +
				// +3: death-save clock (sk-609b.18, death-saves-units.ts).
				3 +
				// +2: Hit Point Dice spent + the Short Rest's heal scratch
				// (sk-jay0.1.55.60.3, fragments/rest.ts).
				2 +
				4 +
				expectedGenericCheckDcIdentities().length +
				1 +
				1 +
				2 +
				1 +
				1 +
				1 +
				1 +
				2 +
				2 +
				2 +
				1 +
				1 +
				1 +
				2 +
				8 +
				// Origins L4: srd/asi_points.
				1 +
				// sk-609b.13: two curated magic-item charge pools.
				2 +
				// L12a srd/speed-climb; L12b srd/wizard/arcane-recovery-uses,
				// srd/warlock/magical-cunning-uses (frenzy-hits retired → condition).
				3 +
				// L12e: dragonborn/breath-weapon-uses; L12b2 relentless-endurance-uses.
				2 +
				// L12d: srd/spellcasting_mod (derived spell attack/DC).
				1 +
				// sk-jay0.3.5.62: cost/weight + four armor-number resources.
				6,
		);
		expect(summary.row_kinds.capability_definitions).toBe(
			expectedSkillIdentities().length +
				// +4: K-C perception actions/capability (sk-609b.16) + death_save gate (sk-609b.18).
				4 +
				expectedActionIdentities().length +
				expectedGenericCheckVerbIdentities().length +
				expectedSupplementalCapabilityIds().length +
				expectedUntaggedSupplementalCapabilityIds().length +
				expectedEquipmentCapabilityIds().length +
				// F1 (Feats): Alert's gate capability (feats/alert-units.ts).
				expectedFeatsCapabilityIds().length +
				// O1 (Character Origins): the 2 net-new tool-proficiency
				// capabilities Backgrounds reference (equipment-proficiencies-units.ts).
				expectedOriginToolProficiencyCapabilityIds().length +
				// K2 (Classes, Fighter vertical): Second Wind's own gate capability.
				1 +
				// K2 (Classes, Fighter vertical, D10 rework): Action Surge's own
				// gate capability.
				1 +
				// Martial L1-4 class-feature capabilities (slice 1+2 incl. expertise).
				expectedMartialClassFeatureCapabilityIds().length +
				// L3+L12b+L12c caster feature gate capabilities.
				expectedCasterFeatureCapabilityIds().length +
				// sk-609b.13: curated wand cast capabilities (magic missiles + fireballs).
				2 +
				// D6 (actor-carried-verbs, sk-o8k): each starter creature's own
				// per-creature attack capability.
				expectedStarterCreatureCapabilityIds().length +
				// L12e: Trait capabilities (Dragonborn Breath Weapon, Darkvision).
				expectedTraitCapabilityIds().length,
		);
	});
});
