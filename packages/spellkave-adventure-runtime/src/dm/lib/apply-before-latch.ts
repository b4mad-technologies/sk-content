/** Generic two-callback sequencing retained for fixture-authoring consumers.
 * The first callback must reject on refusal; this helper cannot interpret its
 * generic result. Scripted runtime flows use performActPlan's accepted-receipt
 * handling and the authored class tag before their ordinary level-up latch.
 */

export interface ApplyBeforeLatchSteps<TApply, TLatch> {
	/** The caller's idempotent first operation; reject if it refuses. */
	applyIdempotent: () => Promise<TApply>;
	/** The world-visible latch write (e.g. an `r_manipulate` dispatch whose
	 * consequence sets an exactly-once marker). Runs ONLY after
	 * `applyIdempotent` resolves — never before, never concurrently. */
	fireLatch: () => Promise<TLatch>;
}

export interface ApplyBeforeLatchResult<TApply, TLatch> {
	apply: TApply;
	latch: TLatch;
}

/** Await the first callback before invoking the second; recovery policy belongs to the caller. */
export async function applyBeforeLatch<TApply, TLatch>(
	steps: ApplyBeforeLatchSteps<TApply, TLatch>,
): Promise<ApplyBeforeLatchResult<TApply, TLatch>> {
	const apply = await steps.applyIdempotent();
	const latch = await steps.fireLatch();
	return { apply, latch };
}
