// sk-fv0.3 / BL-21 C: per-entity loops default to a representative subset.
// The js-packages.yml `nightly` job sets SRD_FULL_SWEEP=1 (PR CI runs the sample; sk-jpbe). Do not use this on identity *count*
// assertions — those must still see the full list.
export function sweep<T>(items: readonly T[], sample = 3): T[] {
	if (process.env.SRD_FULL_SWEEP === "1" || items.length <= sample) {
		return [...items];
	}
	if (sample <= 1) return [items[0] as T];
	const last = items[items.length - 1] as T;
	const mid = items[Math.floor(items.length / 2)] as T;
	return [items[0] as T, mid, last];
}
