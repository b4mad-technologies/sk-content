/** Typed `entity:<id>` ref helpers. Re-homed from the retired `@spellkave/npc`
 * seat helpers (sk-jay0.1.55.60.8): the XP act plans still build refs. */
const ENTITY_REF_PREFIX = "entity:";

/** Strip the `entity:` prefix off a typed target ref, leaving the bare id a
 * trace's `inscribed_by` column carries. Already-bare ids pass through. */
export function bareEntityId(targetRef: string): string {
	return targetRef.startsWith(ENTITY_REF_PREFIX)
		? targetRef.slice(ENTITY_REF_PREFIX.length)
		: targetRef;
}

/** Ensure a typed `entity:<id>` ref. Already-prefixed refs pass through. */
export function toEntityPrefixedRef(idOrRef: string): string {
	return idOrRef.startsWith(ENTITY_REF_PREFIX) ? idOrRef : `${ENTITY_REF_PREFIX}${idOrRef}`;
}
