import type { ConfigPlugin } from 'expo/config-plugins'

type Attrs = { $: Record<string, string> }
type Manifest = {
  manifest: {
    $: Record<string, string>
    'uses-permission'?: Attrs[]
    application?: (Attrs & { service?: Attrs[] })[]
  }
}

export const CALL_SERVICE: string
export function applyCallForegroundService<T extends Manifest>(config: T): T
export const withCallForegroundService: ConfigPlugin
