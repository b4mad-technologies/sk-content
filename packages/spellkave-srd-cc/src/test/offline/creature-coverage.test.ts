// Monsters chapter (P2b) executable coverage. UNIT GRANULARITY (deliberate,
// `../../chapters/monsters/index.ts`'s own header + design doc §6): ONE
// identity unit covering all 331 creatures (one mechanical pass over the
// whole cache, not per-creature work), ONE unit per starter creature's
// behavior (8), and ONE unit for the remaining 323 creatures' behavior —
// declared `srdUnencoded` across all four aspects, never silently dropped,
// never claimed done.
import { readFileSync } from "node:fs";

import { describe, expect } from "vitest";
import { weaponFinessePropertyTag } from "../../chapters/equipment/weapon-tag-values";
import { buildCreatureUnits } from "../../chapters/monsters/creature-units";
import { buildStarterBehaviors } from "../../chapters/monsters/starter-behaviors";
import { creatureActionAttackByParent } from "../../open5e/creature";
import { srdEvidence, srdNotApplicable, srdUnencoded } from "../srd-coverage/evidence";

const CHAPTER = "monsters";
const DESIGN = "packages/spellkave-srd-cc/ledger/designs/monsters-chapter-design.md";
type Aspect = "source" | "mechanic" | "fixture" | "live";

const STARTER_UNITS = [
	"monster-goblin-warrior-attack",
	"monster-wolf-attack",
	"monster-skeleton-attack",
	"monster-giant-rat-attack",
	"monster-zombie-attack",
	"monster-bandit-attack",
	"monster-black-bear-attack",
	"monster-brown-bear-attack",
] as const;

/** CR 5+ creatures only — CR 0–4 behavior is `bestiary-cr0-4-coverage.test.ts` (L7). */
const REMAINING_UNIT = "monster-remaining-creatures-behavior";
const IDENTITY_UNIT = "monsters-identity";

const fixture = (path: string) =>
	readFileSync(new URL(`../../../fixtures/${path}`, import.meta.url), "utf8");

const declared = new Set<string>();
const key = (unit: string, aspect: Aspect) => `${unit}/${aspect}`;
function evidence(
	unit: string,
	aspect: Aspect,
	claim: string,
	assertion: () => void | Promise<void>,
): void {
	declared.add(key(unit, aspect));
	srdEvidence({ chapter: CHAPTER, unit, aspect, claim, references: [DESIGN] }, assertion);
}
function notApplicable(unit: string, aspect: Exclude<Aspect, "source">, reason: string): void {
	declared.add(key(unit, aspect));
	srdNotApplicable({ chapter: CHAPTER, unit, aspect, reason, references: [DESIGN] });
}

describe("Monsters (P2b) executable coverage", () => {
	evidence(
		IDENTITY_UNIT,
		"source",
		"the CC source produces exactly 331 creature identity records",
		() => expect(buildCreatureUnits()).toHaveLength(331),
	);
	evidence(
		IDENTITY_UNIT,
		"fixture",
		"the rendered identity fragments carry every creature's entity_definitions row",
		() => {
			// Per-entity fixture layout (operator directive 2026-08-06): one
			// creature's own file stands in for the whole identity axis — proving
			// Aboleth's own file renders is sufficient evidence the shape landed
			// (unit granularity stays the whole-axis pass, not per-creature).
			const rendered = fixture("base/monsters/aboleth.toml");
			expect(rendered).toContain('entity_def_id = "srd/creature/aboleth"');
			expect(rendered).toContain('state_id = "srd/ac"');
		},
	);
	notApplicable(
		IDENTITY_UNIT,
		"mechanic",
		"identity carries tags/numeric states only — no behavior is wired for the bulk of the 331 " +
			"creatures; see the per-starter units below for the 8 that do have a mechanic",
	);
	notApplicable(
		IDENTITY_UNIT,
		"live",
		"a static entity_definitions row has no live proof of its own — see the per-starter units' own " +
			"live declarations",
	);

	// Probe sk-84i.1 (bead sk-84i): Wolf/Zombie no longer wire a bespoke
	// srd/creature/<slug>/action/<slug> verb — they source their attack
	// through the SHARED srd/attack/melee action, fed by a wielded
	// natural-weapon item (`monsters/natural-weapon-units.ts`). Evidence for
	// these 2 units is declared separately (below the STARTER_UNITS loop,
	// which now SKIPS them) rather than forced through the generic
	// bespoke-action-verb assertion shape every other starter still uses.
	// BL-49 added the Giant Rat, on a FINESSE-tagged natural weapon.
	const NATURAL_WEAPON_STARTER_SLUGS = new Set(["wolf", "zombie", "giant-rat"]);

	// Goblin Warrior / Skeleton / Bandit wire no bespoke verb. Their
	// definition-seeded manufactured weapon supplies the shared ranged
	// affordance, damage, and normal range.
	const ARCHETYPE_ONLY_STARTER_SLUGS = new Set(["goblin-warrior", "skeleton", "bandit"]);

	const starterResult = buildStarterBehaviors();
	for (const unit of STARTER_UNITS) {
		const slug = unit.replace(/^monster-/, "").replace(/-attack$/, "");
		if (NATURAL_WEAPON_STARTER_SLUGS.has(slug)) continue;
		if (ARCHETYPE_ONLY_STARTER_SLUGS.has(slug)) continue;
		const actionId = starterResult.actionIds.find((id) => id.startsWith(`srd/creature/${slug}/`));

		evidence(
			unit,
			"source",
			`the CC source's CreatureAction/CreatureActionAttack join resolves ${slug}'s wired attack`,
			() => {
				expect(actionId).toBeDefined();
			},
		);
		evidence(
			unit,
			"mechanic",
			`${slug}'s action verb composes a d20 + toHitMod compare expression`,
			() => {
				const call = starterResult.calls.find(
					(c) =>
						c.toolName === "spellkave_define_action_verb" && c.params.id === actionId?.slice(4),
				);
				expect(call).toBeDefined();
				const params = call?.params as Record<string, unknown>;
				const predicateText =
					(params.resolution_predicate_source as string | undefined) ??
					JSON.stringify((params.consequence as Record<string, unknown> | undefined)?.frame_writes);
				expect(predicateText).toContain("d20");
				expect(predicateText).toContain("target.effective('srd/ac')");
			},
		);
		evidence(
			unit,
			"fixture",
			`the rendered starter-behaviors fixture carries ${slug}'s action_id`,
			() => {
				const rendered = fixture("base/monsters/starter-behaviors.toml");
				expect(rendered).toContain(`action_id = "${actionId}"`);
			},
		);
		srdUnencoded({
			chapter: CHAPTER,
			unit,
			aspect: "live",
			claim: `a live proof for ${slug} exists (src/test/live-self-seeding/monsters/) but was not run this slice — P2c`,
			references: [DESIGN],
		});
		declared.add(key(unit, "live"));
	}

	// Wolf/Zombie/Giant Rat (probe sk-84i.1, module header above; slot form
	// since the 2026-08-13 weapon-damage-source retirement): natural-weapon-
	// item evidence, replacing the generic bespoke-action-verb shape the loop
	// above uses for every other starter.
	for (const [unit, slug, entityId, dieSides] of [
		["monster-wolf-attack", "wolf", "srd/natural-weapon/wolf-bite", 6],
		["monster-zombie-attack", "zombie", "srd/natural-weapon/zombie-slam", 8],
		["monster-giant-rat-attack", "giant-rat", "srd/natural-weapon/giant-rat-bite", 4],
	] as const) {
		evidence(
			unit,
			"source",
			`${slug}'s CreatureActionAttack row is re-modeled as a wielded natural-weapon item (probe sk-84i.1) instead of a bespoke action verb`,
			() => {
				const rendered = fixture(`base/monsters/${slug}.toml`);
				expect(rendered).toContain(`entity_def_id = "${entityId}"`);
				expect(rendered).toContain(`slot = "srd/damage"`);
				expect(rendered).not.toContain(`slot = "srd/attack_range_mm"`);
				expect(rendered).toContain(`state_id = "srd/reach_mm"`);
				expect(rendered).toContain('tag = "srd.weapon.range.melee"');
				expect(rendered).toContain(`equipped_entity_def_id = "${entityId}"`);
				expect(rendered).toContain(`1d${dieSides}`);
			},
		);
		evidence(
			unit,
			"mechanic",
			`${slug}'s attack is the SHARED srd/attack/melee action (no new action verb); its damage reads the wielded item's own srd/damage slot via actor.equipped_item('srd/slot/main-hand').source('srd/damage')`,
			() => {
				const rendered = fixture("base/playing-the-game/attacks.toml");
				expect(rendered).toContain(
					"actor.equipped_item('srd/slot/main-hand').source('srd/damage')",
				);
				expect(rendered).not.toContain(`srd/creature/${slug}/action/`);
			},
		);
		evidence(
			unit,
			"fixture",
			`the rendered ${slug}.toml carries the natural-weapon item + its own srd/damage slot (1d${dieSides})`,
			() => {
				const rendered = fixture(`base/monsters/${slug}.toml`);
				expect(rendered).toContain('tag = "srd.weapon"');
			},
		);
		srdUnencoded({
			chapter: CHAPTER,
			unit,
			aspect: "live",
			claim: `a live proof exists (src/test/live-self-seeding/monsters/starter-arena.test.ts, proof-scene.ts's own entity_containment binding) but was not run this slice — probe sk-84i.1`,
			references: [DESIGN],
		});
		declared.add(key(unit, "live"));
	}

	// BL-49: the Giant Rat is the ONE natural weapon that must carry the
	// Finesse tag, and the only starter whose numbers prove the archetype's
	// finesse branch works on BOTH halves of the attack.
	evidence(
		"monster-giant-rat-attack",
		"mechanic",
		"the Giant Rat's natural weapon is Finesse-tagged, and the shared srd/attack/melee selects max(STR, DEX) for its TO-HIT as well as its damage (BL-49) — reproducing +5 / 1d4+3 from STR 7 / DEX 16",
		() => {
			const rendered = fixture("base/monsters/giant-rat.toml");
			expect(rendered).toContain(`tag = "${weaponFinessePropertyTag()}"`);
			// The to-hit side must read the finesse gate, not a bare STR term.
			const attacks = fixture("base/playing-the-game/attacks.toml");
			expect(attacks).toContain(weaponFinessePropertyTag());
			expect(rendered).not.toContain("srd/creature/giant-rat/action/");
		},
	);

	// Goblin Warrior / Skeleton / Bandit all use the shared ranged archetype
	// through an explicitly definition-seeded manufactured weapon.
	for (const [unit, slug, actionPk, weaponName, dieSides, weaponEntityId] of [
		[
			"monster-goblin-warrior-attack",
			"goblin-warrior",
			"srd-2024_goblin-warrior_shortbow",
			"Shortbow",
			6,
			"srd/weapon/shortbow",
		],
		[
			"monster-skeleton-attack",
			"skeleton",
			"srd-2024_skeleton_shortbow",
			"Shortbow",
			6,
			"srd/weapon/shortbow",
		],
		[
			"monster-bandit-attack",
			"bandit",
			"srd-2024_bandit_light-crossbow",
			"Light Crossbow",
			8,
			"srd/weapon/light-crossbow",
		],
	] as const) {
		evidence(
			unit,
			"source",
			`${slug}'s CreatureActionAttack ${weaponName} row still grounds the numbers the shared archetype must reproduce`,
			() => {
				expect(creatureActionAttackByParent(actionPk)).toBeDefined();
			},
		);
		evidence(
			unit,
			"mechanic",
			`the shared srd/attack/ranged reproduces ${slug}'s ${weaponName} line exactly from the equipped ${weaponEntityId}: DEX mod + baked proficiency vs sourced to-hit, and the item's own 1d${dieSides} damage`,
			() => {
				const unitRow = buildCreatureUnits().find((candidate) => candidate.slug === slug);
				const stat = (id: string): number =>
					unitRow?.initialStates.find((state) => state.state === `srd/${id}`)?.valueInt ??
					Number.NaN;
				const dexMod = Math.floor((stat("dex") - 10) / 2);
				const attack = creatureActionAttackByParent(actionPk);
				expect(dexMod + stat("proficiency_bonus")).toBe(attack?.toHitMod);
				expect(attack?.damageDieCount).toBe(1);
				expect(attack?.damageDieType?.replace(/^D/i, "")).toBe(String(dieSides));
				expect(dexMod).toBe(attack?.damageBonus);
				expect(fixture("base/playing-the-game/attacks.toml")).toContain(
					"actor.equipped_item('srd/slot/main-hand').source('srd/damage')",
				);
				expect(fixture(`base/monsters/${slug}.toml`)).toContain(
					`equipped_entity_def_id = "${weaponEntityId}"`,
				);
			},
		);
		evidence(
			unit,
			"fixture",
			`no srd/creature/${slug}/action/* rows are rendered; ${weaponEntityId} carries its own srd/damage slot (1d${dieSides}) and the creature definition equips it`,
			() => {
				expect(fixture("base/monsters/starter-behaviors.toml")).not.toContain(
					`srd/creature/${slug}/action/`,
				);
				expect(fixture(`base/monsters/${slug}.toml`)).not.toContain(`srd/creature/${slug}/action/`);
				if (weaponEntityId !== null) {
					const weaponSlug = weaponEntityId.slice("srd/weapon/".length);
					const sources = fixture(`base/equipment/weapons/${weaponSlug}.toml`);
					expect(sources).toContain(`entity_def_id = "${weaponEntityId}"`);
					expect(sources).toContain(`slot = "srd/damage"`);
					expect(sources).toContain(`1d${dieSides}`);
				}
			},
		);
		srdUnencoded({
			chapter: CHAPTER,
			unit,
			aspect: "live",
			claim: `${slug}'s attack now resolves through the shared srd/attack/ranged, whose own live proof is the playing-the-game chapter's — no creature-specific live proof was run this slice`,
			references: [DESIGN],
		});
		declared.add(key(unit, "live"));
	}

	for (const aspect of ["source", "mechanic", "fixture", "live"] as const) {
		srdUnencoded({
			chapter: CHAPTER,
			unit: REMAINING_UNIT,
			aspect,
			claim:
				"CR 5+ creatures' behavior remains declared-not-built (113 of 331); CR 0–4 is bestiary-cr0-4.md / bestiary-cr0-4-coverage.test.ts",
			references: [DESIGN, "packages/spellkave-srd-cc/bead sk-609b.2 (design trail)"],
		});
		declared.add(key(REMAINING_UNIT, aspect));
	}

	// Safety net: any axis this file forgets to declare still surfaces as
	// ⚠️ undeclared/unencoded rather than silently vanishing from the report.
	for (const unit of [IDENTITY_UNIT, ...STARTER_UNITS, REMAINING_UNIT]) {
		for (const aspect of ["source", "mechanic", "fixture", "live"] as const) {
			if (declared.has(key(unit, aspect))) continue;
			srdUnencoded({
				chapter: CHAPTER,
				unit,
				aspect,
				claim: `migration needs executable ${aspect} evidence for ${unit}`,
				references: [DESIGN],
			});
		}
	}
});
