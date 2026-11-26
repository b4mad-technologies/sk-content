/** Canonical source closure for the Job-only NPC document compiler. */
export const QUEST_REFERENCE_ROOTS = [
	["packages/spellkave-mechanics/fixtures/core", "manifest.toml"],
	["packages/spellkave-srd-cc/fixtures", "manifest.toml"],
	["packages/spellkave-srd-cc/fixtures/dm", "manifest.toml"],
	["packages/spellkave-adventure-kavemouth/fixtures", "adventure.manifest.toml"],
] as const;
