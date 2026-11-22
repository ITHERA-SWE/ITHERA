import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getCurrentGroup,
  groupsService,
  saveCurrentGroup,
} from '../../services/groups'
import type { Group } from '../../types/groups'
import { useAuth } from '../../context/useAuth'
import { withSearchTimeout } from './search-data'

/** URL > estado del router > último viaje. Verifica el grupo con el backend antes de permitir propuestas. */
export function useSearchTrip() {
  const { accessToken } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as {
    group?: Group
    groupId?: string | number
  } | null
  const id =
    new URLSearchParams(location.search).get('groupId') ||
    String(state?.group?.id ?? state?.groupId ?? getCurrentGroup()?.id ?? '')
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (id && !params.get('groupId')) {
      params.set('groupId', id)
      navigate(
        { pathname: location.pathname, search: params.toString() },
        { replace: true, state: location.state },
      )
    }
  }, [id, location.pathname, location.search, location.state, navigate])
  const [result, setResult] = useState<{
    key: string
    group: Group | null
    error: string | null
  }>({ key: '', group: null, error: null })
  const [retry, setRetry] = useState(0)
  const key = `${id}:${retry}`
  useEffect(() => {
    if (!id || !accessToken) return
    let cancelled = false
    withSearchTimeout(groupsService.getGroupDetails(id, accessToken), 12000)
      .then((response) => {
        if (cancelled) return
        if (!response.group || String(response.group.id) !== id)
          throw new Error(
            'El grupo devuelto no coincide con el viaje solicitado.',
          )
        saveCurrentGroup(response.group)
        setResult({ key, group: response.group, error: null })
      })
      .catch((error) => {
        if (!cancelled)
          setResult({
            key,
            group: null,
            error:
              error instanceof Error
                ? error.message
                : 'No se pudo verificar el viaje.',
          })
      })
    return () => {
      cancelled = true
    }
  }, [id, accessToken, key])
  return {
    group: Boolean(id) && result.key === key ? result.group : null,
    loading: Boolean(id) && result.key !== key,
    error: Boolean(id) && result.key === key ? result.error : null,
    retry: useCallback(() => setRetry((n) => n + 1), []),
    groupId: id,
  }
}
