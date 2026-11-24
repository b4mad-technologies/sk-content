/**
 * Manifest apply adapter for build-time/test composition and the unstarted
 * quest-loot duty. Active DM seats use ActPort and receipt-ordered authored acts.
 * A supplied applyDelta implementation treats MF-APPLY-012 as success when
 * replaying identical fixture content; applyBeforeLatch relies on that contract.
 */

export interface ApplyResult {
	ok: boolean;
	/** Present on failure; the human-readable rejection detail (e.g. the
	 * server's MF-* diagnostics, JSON-stringified). */
	detail?: string;
}

/** The runtime apply port: dispatch one rendered manifest-delta TOML string
 * and report whether the server accepted it. */
export interface ApplyPort {
	applyDelta(toml: string): Promise<ApplyResult>;
}

/** The `AuthorToolContext.applyDelta`-shaped function every conforming host
 * wires (`@spellkave/tool-authoring`'s own field, matched STRUCTURALLY
 * here — no direct dependency on that type, so a caller can hand this a
 * bare function without importing shared tool runtime for the type alone). */
export type ApplyDeltaFn = (toml: string) => Promise<ApplyResult>;

/** Wire an `ApplyPort` from an already-bound `applyDelta` function (a live
 * `AuthorToolContext.applyDelta`, or any function matching its shape). */
export function applyPortFromExecute(execute: ApplyDeltaFn): ApplyPort {
	return { applyDelta: execute };
}
