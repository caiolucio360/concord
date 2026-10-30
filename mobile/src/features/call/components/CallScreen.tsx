import { useState, type ReactNode } from 'react'
import { FlatList, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, fontSize, spacing } from '../../../shared/theme/tokens'
import { IconButton } from '../../../shared/ui/IconButton'
import { useAuthStore } from '../../auth/store/authStore'
import { callGrid } from '../lib/callGrid'
import { phaseLabel } from '../lib/callLayout'
import { NO_VOICE, type CallUser } from '../lib/callTypes'
import { useCallSessionStore } from '../store/callSessionStore'
import { useCameraStore } from '../store/cameraStore'
import { useScreenShareStore } from '../store/screenShareStore'
import { useParticipantsStore, voiceOf } from '../store/participantsStore'
import { useSpeakingStore } from '../store/speakingStore'
import { useUserAudioStore } from '../store/userAudioStore'
import { CallNotice } from './CallNotice'
import { XpBar } from '../../levels/components/XpBar'
import { useVoiceControlsStore } from '../../voice/store/voiceControlsStore'
import { MusicPanel } from '../../music/components/MusicPanel'
import { useMusicStore } from '../../music/store/musicStore'
import { CallControls } from './CallControls'
import { ParticipantTile } from './ParticipantTile'
import { ScreenViewer } from './ScreenViewer'
import { UserAudioSheet } from './UserAudioSheet'

interface CallScreenProps {
  onBack: () => void
  onLeave: () => void
  onOpenSettings?: () => void
  /** Liga ou desliga a transmissão da minha tela. */
  onToggleShare?: () => void
  /** Assiste à transmissão de alguém (null para de assistir). */
  onWatch?: (userId: string | null) => void
  /** Desenha a transmissão (o componente do LiveKit); sem ele não dá para assistir. */
  renderScreen?: (userId: string) => ReactNode
  /** Liga ou desliga a minha câmera e troca entre a da frente e a de trás. */
  onToggleCamera?: () => void
  onFlipCamera?: () => void
  /** Desenha a câmera de alguém (o componente do LiveKit); sem ele, só a foto. */
  renderCamera?: (userId: string) => ReactNode
}

const peopleLabel = (count: number): string => (count === 1 ? '1 pessoa na chamada' : `${count} pessoas na chamada`)

/** Tela cheia da chamada, no estilo do Discord no celular: tiles grandes de quem está nela, quem fala com anel verde e a barra redonda de controles. */
export function CallScreen({ onBack, onLeave, onOpenSettings, onToggleShare, onWatch, renderScreen, onToggleCamera, onFlipCamera, renderCamera }: CallScreenProps) {
  const { width, height: windowHeight } = useWindowDimensions()
  const [gridHeight, setGridHeight] = useState(windowHeight * 0.55)
  const name = useCallSessionStore((s) => s.name)
  const phase = useCallSessionStore((s) => s.phase)
  const others = useParticipantsStore((s) => s.people)
  const voice = useParticipantsStore((s) => s.voice)
  const speaking = useSpeakingStore((s) => s.speaking)
  const me = useAuthStore((s) => s.user)
  const serverId = useCallSessionStore((s) => s.serverId)
  const hasMusic = useMusicStore((s) => s.state !== null)
  const openMusic = useMusicStore((s) => s.openPanel)
  const xpPaused = useVoiceControlsStore((s) => s.muted || s.deafened)
  const sharers = useScreenShareStore((s) => s.sharers)
  const sharing = useScreenShareStore((s) => s.sharing)
  const watching = useScreenShareStore((s) => s.watching)
  const cameras = useCameraStore((s) => s.cameras)
  const cameraOn = useCameraStore((s) => s.on)
  const canWatch = Boolean(onWatch && renderScreen)
  const userAudio = useUserAudioStore((s) => s.settings)
  const [audioFor, setAudioFor] = useState<CallUser | null>(null)

  const people: CallUser[] = me ? [{ id: me.id, username: me.username, display_name: me.display_name, avatar_url: me.avatar_url }, ...others] : others
  const grid = callGrid(width, gridHeight, people.length)
  const status = phaseLabel(phase) || peopleLabel(people.length)
  const onLayout = ({ nativeEvent }: LayoutChangeEvent): void => setGridHeight(nativeEvent.layout.height)

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon="chevron-down" label="Minimizar chamada" onPress={onBack} />
        <View style={styles.titles}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.status}>{status}</Text>
        </View>
        {hasMusic && serverId ? <IconButton icon="musical-notes" label="Tocando agora" onPress={openMusic} /> : null}
      </View>
      <CallNotice onOpenSettings={onOpenSettings} />
      <XpBar paused={xpPaused} />
      {watching && renderScreen ? (
        <ScreenViewer name={people.find((p) => p.id === watching)?.display_name ?? 'transmissão'} userId={watching} onStop={() => onWatch?.(null)} renderScreen={renderScreen} />
      ) : null}
      <View style={styles.body} onLayout={onLayout}>
        <FlatList
          key={grid.columns}
          data={people}
          numColumns={grid.columns}
          scrollEnabled={grid.scroll}
          keyExtractor={(p) => p.id}
          columnWrapperStyle={grid.columns > 1 ? styles.row : undefined}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <ParticipantTile
              user={item}
              speaking={speaking.includes(item.id)}
              voice={item.id === me?.id ? NO_VOICE : voiceOf(voice, item.id)}
              live={sharers.includes(item.id)}
              height={grid.tileHeight}
              avatarSize={grid.avatar}
              video={renderCamera && cameras.includes(item.id) ? renderCamera(item.id) : undefined}
              onWatch={canWatch && item.id !== me?.id && watching !== item.id ? () => onWatch?.(item.id) : undefined}
              localMuted={userAudio[item.id]?.muted ?? false}
              onOpenAudio={item.id === me?.id ? undefined : () => setAudioFor(item)}
            />
          )}
        />
      </View>
      <CallControls sharing={sharing} camera={cameraOn} onToggleCamera={onToggleCamera} onFlipCamera={onFlipCamera} onToggleShare={onToggleShare} onLeave={onLeave} />
      {serverId ? <MusicPanel serverId={serverId} /> : null}
      {audioFor ? <UserAudioSheet user={audioFor} onClose={() => setAudioFor(null)} /> : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  titles: { flex: 1 },
  name: { color: colors.textStrong, fontSize: fontSize.lg, fontWeight: '700' },
  status: { color: colors.textMuted, fontSize: fontSize.sm },
  body: { flex: 1 },
  grid: { padding: spacing.md, gap: spacing.md, flexGrow: 1 },
  row: { gap: spacing.md }
})
