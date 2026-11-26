import { describe, expect, it } from "vitest";
import {
	CLAIM_VICTORY_CAPABILITY_ID,
	LEVEL_UP_CAPABILITY_ID,
} from "../../chapters/character-creation/advancement-units";
import { UTILIZE_CAPABILITY_ID } from "../../chapters/equipment/area-hazards";
import { BUNDLE_ID } from "../../chapters/playing-the-game/constants";
import {
	buildCreatureCapabilityGrantRows,
	buildCreatureCapabilityGrantUnits,
} from "../../chapters/playing-the-game/creature-identity-units";
import {
	CREATURE_NICHE_TAG,
	MONSTER_TAG,
	PLAYER_CHARACTER_TAG,
} from "../../chapters/playing-the-game/creature-type-units";
import { CONSUME_CAPABILITY_ID } from "../../chapters/playing-the-game/fragments/consume";
import { DASH_CAPABILITY_ID } from "../../chapters/playing-the-game/fragments/dash";
import { DODGE_CAPABILITY_ID } from "../../chapters/playing-the-game/fragments/dodge";
import { DROP_PRONE_CAPABILITY_ID } from "../../chapters/playing-the-game/fragments/drop-prone";
import { HELP_CAPABILITY_ID } from "../../chapters/playing-the-game/fragments/help";
import { HEROIC_INSPIRATION_REROLL_CAPABILITY_ID } from "../../chapters/playing-the-game/fragments/heroic-inspiration";
import { PICKUP_CAPABILITY_ID } from "../../chapters/playing-the-game/fragments/pickup";
import {
	LONG_REST_CAPABILITY_ID,
	SHORT_REST_CAPABILITY_ID,
} from "../../chapters/playing-the-game/fragments/rest";
import { STAND_UP_CAPABILITY_ID } from "../../chapters/playing-the-game/fragments/stand-up";
import {
	buildGenericCheckSubjects,
	genericCheckCapabilitySuffix,
} from "../../chapters/playing-the-game/generic-check-units";
import { WALK_CAPABILITY_ID } from "../../chapters/playing-the-game/grid-units";
import {
	buildPlayerCharacterCapabilityGrantRows,
	buildPlayerCharacterCapabilityGrantUnits,
} from "../../chapters/playing-the-game/player-character-identity-units";
import {
	buildVocalCommunicationCapabilityGrantRows,
	buildVocalCommunicationCapabilityGrantUnits,
	SPEAK_CAPABILITY_ID,
	VOCAL_COMMUNICATION_TAG,
} from "../../chapters/playing-the-game/vocal-communication-identity-units";
import { findingGap } from "../srd-coverage/evidence";

describe("tag-derived character, creature, and communication capability packages", () => {
	it("grants exactly the PC verbs, universal creature attempts, and vocal speech attempt, in package order", () => {
		expect(buildPlayerCharacterCapabilityGrantUnits().map((unit) => unit.capabilityId)).toEqual([
			LEVEL_UP_CAPABILITY_ID,
			CLAIM_VICTORY_CAPABILITY_ID,
			HEROIC_INSPIRATION_REROLL_CAPABILITY_ID,
		]);
		const universal = buildCreatureCapabilityGrantUnits().map((unit) => unit.capabilityId);
		expect(universal.slice(0, 12)).toEqual([
			WALK_CAPABILITY_ID,
			`${BUNDLE_ID}/action/attack`,
			DODGE_CAPABILITY_ID,
			DASH_CAPABILITY_ID,
			HELP_CAPABILITY_ID,
			UTILIZE_CAPABILITY_ID,
			DROP_PRONE_CAPABILITY_ID,
			STAND_UP_CAPABILITY_ID,
			SHORT_REST_CAPABILITY_ID,
			LONG_REST_CAPABILITY_ID,
			PICKUP_CAPABILITY_ID,
			CONSUME_CAPABILITY_ID,
		]);
		expect(universal.slice(12)).toEqual(
			buildGenericCheckSubjects().map(
				(subject) => `${BUNDLE_ID}/${genericCheckCapabilitySuffix(subject)}`,
			),
		);
		expect(buildVocalCommunicationCapabilityGrantUnits().map((unit) => unit.capabilityId)).toEqual([
			SPEAK_CAPABILITY_ID,
		]);
	});

	it("hangs each package off its stable identity and never grants from MONSTER_TAG", () => {
		const character = buildPlayerCharacterCapabilityGrantUnits();
		const creature = buildCreatureCapabilityGrantUnits();
		const vocal = buildVocalCommunicationCapabilityGrantUnits();
		expect(new Set(character.map((unit) => unit.tag))).toEqual(new Set([PLAYER_CHARACTER_TAG]));
		expect(new Set(creature.map((unit) => unit.tag))).toEqual(new Set([CREATURE_NICHE_TAG]));
		expect(new Set(vocal.map((unit) => unit.tag))).toEqual(new Set([VOCAL_COMMUNICATION_TAG]));
		expect([...character, ...creature, ...vocal].some((unit) => unit.tag === MONSTER_TAG)).toBe(
			false,
		);
		expect(creature.map((unit) => unit.capabilityId)).not.toContain(SPEAK_CAPABILITY_ID);
	});

	it("owns locomotion and striking on creature identity, outside the PC-only package", () => {
		const character = buildPlayerCharacterCapabilityGrantUnits().map((unit) => unit.capabilityId);
		const creature = buildCreatureCapabilityGrantUnits().map((unit) => unit.capabilityId);
		expect(character).not.toContain(WALK_CAPABILITY_ID);
		expect(character).not.toContain(`${BUNDLE_ID}/action/attack`);
		expect(creature).toContain(WALK_CAPABILITY_ID);
		expect(creature).toContain(`${BUNDLE_ID}/action/attack`);
	});

	it("keeps trained srd/skill proficiencies out while granting separate check attempts", () => {
		const granted = [
			...buildPlayerCharacterCapabilityGrantUnits(),
			...buildCreatureCapabilityGrantUnits(),
		].map((unit) => unit.capabilityId);
		expect(granted.filter((id) => id.startsWith(`${BUNDLE_ID}/skill/`))).toEqual([]);
		expect(granted.filter((id) => id.startsWith(`${BUNDLE_ID}/class-feature/`))).toEqual([]);
		expect(granted.filter((id) => id.startsWith(`${BUNDLE_ID}/check/`))).toHaveLength(24);
	});

	it("carries a rationale on every entry — the package is argued, not asserted", () => {
		for (const unit of [
			...buildPlayerCharacterCapabilityGrantUnits(),
			...buildCreatureCapabilityGrantUnits(),
			...buildVocalCommunicationCapabilityGrantUnits(),
		]) {
			expect(unit.rationale.length).toBeGreaterThan(20);
		}
	});

	it("renders manifest rows owned by the srd bundle, one per verb", () => {
		const characterRows = buildPlayerCharacterCapabilityGrantRows();
		const creatureRows = buildCreatureCapabilityGrantRows();
		const vocalRows = buildVocalCommunicationCapabilityGrantRows();
		expect(characterRows).toHaveLength(3);
		expect(creatureRows).toHaveLength(36);
		expect(vocalRows).toHaveLength(1);
		for (const row of [...characterRows, ...creatureRows, ...vocalRows]) {
			expect(row.bundle_id).toBe(BUNDLE_ID);
			expect(row.capability_id.startsWith(`${BUNDLE_ID}/`)).toBe(true);
		}
		expect(new Set(characterRows.map((row) => row.tag))).toEqual(new Set([PLAYER_CHARACTER_TAG]));
		expect(new Set(creatureRows.map((row) => row.tag))).toEqual(new Set([CREATURE_NICHE_TAG]));
		expect(new Set(vocalRows.map((row) => row.tag))).toEqual(new Set([VOCAL_COMMUNICATION_TAG]));
	});

	findingGap(
		{
			id: "sk-jay0.1.23.36.22.4-pickup-grant",
			title: "srd/action/pickup is granted from srd.creature — too wide for object-handling",
			expected:
				"srd/action/pickup is granted from an identity tag narrower than srd.creature — one that " +
				"actually means 'can handle objects' — so a rat or ooze statblock (both srd.creature) does " +
				"not also receive it.",
			observed:
				"No 'can handle objects' identity tag exists in this bundle's vocabulary today " +
				"(docs/capabilities-and-identity.md's full ownership split), so srd/action/pickup is " +
				"granted from srd.creature alongside walk/attack/dodge — every creature, including " +
				"animal and ooze statblocks, can attempt to pick things up.",
			impact:
				"A rat or a gray ooze can dispatch srd/pickup exactly like a humanoid PLAYER. Low severity " +
				"today (no content currently depends on monsters being unable to pick up items), but the " +
				"grant should narrow the day a scenario needs to gate this by anatomy.",
			references: [
				"packages/spellkave-srd-cc/src/chapters/playing-the-game/fragments/pickup.ts",
				"packages/spellkave-srd-cc/src/chapters/playing-the-game/creature-identity-units.ts",
			],
		},
		() => {
			const grant = buildCreatureCapabilityGrantUnits().find(
				(unit) => unit.capabilityId === PICKUP_CAPABILITY_ID,
			);
			expect(grant?.tag).not.toBe(CREATURE_NICHE_TAG);
		},
	);
});
