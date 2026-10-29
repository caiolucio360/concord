import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontSize, MIN_TOUCH, radius, spacing } from '../../../shared/theme/tokens'
import { IconButton } from '../../../shared/ui/IconButton'
import { useAuthStore } from '../../auth/store/authStore'
import { removeQueueItem, skipMusic, type MusicItem, type MusicState } from '../api/music'
import { formatDuration, QUEUE_PREVIEW, T17, T20 } from '../lib/music'
import { useMusicStore } from '../store/musicStore'

/** Segundos desde o início da faixa (relógio local), atualizados a cada segundo. */
function useElapsedMs(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (startedAt === null) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [startedAt])
  return startedAt === null ? 0 : Math.max(0, now - startedAt)
}

function NowPlaying({ state, serverId, meId }: { state: MusicState; serverId: string; meId?: string }) {
  const serverOffsetMs = useMusicStore((s) => s.serverOffsetMs)
  const now = state.now!
  const elapsed = useElapsedMs(now.started_at - serverOffsetMs)
  const mine = now.item.requested_by.id === meId
  const voted = !!meId && state.skip.voters.includes(meId)
  const pct = Math.min(100, (elapsed / Math.max(1, now.item.duration_ms)) * 100)
  return (
    <View style={styles.now}>
      <Text accessibilityRole="header" style={styles.nowTitle} numberOfLines={2}>
        {now.item.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {now.item.artist} · @{now.item.requested_by.username}
      </Text>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <View style={styles.times}>
        <Text style={styles.time}>{formatDuration(elapsed)}</Text>
        <Text style={styles.time}>{formatDuration(now.item.duration_ms)}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !mine && voted }}
        disabled={!mine && voted}
        onPress={() => void skipMusic(serverId).catch(() => {})}
        style={[styles.button, !mine && voted && styles.buttonOff]}
      >
        <Text style={styles.buttonText}>{mine ? T17.skip : T17.vote(state.skip.votes, state.skip.needed)}</Text>
      </Pressable>
    </View>
  )
}

function QueueRow({ item, index, mine, onRemove }: { item: MusicItem; index: number; mine: boolean; onRemove: () => void }) {
  return (
    <View style={[styles.row, mine && styles.rowMine]}>
      <Text style={styles.index}>{index + 1}</Text>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {formatDuration(item.duration_ms)} · @{item.requested_by.username}
        </Text>
      </View>
      {mine ? <IconButton icon="close" label={`Remover ${item.title}`} onPress={onRemove} /> : null}
    </View>
  )
}

function Queue({ queue, serverId, meId }: { queue: MusicItem[]; serverId: string; meId?: string }) {
  const [showAll, setShowAll] = useState(false)
  if (queue.length === 0) return <Text style={styles.empty}>{T17.empty}</Text>
  const shown = showAll ? queue : queue.slice(0, QUEUE_PREVIEW)
  return (
    <View style={styles.queue}>
      {shown.map((it, i) => (
        <QueueRow key={it.id} item={it} index={i} mine={it.requested_by.id === meId} onRemove={() => void removeQueueItem(serverId, it.id).catch(() => {})} />
      ))}
      {queue.length > QUEUE_PREVIEW ? (
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAll }} onPress={() => setShowAll((v) => !v)} style={styles.button}>
          <Text style={styles.buttonText}>{showAll ? T20.seeLess : T20.seeMore(queue.length - QUEUE_PREVIEW)}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/** Painel "Tocando agora" do Maestro: folha de baixo com a faixa, o pular/votar e a fila. */
export function MusicPanel({ serverId }: { serverId: string }) {
  const state = useMusicStore((s) => s.state)
  const open = useMusicStore((s) => s.panelOpen)
  const close = useMusicStore((s) => s.closePanel)
  const meId = useAuthStore((s) => s.user?.id)
  const { bottom } = useSafeAreaInsets()
  if (!state || !open) return null
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Fechar painel de música" />
      <View style={[styles.sheet, { paddingBottom: Math.max(spacing.md, bottom) }]}>
        <View style={styles.header}>
          <Text style={styles.heading}>{T17.title}</Text>
          <IconButton icon="close" label="Fechar" onPress={close} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {state.now ? <NowPlaying state={state} serverId={serverId} meId={meId} /> : null}
          <Text style={styles.heading}>{T17.next}</Text>
          <Queue queue={state.queue} serverId={serverId} meId={meId} />
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { maxHeight: '80%', backgroundColor: colors.bgFloating, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  content: { gap: spacing.md },
  now: { gap: spacing.sm },
  nowTitle: { color: colors.textStrong, fontSize: fontSize.md, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: fontSize.xs },
  bar: { height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
  barFill: { height: '100%', backgroundColor: '#a78bfa' },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: colors.textFaint, fontSize: 10 },
  button: { minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: spacing.md },
  buttonOff: { opacity: 0.5 },
  buttonText: { color: colors.textStrong, fontSize: fontSize.sm, fontWeight: '600' },
  empty: { color: colors.textFaint, fontSize: fontSize.sm },
  queue: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.sm, borderRadius: 4, minHeight: MIN_TOUCH },
  rowMine: { backgroundColor: 'rgba(255,255,255,0.05)' },
  index: { width: 16, color: colors.textFaint, fontSize: fontSize.xs },
  rowText: { flex: 1 },
  rowTitle: { color: colors.textStrong, fontSize: fontSize.sm },
  rowMeta: { color: colors.textFaint, fontSize: 11 }
})
