/** Source-backed physical equipment vocabulary, with no instance writes. */
import type { AuthorTarget } from "@spellkave/tool-authoring";
export function equipmentDefinitions(target: AuthorTarget) {
	const itemIds = new Set(
		target
			.lookup("entity_definition_tag", { bundle: "srd" })
			.filter(
				(row) =>
					typeof row.tag === "string" &&
					(row.tag === "srd.item" || row.tag.startsWith("srd.item.")),
			)
			.map((row) => row.entity_def_id),
	);
	const definitions = target.lookup("entity_definitions", { bundle: "srd" }).flatMap((row) =>
		typeof row.entity_def_id === "string" &&
		typeof row.display_name === "string" &&
		itemIds.has(row.entity_def_id)
			? [
					{
						entity_def_id: row.entity_def_id,
						display_name: row.display_name,
						slot_compatibility_predicate: row.slot_compatibility_predicate,
						stackable: row.stackable,
					},
				]
			: [],
	);
	const aliases = target.lookup("metadata_attachments", { bundle: "srd" }).flatMap((row) => {
		if (row.namespace !== "srd.equipment_alias" || row.target_kind !== "entity_definition")
			return [];
		const definition = definitions.find((item) => item.entity_def_id === row.target_ref);
		if (definition === undefined)
			throw new Error(`starting-equipment: alias target is not an item: ${row.target_ref}.`);
		const payload: unknown =
			typeof row.payload_json === "string" ? JSON.parse(row.payload_json) : null;
		if (
			typeof payload !== "object" ||
			payload === null ||
			!("names" in payload) ||
			!Array.isArray(payload.names) ||
			!payload.names.every((name) => typeof name === "string" && name.trim().length > 0)
		) {
			throw new Error(`starting-equipment: invalid aliases for ${row.target_ref}.`);
		}
		return payload.names.map((display_name: string) => ({ ...definition, display_name }));
	});
	return [...definitions, ...aliases];
}
