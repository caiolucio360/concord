import type { User } from '../../auth/store/authStore'
import type { ProfileData } from '../../profile/lib/profileTypes'
import { normalizeLink } from '../../profile/lib/profileLinks'
import type { ProfileFields } from '../../profile/lib/profileValidation'

/**
 * O cartão como ficaria com o que está no modal: a conta salva com o rascunho por cima. Links vazios
 * somem e os outros passam pela mesma normalização do salvamento.
 */
export function previewProfile(user: User, draft: ProfileFields): ProfileData {
  return {
    ...user,
    display_name: draft.display_name.trim() || user.username,
    pronouns: draft.pronouns,
    bio: draft.bio,
    status_text: draft.status_text,
    banner_color: draft.banner_color,
    links: draft.links.map((l) => l.trim()).filter(Boolean).map((l) => ({ url: normalizeLink(l) })),
    name_style: draft.name_style,
    profile_theme: draft.profile_theme
  }
}
