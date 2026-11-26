// pattern: role-driven-brain
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { DEFINE_ACTION_VERB_TOOL } from "@spellkave/tool-authoring";
import { adventureCast } from "./cast.ts";
import { CALL_INITIATIVE_ACTION_LOCAL_ID, CRYPT_FIGHT_SESSION_DEF_ID } from "./lib/entity-keys.ts";
import { BUNDLE } from "./lib/ids.ts";

export { CALL_INITIATIVE_ACTION_ID, CALL_INITIATIVE_ACTION_LOCAL_ID } from "./lib/entity-keys.ts";

/** Prepared encounter places afford session setup. The host retains its
 * healthy-cast/faction selection policy; the world validates the submitted bodies. */
export function initiativeSetup(placements: readonly VerbCall[]): VerbCall[] {
	const hostile = new Set(authoredHostileActorKeys());
	const places = new Set<string>();
	for (const call of placements) {
		if (call.toolName !== "spellkave_place_actor") continue;
		const p = call.params;
		const keys =
			typeof p.entity_key === "string"
				? [p.entity_key]
				: typeof p.key_prefix === "string"
					? Array.from(
							{ length: Number(p.count ?? 1) },
							(_, n) => `${BUNDLE}/${p.key_prefix}_${n + 1}`,
						)
					: [];
		if (keys.some((key) => hostile.has(key)) && typeof p.at === "string") places.add(p.at);
	}
	return [
		{
			toolName: DEFINE_ACTION_VERB_TOOL,
			label: "define-call-initiative",
			params: {
				bundle: BUNDLE,
				id: CALL_INITIATIVE_ACTION_LOCAL_ID,
				required_capability: "frontier.open_session",
				niche_id: "core/mark_surface",
				display_name: "Call initiative",
				description:
					"Open the authored encounter session for the selected bodies at this prepared place.",
				cost_time_ms: 0,
				consequence: {
					frame_writes: [{ OpenSession: { session_def_id: CRYPT_FIGHT_SESSION_DEF_ID } }],
				},
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "initiative-prepared-places",
			params: {
				bundle: BUNDLE,
				kind: "spatial_niche_attachments",
				rows: [...places].sort().map((place_node_id) => ({
					bundle_id: BUNDLE,
					niche_id: "core/mark_surface",
					place_node_id,
					condition_bool: true,
				})),
			},
		},
	];
}

/** The authored opposition, shared by place preparation and runtime policy. */
export function authoredHostileActorKeys(): string[] {
	return adventureCast()
		.filter(
			({ profile }) =>
				profile === "kavemouth/role-driven" || profile === "kavemouth/crypt-warden",
		)
		.map(({ actor_key }) => String(actor_key));
}
