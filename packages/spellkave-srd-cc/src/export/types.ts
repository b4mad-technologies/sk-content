/** Build-time compendium JSON (ledger/designs/compendium-shape.md export contract). */

export type CompendiumCorpus = "srd" | "elven_mini";

export interface CompendiumStat {
	key: string;
	label: string;
	value: string;
}

export interface CompendiumText {
	verbatim: string;
	format: "markdown" | "plain";
	attachment_namespace: string;
}

export interface CompendiumSource {
	label: string;
	cache_path: string;
	primary_key: string;
	fixture_path: string;
}

export interface CompendiumArt {
	path: string;
	hash: string;
	license: string;
	native_px: number | null;
}

export interface CompendiumRow {
	kind: string;
	key: string;
	fields: Record<string, unknown>;
}

export interface CompendiumAttachment {
	namespace: string;
	target_kind: string;
	target_ref: string;
	payload: Record<string, unknown>;
}

export interface CompendiumAuthorDoc {
	id: string;
	title: string;
}

export interface CompendiumAuthor {
	generator: string;
	patterns: string[];
	docs: CompendiumAuthorDoc[];
	source_excerpt: string;
}

export interface CompendiumLink {
	rel: string;
	id: string;
	name: string;
	kind: string;
	href: string;
}

export interface CompendiumEntry {
	id: string;
	corpus: CompendiumCorpus;
	kind: string;
	chapter: string;
	slug: string;
	name: string;
	description_short: string;
	text: CompendiumText | null;
	source: CompendiumSource;
	stats: CompendiumStat[];
	tags: string[];
	art: CompendiumArt | null;
	rows: CompendiumRow[];
	attachments: CompendiumAttachment[];
	author: CompendiumAuthor;
	links: CompendiumLink[];
}

export interface CompendiumIndexEntry {
	id: string;
	name: string;
	kind: string;
	chapter: string;
	slug: string;
	tags: string[];
	search_text: string;
	art_thumb: string | null;
	has_art: boolean;
}

export interface CompendiumChapterIndex {
	id: string;
	name: string;
	count: number;
	filters: string[];
	entries: CompendiumIndexEntry[];
}

export interface CompendiumRootIndex {
	generated_at: "deterministic";
	entry_count: number;
	corpus: CompendiumCorpus;
	chapters: { id: string; name: string; count: number }[];
}

export interface RenderedCompendiumExport {
	/** Paths relative to the export root (no leading slash). */
	files: Record<string, string>;
	entryCount: number;
	entryIds: string[];
}
