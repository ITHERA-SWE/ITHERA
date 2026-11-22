import { useEffect, useRef, useState } from 'react'
import { exportService } from '../../services/export'
import { useAuth } from '../../context/useAuth'
import { EditorialDialog } from '../collaboration/EditorialDialog'
import { withSearchTimeout } from '../../pages/Search/search-data'
export function ShareItineraryButton({
  groupId,
  online,
}: {
  groupId: string
  online: boolean
}) {
  const { accessToken } = useAuth()
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [copied, setCopied] = useState(false)
  const [link, setLink] = useState<{ url: string; expires: string } | null>(
    null,
  )
  const lock = useRef(false),
    alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const load = async () => {
    if (lock.current || !online || !accessToken) return
    lock.current = true
    setOpen(true)
    setBusy(true)
    setError('')
    setCopied(false)
    setLink(null)
    try {
      const response = await withSearchTimeout(
        exportService.getShareLink(groupId, accessToken),
        12000,
      )
      if (!/^https?:\/\//i.test(response.shareUrl))
        throw new Error('El servidor no devolvió un enlace de consulta válido.')
      if (alive.current)
        setLink({ url: response.shareUrl, expires: response.expiresAt })
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error
            ? e.message
            : 'No se pudo obtener el enlace de consulta.',
        )
    } finally {
      lock.current = false
      if (alive.current) setBusy(false)
    }
  }
  return (
    <>
      <button
        className="atlas-text-link"
        disabled={!online || busy}
        onClick={() => void load()}
      >
        Compartir consulta ↗
      </button>
      {open && (
        <EditorialDialog
          title="Compartir itinerario"
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <div className="atlas-activity-detail">
            <p>
              Este enlace permite consultar el itinerario público. Compártelo
              solo con quienes deban verlo. No concede permisos para editar.
            </p>
            {busy && <p role="status">Preparando enlace…</p>}
            {error && (
              <p role="alert" className="atlas-collab-error">
                {error}{' '}
                <button disabled={busy || !online} onClick={() => void load()}>
                  Reintentar enlace
                </button>
              </p>
            )}
            {link && !busy && (
              <>
                <label htmlFor="atlas-share-url">
                  Enlace de consulta
                  <input
                    id="atlas-share-url"
                    readOnly
                    value={link.url}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </label>
                {link.expires && (
                  <p>
                    Vigencia informada:{' '}
                    {Number.isFinite(Date.parse(link.expires))
                      ? new Date(link.expires).toLocaleString('es-MX')
                      : link.expires}
                  </p>
                )}
                <a
                  className="atlas-text-link"
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir consulta compartida ↗
                </a>
                <button
                  className="atlas-button atlas-button-secondary"
                  onClick={() => {
                    if (navigator.clipboard)
                      void navigator.clipboard
                        .writeText(link.url)
                        .then(() => setCopied(true))
                        .catch(() =>
                          setError(
                            'No se pudo copiar. Puedes seleccionar el enlace y copiarlo manualmente.',
                          ),
                        )
                    else document.getElementById('atlas-share-url')?.focus()
                  }}
                >
                  Copiar enlace
                </button>
                {copied && <p role="status">Enlace copiado.</p>}
              </>
            )}
          </div>
        </EditorialDialog>
      )}
    </>
  )
}
