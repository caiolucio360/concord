import { useEffect, useState } from 'react'
import { useAuthStore } from '../../auth/store/authStore'
import { getRelationship, type Relationship } from '../../friends/api/friends'
import { useLevelStore } from '../../levels/store/levelStore'
import { useProfileStore } from '../store/profileStore'
import type { ProfileCardTarget } from '../store/profileCardStore'

interface ProfileCardData {
  /** Amigos e servidores em comum (só no cartão de outra pessoa). */
  mutual: Relationship | null
  /** Quem já respondeu (mesmo com erro): o skeleton não fica para sempre se a chamada falhar. */
  profileSettled: string | null
  mutualSettled: string | null
}

/**
 * Busca o que o cartão mostra: nível, perfil e o que temos em comum. Busca de
 * novo quando a amizade muda (`relationship`).
 */
export function useProfileCardData(
  target: ProfileCardTarget,
  relationship: unknown
): ProfileCardData {
  const ensureLevels = useLevelStore((s) => s.ensureLevels)
  const fetchProfile = useProfileStore((s) => s.fetchProfile)
  const [loadedMutual, setMutual] = useState<{ userId: string; rel: Relationship } | null>(null)
  const [profileSettled, setProfileSettled] = useState<string | null>(null)
  const [mutualSettled, setMutualSettled] = useState<string | null>(null)

  useEffect(() => {
    ensureLevels([target.userId])
    if (target.userId === useAuthStore.getState().user?.id) return
    let cancelled = false
    void fetchProfile(target.userId).finally(() => {
      if (!cancelled) setProfileSettled(target.userId)
    })
    return () => {
      cancelled = true
    }
  }, [target, ensureLevels, fetchProfile])

  useEffect(() => {
    if (target.userId === useAuthStore.getState().user?.id) return
    let cancelled = false
    getRelationship(target.userId)
      .then((r) => {
        if (!cancelled) setMutual({ userId: target.userId, rel: r })
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setMutualSettled(target.userId)
      })
    return () => {
      cancelled = true
    }
  }, [target, relationship])

  const mutual = loadedMutual?.userId === target.userId ? loadedMutual.rel : null
  return { mutual, profileSettled, mutualSettled }
}
