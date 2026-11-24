/** Discover playable vessels by their actual blueprint and observed place. */
import {
	asEntityRef,
	type ReaderManifest,
	readActorSnapshot,
	readEntityBody,
	readSeats,
	type SnapshotDb,
} from "@spellkave/sdk";
import {
	readActorPrincipalsRequiredTables,
	readActorSnapshotRequiredTables,
	readSeatsRequiredTables,
} from "@spellkave/sdk/readers";

export interface HeroSeatLocation {
	blueprintId: string;
	nodeId: string;
}
export const heroSeatReaderManifests: readonly ReaderManifest[] = [
	{ requiredTables: readSeatsRequiredTables },
	{ requiredTables: readActorPrincipalsRequiredTables },
	{ requiredTables: readActorSnapshotRequiredTables },
];

/** A missing location is undisclosed, so it cannot satisfy a node constraint. */
export function readHeroVessels(db: SnapshotDb, blueprintId: string) {
	return readSeats(db).flatMap((seat) => {
		const ref = asEntityRef(String(seat.entity_id));
		if (!seat.embodied || readEntityBody(db, ref)?.entity_def_id !== blueprintId) return [];
		const body = readActorSnapshot(db, ref);
		if (!body?.current_node_id) return [];
		return [
			{
				...seat,
				targetRef: `entity:${seat.entity_id}`,
				nodeId: body.current_node_id,
				drafting: body.conditions.some(
					(condition) => condition.condition_definition_id === "dm/creation/drafting",
				),
			},
		];
	});
}

export function readHeroSeats(db: SnapshotDb, location: HeroSeatLocation) {
	return readHeroVessels(db, location.blueprintId)
		.filter((seat) => seat.nodeId === location.nodeId)
		.map(({ nodeId: _nodeId, ...seat }) => seat);
}

/** A claimed candidate remains the creation duty until induction moves it out
 * of the station, even after confirmation closes its drafting condition. */
export function readCreationDutySeat(db: SnapshotDb, location: HeroSeatLocation) {
	const seats = readHeroSeats(db, location);
	const claimed = seats.filter((seat) => seat.claimed);
	const eligible = claimed.length > 0 ? claimed : seats.filter((seat) => seat.drafting);
	if (eligible.length !== 1) return undefined;
	return { targetRef: eligible[0]!.targetRef, claimed: eligible[0]!.claimed };
}

/** A restored hero may have left creation. Ambiguity requires the operator's explicit --hero choice. */
export function selectRestoredHero(db: SnapshotDb, location: HeroSeatLocation) {
	const vessels = readHeroVessels(db, location.blueprintId);
	const atStation = vessels.filter((seat) => seat.nodeId === location.nodeId);
	const eligible = atStation.length > 0 ? atStation : vessels;
	if (eligible.length !== 1)
		throw new Error(
			"The saved world has no unique hero vessel; use --hero with an observed entity reference.",
		);
	const seat = eligible[0];
	if (!seat || seat.claimed)
		throw new Error(
			"The saved hero seat is occupied; release its previous binding before claiming it.",
		);
	return asEntityRef(seat.targetRef);
}
