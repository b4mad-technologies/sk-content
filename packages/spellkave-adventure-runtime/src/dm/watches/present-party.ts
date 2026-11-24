import { asEntityRef, readActorSnapshot, resolveEntityId, type SnapshotDb } from "@spellkave/sdk";

/**
 * Party members standing where the hero stands, as bare numeric entity ids
 * (sk-awlo.15). A quest-XP watch that omits this grants terminal quest XP to
 * the hero ALONE (measured in PR #2792: `{hero: 200, rogue: null, hesper: null}`).
 *
 * Presence is co-location on the hero's own `current_node_id`, read through
 * the production actor reader: a companion left behind elsewhere does not
 * share in a quest they were not there for. Companions are relocated back to
 * their pre-session node when a combat session closes, so a terminal that
 * fires after a fight sees them at the hero's node again.
 *
 * Both keys are required: the runtime knows no hero and no party roster.
 */
export function presentPartyEntityIds(
	db: SnapshotDb,
	spec: { heroEntityKey: string; companionEntityKeys: readonly string[] },
): string[] {
	const heroNodeId = readActorSnapshot(db, asEntityRef(spec.heroEntityKey))?.current_node_id;
	if (heroNodeId === undefined || heroNodeId === "") return [];
	const present: string[] = [];
	for (const companionKey of spec.companionEntityKeys) {
		const companionRef = asEntityRef(companionKey);
		if (readActorSnapshot(db, companionRef)?.current_node_id !== heroNodeId) continue;
		const companionEntityId = resolveEntityId(db, companionRef);
		if (companionEntityId !== undefined) present.push(String(companionEntityId));
	}
	return present;
}
