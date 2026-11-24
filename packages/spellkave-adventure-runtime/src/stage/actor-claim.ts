// Claim an offered PLAYER body through the public SDK session.
// Fresh sessions and retained-credential reconnects share this path.
// An unoffered NPC must already have a durable Service binding before
// seat/supervisor.ts setup; production host integration is tracked by .144.
// This helper may idempotently reuse that binding, but cannot claim an
// unbound, unoffered NPC.
// The player identity and test-lab helpers use the same observed-binding
// protocol, without introducing a package dependency on their wrappers.

import {
	asEntityRef,
	type EntityRef,
	readActorIdentityBindings,
	readActorPrincipals,
	resolveEntityId,
	type SnapshotDb,
	type SpellkaveSession,
} from "@spellkave/sdk";

/** Thrown when `r_claim_actor` sent successfully but the binding never landed
 * within the timeout — i.e. the server had the request and either rejected it
 * or the transaction never observably completed. Also thrown when the body is already bound
 * to a DIFFERENT identity (a re-run against a not-freshly-wiped node) —
 * that is a genuine, informative server-side "seat taken" outcome, not a
 * silent success. */
export class ClaimNotConfirmedError extends Error {}

function normalizeIdentity(identity: string): string {
	return identity.trim().replace(/^0x/i, "").toLowerCase();
}

function identityMatches(current: unknown, bound: string): boolean {
	if (current === undefined || current === null) return false;
	return normalizeIdentity(String(current)) === normalizeIdentity(bound);
}

interface ActorPrincipal {
	readonly actorId: string;
	readonly bodyEntityId: string;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function findPrincipal(db: SnapshotDb, actorEntityKey: EntityRef): ActorPrincipal | null {
	const bodyEntityId = resolveEntityId(db, actorEntityKey);
	if (bodyEntityId === undefined) return null;
	const bodyEntityIdText = String(bodyEntityId);
	const principal = readActorPrincipals(db).find((row) => row.current_body === bodyEntityIdText);
	if (principal === undefined) return null;
	return { actorId: principal.actor_id, bodyEntityId: bodyEntityIdText };
}

async function waitForPrincipal(
	db: () => SnapshotDb,
	actorEntityKey: EntityRef,
	timeoutMs: number,
	pollMs: number,
): Promise<ActorPrincipal | null> {
	const deadline = performance.now() + timeoutMs;
	while (performance.now() <= deadline) {
		const found = findPrincipal(db(), actorEntityKey);
		if (found !== null) return found;
		await sleep(pollMs);
	}
	return findPrincipal(db(), actorEntityKey);
}

async function waitForBinding(
	db: () => SnapshotDb,
	actorId: string,
	timeoutMs: number,
	pollMs: number,
): Promise<boolean> {
	const has = () => readActorIdentityBindings(db()).some((row) => row.actor_id === actorId);
	const deadline = performance.now() + timeoutMs;
	while (performance.now() <= deadline) {
		if (has()) return true;
		await sleep(pollMs);
	}
	return has();
}

/**
 * Claim the unbound body named `actorEntityKey` for `session`'s identity.
 * No-op (resolves clean) if some earlier run already bound it to THIS SAME
 * identity — a re-run of the smoke harness against a not-freshly-wiped node
 * should not treat "already mine" as a cliff. Throws `ClaimNotConfirmedError`
 * if the body is already bound to a DIFFERENT identity (seat taken — a real
 * server-side outcome, not silently treated as success) or if
 * `r_claim_actor` sent but no binding was observed within the timeout.
 * Throws the raw reducer-call error for a client-side send failure.
 */
export async function claimBody(
	session: SpellkaveSession,
	db: () => SnapshotDb,
	actorEntityKey: string,
	timeoutMs = 4_000,
	pollMs = 25,
	options?: {
		/** Send the idempotent reducer request even when the cache already shows
		 * this same identity. The server's find_existing_claim_binding /
		 * next_claim_scope policy owns connection scope: durable None stays
		 * durable, existing Some is not retagged to a newer connection, and
		 * Service provenance remains Service. This option cannot acquire an
		 * unbound unoffered NPC or revise that policy. */
		refreshBinding?: boolean;
	},
): Promise<void> {
	const key = asEntityRef(actorEntityKey);
	const principal = await waitForPrincipal(db, key, timeoutMs, pollMs);
	if (principal === null) {
		throw new Error(`body '${actorEntityKey}' not visible in live actor snapshot`);
	}
	const existing = readActorIdentityBindings(db()).find(
		(row) => row.actor_id === principal.actorId,
	);
	if (existing !== undefined) {
		if (identityMatches(session.authenticatedIdentity?.toHexString(), existing.identity)) {
			if (options?.refreshBinding === true) {
				try {
					await session.conn.reducers.rClaimActor({
						actorId: BigInt(principal.actorId),
						role: "primary",
					});
				} catch {
					// A PERSISTENT binding (`connection_id: None`, the ADR-0097
					// trusted-authorship path) rejects a runtime re-claim — and
					// needs no refresh either: it survives every disconnect by
					// definition. The same-identity check above already
					// established this seat holds the actor; the refresh is
					// best-effort connection-id hygiene, never a gate.
				}
			}
			return;
		}
		throw new ClaimNotConfirmedError(
			`body '${actorEntityKey}' is already claimed by a different identity (0x${existing.identity}) — likely a re-run against a node that was not freshly wiped/re-seeded`,
		);
	}

	// A synchronous/rejected throw here is the reducer call never reaching (or
	// being accepted by) the server — a client-side failure.
	await session.conn.reducers.rClaimActor({ actorId: BigInt(principal.actorId), role: "primary" });

	const bound = await waitForBinding(db, principal.actorId, timeoutMs, pollMs);
	if (!bound) {
		throw new ClaimNotConfirmedError(
			`r_claim_actor for '${actorEntityKey}' sent but no binding observed within ${timeoutMs}ms`,
		);
	}
}
