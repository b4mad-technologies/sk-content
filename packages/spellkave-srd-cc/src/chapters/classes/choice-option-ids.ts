/**
 * // pattern: advancement-choice
 *
 * Unique menu-member entity ids for `srd.advancement_choice` attachments.
 *
 * Live `metadata_attachment` rows upsert on
 * `(target_kind, target_ref, namespace)`. Shared real entities (feats, weapons,
 * ASI) therefore cannot be the attachment `target_ref` when two menus name the
 * same member — later seed rows silently overwrite earlier ones. Offline
 * `createLocalAuthorTarget` still returns every TOML row, which hid the
 * collapse until Aldwin's live catalog was empty for Fighter L1.
 *
 * Each choice member is therefore a menu-only entity_definition
 * (`srd/advancement-choice-option/<class>/<level>/<member-tail>`), same idiom
 * as `srd/expertise-option/*` / `srd/skill-option/*`. Payload still carries
 * the real class/level/group; confirm filters members to capability ids only.
 */
import { BUNDLE_ID } from "./classes-units";

const OPTION_PREFIX = `${BUNDLE_ID}/advancement-choice-option`;

/** Strip leading `srd/` (or other bundle) so the option id stays short. */
function memberTail(memberEntityId: string): string {
	const slash = memberEntityId.indexOf("/");
	if (slash <= 0) return memberEntityId;
	return memberEntityId.slice(slash + 1);
}

/** Stable unique entity_definition id for one choice menu member. */
export function advancementChoiceOptionEntityId(
	classSlug: string,
	level: number,
	memberEntityId: string,
): string {
	return `${OPTION_PREFIX}/${classSlug}/${level}/${memberTail(memberEntityId)}`;
}

/** Local id for `spellkave_define_entity_type` (`bundle` is applied separately). */
export function advancementChoiceOptionLocalId(
	classSlug: string,
	level: number,
	memberEntityId: string,
): string {
	return advancementChoiceOptionEntityId(classSlug, level, memberEntityId).slice(
		BUNDLE_ID.length + 1,
	);
}

export function isAdvancementChoiceOptionId(entityId: string): boolean {
	return entityId.startsWith(`${OPTION_PREFIX}/`);
}
