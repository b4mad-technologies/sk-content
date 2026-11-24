// DOC-IMPL: srd-text#whitespace
// Whitespace-only normalisation for verbatim SRD 5.2.1 text. Wording is
// otherwise kept as cached.

/** Collapse source line endings and trailing line space; keep words intact. */
export function normalizeWhitespace(text: string): string {
	return text
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.split("\n")
		.map((line) => line.replace(/[ \t]+$/g, ""))
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/**
 * The SRD's own first sentence (or first paragraph when there is no
 * terminator). Surrounding emphasis markers wrapping the whole line are
 * stripped so a stat-block type line stays readable as a short description.
 */
export function firstSentence(text: string): string {
	const normalized = normalizeWhitespace(text);
	const withoutHeading = normalized.replace(/^#+\s+[^\n]+\n+/, "");
	const firstLine = withoutHeading.split("\n").find((line) => line.trim().length > 0) ?? "";
	const unwrapped = unwrapEmphasis(firstLine.trim());
	const body = withoutHeading.replace(/^[^\n]+\n*/, "");
	const fromBody = `${unwrapped}\n${body}`;
	const match = fromBody.match(/^(.+?[.!?])(?:\s|$)/s);
	const raw = match?.[1] ?? unwrapped;
	return unwrapEmphasis(raw.replace(/\s+/g, " ").trim());
}

function unwrapEmphasis(value: string): string {
	const italic = /^_(.+)_$/.exec(value);
	if (italic?.[1] !== undefined) return italic[1];
	const bold = /^\*\*(.+)\*\*$/.exec(value);
	if (bold?.[1] !== undefined) return bold[1];
	return value;
}
