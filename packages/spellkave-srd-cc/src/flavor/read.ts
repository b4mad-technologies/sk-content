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

/** Missing optional flavor leaves the authored rules and mechanics available. */
export function readFlavorFile(path: string): { body: string } {
	try {
		return parseFlavorMarkdown(readFileSync(path, "utf8"), path);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return { body: "" };
		throw error;
	}
}

export function readClassFlavor(slug: string, locale = "en"): { body: string } {
	return readFlavorFile(classFlavorPath(slug, locale));
}

export function readCreatureFlavor(slug: string, locale = "en"): { body: string } {
	return readFlavorFile(creatureFlavorPath(slug, locale));
}

export function readSpellFlavor(slug: string, locale = "en"): { body: string } {
	return readFlavorFile(spellFlavorPath(slug, locale));
}

export function readItemFlavor(slug: string, locale = "en"): { body: string } {
	return readFlavorFile(itemFlavorPath(slug, locale));
}

export function readBackgroundFlavor(slug: string, locale = "en"): { body: string } {
	return readFlavorFile(backgroundFlavorPath(slug, locale));
}

export function readSpeciesFlavor(slug: string, locale = "en"): { body: string } {
	return readFlavorFile(speciesFlavorPath(slug, locale));
}

export function readFeatFlavor(slug: string, locale = "en"): { body: string } {
	return readFlavorFile(featFlavorPath(slug, locale));
}

export function readArmorFlavor(slug: string, locale = "en"): { body: string } {
	return readFlavorFile(armorFlavorPath(slug, locale));
}

export function readGearFlavor(slug: string, locale = "en"): { body: string } {
	return readFlavorFile(gearFlavorPath(slug, locale));
}

export function readToolFlavor(slug: string, locale = "en"): { body: string } {
	return readFlavorFile(toolFlavorPath(slug, locale));
}

export function readResourceFlavor(slug: string, locale = "en"): { body: string } {
	return readFlavorFile(resourceFlavorPath(slug, locale));
}

export function readSubclassFlavor(slug: string, locale = "en"): { body: string } {
	return readFlavorFile(subclassFlavorPath(slug, locale));
}

export function classFeatureFlavorSlug(entityId: string): string {
	return entityId.replace(/^srd\/class-feature\//, "").replaceAll("/", "-");
}

export function readClassFeatureFlavor(entityId: string, locale = "en"): { body: string } {
	return readFlavorFile(
		classFeatureFlavorPath(classFeatureFlavorSlug(entityId), locale),
	);
}

export function readCapabilityFlavor(id: string, locale = "en"): { body: string } {
	return readFlavorFile(capabilityFlavorPath(ruleFlavorSlug(id), locale));
}

export function readConditionFlavor(id: string, locale = "en"): { body: string } {
	return readFlavorFile(conditionFlavorPath(ruleFlavorSlug(id), locale));
}

export function readActionFlavor(id: string, locale = "en"): { body: string } {
	return readFlavorFile(actionFlavorPath(ruleFlavorSlug(id), locale));
}
