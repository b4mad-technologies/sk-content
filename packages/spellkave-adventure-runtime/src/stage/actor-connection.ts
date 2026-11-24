// Operator staging connection: open one SDK session for one actor, retain the
// token, claim the body. Re-homed from the retired `@spellkave/npc` package
// (sk-jay0.1.55.60.8) because `claimHeroSeat` (play-stage, sk dev saves) still
// needs it; the NPC seat runtime around it is gone.
import {
	type ActorClient,
	connect,
	createActorClient,
	type ReaderManifest,
	type RequiredTables,
	type SnapshotDb,
	type SpellkaveSession,
	snapshotDb,
} from "@spellkave/sdk";
import {
	readActorSnapshotRequiredTables,
	readEntityTagsRequiredTables,
} from "@spellkave/sdk/readers";
import { claimBody } from "./actor-claim.ts";

const movementRequiredTables: RequiredTables<
	[
		"visible_actor_spatial_location",
		"visible_manifest_authored_entity",
		"visible_manifest_authored_entity_coverage",
		"visible_place_edge",
		"visible_place_node",
	]
> = [
	// ActorClient.adjacentMoves() reads snapshotFromDb(): actor locations,
	// manifest aliases, and the place graph.
	"visible_actor_spatial_location",
	"visible_manifest_authored_entity",
	"visible_manifest_authored_entity_coverage",
	"visible_place_edge",
	"visible_place_node",
];

const claimRequiredTables: RequiredTables<
	[
		"actor",
		"visible_actor_identity",
		"visible_manifest_authored_entity",
		"visible_manifest_authored_entity_coverage",
	]
> = [
	// claimBody(): readActorPrincipals(), readActorIdentityBindings(), and
	// resolveEntityId() for npc_ceiling/body-* manifest keys.
	// `actor_identity` is private (#915 PR-5); readActorIdentityBindings()
	// reads its self-only `visible_actor_identity` view — sufficient here
	// since claimBody() only ever checks the claiming identity's OWN binding.
	"actor",
	"visible_actor_identity",
	"visible_manifest_authored_entity",
	"visible_manifest_authored_entity_coverage",
];

const reducerObservationRequiredTables: RequiredTables<["visible_evaluation_provenance"]> = [
	// createActorClient().move() classifies reducer outcomes from the SDK
	// provenance buffer in addition to polling actor_spatial_location.
	"visible_evaluation_provenance",
];

const driverObservationRequiredTables: RequiredTables<["visible_actor_driver_control"]> = [
	// Every Service decision captures this before perception, including the
	// DM floor and passive watch profile. Control history is not required.
	"visible_actor_driver_control",
];

export const floorTierReaderManifests: readonly ReaderManifest[] = [
	{ requiredTables: readActorSnapshotRequiredTables },
	{ requiredTables: movementRequiredTables },
	{ requiredTables: claimRequiredTables },
	{ requiredTables: reducerObservationRequiredTables },
	{ requiredTables: driverObservationRequiredTables },
	// #C4: readEntityFaction() (used to derive combat hostility from live
	// faction tags instead of a same-faction-blind wildcard) reads entity_tag;
	// without this the table is never subscribed and the reader sees nothing.
	{ requiredTables: readEntityTagsRequiredTables },
];

/** Ceiling on how long the staged actor's own act waits for its observation, in ms. */
export const STAGED_OBSERVATION_TIMEOUT_MS = 8_000;

export interface StagedActorOptions {
	/** Retained token for this actor. Omit only for the first connection. */
	readonly credential?: string;
	/** Persist a newly minted token before the actor claim is attempted. */
	readonly retainCredential?: (credential: string) => Promise<void>;
	readonly readerManifests?: readonly ReaderManifest[];
	readonly claimTimeoutMs?: number;
	readonly claimPollMs?: number;
	readonly observationTimeoutMs?: number;
}

export interface StagedActorSession {
	readonly actorEntityKey: string;
	readonly credential: string;
	readonly session: SpellkaveSession;
	readonly actorClient: ActorClient;
	readonly snapshot: () => SnapshotDb;
	disconnect(): void;
}

/**
 * Open one SDK-owned SpacetimeDB session for one actor. A fresh connection
 * mints one identity, persists its token, and only then claims the actor.
 * Reconnects must supply that actor's retained token. Caller manifests WIDEN
 * the floor tier, never replace it (a replaced set starves the claim tables).
 */
export async function connectStagedActor(
	url: string,
	db: string,
	actorEntityKey: string,
	options: StagedActorOptions = {},
): Promise<StagedActorSession> {
	let session: SpellkaveSession | undefined;
	let disconnected = false;
	const disconnect = (): void => {
		if (disconnected) return;
		disconnected = true;
		session?.disconnect();
	};
	try {
		session = await connect(
			{
				url,
				db,
				token: options.credential,
				connectedActorId: actorEntityKey,
				readerManifests:
					options.readerManifests === undefined
						? floorTierReaderManifests
						: [...floorTierReaderManifests, ...options.readerManifests],
			},
			{ onUpdate: () => {}, onError: () => {}, onDisconnect: () => {} },
		);
		await session.ready;
		const credential = session.authenticatedToken;
		if (credential === undefined || credential === "") {
			throw new Error(`SDK connection did not return a credential for '${actorEntityKey}'`);
		}
		if (options.credential === undefined || options.credential !== credential) {
			if (options.retainCredential === undefined) {
				throw new Error(`fresh actor '${actorEntityKey}' requires retained credential storage`);
			}
			await options.retainCredential(credential);
		}
		const snapshot = (): SnapshotDb => snapshotDb(session as SpellkaveSession);
		await claimBody(session, snapshot, actorEntityKey, options.claimTimeoutMs, options.claimPollMs);
		const actorClient = createActorClient(session, actorEntityKey, {
			observationTimeoutMs: options.observationTimeoutMs ?? STAGED_OBSERVATION_TIMEOUT_MS,
			successOnProvenance: true,
		});
		return { actorEntityKey, credential, session, actorClient, snapshot, disconnect };
	} catch (error) {
		disconnect();
		throw error;
	}
}
