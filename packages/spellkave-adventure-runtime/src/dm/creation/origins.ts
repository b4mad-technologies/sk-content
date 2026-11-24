// DOC-IMPL: character-creation#what-the-player-sees
/**
 * // pattern: draft-then-confirm-wizard
 * // pattern: tag-membership-menu
 *
 * Creation-dialogue origin catalogs (slice 3): the 9 SRD species and 4
 * SRD 5.2.1 backgrounds, sourced from this package's own chapter units —
 * never re-derived here. Cached like `../data`'s `classCreationData`.
 */
import { SRD_BACKGROUND_CATALOG, SRD_SPECIES_CATALOG } from "../data/srd-catalog.ts";

export interface CreationOriginOption {
	slug: string;
	displayName: string;
	definitionRef: string;
	speedCells?: number;
	skillCapabilityIds?: readonly string[];
	featEntityId?: string | null;
}

let speciesCache: CreationOriginOption[] | undefined;
let backgroundCache: CreationOriginOption[] | undefined;

export function speciesCreationData(): readonly CreationOriginOption[] {
	if (speciesCache === undefined) {
		speciesCache = SRD_SPECIES_CATALOG.map((unit) => ({
			slug: unit.slug,
			displayName: unit.displayName,
			definitionRef: `srd/species/${unit.slug}`,
			speedCells: unit.speedCells,
		}));
	}
	return speciesCache;
}

export function backgroundCreationData(): readonly CreationOriginOption[] {
	if (backgroundCache === undefined) {
		backgroundCache = SRD_BACKGROUND_CATALOG.map((unit) => ({
			slug: unit.slug,
			displayName: unit.displayName,
			definitionRef: `srd/background/${unit.slug}`,
			skillCapabilityIds: unit.skillCapabilityIds,
			featEntityId: unit.featEntityId,
		}));
	}
	return backgroundCache;
}

export function speciesCreationDataBySlug(slug: string): CreationOriginOption {
	const unit = speciesCreationData().find((candidate) => candidate.slug === slug);
	if (unit === undefined) {
		throw new Error(`dm/creation/origins: '${slug}' is not a known species slug.`);
	}
	return unit;
}

export function backgroundCreationDataBySlug(slug: string): CreationOriginOption {
	const unit = backgroundCreationData().find((candidate) => candidate.slug === slug);
	if (unit === undefined) {
		throw new Error(`dm/creation/origins: '${slug}' is not a known background slug.`);
	}
	return unit;
}
