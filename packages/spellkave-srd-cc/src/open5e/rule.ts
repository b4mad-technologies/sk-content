// Typed reader for `cache/open5e/Rule.json` (56 records, pk join
// `srd-2024_<section>[_<subsection>]`) — the open5e Django-fixture shape,
// read ONLY from the committed cache (never the fork directly; see
// `../sources.ts`). First consumer: slice 1b's modifier unit
// (`../chapters/playing-the-game/modifier-units.ts`), which parses the
// Ability Modifiers score table out of
// `srd-2024_the-six-abilities_ability-modifiers`'s desc.
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

interface RawRuleRow {
	fields: {
		desc: string;
		document: string;
		index: number;
		name: string;
		ruleset: string;
	};
	model: string;
	pk: string;
}

/** One `Rule.json` record, flattened out of open5e's `fields` wrapper. */
export interface RuleRecord {
	/** open5e pk, e.g. `srd-2024_the-six-abilities_ability-modifiers`. */
	pk: string;
	name: string;
	/** Full section prose, markdown — tables arrive as pipe tables inside this. */
	desc: string;
	/** Parent RuleSet pk, e.g. `srd-2024_the-six-abilities`. */
	ruleset: string;
	document: string;
}

function assertShape(row: unknown, index: number): asserts row is RawRuleRow {
	const candidate = row as Partial<RawRuleRow>;
	if (
		typeof candidate?.pk !== "string" ||
		typeof candidate?.fields?.desc !== "string" ||
		typeof candidate?.fields?.name !== "string" ||
		typeof candidate?.fields?.ruleset !== "string"
	) {
		throw new Error(
			`rule: Rule.json record #${index} does not match the expected open5e fixture shape (pk/fields.desc/fields.name/fields.ruleset).`,
		);
	}
}

/** Read every Rule.json record from the committed cache. */
export function readRules(): RuleRecord[] {
	const raw: unknown = JSON.parse(readFileSync(path.join(CACHE_OPEN5E_DIR, "Rule.json"), "utf8"));
	if (!Array.isArray(raw)) {
		throw new Error("rule: Rule.json is not a JSON array.");
	}
	return raw.map((row, index) => {
		assertShape(row, index);
		return {
			pk: row.pk,
			name: row.fields.name,
			desc: row.fields.desc,
			ruleset: row.fields.ruleset,
			document: row.fields.document,
		};
	});
}

/** Resolve one rule by pk, throwing loudly (never a silent undefined). */
export function ruleByPk(pk: string): RuleRecord {
	const record = readRules().find((rule) => rule.pk === pk);
	if (record === undefined) {
		throw new Error(`rule: no Rule.json record with pk '${pk}' in the cache.`);
	}
	return record;
}
