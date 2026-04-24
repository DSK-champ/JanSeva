import { useState, useEffect } from 'react'
import { MapPin, Search, Filter, Users, Award, X, Compass } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const FOCUS_AREAS = ['All', 'Food', 'Medical', 'Shelter', 'Education', 'Emergency', 'Other']
const STATES = ['All', 'Maharashtra', 'Delhi', 'Bihar', 'Uttar Pradesh', 'Gujarat', 'Karnataka', 'Tamil Nadu', 'Rajasthan', 'West Bengal', 'Telangana', 'Kerala', 'Punjab']

export default function Explore() {
  const [ngos, setNgos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('All')
  const [focusFilter, setFocusFilter] = useState('All')
  const [searchTimeout, setSearchTimeout] = useState(null)
  const [nearbyMode, setNearbyMode] = useState(false)

  const fetchNGOs = async (q, state, focus, lat = null, lng = null) => {
    setLoading(true)
    try {
      let url
      if (lat && lng) {
        url = `${API}/ngos/nearby?lat=${lat}&lng=${lng}&radius=500`
        setNearbyMode(true)
      } else {
        setNearbyMode(false)
        if (q && q.length > 1) {
          url = `${API}/ngos/search?q=${encodeURIComponent(q)}`
          if (state && state !== 'All') url += `&state=${state}`
          if (focus && focus !== 'All') url += `&focus=${focus}`
        } else {
          url = `${API}/ngos?limit=30`
          if (state && state !== 'All') url += `&state=${state}`
          if (focus && focus !== 'All') url += `&focus=${focus}`
        }
      }
      const res = await fetch(url)
      const data = await res.json()
      setNgos(data.data || [])
    } catch {
      setNgos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNGOs('', 'All', 'All')
  }, [])

  const handleSearch = (value) => {
    setSearch(value)
    clearTimeout(searchTimeout)
    setSearchTimeout(setTimeout(() => fetchNGOs(value, stateFilter, focusFilter), 400))
  }

  const handleFilter = (state, focus) => {
    setStateFilter(state)
    setFocusFilter(focus)
    fetchNGOs(search, state, focus)
  }

  const handleNearby = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchNGOs('', 'All', 'All', position.coords.latitude, position.coords.longitude)
      },
      () => {
        alert('Unable to retrieve your location')
        setLoading(false)
      },
    )
  }

  const levelColors = { Critical: '#9D4EDD', High: '#4CC9F0', Medium: '#40916C', Low: '#52B788' }

  return (
    <div>
      <section className="page-hero">
        <div className="container">
          <div className="page-hero-grid">
            <div className="page-hero-copy">
              <span className="section-label">Explore</span>
              <h1 className="page-title">Find NGOs through a clearer discovery flow</h1>
              <p className="page-subtitle">
                Search by state, focus area, or proximity using a lighter layout that makes exploration feel less cluttered and more intentional.
              </p>
            </div>
            <div className="page-hero-panel">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-soft)' }} />
                  <input className="input-field input-field-icon" placeholder="Search NGOs by name..." value={search} onChange={(e) => handleSearch(e.target.value)} disabled={nearbyMode} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={nearbyMode ? () => fetchNGOs('', stateFilter, focusFilter) : handleNearby} className={nearbyMode ? 'btn-mustard' : 'btn-primary'}>
                    {nearbyMode ? <X size={16} /> : <Compass size={16} />}
                    {nearbyMode ? 'Clear nearby mode' : 'Find nearby NGOs'}
                  </button>
                  {search && (
                    <button onClick={() => { setSearch(''); fetchNGOs('', stateFilter, focusFilter) }} className="btn-outline">
                      Reset search
                    </button>
                  )}
                </div>
                <p className="text-sm" style={{ color: 'var(--text-soft)' }}>{ngos.length} results currently visible</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="glass-card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex items-center gap-3">
                <div className="icon-shell">
                  <Filter size={18} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--green-8)' }}>Filter organizations</p>
                  <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Keep the search focused without crowding the page.</p>
                </div>
              </div>

              <div className="grid flex-1 gap-3 md:grid-cols-[220px_1fr]">
                <select className="select-field" value={stateFilter} onChange={(e) => handleFilter(e.target.value, focusFilter)} disabled={nearbyMode}>
                  {STATES.map((state) => <option key={state}>{state}</option>)}
                </select>
                <div className="flex flex-wrap gap-2">
                  {FOCUS_AREAS.map((focus) => (
                    <button
                      key={focus}
                      onClick={() => handleFilter(stateFilter, focus)}
                      disabled={nearbyMode}
                      className={focusFilter === focus ? 'btn-primary min-h-0 px-4 py-2 text-xs' : 'btn-outline min-h-0 px-4 py-2 text-xs'}
                    >
                      {focus}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="empty-state mt-6">
              <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 animate-spin" style={{ borderColor: 'rgba(82,183,136,0.18)', borderTopColor: 'var(--green-6)' }} />
              <p>Loading NGOs...</p>
            </div>
          ) : ngos.length > 0 ? (
            <div className="cards-grid-3 mt-6">
              {ngos.map((ngo) => (
                <div key={ngo._id} className="glass-card p-5">
                  <div className="mb-4 flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold text-white" style={{ background: 'linear-gradient(135deg, var(--green-6), var(--green-7))' }}>
                      {ngo.name?.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-1 text-base font-bold" style={{ color: 'var(--green-8)' }}>{ngo.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                        <MapPin size={12} />
                        {ngo.city}, {ngo.state}
                      </p>
                    </div>
                    <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: `${levelColors[ngo.contributionLevel]}14`, color: levelColors[ngo.contributionLevel] }}>
                      {ngo.contributionLevel}
                    </span>
                  </div>

                  <p className="line-clamp-3 text-sm leading-7" style={{ color: 'var(--text-muted)' }}>{ngo.organizationDetails}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {ngo.focusAreas?.map((focus) => (
                      <span key={focus} className="tag-chip">{focus}</span>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t pt-4 text-xs" style={{ borderColor: 'rgba(45, 106, 79, 0.08)', color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1">
                      <Users size={13} />
                      {ngo.volunteerCount} volunteers
                    </span>
                    <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--blue-accent)' }}>
                      <Award size={13} />
                      Score {ngo.impactScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state mt-6">
              <Search size={40} className="mx-auto mb-4 opacity-40" />
              <p>No NGOs matched the current search or filters.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
