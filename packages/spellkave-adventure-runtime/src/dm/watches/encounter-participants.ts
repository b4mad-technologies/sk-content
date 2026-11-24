// pattern: role-driven-brain
import {
	asEntityRef,
	readActorSnapshot,
	readEntityTags,
	readObjectStateInt,
	resolveEntityId,
} from "@spellkave/sdk";
import type { SnapshotDb } from "@spellkave/sdk/replay";
import { DEAD_CONDITION_ID, FACTION_MONSTERS_TAG, FACTION_PARTY_TAG } from "../../srd-ids.ts";

/**
 * One co-located encounter, never distant reinforcements or unrelated NPCs.
 * Actor embodiment is necessary but does not prove that its host is healthy.
 * The caller must run the authored cast; this is not a seat-readiness oracle.
 * The struck body may already be dead: surviving allies still oppose the party.
 *
 * `hostileActorKeys` names the authored opposition (the adventure's cast
 * entries that fight the party). It is required: the runtime holds no cast.
 * A hostile body counts only if it ALSO carries the monsters faction tag.
 */
export function encounterParticipants(
	db: SnapshotDb,
	attacker: string,
	defender: string,
	hostileActorKeys: readonly string[],
): string[] {
	const anchor = readActorSnapshot(db, asEntityRef(defender))?.current_node_id;
	if (!anchor || readActorSnapshot(db, asEntityRef(attacker))?.current_node_id !== anchor)
		return [];
	const hostileIds = new Set(
		hostileActorKeys.flatMap((key) => {
			const id = resolveEntityId(db, asEntityRef(key));
			return id === undefined ? [] : [String(id)];
		}),
	);
	const side = (id: string) => {
		const tags = readEntityTags(db, id);
		if (tags.includes(FACTION_PARTY_TAG)) return "party";
		if (hostileIds.has(id) && tags.includes(FACTION_MONSTERS_TAG)) return "hostile";
		return null;
	};
	const attackingSide = side(attacker);
	const defendingSide = side(defender);
	if (!attackingSide || !defendingSide || attackingSide === defendingSide) return [];
	const actorRows = (db as unknown as { actor?: { iter(): Iterable<{ currentBody: bigint }> } })
		.actor;
	const living = [...(actorRows?.iter() ?? [])]
		.map((row) => String(row.currentBody))
		.filter((id) => {
			const snapshot = readActorSnapshot(db, asEntityRef(id));
			return (
				snapshot?.current_node_id === anchor &&
				side(id) !== null &&
				!snapshot.conditions.some(
					(condition) => condition.condition_definition_id === DEAD_CONDITION_ID,
				) &&
				(readObjectStateInt(db, { targetKind: "entity", targetId: id, stateId: "srd/hp" }) ?? 0n) >
					0n
			);
		});
	if (!living.some((id) => side(id) === "party") || !living.some((id) => side(id) === "hostile"))
		return [];
	// Defender anchors the tactical grid when alive; all survivors share that node.
	return [...new Set([defender, attacker, ...living].filter((id) => living.includes(id)))];
}
