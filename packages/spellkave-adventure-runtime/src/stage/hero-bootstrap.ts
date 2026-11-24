/** Operator staging primes one seat through an authored act and retires its temporary authority. */
import { randomUUID } from "node:crypto";
import {
	asEntityRef,
	connect,
	createActorClient,
	type EntityRef,
	enqueueAndWaitManifestApply,
	type SpellkaveSession,
	snapshotDb,
} from "@spellkave/sdk";
import { presenceActRequiredTables } from "@spellkave/session/player-tools";
import { liveNodeToken } from "@spellkave/tool-node";
import { stringify } from "smol-toml";
import {
	type HeroSeatLocation,
	heroSeatReaderManifests,
	readHeroSeats,
	selectRestoredHero,
} from "./hero-discovery.ts";

const callbacks = { onError: () => {}, onDisconnect: () => {}, onUpdate: () => {} };
const header = `#:schema https://spellkave.dev/schema/world-manifest-1.0.0.json
schema_version = "1.0.0"
`;

async function connectPublisher(options: { url: string; db: string }) {
	const token = liveNodeToken();
	if (token === undefined)
		throw new Error("Seat staging requires this local node's publisher credential.");
	const publisher = await connect(
		{
			...options,
			token,
			connectedActorId: "stage-publisher",
			readerManifests: [
				...heroSeatReaderManifests,
				{
					requiredTables: [
						"manifest_apply_digest",
						"manifest_apply_outcome",
						"entity_definition",
						"visible_place_node",
					],
				},
			],
		},
		callbacks,
	);
	try {
		await publisher.ready;
		const identity = publisher.authenticatedIdentity?.toHexString();
		const operator = [...publisher.conn.db.config.iter()][0]?.operatorIdentity.toHexString();
		if (!identity || identity !== operator)
			throw new Error("Seat staging requires the database publisher identity.");
		return publisher;
	} catch (error) {
		publisher.disconnect();
		throw error;
	}
}

/** Observe the saved world's current bodies without changing it or minting role authority. */
export async function discoverRestoredHero(
	options: HeroSeatLocation & { url: string; db: string },
): Promise<EntityRef> {
	const publisher = await connectPublisher({ url: options.url, db: options.db });
	try {
		return selectRestoredHero(snapshotDb(publisher), options);
	} finally {
		publisher.disconnect();
	}
}

export async function bootstrapHeroSeat(
	options: HeroSeatLocation & { url: string; db: string; actionId: string },
): Promise<EntityRef> {
	const publisher = await connectPublisher({ url: options.url, db: options.db });
	let caller: SpellkaveSession | undefined;
	let bindingId: string | undefined;
	const apply = async (toml: string) => {
		const result = await enqueueAndWaitManifestApply({
			digestHandle: publisher.conn.db.manifestApplyDigest,
			outcomeHandle: publisher.conn.db.manifestApplyOutcome,
			enqueue: () => publisher.conn.reducers.rApplyManifestDelta({ toml }),
			label: "operator seat staging",
		});
		if (!result.ok) throw new Error(result.detail);
	};
	const openSeat = async () => {
		const definition = [...publisher.conn.db.entityDefinition.iter()].find(
			(row) => row.entityDefId === options.blueprintId,
		);
		const node = [...publisher.conn.db.visiblePlaceNode.iter()].find(
			(row) => row.nodeId === options.nodeId,
		);
		if (!definition || !node)
			throw new Error("The staged hero blueprint or station node is missing.");
		caller = await connect(
			{ url: options.url, db: options.db, token: null, connectedActorId: "stage-caller" },
			callbacks,
		);
		await caller.ready;
		const identity = caller.authenticatedIdentity?.toHexString();
		const token = caller.authenticatedToken;
		if (!identity || !token)
			throw new Error("Seat staging did not receive its temporary identity.");
		bindingId = `${definition.bundleId}/stage-seat/${randomUUID()}`;
		await apply(
			header +
				stringify({
					role_bindings: [
						{
							binding_id: bindingId,
							bundle_id: definition.bundleId,
							subject: identity,
							role_id: "dm",
							extent_kind_ref: "place_graph",
							extent_ref: node.placeGraphId,
							description:
								"Temporary operator staging presence; retracted before the player claim.",
						},
					],
				}),
		);
		caller.disconnect();
		caller = undefined;
		caller = await connect(
			{
				url: options.url,
				db: options.db,
				token,
				connectedActorId: "stage-caller",
				readerManifests: [
					...heroSeatReaderManifests,
					{
						requiredTables: [
							...presenceActRequiredTables,
							"visible_evaluation_provenance",
							"visible_role_binding",
							"visible_actor_identity",
						],
					},
				],
			},
			callbacks,
		);
		await caller.ready;
		const binding = [...caller.conn.db.visibleRoleBinding.iter()].find(
			(row) => row.bindingId === bindingId,
		);
		if (!binding?.presenceEntityId)
			throw new Error("Seat staging's temporary presence was not realised.");
		const liveCaller = caller;
		const seats = () => readHeroSeats(snapshotDb(liveCaller), options);
		const existing = seats().filter((seat) => seat.drafting);
		if (existing.length > 1 || existing.some((seat) => seat.claimed))
			throw new Error("Creation is already occupied; wait for its current player.");
		if (existing[0]) return asEntityRef(existing[0].targetRef);
		const receipt = await createActorClient(
			caller,
			asEntityRef(`entity:${binding.presenceEntityId}`),
			{ successOnProvenance: true },
		).manipulate(
			`place_node:${options.nodeId}`,
			options.actionId,
			"{}",
			() => false,
			() => null,
		);
		if (receipt.status !== "success")
			throw new Error(
				`The authored open-seat act was refused: ${receipt.reason ?? receipt.status}`,
			);
		// Re-subscribe after the receipt so the discovery proof uses committed rows.
		await caller.replaceReaderManifests([
			...heroSeatReaderManifests,
			{ requiredTables: ["visible_role_binding"] },
		]);
		const opened = seats().filter((seat) => seat.drafting && !seat.claimed);
		const openedSeat = opened[0];
		if (opened.length !== 1 || !openedSeat)
			throw new Error(
				"The open-seat receipt did not disclose exactly one unbound creation vessel.",
			);
		return asEntityRef(openedSeat.targetRef);
	};
	const result = await openSeat().then(
		(vessel) => ({ ok: true as const, vessel }),
		(error: unknown) => ({ ok: false as const, error }),
	);
	const cleanup = await (async () => {
		try {
			if (bindingId !== undefined)
				await apply(
					header +
						stringify({ retractions: [{ row_kind: "role_bindings", authored_key: bindingId }] }),
				);
		} finally {
			caller?.disconnect();
			publisher.disconnect();
		}
	})().then(
		() => ({ ok: true as const }),
		(error: unknown) => ({ ok: false as const, error }),
	);
	if (!cleanup.ok && !result.ok)
		throw new AggregateError(
			[result.error, cleanup.error],
			"Seat staging failed and its temporary binding could not be retracted.",
		);
	if (!cleanup.ok) throw cleanup.error;
	if (!result.ok) throw result.error;
	return result.vessel;
}
