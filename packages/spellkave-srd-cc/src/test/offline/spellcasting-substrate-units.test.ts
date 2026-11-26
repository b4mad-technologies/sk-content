// Offline coverage for spellcasting substrate (docs/spellcasting-substrate.md).
import { readFileSync } from "node:fs";
import path from "node:path";
import type { SetMetadataUpdate } from "@spellkave/tool-authoring";
import { describe, expect } from "vitest";

import {
	allSlotGrants,
	CASTER_PROFILES,
	profilePayload,
	SPELL_SLOT_GRANT_NAMESPACE,
	SPELLCASTING_LEVEL_CEILING,
	SPELLCASTING_PROFILE_NAMESPACE,
	slotGrantsForProfile,
	spellcastingFeatureEntityId,
	spellcastingSubstrateAuthoringInputs,
	spellSlotResourceId,
} from "../../chapters/classes/spellcasting-substrate-units";
import { buildSpellUnits, classSlugFromSpellClassPk } from "../../chapters/spells/spell-units";
import { readSpells } from "../../open5e/spell";
import { FIXTURES_DIR } from "../../pipeline";
import { srdEvidence, srdUnencoded } from "../srd-coverage/evidence";

const DESIGN = "bead sk-609b.1 (design trail)";
const DOC = "docs/spellcasting-substrate.md";

function fixtureText(rel: string): string {
	return readFileSync(path.join(FIXTURES_DIR, rel), "utf8");
}

describe("spellcasting substrate — source axis", () => {
	srdEvidence(
		{
			chapter: "classes",
			unit: "spellcasting-slots",
			aspect: "source",
			claim:
				"ClassFeatureItem slot/cantrip/prepared columns plus classes.md Spellcasting Ability lines cover every caster L1-4",
			references: [DESIGN, DOC],
		},
		() => {
			expect(CASTER_PROFILES).toHaveLength(8);
			for (const profile of CASTER_PROFILES) {
				const grants = slotGrantsForProfile(profile);
				expect(grants.length).toBeGreaterThan(0);
				for (const grant of grants) {
					expect(grant.level).toBeGreaterThanOrEqual(1);
					expect(grant.level).toBeLessThanOrEqual(SPELLCASTING_LEVEL_CEILING);
					expect(grant.count).toBeGreaterThan(0);
				}
				const payload = profilePayload(profile);
				expect(payload.ability).toMatch(/^(int|wis|cha)$/);
				expect(Object.keys(payload.prepared_spells_by_level).length).toBeGreaterThan(0);
				if (profile.classSlug === "paladin" || profile.classSlug === "ranger") {
					expect(payload.cantrips_known_by_level).toBeUndefined();
				} else {
					expect(payload.cantrips_known_by_level).toBeDefined();
				}
			}
			// Wizard L3: 4×slot_1 + 2×slot_2 (cache/open5e ClassFeatureItem).
			const wizard = CASTER_PROFILES.find((p) => p.classSlug === "wizard");
			expect(wizard).toBeDefined();
			const wGrants = slotGrantsForProfile(wizard!);
			expect(wGrants.filter((g) => g.level === 3 && g.slotLevel === 1)[0]?.count).toBe(4);
			expect(wGrants.filter((g) => g.level === 3 && g.slotLevel === 2)[0]?.count).toBe(2);
			// Warlock L3: 2 pact slots at slot level 2.
			const warlock = CASTER_PROFILES.find((p) => p.classSlug === "warlock");
			const pact = slotGrantsForProfile(warlock!).find((g) => g.level === 3);
			expect(pact).toMatchObject({
				slotLevel: 2,
				count: 2,
				kind: "pact_magic",
				recovery: "short_or_long_rest",
			});
			// Half-casters have no 2nd-level slots through L4.
			for (const slug of ["paladin", "ranger"] as const) {
				const half = CASTER_PROFILES.find((p) => p.classSlug === slug)!;
				expect(slotGrantsForProfile(half).every((g) => g.slotLevel === 1)).toBe(true);
			}
		},
	);

	srdEvidence(
		{
			chapter: "spells",
			unit: "class-spell-lists",
			aspect: "source",
			claim: "Spell.json fields.classes enumerates class list membership for every spell",
			references: [DESIGN, DOC],
		},
		() => {
			const spells = readSpells();
			expect(spells.length).toBe(339);
			const byClass = new Map<string, number>();
			for (const spell of spells) {
				expect(spell.classPks.length).toBeGreaterThan(0);
				for (const pk of spell.classPks) {
					const slug = classSlugFromSpellClassPk(pk);
					byClass.set(slug, (byClass.get(slug) ?? 0) + 1);
				}
			}
			// Cache-pinned corpus counts (open5e Spell.json).
			expect(byClass.get("wizard")).toBe(218);
			expect(byClass.get("sorcerer")).toBe(140);
			expect(byClass.get("bard")).toBe(130);
			expect(byClass.get("cleric")).toBe(109);
			expect(byClass.get("druid")).toBe(124);
			expect(byClass.get("paladin")).toBe(38);
			expect(byClass.get("ranger")).toBe(48);
			expect(byClass.get("warlock")).toBe(72);
		},
	);
});

describe("spellcasting substrate — mechanic axis", () => {
	srdEvidence(
		{
			chapter: "classes",
			unit: "spellcasting-slots",
			aspect: "mechanic",
			claim:
				"Generator emits absolute srd.spell_slot_grant rows + spellcasting profiles + class→magic grants",
			references: [DESIGN, DOC],
		},
		() => {
			const grants = allSlotGrants();
			expect(grants).toHaveLength(42);
			type AttachmentUpdate = SetMetadataUpdate & { target: { kind: string; ref: string } };
			const updates = spellcastingSubstrateAuthoringInputs().metadataUpdates.flatMap((update) =>
				typeof update.target === "object" && update.key === SPELL_SLOT_GRANT_NAMESPACE
					? [update as AttachmentUpdate]
					: [],
			);
			expect(updates).toHaveLength(2);
			expect(
				new Set(
					updates.map((update) => `${update.target.kind}:${update.target.ref}:${update.key}:srd`),
				).size,
			).toBe(2);
			const grouped = updates.flatMap((update) => {
				const payload = update.value as {
					grants: Array<Record<string, unknown>>;
				};
				return payload.grants.map((grant) => ({ resource: update.target.ref, ...grant }));
			});
			const byIdentity = (row: Record<string, unknown>) =>
				`${String(row.resource)}:${String(row.class)}:${String(row.level)}`;
			expect(grouped.sort((a, b) => byIdentity(a).localeCompare(byIdentity(b)))).toEqual(
				grants
					.map((grant) => ({
						resource: spellSlotResourceId(grant.slotLevel),
						class: grant.classSlug,
						level: grant.level,
						count: grant.count,
						kind: grant.kind,
						recovery: grant.recovery,
					}))
					.sort((a, b) => byIdentity(a).localeCompare(byIdentity(b))),
			);
			// Every full caster L3 has both slot levels.
			for (const slug of ["bard", "cleric", "druid", "sorcerer", "wizard"]) {
				expect(grants.some((g) => g.classSlug === slug && g.level === 3 && g.slotLevel === 1)).toBe(
					true,
				);
				expect(grants.some((g) => g.classSlug === slug && g.level === 3 && g.slotLevel === 2)).toBe(
					true,
				);
			}
			const wizardProfile = profilePayload(CASTER_PROFILES.find((p) => p.classSlug === "wizard")!);
			expect(wizardProfile.ability).toBe("int");
			expect(wizardProfile.ritual_casting).toBe(true);
			expect(wizardProfile.cantrips_known_by_level?.["1"]).toBe(3);
			expect(wizardProfile.prepared_spells_by_level["1"]).toBe(4);
			expect(wizardProfile.prepared_spells_by_level["4"]).toBe(7);
			expect(spellSlotResourceId(1)).toBe("srd/spell_slot_1");
			expect(spellcastingFeatureEntityId(CASTER_PROFILES[0]!)).toContain("class-feature/");
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "spellcasting-feature",
			aspect: "mechanic",
			claim: "Each caster profile names ability, feature entity, and prepared/cantrip ladders",
			references: [DESIGN, DOC],
		},
		() => {
			for (const profile of CASTER_PROFILES) {
				const payload = profilePayload(profile);
				expect(payload.class).toBe(profile.classSlug);
				expect(payload.feature).toBe(
					profile.featureSlug === "pact-magic" ? "pact_magic" : "spellcasting",
				);
				expect(spellcastingFeatureEntityId(profile)).toBe(
					`srd/class-feature/${profile.classSlug}/${profile.featureSlug}`,
				);
			}
		},
	);

	srdEvidence(
		{
			chapter: "spells",
			unit: "class-spell-lists",
			aspect: "mechanic",
			claim: "buildSpellUnits stamps srd.spell.list.<class> from Spell.json classes",
			references: [DESIGN, DOC],
		},
		() => {
			const units = buildSpellUnits();
			const magicMissile = units.find((u) => u.slug === "magic-missile");
			expect(magicMissile?.tags).toContain("srd.spell.list.wizard");
			expect(magicMissile?.tags).toContain("srd.spell.list.sorcerer");
			const cure = units.find((u) => u.slug === "cure-wounds");
			expect(cure?.tags).toContain("srd.spell.list.cleric");
			expect(cure?.tags).toContain("srd.spell.list.paladin");
		},
	);
});

describe("spellcasting substrate — fixture axis", () => {
	srdEvidence(
		{
			chapter: "classes",
			unit: "spellcasting-slots",
			aspect: "fixture",
			claim: "Committed spellcasting-substrate.toml carries namespaces, grants, and magic bridges",
			references: [DESIGN, DOC],
		},
		() => {
			const toml = fixtureText("base/classes/spellcasting-substrate.toml");
			expect(toml).toContain(SPELL_SLOT_GRANT_NAMESPACE);
			expect(toml).toContain(SPELLCASTING_PROFILE_NAMESPACE);
			expect(toml).toContain('target_ref = "srd/spell_slot_1"');
			expect(toml).toContain('target_ref = "srd/spell_slot_2"');
			expect(toml).toContain('"class":"wizard"');
			expect(toml).toContain('"kind":"pact_magic"');
			expect(toml).toContain('capability_id = "srd/action/magic"');
			expect(toml).toContain('tag = "srd.class.wizard"');
			expect(toml).toContain('tag = "srd.class.warlock"');
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "spellcasting-feature",
			aspect: "fixture",
			claim: "Profiles attach to class-feature spellcasting/pact-magic entity ids",
			references: [DESIGN, DOC],
		},
		() => {
			const toml = fixtureText("base/classes/spellcasting-substrate.toml");
			expect(toml).toContain('target_ref = "srd/class-feature/wizard/spellcasting"');
			expect(toml).toContain('target_ref = "srd/class-feature/warlock/pact-magic"');
			expect(toml).toContain('"ability":"int"');
			expect(toml).toContain('"ritual_casting":true');
		},
	);

	srdEvidence(
		{
			chapter: "spells",
			unit: "class-spell-lists",
			aspect: "fixture",
			claim: "Spell fixtures and tag catalog include srd.spell.list.* membership",
			references: [DESIGN, DOC],
		},
		() => {
			const tagCatalog = fixtureText("base/spells/tag-values.toml");
			expect(tagCatalog).toContain('tag = "srd.spell.list.wizard"');
			expect(tagCatalog).toContain('tag = "srd.spell.list.bard"');
			const mm = fixtureText("base/spells/level-1/magic-missile.toml");
			expect(mm).toContain('tag = "srd.spell.list.wizard"');
		},
	);
});

describe("spellcasting substrate — live axis (catalog; slot-cast is the live debit proof)", () => {
	for (const unit of ["spellcasting-slots", "spellcasting-feature"] as const) {
		srdUnencoded({
			chapter: "classes",
			unit,
			aspect: "live",
			claim:
				"Live debit of srd/spell_slot_1 is proven by live-self-seeding/spells/slot-cast.test.ts; " +
				"per-class grant application at creation/level-up is a later dialogue lane",
			references: [DESIGN, DOC],
		});
	}
	srdUnencoded({
		chapter: "spells",
		unit: "class-spell-lists",
		aspect: "live",
		claim: "Class list tags are catalog membership; no live world reader required this lane",
		references: [DESIGN, DOC],
	});
	srdEvidence(
		{
			chapter: "spells",
			unit: "prepared-known-representation",
			aspect: "mechanic",
			claim: "Prepared/known uses capability id shapes srd/spell/<slug>/prepared and .../cantrip",
			references: [DESIGN, DOC, "docs/capabilities-and-identity.md"],
		},
		() => {
			const preparedId = (slug: string) => `srd/spell/${slug}/prepared`;
			const cantripId = (slug: string) => `srd/spell/${slug}/cantrip`;
			expect(preparedId("magic-missile")).toBe("srd/spell/magic-missile/prepared");
			expect(cantripId("fire-bolt")).toBe("srd/spell/fire-bolt/cantrip");
		},
	);
	for (const aspect of ["source", "fixture", "live"] as const) {
		srdUnencoded({
			chapter: "spells",
			unit: "prepared-known-representation",
			aspect,
			claim:
				"Idiom is documented; capability rows mint on demand when a scene/dialogue grants them",
			references: [DESIGN, DOC],
		});
	}
});
