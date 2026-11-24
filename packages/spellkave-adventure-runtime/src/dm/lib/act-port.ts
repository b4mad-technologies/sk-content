/** Runtime DM writes are authored acts performed by a bound presence (ADR-0155 D-9). */
export interface ActStep {
	targetId: string;
	actionId: string;
	args: Record<string, unknown>;
}
export interface ActResult {
	ok: boolean;
	detail?: string;
}
export interface ActPort {
	act(step: ActStep): Promise<ActResult>;
}

/** Await each receipt; a refusal leaves subsequent acts and the caller's latch untouched. */
export async function performActPlan(port: ActPort, steps: readonly ActStep[]): Promise<ActResult> {
	for (const step of steps) {
		const result = await port.act(step);
		if (!result.ok) return result;
	}
	return { ok: true };
}
