// Seções da tela de Configurações no celular: lista de seções que abre uma seção por vez, como no Discord
// mobile e na versão web em tela pequena. Porte do settingsNav do desktop, só com o que o app já tem
// (atalhos, vídeo/fundo de câmera e "Aplicativo" são do desktop e não entram).

export type SettingsSectionId = 'account' | 'profiles'

export interface SettingsSection {
  id: SettingsSectionId
  label: string
  group: 'user' | 'app'
}

export const SETTINGS_GROUPS: { id: SettingsSection['group']; label: string }[] = [
  { id: 'user', label: 'Configurações de usuário' },
  { id: 'app', label: 'Configurações do aplicativo' }
]

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'account', label: 'Minha conta', group: 'user' },
  { id: 'profiles', label: 'Perfis', group: 'user' }
]

export function findSection(id: string | undefined): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((s) => s.id === id)
}

/** Seções de cada grupo, na ordem; grupo sem seção não aparece. */
export function groupedSections(): { id: string; label: string; sections: SettingsSection[] }[] {
  return SETTINGS_GROUPS.map((g) => ({ ...g, sections: SETTINGS_SECTIONS.filter((s) => s.group === g.id) })).filter((g) => g.sections.length > 0)
}
