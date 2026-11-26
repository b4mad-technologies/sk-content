// Offline coverage for caster non-spellcasting features L1-4
// (docs/caster-features-l1-4.md, lane L3 / sk-609b.4).
import { readFileSync } from "node:fs";
import path from "node:path";
import { advancementChoicesForClassLevel } from "@spellkave/adventure-runtime/dm/data/advancement";
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { describe, expect, it } from "vitest";
import {
	advancementChoiceMembers,
	BARDIC_ACTION_ID,
	BARDIC_USES_RESOURCE_ID,
	CLERIC_CD_USES_INITIAL,
	CLERIC_CD_USES_RESOURCE_ID,
	clericChannelDivinityUsesColumn,
	DIVINE_SPARK_HEAL_ACTION_ID,
	eldritchInvocationCountByLevel,
	FAVORED_ENEMY_USES_RESOURCE_ID,
	INNATE_SORCERY_ACTION_ID,
	LAY_ON_HANDS_RESOURCE_ID,
	SORCERY_POINTS_RESOURCE_ID,
	WILD_SHAPE_USES_RESOURCE_ID,
} from "../../chapters/classes/caster-features-units";
import { advancementChoiceOptionEntityId } from "../../chapters/classes/choice-option-ids";
import { FIXTURES_DIR } from "../../pipeline";
import { srdEvidence, srdNotApplicable, srdUnencoded } from "../srd-coverage/evidence";

const DESIGN = "bead sk-609b.4 (design trail)";
const DOC = "docs/caster-features-l1-4.md";

function fixtureText(rel: string): string {
	return readFileSync(path.join(FIXTURES_DIR, rel), "utf8");
}

describe("caster features L1-4 — source axis", () => {
	srdEvidence(
		{
			chapter: "classes",
			unit: "cleric-channel-divinity",
			aspect: "source",
			claim:
				"ClassFeatureItem channel-divinity-uses is 2 at Cleric L2-4; Divine Spark prose at classes.md:2221",
			references: [DESIGN, DOC, "cache/markdown/classes.md:2213-2225"],
		},
		() => {
			const col = clericChannelDivinityUsesColumn();
			expect(col.length).toBeGreaterThan(0);
			for (const row of col) expect(row.uses).toBe(2);
			expect(CLERIC_CD_USES_INITIAL).toBe(2);
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "advancement-choice-rows",
			aspect: "source",
			claim:
				"Eldritch invocation count is 1 at L1 and 3 at L2; caster choice menus omit subclass L3 " +
				"(owned by advancement-metadata-units) and keep Divine/Primal Order, Fighting Style, " +
				"Expertise, Metamagic, Eldritch Invocations, Scholar",
			references: [DESIGN, DOC, "docs/advancement-choice.md"],
		},
		() => {
			const inv = eldritchInvocationCountByLevel();
			expect(inv.find((r) => r.level === 1)?.count).toBe(1);
			expect(inv.find((r) => r.level === 2)?.count).toBe(3);
			const members = advancementChoiceMembers();
			// No subclass menus from this lane.
			expect(members.every((m) => !m.choiceGroup.endsWith("/subclass"))).toBe(true);
			const groups = new Set(members.map((m) => m.choiceGroup));
			expect(groups.has("srd/cleric/1/divine-order")).toBe(true);
			expect(groups.has("srd/druid/1/primal-order")).toBe(true);
			expect(groups.has("srd/paladin/2/fighting-style")).toBe(true);
			expect(groups.has("srd/ranger/2/fighting-style")).toBe(true);
			expect(groups.has("srd/bard/2/expertise")).toBe(true);
			expect(groups.has("srd/sorcerer/2/metamagic")).toBe(true);
			expect(groups.has("srd/warlock/1/eldritch-invocations")).toBe(true);
			expect(groups.has("srd/warlock/2/eldritch-invocations")).toBe(true);
			expect(groups.has("srd/wizard/2/scholar")).toBe(true);
			expect(groups.size).toBe(9);
		},
	);

	for (const unit of [
		"bardic-inspiration",
		"wild-shape-uses",
		"lay-on-hands",
		"favored-enemy-uses",
		"innate-sorcery",
		"font-of-magic",
	] as const) {
		srdEvidence(
			{
				chapter: "classes",
				unit,
				aspect: "source",
				claim: `${unit} is grounded in cache/markdown/classes.md + ClassFeature.json (see ${DESIGN})`,
				references: [DESIGN, DOC],
			},
			() => {
				expect(advancementChoiceMembers().length).toBeGreaterThan(0);
			},
		);
	}
});

describe("caster features L1-4 — mechanic axis", () => {
	srdEvidence(
		{
			chapter: "classes",
			unit: "cleric-channel-divinity",
			aspect: "mechanic",
			claim: "Divine Spark heal action id and CD uses resource constants are authored",
			references: [DESIGN, DOC],
		},
		() => {
			expect(DIVINE_SPARK_HEAL_ACTION_ID).toBe("srd/cleric/divine-spark-heal");
			expect(CLERIC_CD_USES_RESOURCE_ID).toBe("srd/cleric/channel-divinity-uses");
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "bardic-inspiration",
			aspect: "mechanic",
			claim: "Bardic Inspiration action + uses resource constants exist (Help-shaped approx)",
			references: [DESIGN, DOC],
		},
		() => {
			expect(BARDIC_ACTION_ID).toBe("srd/bard/bardic-inspiration");
			expect(BARDIC_USES_RESOURCE_ID).toBe("srd/bard/bardic-inspiration-uses");
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "wild-shape-uses",
			aspect: "mechanic",
			claim: "Wild Shape uses resource id is authored (form swap deferred)",
			references: [DESIGN, DOC],
		},
		() => {
			expect(WILD_SHAPE_USES_RESOURCE_ID).toBe("srd/druid/wild-shape-uses");
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "lay-on-hands",
			aspect: "mechanic",
			claim: "Lay On Hands pool resource id is authored",
			references: [DESIGN, DOC],
		},
		() => {
			expect(LAY_ON_HANDS_RESOURCE_ID).toBe("srd/paladin/lay-on-hands");
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "favored-enemy-uses",
			aspect: "mechanic",
			claim: "Favored Enemy uses resource id is authored",
			references: [DESIGN, DOC],
		},
		() => {
			expect(FAVORED_ENEMY_USES_RESOURCE_ID).toBe("srd/ranger/favored-enemy-uses");
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "innate-sorcery",
			aspect: "mechanic",
			claim: "Innate Sorcery action id is authored",
			references: [DESIGN, DOC],
		},
		() => {
			expect(INNATE_SORCERY_ACTION_ID).toBe("srd/sorcerer/innate-sorcery");
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "font-of-magic",
			aspect: "mechanic",
			claim: "Sorcery points resource id is authored",
			references: [DESIGN, DOC],
		},
		() => {
			expect(SORCERY_POINTS_RESOURCE_ID).toBe("srd/sorcerer/sorcery-points");
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "advancement-choice-rows",
			aspect: "mechanic",
			claim:
				"Choice members use shared {class,level,choice_group,choose_n,rechoose?} shape; " +
				"DM reader advancementChoicesForClassLevel regroups them",
			references: [DESIGN, DOC, "docs/advancement-choice.md"],
		},
		() => {
			const members = advancementChoiceMembers();
			expect(members.length).toBeGreaterThan(0);
			for (const m of members) {
				expect(m.classSlug.length).toBeGreaterThan(0);
				expect(m.level).toBeGreaterThanOrEqual(1);
				expect(m.level).toBeLessThanOrEqual(4);
				expect(m.choiceGroup).toBe(
					`srd/${m.classSlug}/${m.level}/${m.choiceGroup.split("/").slice(3).join("/")}`,
				);
				expect(m.chooseN).toBeGreaterThanOrEqual(1);
				expect(m.memberEntityId.startsWith("srd/")).toBe(true);
				expect(
					m.rechoose === undefined || m.rechoose === "none" || m.rechoose === "long_rest_one",
				).toBe(true);
			}
			// Warlock L1 choose_n = 1, L2 choose_n = 3 (absolute table counts).
			const w1 = members.filter((m) => m.choiceGroup === "srd/warlock/1/eldritch-invocations");
			const w2 = members.filter((m) => m.choiceGroup === "srd/warlock/2/eldritch-invocations");
			expect(w1.length).toBeGreaterThan(0);
			expect(w1[0]?.chooseN).toBe(1);
			expect(w2[0]?.chooseN).toBe(3);
			// Bard expertise is choose 2.
			const exp = members.find((m) => m.choiceGroup === "srd/bard/2/expertise");
			expect(exp?.chooseN).toBe(2);
		},
	);

	// Reader parity: every menu this generator emits is visible to the DM reader
	// against the committed fixtures (post-regenerate).
	it("DM reader advancementChoicesForClassLevel parses every caster-features choice menu", () => {
		const target = createLocalAuthorTarget(FIXTURES_DIR);
		const byKey = new Map<string, { chooseN: number; members: Set<string> }>();
		for (const m of advancementChoiceMembers()) {
			const key = `${m.classSlug}@${m.level}@${m.choiceGroup}`;
			const bucket = byKey.get(key) ?? { chooseN: m.chooseN, members: new Set<string>() };
			// Reader returns unique choice-option wrappers (L5d), not the grants_ref.
			bucket.members.add(advancementChoiceOptionEntityId(m.classSlug, m.level, m.memberEntityId));
			byKey.set(key, bucket);
		}
		for (const [key, expected] of byKey) {
			const [classSlug, levelStr, ...groupParts] = key.split("@");
			const level = Number(levelStr);
			const choiceGroup = groupParts.join("@");
			const groups = advancementChoicesForClassLevel(target, classSlug!, level);
			const hit = groups.find((g) => g.choiceGroup === choiceGroup);
			expect(hit, `missing menu ${choiceGroup} for ${classSlug} L${level}`).toBeDefined();
			expect(hit?.chooseN).toBe(expected.chooseN);
			expect([...(hit?.memberCapabilityIds ?? [])].sort()).toEqual([...expected.members].sort());
		}
	});
});

describe("caster features L1-4 — fixture axis", () => {
	const toml = () => fixtureText("base/classes/caster-features.toml");

	srdEvidence(
		{
			chapter: "classes",
			unit: "cleric-channel-divinity",
			aspect: "fixture",
			claim:
				"caster-features.toml carries CD uses + Divine Spark heal/damage + Turn Undead + Preserve Life (L12c menu)",
			references: [DESIGN, DOC],
		},
		() => {
			const text = toml();
			expect(text).toContain('resource_definition_id = "srd/cleric/channel-divinity-uses"');
			expect(text).toContain('action_id = "srd/cleric/divine-spark-heal"');
			expect(text).toContain('action_id = "srd/cleric/divine-spark-damage"');
			expect(text).toContain('action_id = "srd/cleric/turn-undead"');
			expect(text).toContain('action_id = "srd/cleric/preserve-life"');
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "bardic-inspiration",
			aspect: "fixture",
			claim:
				"fixture carries Bardic Inspiration grant + banked condition + spend-die action (L12c)",
			references: [DESIGN, DOC],
		},
		() => {
			const text = toml();
			expect(text).toContain('action_id = "srd/bard/bardic-inspiration"');
			expect(text).toContain('condition_definition_id = "srd/condition/bardic-inspiration"');
			expect(text).toContain('action_id = "srd/bard/spend-bardic-inspiration-die"');
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "wild-shape-uses",
			aspect: "fixture",
			claim: "fixture carries Wild Shape uses resource",
			references: [DESIGN, DOC],
		},
		() => {
			expect(toml()).toContain('resource_definition_id = "srd/druid/wild-shape-uses"');
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "lay-on-hands",
			aspect: "fixture",
			claim: "fixture carries Lay On Hands pool + 1/5/10 spend menu (L12c)",
			references: [DESIGN, DOC],
		},
		() => {
			const text = toml();
			expect(text).toContain('resource_definition_id = "srd/paladin/lay-on-hands"');
			expect(text).toContain('action_id = "srd/paladin/lay-on-hands"');
			expect(text).toContain('action_id = "srd/paladin/lay-on-hands-1"');
			expect(text).toContain('action_id = "srd/paladin/lay-on-hands-10"');
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "favored-enemy-uses",
			aspect: "fixture",
			claim: "fixture carries Favored Enemy uses",
			references: [DESIGN, DOC],
		},
		() => {
			expect(toml()).toContain('resource_definition_id = "srd/ranger/favored-enemy-uses"');
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "innate-sorcery",
			aspect: "fixture",
			claim: "fixture carries Innate Sorcery action",
			references: [DESIGN, DOC],
		},
		() => {
			expect(toml()).toContain('action_id = "srd/sorcerer/innate-sorcery"');
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "font-of-magic",
			aspect: "fixture",
			claim: "fixture carries sorcery-points + convert/create slot actions (L12c)",
			references: [DESIGN, DOC],
		},
		() => {
			const text = toml();
			expect(text).toContain('resource_definition_id = "srd/sorcerer/sorcery-points"');
			expect(text).toContain('action_id = "srd/sorcerer/convert-slot-1-to-points"');
			expect(text).toContain('action_id = "srd/sorcerer/create-spell-slot-1"');
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "divine-smite",
			aspect: "fixture",
			claim: "fixture carries Divine Smite bonus-action slot debit + radiant (L12c)",
			references: [DESIGN, DOC],
		},
		() => {
			expect(toml()).toContain('action_id = "srd/paladin/divine-smite"');
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "wild-companion",
			aspect: "fixture",
			claim: "fixture carries Wild Companion action + Spawn effect_def (L12c)",
			references: [DESIGN, DOC],
		},
		() => {
			const text = toml();
			expect(text).toContain('action_id = "srd/druid/wild-companion"');
			expect(text).toContain('effect_def_id = "srd/druid/wild-companion/spawn"');
			expect(text).toContain('primitives_csv = "Spawn"');
		},
	);

	srdEvidence(
		{
			chapter: "classes",
			unit: "advancement-choice-rows",
			aspect: "fixture",
			claim:
				"fixture carries srd.advancement_choice MEMBER rows (choice_group/choose_n) for caster menus; " +
				"no subclass L3 rows (owned by advancement-metadata)",
			references: [DESIGN, DOC, "docs/advancement-choice.md"],
		},
		() => {
			const text = toml();
			expect(text).toContain('namespace = "srd.advancement_choice"');
			expect(text).toContain('"choice_group":"srd/cleric/1/divine-order"');
			expect(text).toContain('"choice_group":"srd/druid/1/primal-order"');
			expect(text).toContain('"choice_group":"srd/paladin/2/fighting-style"');
			expect(text).toContain('"choice_group":"srd/warlock/1/eldritch-invocations"');
			expect(text).toContain('"choose_n":');
			// Subclass L3 deliberately absent from this fragment.
			expect(text).not.toContain('"feature":"subclass"');
			expect(text).not.toContain("/3/subclass");
		},
	);
});

describe("caster features L1-4 — live axis", () => {
	// Live proof is the dedicated channel-divinity self-seeding test
	// (channel-divinity.test.ts); other features are n/a for this lane's
	// single live representative.
	srdNotApplicable({
		chapter: "classes",
		unit: "bardic-inspiration",
		aspect: "live",
		reason: "Lane L3 live representative is Divine Spark heal use-decrement only",
		references: [DESIGN],
	});
	srdNotApplicable({
		chapter: "classes",
		unit: "wild-shape-uses",
		aspect: "live",
		reason: "Lane L3 live representative is Divine Spark heal use-decrement only",
		references: [DESIGN],
	});
	srdNotApplicable({
		chapter: "classes",
		unit: "lay-on-hands",
		aspect: "live",
		reason: "Lane L3 live representative is Divine Spark heal use-decrement only",
		references: [DESIGN],
	});
	srdNotApplicable({
		chapter: "classes",
		unit: "favored-enemy-uses",
		aspect: "live",
		reason: "Lane L3 live representative is Divine Spark heal use-decrement only",
		references: [DESIGN],
	});
	srdNotApplicable({
		chapter: "classes",
		unit: "innate-sorcery",
		aspect: "live",
		reason: "Lane L3 live representative is Divine Spark heal use-decrement only",
		references: [DESIGN],
	});
	srdNotApplicable({
		chapter: "classes",
		unit: "font-of-magic",
		aspect: "live",
		reason: "Lane L3 live representative is Divine Spark heal use-decrement only",
		references: [DESIGN],
	});
	srdNotApplicable({
		chapter: "classes",
		unit: "advancement-choice-rows",
		aspect: "live",
		reason: "ADR-0073 D-1: metadata alone never mutates the world; no live writer in this lane",
		references: [DESIGN],
	});

	srdUnencoded({
		chapter: "classes",
		unit: "cleric-channel-divinity",
		aspect: "live",
		claim:
			"Live Divine Spark heal use-decrement is proven by " +
			"live-self-seeding/mechanics/channel-divinity.test.ts when SPELLKAVE_LOCAL_NODE=1",
		references: [DESIGN, DOC],
	});
});
