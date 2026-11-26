// embedded-manifest: {"category": "exact_parser_oracle", "rationale": "the weapon-unit test prepends a minimal header solely to inspect one generated include fragment"}
// Melee/Ranged Attack offline proof: item-sourced damage and normal range,
// the to-hit expression builders, and catalog-derived outer range bounds.
// Shipped ROW shapes are pinned
// against the committed `fixtures/` in `fixtures-author-tool/combat.test.ts`.
// ci-allow(embedded-manifest-schema): unit parser input assembled around one row, not a whole valid manifest
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { inspectManifest } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";
import {
	WEAPON_ATTACK_RANGE_SLOT_ID,
	WEAPON_DAMAGE_SLOT_ID,
	weaponDamageMagnitudeExpr,
} from "../../chapters/equipment/weapon-damage-source-units";
import {
	damageTypeTag,
	SRD_DAMAGE_TYPES,
	WEAPON_RANGE_TAG_PREFIX,
	weaponFinessePropertyTag,
	weaponReachPropertyTag,
} from "../../chapters/equipment/weapon-tag-values";
import {
	buildWeaponUnits,
	weaponAttackRangeFeet,
	weaponRangeClass,
} from "../../chapters/equipment/weapon-units";
import { attackRollExpr } from "../../chapters/playing-the-game/attack-roll-units";
import { MONSTER_TAG } from "../../chapters/playing-the-game/creature-type-units";
import { damageRollExpr } from "../../chapters/playing-the-game/damage-units";
import { buildAttacksFragment } from "../../chapters/playing-the-game/fragments/attacks";
import { DEAD_CONDITION_ID } from "../../chapters/playing-the-game/fragments/conditions";
import { HP_ID } from "../../chapters/playing-the-game/hp-units";
import { BUNDLE_ID } from "../../chapters/playing-the-game/index";
import { expectedAbilityModifier } from "../../chapters/playing-the-game/modifier-units";
import {
	OPPORTUNITY_ATTACK_ACTION_SUFFIX,
	UNARMED_STRIKE_DAMAGE_ACTION_SUFFIX,
} from "../../chapters/playing-the-game/unarmed-strike-units";
import {
	attackAbilityScoreExpr,
	MELEE_ATTACK_LOCAL_ID,
	MELEE_ATTACK_RANGE_METERS,
	meleeAttackRollExpr,
	meleeDamageDeltaExpr,
	monsterDeathFrameWrite,
	monsterDeathGuardExpr,
	RANGED_ATTACK_LOCAL_ID,
	RANGED_ATTACK_RANGE_METERS,
	rangedAttackRollExpr,
	rangedDamageDeltaExpr,
	SWING_ATTACK_LOCAL_ID,
	UNARMED_ATTACK_RANGE_METERS,
	weaponAttackRangePredicate,
} from "../../chapters/playing-the-game/weapon-attack-units";
import {
	readWeaponProperties,
	weaponPropertyAssignmentsByWeapon,
} from "../../open5e/weapon-property";
import { FIXTURES_DIR } from "../../pipeline";

describe("weapon ranges (cache-grounded, never invented)", () => {
	it("melee reach is 5 feet, or 10 feet only for a weapon carrying the sourced Reach property", () => {
		const melee = buildWeaponUnits().filter((weapon) => weapon.rangeClass === "melee");
		expect(new Set(melee.map(weaponAttackRangeFeet))).toEqual(new Set([5, 10]));
	});

	it("every ranged weapon uses its own positive Weapon.json normal range", () => {
		const ranged = buildWeaponUnits().filter((weapon) => weapon.rangeClass === "ranged");
		expect(ranged.every((weapon) => weaponAttackRangeFeet(weapon) === weapon.range)).toBe(true);
	});
});

describe("range constants", () => {
	it("melee outer range admits Reach weapons while the actor effective reach supplies the exact gate", () => {
		expect(MELEE_ATTACK_RANGE_METERS).toBe(10.668);
		expect(UNARMED_ATTACK_RANGE_METERS).toBe(9.144);
		const predicate = weaponAttackRangePredicate("melee");
		expect(predicate).toContain(`${WEAPON_RANGE_TAG_PREFIX}.melee`);
		expect(predicate).toContain("actor.effective('srd/reach_mm')");
		expect(predicate).toContain(weaponReachPropertyTag());
		expect(predicate).not.toContain(WEAPON_ATTACK_RANGE_SLOT_ID);
	});

	it("ranged outer range is the maximum sourced normal range in the catalog", () => {
		const maximum = Math.max(
			...buildWeaponUnits()
				.filter((weapon) => weapon.rangeClass === "ranged")
				.map(weaponAttackRangeFeet),
		);
		expect(RANGED_ATTACK_RANGE_METERS).toBe((maximum * 304.8) / 1000);
	});
});

describe("to-hit builders (compose attackRollExpr verbatim, never retyped)", () => {
	// sk-84i.4 (probe sk-84i.1's measured to-hit deltas vs open5e): both
	// builders now thread a caller-supplied Proficiency Bonus expression
	// through attackRollExpr's existing circumstantialExpr hook.
	const proficiencyBonusExpr = "actor.stat('srd/proficiency_bonus')";

	it("melee to-hit is exactly attackRollExpr on the finesse-aware attack ability (Strength base) plus the Proficiency Bonus term", () => {
		expect(
			meleeAttackRollExpr(
				"actor.stat('srd/str')",
				"actor.stat('srd/dex')",
				"target.effective('srd/ac')",
				proficiencyBonusExpr,
			),
		).toBe(
			attackRollExpr({
				scoreExpr: attackAbilityScoreExpr("actor.stat('srd/str')", "actor.stat('srd/dex')"),
				acExpr: "target.effective('srd/ac')",
				circumstantialExpr: proficiencyBonusExpr,
			}),
		);
	});

	it("ranged to-hit is exactly attackRollExpr on the finesse-aware attack ability (Dexterity base) plus the Proficiency Bonus term", () => {
		expect(
			rangedAttackRollExpr(
				"actor.stat('srd/dex')",
				"actor.stat('srd/str')",
				"target.effective('srd/ac')",
				proficiencyBonusExpr,
			),
		).toBe(
			attackRollExpr({
				scoreExpr: attackAbilityScoreExpr("actor.stat('srd/dex')", "actor.stat('srd/str')"),
				acExpr: "target.effective('srd/ac')",
				circumstantialExpr: proficiencyBonusExpr,
			}),
		);
	});

	it("melee to-hit expression string carries the Proficiency Bonus stat read", () => {
		expect(
			meleeAttackRollExpr(
				"actor.stat('srd/str')",
				"actor.stat('srd/dex')",
				"target.effective('srd/ac')",
				proficiencyBonusExpr,
			),
		).toContain("actor.stat('srd/proficiency_bonus')");
	});
});

describe("effective ability-score inputs (equipped modifiers affect weapon attacks)", () => {
	const str = "actor.effective('srd/str')";
	const dex = "actor.effective('srd/dex')";

	it("uses the shared ability-modifier macro around effective scores for melee and ranged to-hit", () => {
		expect(meleeAttackRollExpr(str, dex, "target.effective('srd/ac')", "0")).toContain(
			"macro('srd/ability_modifier', cond(actor.equipped_item('srd/slot/main-hand').has_tag('srd.weapon.property.finesse'), max(actor.effective('srd/str'), actor.effective('srd/dex')), actor.effective('srd/str')))",
		);
		expect(rangedAttackRollExpr(dex, str, "target.effective('srd/ac')", "0")).toContain(
			"macro('srd/ability_modifier', cond(actor.equipped_item('srd/slot/main-hand').has_tag('srd.weapon.property.finesse'), max(actor.effective('srd/dex'), actor.effective('srd/str')), actor.effective('srd/dex')))",
		);
	});

	it("uses the shared ability-modifier macro around effective scores in item-owned damage", () => {
		expect(
			weaponDamageMagnitudeExpr(
				{ diceExpr: "1d8", damageType: "slashing", abilityMode: "finesse" },
				str,
				dex,
			),
		).toContain("max(macro('srd/strength_modifier'), macro('srd/dexterity_modifier'))");
	});

	it("keeps every weapon slot as die plus modifier, with no baked defense ladder", () => {
		for (const type of ["slashing", "piercing", "bludgeoning", "fire"] as const) {
			const expr = weaponDamageMagnitudeExpr(
				{ diceExpr: "1d8", damageType: type, abilityMode: "str" },
				str,
				dex,
			);
			expect(expr).toBe("1d8 + (macro('srd/strength_modifier'))");
			expect(expr).not.toContain("damage_immune");
		}
	});
});

// BL-49: the defect was that to-hit and damage disagreed — damage was
// finesse-aware, to-hit was not, so a rogue with a rapier added DEX to
// damage while rolling to hit off STR. Both halves must now select the SAME
// ability, and an actor with no finesse weapon must be UNCHANGED.
describe("attackAbilityScoreExpr (BL-49 — one ability choice, both halves of the attack)", () => {
	const str = "actor.stat('srd/str')";
	const dex = "actor.stat('srd/dex')";

	it("gates the widening on the wielded item's Finesse tag, with the base ability as the else-branch", () => {
		expect(attackAbilityScoreExpr(str, dex)).toBe(
			`cond(actor.equipped_item('srd/slot/main-hand').has_tag('${weaponFinessePropertyTag()}'), max(${str}, ${dex}), ${str})`,
		);
	});

	it("melee to-hit selects its ability while damage remains owned by the equipped item", () => {
		const shared = attackAbilityScoreExpr(str, dex);
		expect(meleeAttackRollExpr(str, dex, "target.effective('srd/ac')", "0")).toContain(shared);
		expect(meleeDamageDeltaExpr()).not.toContain(shared);
	});

	it("ranged to-hit selects its ability while damage remains owned by the equipped item", () => {
		const shared = attackAbilityScoreExpr(dex, str);
		expect(rangedAttackRollExpr(dex, str, "target.effective('srd/ac')", "0")).toContain(shared);
		expect(rangedDamageDeltaExpr()).not.toContain(shared);
	});

	// THE CANARY (sk-84i.4's own stated fear, now asserted rather than
	// assumed): the blanket max(STR,DEX) flip it rejected would have moved
	// the combat-arena Goblin Warriors from Strength mod -1 to Dexterity mod
	// +2. The weapon-GATED variant must leave them exactly where they were.
	// Modelled here over the real formula rather than trusted: `cond` picks
	// the else-branch when no finesse item is wielded, so the selected score
	// is the base score, and floor((8-10)/2) = -1.
	it("an actor wielding nothing or a non-finesse weapon is UNCHANGED — the combat-arena Goblin Warrior stays at Strength mod -1", () => {
		// The else-branch of the cond is the bare base score expression.
		const expr = attackAbilityScoreExpr(str, dex);
		expect(expr.endsWith(`, ${str})`)).toBe(true);
		// STR 8 / DEX 15: the pre-BL-49 selection, reproduced from the table.
		expect(expectedAbilityModifier(8)).toBe(-1);
		// What the blanket flip sk-84i.4 rejected would have produced instead.
		expect(expectedAbilityModifier(15)).toBe(2);
	});

	// Monotonicity is what lets the gate select a SCORE and convert once,
	// instead of taking max over two already-converted modifiers. If this
	// ever stopped holding, the damage side would silently change value.
	it("selecting max(score) then converting equals max of the converted modifiers, across the SRD score range", () => {
		for (let a = 1; a <= 30; a += 1) {
			for (let b = 1; b <= 30; b += 1) {
				expect(expectedAbilityModifier(Math.max(a, b))).toBe(
					Math.max(expectedAbilityModifier(a), expectedAbilityModifier(b)),
				);
			}
		}
	});
});

describe("damage-delta builders (item-owned magnitude, types routed at the write)", () => {
	it("melee delta reads the equipped item's magnitude plus while-raging Rage Damage", () => {
		const expectedMagnitude = `actor.equipped_item('srd/slot/main-hand').source('${WEAPON_DAMAGE_SLOT_ID}')`;
		expect(meleeDamageDeltaExpr()).toContain(expectedMagnitude);
		expect(meleeDamageDeltaExpr()).toContain("actor.status('srd/condition/raging') == true");
		expect(meleeDamageDeltaExpr()).toContain(
			damageRollExpr({
				diceExpr: expectedMagnitude,
				modifierExpr: "cond(actor.status('srd/condition/raging') == true, 2, 0)",
			}),
		);
	});

	it("melee delta reads the shared srd/damage slot id, never a re-typed literal", () => {
		const expr = meleeDamageDeltaExpr();
		expect(expr).toContain(
			`actor.equipped_item('srd/slot/main-hand').source('${WEAPON_DAMAGE_SLOT_ID}')`,
		);
	});

	it("melee delta routes every SRD damage type from the wielded item's tag", () => {
		const expr = meleeDamageDeltaExpr();
		for (const type of SRD_DAMAGE_TYPES) {
			expect(expr).toContain(
				`actor.equipped_item('srd/slot/main-hand').has_tag('${damageTypeTag(type)}')`,
			);
			expect(expr).toContain(`target.has_tag('damage_resist:${type}')`);
		}
	});

	// Ranged damage mirrors melee's direct equipped-item read. The SRD's own
	// Dart is a Finesse RANGED weapon, so ranged to-hit keeps the shared
	// ability-selection expression even though damage is item-owned.
	it("ranged delta uses the same item-owned magnitude shape", () => {
		expect(rangedDamageDeltaExpr()).toBe(meleeDamageDeltaExpr());
	});

	// The Dart is why BL-48's "ranged never takes finesse" was wrong.
	it("the SRD carries a Finesse RANGED weapon (the Dart), so the ranged finesse branch is reachable", () => {
		const finesse = readWeaponProperties().find(
			(candidate) => candidate.type === null && candidate.name === "Finesse",
		);
		expect(finesse, "a plain Finesse WeaponProperty row").toBeDefined();
		const dartIsFinesse = weaponPropertyAssignmentsByWeapon("srd-2024_dart").some(
			(row) => row.propertyPk === finesse?.pk,
		);
		expect(dartIsFinesse, "srd-2024_dart should carry the Finesse property").toBe(true);
		expect(weaponRangeClass("srd-2024_dart")).toBe("ranged");
		expect(
			rangedAttackRollExpr("actor.stat('srd/dex')", "actor.stat('srd/str')", "0", "0"),
		).toContain(weaponFinessePropertyTag());
	});

	it("ranged delta routes every SRD type from the same wielded-item tags as melee", () => {
		const expr = rangedDamageDeltaExpr();
		for (const type of SRD_DAMAGE_TYPES) {
			expect(expr).toContain(
				`actor.equipped_item('srd/slot/main-hand').has_tag('${damageTypeTag(type)}')`,
			);
		}
	});
});

describe("monsterDeathGuardExpr (renamed from lethalHpGuardExpr, sk-dms.39/sk-b3m)", () => {
	it("defaults to the target subject: srd.monster tag check FIRST (short-circuit-safe), then the <= 0 comparison, against the supplied HP resource id", () => {
		expect(monsterDeathGuardExpr("srd/hp")).toBe(
			"target.has_tag('srd.monster') && target.stat('srd/hp') <= 0",
		);
	});

	it("rebinds to the actor subject when composing inside a ForEachActorInRadius body predicate", () => {
		expect(monsterDeathGuardExpr("srd/hp", "actor")).toBe(
			"actor.has_tag('srd.monster') && actor.stat('srd/hp') <= 0",
		);
	});

	it("gates on the SAME MONSTER_TAG constant the tag vocabulary declares — never a re-typed literal", () => {
		expect(monsterDeathGuardExpr("srd/hp")).toContain(`has_tag('${MONSTER_TAG}')`);
	});
});

describe("monsterDeathFrameWrite (renamed from lethalToDeadFrameWrite, sk-dms.39/sk-b3m — wired, finding #66 addendum, corrected by finding #67 — combat-arena proof Slice C)", () => {
	it("builds a core/area/node_ball radius-0 self-guard ForEachActorInRadius, monster-tag-gated, applying the supplied dead condition", () => {
		expect(monsterDeathFrameWrite("srd/hp", "srd/condition/dead")).toEqual({
			ForEachActorInRadius: {
				center_ref: "TargetSpatialRef",
				shape_id: "core/area/node_ball",
				shape_params_json: '{"ball_radius": 0}',
				predicate_source: "actor.has_tag('srd.monster') && actor.stat('srd/hp') <= 0",
				body: [
					{
						ApplyStatus: {
							target_kind: "entity",
							target_ref: "Actor",
							condition_definition_id: "srd/condition/dead",
						},
					},
				],
			},
		});
	});

	// Finding #67: the closed kernel `KNOWN_AREA_SHAPE_IDS` vocabulary
	// (`server/src/spatial/vocabulary.rs:87-93`) is ALL `core/area/`-prefixed
	// — a bare `"node_ball"` never validates. `core/area/node_ball` is
	// kernel-genesis substrate vocabulary (a closed Rust constant, never an
	// authored `area_shape_definitions` row), not a `core` BUNDLE dependency —
	// `self-sufficiency.test.ts` carries a narrow, explicit carve-out for
	// exactly the five `KNOWN_AREA_SHAPE_IDS` strings (operator ruling,
	// `ledger/archive/general-decisions.md`, 2026-07-31) rather than this unit asserting a
	// zero-`core/`-references shape that the kernel would reject.
	it("uses the fully-qualified core/area/node_ball kernel shape id (finding #67)", () => {
		const frameWrite = monsterDeathFrameWrite("srd/hp", "srd/condition/dead");
		expect(JSON.stringify(frameWrite)).toContain("core/area/node_ball");
	});
});

// sk-dms.39 (e): the actual regression — of the four TARGETED attack
// templates `fragments/attacks.ts` authors, only srd/attack/melee and
// srd/attack/ranged ever called the Monster Death write; srd/attack/
// unarmed-strike/damage and srd/attack/opportunity-attack silently dropped a
// killed monster's HP to 0 and stopped. This guard enumerates the fragment's
// OWN exported `units` (never a hand-listed id set — a hand-listed guard has
// the same failure mode as the bug it guards, sk-dms.39's own framing) and
// fails loud if a SIXTH TARGETED template ever ships a `srd/hp`
// ModifyResource without the Monster Death write alongside it.
//
// actor-carried-verbs D4/D9 added a FIFTH template, the untargeted swing —
// deliberately EXCLUDED from this guard's target-damage assertions: its
// resolution reads no `target.*` facts at all (that absence is what makes it
// the sentinel-emitting untargeted variant), so it has nothing to damage and
// carries no Monster Death write. Checked separately below (empty
// frame_writes, MF-VAL-222's no-op consequence shape).
describe("Monster Death guard coverage — every TARGETED attacks.ts consequence that damages srd/hp also applies it (sk-dms.39 e)", () => {
	it("covers all four targeted /success consequences, derived from buildAttacksFragment's own units array (swing excluded, D4/D9)", async () => {
		// `armor-units.test.ts`'s own precedent (`generateEquipment(createLocalAuthorTarget(FIXTURES_DIR))`):
		// this fragment's ModifyResource on `srd/hp` only validates with a target
		// augmented by the committed fixtures' cross-chapter resource_definitions
		// (srd/hp is authored in the identity fragment, not here) — called with NO
		// target, `driveUnitScene` rejects with MF-VAL-217 (unresolved resource).
		const { toml, units } = await buildAttacksFragment(createLocalAuthorTarget(FIXTURES_DIR));
		const swingSuccessId = `${BUNDLE_ID}/${SWING_ATTACK_LOCAL_ID}/success`;
		const successConsequenceIds = units
			.filter((unit) => unit.kind === "consequence_templates" && unit.id.endsWith("/success"))
			.map((unit) => unit.id);
		// Guards the enumeration itself: if attacks.ts ever stopped reporting
		// its own consequence ids in `units`, this loop would silently check
		// nothing and the test would pass for the wrong reason.
		expect(successConsequenceIds).toEqual([
			`${BUNDLE_ID}/${UNARMED_STRIKE_DAMAGE_ACTION_SUFFIX}/success`,
			`${BUNDLE_ID}/${OPPORTUNITY_ATTACK_ACTION_SUFFIX}/success`,
			`${BUNDLE_ID}/${MELEE_ATTACK_LOCAL_ID}/success`,
			`${BUNDLE_ID}/${RANGED_ATTACK_LOCAL_ID}/success`,
			swingSuccessId,
		]);
		const targetedSuccessConsequenceIds = successConsequenceIds.filter(
			(id) => id !== swingSuccessId,
		);

		// `driveUnitScene`'s own returned fragment text is deliberately NOT
		// standalone-parseable (`dm-data-advancement.test.ts`'s module header:
		// "meant to be `[[include]]`d by the pipeline's own root manifest
		// render") — it carries no `#:schema`/`schema_version` header. Prepend
		// the SAME literal directive the crates-level fixtures use
		// (`crates/spellkave-format/tests/fixtures/valid_manifest.toml`) purely
		// to make `inspectManifest` able to parse this fragment's own rows; no
		// semantic validation runs again here (that already happened inside
		// `buildAttacksFragment` itself, against the real committed fixtures).
		const schemaHeader =
			'#:schema https://spellkave.dev/schema/world-manifest-1.0.0.json\nschema_version = "1.0.0"\n\n';
		const manifest = inspectManifest(schemaHeader + toml).manifest as Record<string, unknown>;
		const frameWriteRows = Array.isArray(manifest.consequence_frame_writes)
			? (manifest.consequence_frame_writes as Array<Record<string, unknown>>)
			: [];
		expect(frameWriteRows.length).toBeGreaterThan(0);

		const hpResourceId = `${BUNDLE_ID}/${HP_ID}`;
		for (const templateId of targetedSuccessConsequenceIds) {
			const writesForTemplate = frameWriteRows.filter((row) => row.template_id === templateId);
			expect(writesForTemplate.length, `${templateId} authored no frame_writes`).toBeGreaterThan(0);

			const damagesHp = writesForTemplate.some((row) => {
				const write = row.frame_write as { ModifyResource?: { resource?: string } } | undefined;
				return write?.ModifyResource?.resource === hpResourceId;
			});
			expect(
				damagesHp,
				`${templateId} does not carry a ModifyResource on ${hpResourceId} — test is stale`,
			).toBe(true);

			const carriesMonsterDeath = writesForTemplate.some((row) => {
				const write = row.frame_write as
					| {
							ForEachActorInRadius?: {
								predicate_source?: string;
								body?: Array<{ ApplyStatus?: { condition_definition_id?: string } }>;
							};
					  }
					| undefined;
				const forEach = write?.ForEachActorInRadius;
				if (forEach === undefined) return false;
				const appliesDead = (forEach.body ?? []).some(
					(leaf) => leaf.ApplyStatus?.condition_definition_id === DEAD_CONDITION_ID,
				);
				return (
					appliesDead && (forEach.predicate_source ?? "").includes(`has_tag('${MONSTER_TAG}')`)
				);
			});
			expect(
				carriesMonsterDeath,
				`${templateId} damages ${hpResourceId} but never applies Monster Death (${DEAD_CONDITION_ID}, monster-tag-guarded)`,
			).toBe(true);
		}

		// D9: the swing's own success consequence carries NO frame_writes at
		// all (MF-VAL-222's no-op shape) — proof that its resolution reads no
		// target.* facts, the property that makes it the sentinel-emitting
		// untargeted variant.
		const swingWrites = frameWriteRows.filter((row) => row.template_id === swingSuccessId);
		expect(
			swingWrites.length,
			`${swingSuccessId} authored frame_writes — it must stay a target-free no-op (D4/D9)`,
		).toBe(0);
	});
});
