import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const FLAVOR_ROOT = join(PKG_ROOT, "authored", "flavor");

export interface FlavorDoc {
	id: string;
	kind: string;
	locale: string;
	// A paid-provider cell carries `model`; an agent-session cell (no provider
	// credential, bin/skgen prose ingest — sk-jay0.3.17) carries `provider` +
	// `author` instead and never claims a model it didn't call.
	model?: string;
	provider?: string;
	author?: string;
	prompt_id: string;
	reviewed: boolean;
	body: string;
	path: string;
}

export function classFlavorPath(slug: string, locale = "en"): string {
	return join(FLAVOR_ROOT, locale, "classes", `${slug}.md`);
}

export function creatureFlavorPath(slug: string, locale = "en"): string {
	return join(FLAVOR_ROOT, locale, "monsters", `${slug}.md`);
}

export function spellFlavorPath(slug: string, locale = "en"): string {
	return join(FLAVOR_ROOT, locale, "spells", `${slug}.md`);
}

export function itemFlavorPath(slug: string, locale = "en"): string {
	return join(FLAVOR_ROOT, locale, "items", `${slug}.md`);
}

export function backgroundFlavorPath(slug: string, locale = "en"): string {
	return join(FLAVOR_ROOT, locale, "backgrounds", `${slug}.md`);
}

export function speciesFlavorPath(slug: string, locale = "en"): string {
	return join(FLAVOR_ROOT, locale, "species", `${slug}.md`);
}

export function featFlavorPath(slug: string, locale = "en"): string {
	return join(FLAVOR_ROOT, locale, "feats", `${slug}.md`);
}

export function armorFlavorPath(slug: string, locale = "en"): string {
	return join(FLAVOR_ROOT, locale, "armor", `${slug}.md`);
}

export function gearFlavorPath(slug: string, locale = "en"): string {
	return join(FLAVOR_ROOT, locale, "gear", `${slug}.md`);
}

export function toolFlavorPath(slug: string, locale = "en"): string {
	return join(FLAVOR_ROOT, locale, "tools", `${slug}.md`);
}

export function resourceFlavorPath(slug: string, locale = "en"): string {
	return join(FLAVOR_ROOT, locale, "resources", `${slug}.md`);
}

export function subclassFlavorPath(slug: string, locale = "en"): string {
	return join(FLAVOR_ROOT, locale, "subclasses", `${slug}.md`);
}

export function classFeatureFlavorPath(slug: string, locale = "en"): string {
	return join(FLAVOR_ROOT, locale, "class-features", `${slug}.md`);
}

export function capabilityFlavorPath(slug: string, locale = "en"): string {
	return join(FLAVOR_ROOT, locale, "capabilities", `${slug}.md`);
}

export function conditionFlavorPath(slug: string, locale = "en"): string {
	return join(FLAVOR_ROOT, locale, "conditions", `${slug}.md`);
}

export function actionFlavorPath(slug: string, locale = "en"): string {
	return join(FLAVOR_ROOT, locale, "actions", `${slug}.md`);
}

/** File slug for capabilities/conditions/actions from a fully-qualified id. */
export function ruleFlavorSlug(id: string): string {
	return id
		.replace(/^srd\//, "")
		.replaceAll("_", "-")
		.replaceAll("/", "-");
}

/** File slug for authored/flavor/en/resources/<slug>.md from a resource local id. */
export function resourceFlavorSlug(resourceLocalId: string): string {
	return resourceLocalId.replaceAll("_", "-").replaceAll("/", "-");
}

function requireField(fields: Record<string, string>, key: string, path: string): string {
	const value = fields[key];
	if (!value) throw new Error(`flavor ${path}: missing ${key}`);
	return value;
}

export function parseFlavorMarkdown(raw: string, path: string): FlavorDoc {
	const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	if (!match || match[1] === undefined || match[2] === undefined) {
		throw new Error(`flavor ${path}: missing YAML frontmatter`);
	}
	const fields: Record<string, string> = {};
	for (const line of match[1].split("\n")) {
		const cut = line.indexOf(":");
		if (cut <= 0) continue;
		fields[line.slice(0, cut).trim()] = line.slice(cut + 1).trim();
	}
	const body = match[2].trim();
	if (!body) throw new Error(`flavor ${path}: empty body`);
	if (fields.reviewed !== "true") throw new Error(`flavor ${path}: reviewed must be true`);
	const isAgentSession = fields.provider === "agent-session";
	if (!isAgentSession && !fields.model) throw new Error(`flavor ${path}: missing model`);
	if (isAgentSession && !fields.author) throw new Error(`flavor ${path}: missing author`);
	return {
		id: requireField(fields, "id", path),
		kind: requireField(fields, "kind", path),
		locale: requireField(fields, "locale", path),
		model: fields.model,
		provider: fields.provider,
		author: fields.author,
		prompt_id: requireField(fields, "prompt_id", path),
		reviewed: true,
		body,
		path,
	};
}

function readFlavorFile(path: string, promptHint: string): FlavorDoc {
	try {
		return parseFlavorMarkdown(readFileSync(path, "utf8"), path);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			throw new Error(
				`missing flavor blurb ${path} — generate with skgen (openai/gpt-5.6-terra, ${promptHint}) then scripts/flavor-ingest.ts`,
			);
		}
		throw error;
	}
}

export function readClassFlavor(slug: string, locale = "en"): FlavorDoc {
	return readFlavorFile(classFlavorPath(slug, locale), "prompt_id flavor");
}

export function readCreatureFlavor(slug: string, locale = "en"): FlavorDoc {
	return readFlavorFile(creatureFlavorPath(slug, locale), "prompt_id flavor-creature");
}

export function readSpellFlavor(slug: string, locale = "en"): FlavorDoc {
	return readFlavorFile(spellFlavorPath(slug, locale), "prompt_id flavor-spell");
}

export function readItemFlavor(slug: string, locale = "en"): FlavorDoc {
	return readFlavorFile(itemFlavorPath(slug, locale), "prompt_id flavor-item");
}

export function readBackgroundFlavor(slug: string, locale = "en"): FlavorDoc {
	return readFlavorFile(backgroundFlavorPath(slug, locale), "prompt_id flavor-background");
}

export function readSpeciesFlavor(slug: string, locale = "en"): FlavorDoc {
	return readFlavorFile(speciesFlavorPath(slug, locale), "prompt_id flavor-species");
}

export function readFeatFlavor(slug: string, locale = "en"): FlavorDoc {
	return readFlavorFile(featFlavorPath(slug, locale), "prompt_id flavor-feat");
}

export function readArmorFlavor(slug: string, locale = "en"): FlavorDoc {
	return readFlavorFile(armorFlavorPath(slug, locale), "prompt_id flavor-gear");
}

export function readGearFlavor(slug: string, locale = "en"): FlavorDoc {
	return readFlavorFile(gearFlavorPath(slug, locale), "prompt_id flavor-gear");
}

export function readToolFlavor(slug: string, locale = "en"): FlavorDoc {
	return readFlavorFile(toolFlavorPath(slug, locale), "prompt_id flavor-gear");
}

export function readResourceFlavor(slug: string, locale = "en"): FlavorDoc {
	return readFlavorFile(resourceFlavorPath(slug, locale), "prompt_id flavor-resource");
}

export function readSubclassFlavor(slug: string, locale = "en"): FlavorDoc {
	return readFlavorFile(subclassFlavorPath(slug, locale), "prompt_id flavor-subclass");
}

export function classFeatureFlavorSlug(entityId: string): string {
	return entityId.replace(/^srd\/class-feature\//, "").replaceAll("/", "-");
}

export function readClassFeatureFlavor(entityId: string, locale = "en"): FlavorDoc {
	return readFlavorFile(
		classFeatureFlavorPath(classFeatureFlavorSlug(entityId), locale),
		"prompt_id flavor-resource",
	);
}

export function readCapabilityFlavor(id: string, locale = "en"): FlavorDoc {
	return readFlavorFile(capabilityFlavorPath(ruleFlavorSlug(id), locale), "prompt_id flavor-rule");
}

export function readConditionFlavor(id: string, locale = "en"): FlavorDoc {
	return readFlavorFile(conditionFlavorPath(ruleFlavorSlug(id), locale), "prompt_id flavor-rule");
}

export function readActionFlavor(id: string, locale = "en"): FlavorDoc {
	return readFlavorFile(actionFlavorPath(ruleFlavorSlug(id), locale), "prompt_id flavor-rule");
}
