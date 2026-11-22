import { useNavigate } from 'react-router-dom'
import type { Group } from '../../types/groups'
import { travelPath } from '../../pages/Search/search-data'
import '../../pages/Search/search-editorial.css'

export function ExploreHub({ group }: { group: Group | null }) {
  const navigate = useNavigate()
  const go = (path: string, mode?: string) =>
    navigate(travelPath(path, group?.id, mode ? { mode } : {}), {
      state: { group },
    })
  return (
    <div className="atlas-search-scroll">
      <section className="atlas-explore-hub">
        <p className="atlas-eyebrow">
          EXPLORAR · {group?.destino || 'EL PRÓXIMO DESTINO'}
        </p>
        <h1>
          Todo viaje empieza
          <br />
          con una posibilidad.
        </h1>
        <p>Encuentra opciones, compártelas y decidan juntos.</p>
        <div className="atlas-explore-primary">
          <button onClick={() => go('/search/flights-hotels', 'flights')}>
            <span className="atlas-explore-number">01 / EL TRAYECTO</span>
            <h2>Encontrar un vuelo</h2>
            <p>Horarios, escalas y alternativas para llegar.</p>
            <span className="atlas-text-link">Explorar vuelos ↗</span>
          </button>
          <button onClick={() => go('/search/flights-hotels', 'hotels')}>
            <span className="atlas-explore-number">02 / LA ESTANCIA</span>
            <h2>Encontrar un hotel</h2>
            <p>Un lugar para descansar y compartir el viaje.</p>
            <span className="atlas-text-link">Explorar hoteles ↗</span>
          </button>
        </div>
        <div className="atlas-explore-tools">
          <button onClick={() => go('/search/map-places')}>
            Lugares y actividades <span>↗</span>
          </button>
          <button onClick={() => go('/search/routes-weather')}>
            Rutas, transporte y clima <span>↗</span>
          </button>
          <button onClick={() => go('/search/history')}>
            Alternativas guardadas <span>↗</span>
          </button>
        </div>
        <p className="atlas-explore-footnote">
          Las opciones que propongas se guardan para revisarlas y votarlas en
          grupo. Proponer no compra ni reserva.
        </p>
      </section>
    </div>
  )
}
