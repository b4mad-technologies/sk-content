import { inspectManifest } from "@spellkave/world-author";
import { CRYPT_FIGHT_SESSION_DEF_ID } from "./crypt-fight.ts";
import { BUNDLE } from "./lib/ids.ts";
import { INNKEEPER_ENTITY_KEY } from "./occupancy.ts";
import { CULT_RELIC_KEY, MOONPETAL_KEY, QUESTS, TOMB_KEY_ITEM_KEY } from "./quests.ts";

type Row = Record<string, unknown>;
export interface KavemouthAdventureDescriptor {
	name: string;
	description: string;
}

const text = (row: Row, field: string): string =>
	typeof row[field] === "string" ? row[field] : "";
const slugFromRef = (ref: string): string => ref.slice(ref.lastIndexOf("/") + 1);
const escapeHtml = (value: string): string =>
	value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function questBody(quest: (typeof QUESTS)[number]): string {
	const technicalDetails = {
		rung: quest.rung,
		giver_key: quest.giverKey,
		giver_name: quest.giverName,
		accept_slot: quest.acceptSlot,
		decline_slot: quest.declineSlot,
		accept_text: quest.slotAcceptText,
		decline_text: quest.slotDeclineText,
		terminal: quest.terminal,
		reward_xp: quest.rewardXp,
		...(quest.bonusXp === undefined ? {} : { bonus_xp: quest.bonusXp }),
		...(quest.bonusFlag === undefined ? {} : { bonus_flag: quest.bonusFlag }),
		kill_xp_creatures: quest.killXpCreatures,
	};
	return [
		quest.objective,
		`- Rung: ${quest.rung}`,
		`- Giver: ${quest.giverName} (${quest.giverKey})`,
		`- Reward XP: ${quest.rewardXp}`,
		`<details><summary>Technical details</summary><pre><code class="language-json">${escapeHtml(JSON.stringify(technicalDetails, null, 2))}</code></pre></details>`,
	].join("\n\n");
}

export function catalogueSourcePaths(
	fragments: Readonly<Record<string, string>>,
): ReadonlyMap<string, string> {
	const out = new Map<string, string>();
	for (const [path, toml] of Object.entries(fragments)) {
		const parsed = inspectManifest(
			`#:schema https://spellkave.dev/schema/world-manifest-1.0.0.json
schema_version = "1.0.0"
${toml}`,
		).manifest as Record<string, unknown>;
		for (const [table, kind, idField] of [
			["entities", "entity", "entity_key"],
			["entity_definitions", "entity_definition", "entity_def_id"],
			["place_graphs", "place_graph", "place_graph_id"],
			["session_definitions", "session_definition", "session_def_id"],
		] as const) {
			for (const row of Array.isArray(parsed[table]) ? (parsed[table] as Row[]) : []) {
				const ref = text(row, idField);
				if (!ref) continue;
				const key = `${kind}:${ref}`;
				if (out.has(key))
					throw new Error(
						`kavemouth docs: catalogue identity '${key}' occurs in multiple generated fragments.`,
					);
				out.set(key, path);
			}
		}
	}
	return out;
}

function catalogueRow(
	kind: string,
	ref: string,
	family: string,
	row: Row,
	sourcePaths: ReadonlyMap<string, string>,
) {
	const title = text(row, "display_name") || text(row, "name");
	const description = text(row, "description");
	const facts: Array<{ label: string; value: string }> = [];
	if (kind === "entity" && text(row, "kind"))
		facts.push({ label: "Kind", value: text(row, "kind") });
	if (kind === "entity" && text(row, "entity_def_id"))
		facts.push({ label: "Definition", value: text(row, "entity_def_id") });
	if (kind === "place_graph" && text(row, "topology"))
		facts.push({ label: "Topology", value: text(row, "topology") });
	const tags = new Set<string>();
	if ([CULT_RELIC_KEY, MOONPETAL_KEY, TOMB_KEY_ITEM_KEY].includes(ref)) tags.add("quest-item");
	const sourcePath = sourcePaths.get(`${kind}:${ref}`);
	if (!sourcePath)
		throw new Error(
			`kavemouth docs: catalogue identity '${kind}:${ref}' has no generated fragment provenance.`,
		);
	return {
		kind,
		ref,
		family,
		slug: slugFromRef(ref),
		source: {
			path: `fixtures/${sourcePath}`,
			anchor: ref,
			license: "CC-BY-4.0",
		},
		...(title ? { title } : {}),
		...(description ? { description } : {}),
		...(facts.length ? { facts } : {}),
		...(tags.size ? { tags: [...tags] } : {}),
	};
}

/** Build navigation metadata from the exact rows authored for the adventure. */
export function buildKavemouthRootMetadata(
	rows: Record<string, Row[]>,
	descriptor: KavemouthAdventureDescriptor,
	sourcePaths: ReadonlyMap<string, string>,
) {
	// Every `kavemouth.art.image` attachment this adventure authors for a subject
	// it does not itself own (i.e. an SRD entity_definition it never defines).
	// Derived from the authored rows, not a hand-written id list, so a new art
	// attachment picks up its embed here automatically.
	const artNamespace = `${BUNDLE}.art.image`;
	const srdArtTargets = [
		...new Set(
			(rows.metadata_attachments ?? [])
				.filter((row) => text(row, "namespace") === artNamespace)
				.filter((row) => text(row, "target_kind") === "entity_definition")
				.map((row) => text(row, "target_ref"))
				.filter((ref) => ref && !ref.startsWith(`${BUNDLE}/`)),
		),
	].sort();
	const castInstances = (rows.entities ?? [])
		.filter((row) => ["npc", "player"].includes(text(row, "kind")))
		.map((row) => catalogueRow("entity", text(row, "entity_key"), "cast", row, sourcePaths));
	const itemInstances = (rows.entities ?? [])
		.filter((row) => text(row, "kind") === "item")
		.map((row) => catalogueRow("entity", text(row, "entity_key"), "item", row, sourcePaths));
	// The creation starter kit (`author/creation-kit.ts`) authors item
	// `entity_definitions` — field kit, torch, rations — that no adventure
	// `entities` row ever instantiates: they are handed out at character
	// creation, not placed in the world. An `entity_definitions` row carries
	// no `kind` column, so "is an item" is read off its own
	// `entity_definition_tag` rows instead: every item tag this bundle mints
	// (`srd.item.gear`/`.container`/`.food`/`.light`, `./hero.ts`) lives under
	// the `srd.item.` namespace, so a definition tagged there is an item by
	// construction — never a hand-picked id list (sk-jay0.3.5.76).
	const instantiatedDefIds = new Set(
		(rows.entities ?? []).map((row) => text(row, "entity_def_id")).filter(Boolean),
	);
	// A world-owned creation candidate is spawned from this blueprint rather
	// than installed as an authored instance. Its initial sheet and grants
	// belong beside the blueprint on the cast page.
	const creatureDefIds = new Set(
		(rows.entity_definition_tag ?? [])
			.filter((row) => text(row, "tag") === "srd.creature")
			.map((row) => text(row, "entity_def_id")),
	);
	const castDefinitions = (rows.entity_definitions ?? [])
		.filter(
			(row) =>
				text(row, "bundle_id") === BUNDLE &&
				creatureDefIds.has(text(row, "entity_def_id")) &&
				!instantiatedDefIds.has(text(row, "entity_def_id")),
		)
		.map((row) =>
			catalogueRow("entity_definition", text(row, "entity_def_id"), "cast", row, sourcePaths),
		);
	const cast = [...castInstances, ...castDefinitions];
	const itemDefIds = new Set(
		(rows.entity_definition_tag ?? [])
			.filter((row) => text(row, "tag").startsWith("srd.item."))
			.map((row) => text(row, "entity_def_id")),
	);
	const starterKitDefinitions = (rows.entity_definitions ?? [])
		.filter(
			(row) =>
				text(row, "bundle_id") === BUNDLE &&
				itemDefIds.has(text(row, "entity_def_id")) &&
				!instantiatedDefIds.has(text(row, "entity_def_id")),
		)
		.map((row) =>
			catalogueRow("entity_definition", text(row, "entity_def_id"), "item", row, sourcePaths),
		);
	const items = [...itemInstances, ...starterKitDefinitions];
	const places = (rows.place_graphs ?? []).map((row) =>
		catalogueRow("place_graph", text(row, "place_graph_id"), "place", row, sourcePaths),
	);
	const encounterPresentation = new Map([
		[
			CRYPT_FIGHT_SESSION_DEF_ID,
			{
				title: "Crypt fight",
				description: 'The crypt-hall Goblin ("Crypt Warden") turn-based grid fight.',
			},
		],
	]);
	const encounters = (rows.session_definitions ?? []).map((row) => {
		const ref = text(row, "session_def_id");
		const presentation = encounterPresentation.get(ref);
		const title = text(row, "display_name") || presentation?.title;
		const description = text(row, "description") || presentation?.description;
		if (!title || !description)
			throw new Error(`kavemouth docs: session '${ref}' needs explicit presentation metadata.`);
		return catalogueRow(
			"session_definition",
			ref,
			"encounter",
			{ ...row, display_name: title, description },
			sourcePaths,
		);
	});
	const byRef = (left: { ref: string }, right: { ref: string }) =>
		left.ref.localeCompare(right.ref);
	return {
		publisher_list_bundle: BUNDLE,
		docs: {
			version: 1,
			page_id: "kavemouth",
			title: "Kavemouth",
			nav_group: "adventure",
			intro: descriptor.description,
			source_base: "packages/spellkave-adventure-kavemouth/",
			attributions: [
				{
					body: "Kavemouth adventure material",
					source: {
						path: "adventures/kavemouth.toml",
						anchor: "name-kavemouth",
						license: "CC-BY-4.0",
					},
				},
				{
					body: "Kavemouth place maps: first-party Spellkave art over first-party floor plans, CC BY 4.0. The images were generated with PixelLab. PixelLab's terms restrict using its outputs to train other models; that restriction may apply to you.",
					source: { path: "author/backdrops.ts", anchor: "backdrops", license: "CC-BY-4.0" },
				},
			],
			sections: [
				{
					id: "adventure-subjects",
					title: "Adventure subjects",
					intro: "Installed subjects from the adventure and its SRD dependency.",
					pages: [
						{
							id: "installed-subjects",
							title: "Installed subjects",
							body: [
								"The adventure installs an innkeeper instance.",
								'::subject{kind="entity" ref="kavemouth/adventure/innkeeper_1" view="compact"}',
							].join("\n\n"),
							source: {
								path: "author/docs.ts",
								anchor: "buildKavemouthRootMetadata",
								license: "CC-BY-4.0",
							},
						},
						{
							id: "srd-subjects",
							title: "Creatures and gear from the SRD",
							body: [
								"These are SRD subjects — creatures and gear the adventure does not own — " +
									"shown here with the art this adventure gives them. Their own SRD page " +
									"carries none of it; it lives only on this page.",
								...srdArtTargets.map(
									(ref) => `::subject{kind="entity_definition" ref="${ref}" view="full"}`,
								),
							].join("\n\n"),
							source: {
								path: "author/docs.ts",
								anchor: "buildKavemouthRootMetadata",
								license: "CC-BY-4.0",
							},
						},
					],
				},
				{
					// The id is srd-cc's `mechanics_section`: its `[[kind_sections]]` rows
					// place every mechanics row kind under it. Without a section of this
					// id the adventure's own actions, capabilities and consequences match
					// no placement rule and reach no reader (sk-jay0.3.5.76).
					id: "mechanics",
					title: "Adventure rules",
					intro:
						"What this adventure itself can offer, resolve and change, beyond the SRD it builds on. " +
						"Placed by the same rules as the SRD's own, so an action here reads the way an action there does.",
				},
				{
					id: "cast",
					title: "Cast",
					intro:
						"Installed actors, the creation candidate blueprint, and the adventure descriptor.",
					catalogue: cast.sort(byRef),
					documents: [
						{
							id: "adventure",
							ref: `${BUNDLE}/adventure`,
							slug: "adventure",
							family: "adventure",
							title: descriptor.name,
							body: descriptor.description,
							source: {
								path: "adventures/kavemouth.toml",
								anchor: "name-kavemouth",
								license: "CC-BY-4.0",
							},
						},
					],
				},
				{
					id: "items",
					title: "Items",
					intro:
						"Item instances installed by the adventure, plus item blueprints it " +
						"defines but never places — the creation starter kit, handed to a " +
						"hero at character creation rather than found in the world.",
					catalogue: items.sort(byRef),
				},
				{
					id: "places",
					title: "Places",
					intro: "Authored place graphs and their joined map layers.",
					catalogue: places.sort(byRef),
				},
				{
					id: "encounters",
					title: "Encounters",
					intro: "Authored session definitions.",
					catalogue: encounters.sort(byRef),
				},
				{
					id: "quest-lines",
					title: "Quest lines",
					intro: "The complete authored quest catalogue.",
					documents: QUESTS.map((quest) => ({
						id: `quest-${quest.id.toLowerCase()}`,
						ref: `${BUNDLE}/quest/${quest.id}`,
						slug: quest.id,
						family: "quest",
						title: quest.name,
						body: questBody(quest),
						tags: [`quest.rung.${quest.rung}`],
						relations: [
							{ kind: "entity", ref: quest.giverKey },
							...quest.killXpCreatures.map(({ slug }) => ({
								kind: "entity_definition",
								ref: `srd/creature/${slug}`,
							})),
							...(quest.terminal.itemKey ? [{ kind: "entity", ref: quest.terminal.itemKey }] : []),
						],
						source: {
							path: "author/quests.ts",
							anchor: "QUESTS",
							license: "CC-BY-4.0",
						},
					})),
				},
			],
		},
	};
}

/** Keep the article's entity target coupled to the authored placement identity. */
export function assertKavemouthDocsTargets(): void {
	if (INNKEEPER_ENTITY_KEY !== `${BUNDLE}/adventure/innkeeper_1`)
		throw new Error(
			"kavemouth docs: Mira's public subject target drifted from its placement identity.",
		);
}
