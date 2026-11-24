// DOC-IMPL: tags-and-ids#mf-val-306-register-every-new-tag-family-verbatim
// DOC-IMPL: tags-and-ids#tags-fully-dotted-no-flat-tags
// The ONE `[[bundles]]` header row for this package's `srd` bundle — shared
// by `src/pipeline.ts` (the root manifest render) and
// `src/chapters/verb-runner.ts` (which seeds every per-unit throwaway
// workspace with this row so unit calls validate against the DECLARED tag
// vocabulary instead of `ensureBundleScaffold`'s bare namespace-only
// auto-header; post-#2008 the MF-VAL-297/298 grammar warnings would
// otherwise reject every tagged unit at generation time).
export const BUNDLE_ROW: Record<string, unknown> = {
	bundle_id: "srd",
	display_name: "SRD 5.2.1 (CC-BY)",
	author: "spellkave-srd-cc",
	version: "1.0.0",
	depends_on: [],
	description:
		"SRD 5.2.1 content bundle adapted from CC BY 4.0 sources (see cache/NOTICE.md).",
	// Manifest-declared tag vocabulary (tag-vocabulary-declaration change,
	// #1994/PR #2008) — closes the finding #2/#9 handoff for THIS bundle:
	// the `srd.ability.<code>` ref family previously lived caller-side in
	// `src/ref-tag-families.ts` (retired); declaring it HERE lets `sk lint`,
	// `spellkave_query`, and `refTagOutboundRefs` resolve those tags with no
	// caller-supplied list.
	//
	// FULLY DOTTED, no `allow_flat_tags` (operator decision 2026-07-27,
	// reversing slice 1a's sister-identical flat tags while the bundle is 24
	// rows small): the identity tags are `srd.ability_score` / `srd.skill`
	// under this bundle's own namespace. Consumer grep first — NOTHING reads
	// the sister's flat `ability_score`/`skill` values anywhere (no DSL
	// predicate, no server read, no UI; the only hits are the sister's own
	// generator write sites), so this is a zero-cost divergence, same
	// justification as the dropped `core` tag. The exact `srd` vocabulary entry
	// resolves the currently emitted category values through this bundle's own
	// `tag_value_definitions`; the LONGER `srd.ability` resource-ref and
	// `srd.creature_type`, `srd.travel_pace`, `srd.alignment`, `srd.language`,
	// `srd.character_creation` exact-vocabulary entries win by longest prefix (MF-VAL-306: a
	// tag_value_definition's own `prefix` field must match one of these
	// entries VERBATIM, not just fall under the bare `srd` catch-all —
	// confirmed empirically the first time `srd.alignment.*` rows were
	// authored, character-creation C1). This remains advisory vocabulary
	// metadata, not a closed server admission list.
	tag_prefixes: [
		...["srd.advancement", "srd.feature"].map((prefix) => ({
			prefix,
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		})),
		{
			prefix: "srd.ability",
			target_kind: "resource_definitions",
			natural_key_field: "resource_definition_id",
		},
		{
			prefix: "srd.creature_type",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			prefix: "srd.travel_pace",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			prefix: "srd.alignment",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			prefix: "srd.language",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			prefix: "srd.character_creation",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			// Character Origins O2 (`ledger/character-origins.md`): the 9 SRD
			// species (`srd.species.<slug>`), same closed-choice-catalog family as
			// `srd.creature_type`/`srd.alignment`/`srd.language` above.
			prefix: "srd.species",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			// Character Origins O2: the 6 SRD creature-size categories
			// (`srd.creature_size.<category>`), `creature-size-units.ts`'s own
			// parsed table's first real emitter.
			prefix: "srd.creature_size",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			// Character Origins O3 (`ledger/character-origins.md`): the 33 SRD
			// species traits (`srd.trait.<slug>`), same closed-choice-catalog
			// family as `srd.species`/`srd.creature_size` above
			// (`trait-units.ts`'s own header).
			prefix: "srd.trait",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			// Classes chapter K1 (`ledger/classes.md`): the 12 SRD classes
			// (`srd.class.<slug>`), same closed-choice-catalog family as
			// `srd.species`/`srd.trait` above (`classes-units.ts`'s own header).
			prefix: "srd.class",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			// Classes chapter K1: the 12 SRD subclasses (`srd.subclass.<slug>`),
			// same family as `srd.class` above.
			prefix: "srd.subclass",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			// Classes chapter K2 (`ledger/classes.md`'s K2 row, binding session
			// finding (i)): the 19 Fighter + 6 Champion class-feature identities
			// (`srd.class_feature.<slug>`), same closed-choice-catalog family as
			// `srd.class`/`srd.subclass` above (`fighter-units.ts`'s own header).
			prefix: "srd.class_feature",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			// Monsters chapter (P2b, `ledger/designs/monsters-chapter-design.md`
			// §3): the 5 sourced Creature.json Size categories
			// (`srd.size.<slug>`), same closed-choice-catalog family as
			// `srd.class`/`srd.trait` above (`creature-tag-values.ts`'s own
			// header) — a DELIBERATELY separate prefix from `srd.creature_size`
			// (the existing player-character Size RANK resource's own tag),
			// design doc §3.
			prefix: "srd.size",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			// Monsters chapter (P2b): the sourced Creature.json Challenge Rating
			// values (`srd.cr.<slug>`), documentary-only vocabulary — no
			// resource_definitions row (`creature-tag-values.ts`'s own header).
			prefix: "srd.cr",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			// Monsters chapter (L11 / sk-609b.11): combat-role brain selection
			// (`srd.creature.role.<role>`), storyline §6 + `@spellkave/npc`
			// combat-role presets. Documentary + seat-factory consumer.
			prefix: "srd.creature.role",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			// Source-derived starting-equipment instrument/artisan choice menus.
			prefix: "srd.tool.category",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			// Equipment E3 (`ledger/equipment.md`): the 38 SRD weapons' 4
			// closed-choice axes (`srd.weapon.category.<simple|martial>`), same
			// family as `srd.class`/`srd.size` above (`weapon-tag-values.ts`'s
			// own header).
			prefix: "srd.weapon.category",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			// Equipment E3: `srd.weapon.range.<melee|ranged>`.
			prefix: "srd.weapon.range",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			// Equipment E3: `srd.weapon.property.<slug>` — the 9 plain SRD
			// Weapon Properties (reference-tables-as-tag-metadata pattern,
			// `weapon-tag-values.ts`'s own header).
			prefix: "srd.weapon.property",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			// Equipment E3: `srd.weapon.mastery.<slug>` — the 8 SRD Weapon
			// Mastery properties, same reference-tables-as-tag-metadata pattern.
			prefix: "srd.weapon.mastery",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			// Weapon-damage-source retirement (2026-08-13): `srd.damage_type.
			// <slashing|piercing|bludgeoning>` — documentary metadata on a
			// weapon-like item's own `srd/damage` dsl-source slot, same
			// closed-choice-catalog family as `srd.weapon.category`/`.range`/
			// `.property`/`.mastery` above (`weapon-tag-values.ts`'s own header).
			prefix: "srd.damage_type",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			// Character Origins O3 (`ledger/character-origins.md`): senses (Darkvision, etc.)
			prefix: "srd.sense",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			// Character Origins O3 (`ledger/character-origins.md`): immunities (sleep, exhaustion, etc.)
			prefix: "srd.immunity",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
		{
			prefix: "srd",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		},
	],
};
