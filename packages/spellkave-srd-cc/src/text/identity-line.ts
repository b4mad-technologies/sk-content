/** Short player/operator identity for a generated row. Dice, Source/pk, and
 * compiler notes belong on structured rows or `srd.text`, not here. */
export function identityLine(name: string, kind: string): string {
	const trimmedName = name.trim();
	const trimmedKind = kind.trim();
	if (trimmedName.length === 0) throw new Error("identityLine: empty name");
	if (trimmedKind.length === 0) throw new Error("identityLine: empty kind");
	return `${trimmedName} — a ${trimmedKind}.`;
}
