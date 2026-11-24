// pattern: proactive-level-up
import { CLASS_TAG_PREFIX } from "../../srd-ids";

export const CLASS_TAG_PREFIX_DOT = `${CLASS_TAG_PREFIX}.`;

/** Pure helper — first `srd.class.<slug>` tag wins. Exported for offline tests. */
export function classSlugFromIdentityTags(tags: readonly string[]): string | null {
	for (const tag of tags) {
		if (tag.startsWith(CLASS_TAG_PREFIX_DOT)) {
			const slug = tag.slice(CLASS_TAG_PREFIX_DOT.length);
			if (slug.length > 0 && !slug.includes(".")) return slug;
		}
	}
	return null;
}
