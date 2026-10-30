import Avatar from '../../../../shared/ui/Avatar'
import { VolumeIcon } from '../../../../shared/ui/icons'
import { ProfileInfoSkeleton } from '../../../../shared/ui/skeleton/layouts'
import LiveBadge from '../../../call/components/LiveBadge'
import SectionHeader from '../../../../shared/ui/SectionHeader'
import type { Role } from '../../../servers/lib/permissions'
import { OWNER_STYLE, type CardInfo as Info } from '../../lib/profileCardView'
import type { ProfileThemeLook } from '../../lib/profileTheme'
import ProfileRoleChips, { TierName } from '../ProfileRoleChips'

/** Fundo do tema e cor do texto: os cargos e a faixa ficam legíveis nele. */
interface Look {
  background: string[]
  ink: ProfileThemeLook['ink']
}

function SectionTitle({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <SectionHeader as="p" className="mb-1">{children}</SectionHeader>
}

interface RolesProps {
  inServer: boolean
  isServerOwner: boolean
  memberRoles: Role[]
  look: Look
}

function RolesSection({
  inServer,
  isServerOwner,
  memberRoles,
  look
}: RolesProps): React.JSX.Element | null {
  if (!inServer || (!isServerOwner && memberRoles.length === 0)) return null
  return (
    <div>
      <SectionTitle>{memberRoles.length > 1 ? 'Cargos' : 'Cargo'}</SectionTitle>
      <ProfileRoleChips
        roles={memberRoles}
        owner={isServerOwner ? OWNER_STYLE : undefined}
        background={look.background}
        ink={look.ink}
      />
    </div>
  )
}

function TierSection({ info, look }: { info: Info; look: Look }): React.JSX.Element | null {
  if (!info.tier) return null
  return (
    <div>
      <SectionTitle>Nível de voz</SectionTitle>
      <p className="text-ds-xs text-normal">
        Nível {info.level} ·{' '}
        <TierName
          name={info.tier.name}
          color={info.tier.color}
          background={look.background}
          ink={look.ink}
        />
      </p>
    </div>
  )
}

function SinceSection({ info }: { info: Info }): React.JSX.Element | null {
  if (!info.salinhaSince && !info.serverSince) return null
  return (
    <div>
      <SectionTitle>Membro desde</SectionTitle>
      <div className="flex flex-col gap-0.5 text-ds-xs text-normal">
        {info.salinhaSince && (
          <p>
            {info.salinhaSince} <span className="text-faint">· na Salinha</span>
          </p>
        )}
        {info.serverSince && (
          <p>
            {info.serverSince} <span className="text-faint">· neste servidor</span>
          </p>
        )}
      </div>
    </div>
  )
}

function MutualServersSection({ info }: { info: Info }): React.JSX.Element | null {
  const servers = info.mutualServers
  if (servers.length === 0) return null
  return (
    <div>
      <SectionTitle>
        {servers.length === 1 ? '1 servidor em comum' : `${servers.length} servidores em comum`}
      </SectionTitle>
      <p className="truncate text-ds-xs text-normal">{servers.map((sv) => sv.name).join(', ')}</p>
    </div>
  )
}

function MutualFriendsSection({ info }: { info: Info }): React.JSX.Element | null {
  const friends = info.mutualFriends
  if (friends.length === 0) return null
  return (
    <div>
      <SectionTitle>
        {friends.length === 1 ? '1 amigo em comum' : `${friends.length} amigos em comum`}
      </SectionTitle>
      <div className="flex items-center gap-1.5">
        {friends.slice(0, 6).map((f) => (
          <span key={f.id} title={f.display_name || f.username}>
            <Avatar
              userId={f.id}
              name={f.display_name || f.username}
              avatarUrl={f.avatar_url}
              size={20}
            />
          </span>
        ))}
      </div>
    </div>
  )
}

function VoiceSection({ info, live }: { info: Info; live: boolean }): React.JSX.Element | null {
  if (!info.voiceChannel) return null
  return (
    <div>
      <SectionTitle>Em call</SectionTitle>
      <p className="flex items-center gap-1.5 text-ds-xs text-normal">
        <VolumeIcon className="h-3.5 w-3.5 text-success" />
        <span className="min-w-0 truncate">{info.voiceChannel.name}</span>
        {live && <LiveBadge />}
      </p>
    </div>
  )
}

interface CardInfoProps extends Omit<RolesProps, 'look'> {
  info: Info
  live: boolean
  look: Look
}

/** Caixa do cartão: cargos, nível, desde quando, em comum e em call. */
function CardInfo({ info, live, look, ...roles }: CardInfoProps): React.JSX.Element | null {
  if (!info.hasInfo) return null
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-lg bg-input p-3">
      <RolesSection {...roles} look={look} />
      <TierSection info={info} look={look} />
      <SinceSection info={info} />
      <MutualServersSection info={info} />
      <MutualFriendsSection info={info} />
      <VoiceSection info={info} live={live} />
      {/* Amigos e servidores em comum vêm de outra chamada. */}
      {info.mutualLoading && <ProfileInfoSkeleton sections={2} />}
    </div>
  )
}

export default CardInfo
