// pattern: none — authored kavemouth creation offer, not runtime rules.
/**
 * The classes Aldwin offers at creation, in menu order (owner decision D-2,
 * `ledger/designs/solo-beta-definition.md`, gate P-1). The SRD ruleset knows
 * twelve; the solo beta proves these four. The DM duty source exporter
 * (`scripts/export-dm-duty-source.ts`) keeps only these in
 * `duties.creation.classes`, in this order, and drops the starting kits of
 * every other class: the duty validator admits a creation menu that is a
 * non-empty subset of the SRD classes and refuses a kit whose class is not
 * on the menu (`crates/spellkave-validate/src/dm_duties.rs`,
 * sk-jay0.1.55.60.19). `duties.srd.classes` stays complete.
 */
export const CREATION_CLASS_SLUGS = ["fighter", "rogue", "cleric", "wizard"] as const;
