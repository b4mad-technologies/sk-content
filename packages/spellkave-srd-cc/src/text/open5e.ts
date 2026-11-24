// DOC-IMPL: srd-text#open5e
// Read a cached open5e JSON row by pk. Only `cache/open5e` (CC-BY-4.0).
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "../open5e/paths";
import { markdownHeadingBlock } from "./markdown";
import { normalizeWhitespace } from "./normalize";
import type { ExtractedSrdText } from "./types";

interface Open5eRow {
	pk: string;
	fields: Record<string, unknown>;
}

function isOpen5eRow(value: unknown): value is Open5eRow {
	if (value === null || typeof value !== "object") return false;
	const row = value as { pk?: unknown; fields?: unknown };
	return typeof row.pk === "string" && row.fields !== null && typeof row.fields === "object";
}

const cache = new Map<string, Open5eRow[]>();

export function open5eRows(file: string): Open5eRow[] {
	const cached = cache.get(file);
	if (cached !== undefined) return cached;
	const filePath = path.join(CACHE_OPEN5E_DIR, file);
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
	if (!Array.isArray(raw) || !raw.every(isOpen5eRow)) {
		throw new Error(`srd-text: ${file} is not an open5e fixture array.`);
	}
	cache.set(file, raw);
	return raw;
}

export function open5eRow(file: string, pk: string): Open5eRow {
	const row = open5eRows(file).find((candidate) => candidate.pk === pk);
	if (row === undefined) {
		throw new Error(`srd-text: ${file} has no pk '${pk}'.`);
	}
	return row;
}

/** Verbatim string field (usually `desc`) plus the cache/ pk pointer. */
export function open5eStringField(file: string, pk: string, field = "desc"): ExtractedSrdText {
	const row = open5eRow(file, pk);
	const value = row.fields[field];
	if (typeof value !== "string") {
		throw new Error(`srd-text: ${file} pk='${pk}' field '${field}' is not a string.`);
	}
	return {
		text: normalizeWhitespace(value),
		source: `cache/open5e/${file} pk=${pk}`,
	};
}

export function open5eSourcePointer(file: string, pk: string): string {
	return `cache/open5e/${file} pk=${pk}`;
}

/** Prefer a non-empty open5e string field; otherwise the markdown heading block. */
export function open5eStringFieldOrMarkdown(
	file: string,
	pk: string,
	markdownFile: string,
	heading: string,
	field = "desc",
): ExtractedSrdText {
	const row = open5eRow(file, pk);
	const value = row.fields[field];
	if (typeof value === "string" && value.trim().length > 0) {
		return {
			text: normalizeWhitespace(value),
			source: open5eSourcePointer(file, pk),
		};
	}
	return markdownHeadingBlock(markdownFile, heading);
}
