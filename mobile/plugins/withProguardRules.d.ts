import type { ConfigPlugin } from 'expo/config-plugins'

export const PROGUARD_RULES: string[]
export function addProguardRules(current: string): string
export const withProguardRules: ConfigPlugin
