import { useState, useEffect } from 'react'
import { MapPin, Users, Award } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix generic leaflet icon rendering issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const getContribColor = (level) => {
  switch (level) {
    case 'Critical': return '#9D4EDD'
    case 'High': return '#4CC9F0'
    case 'Medium': return '#40916C'
    default: return '#52B788'
  }
}

// Custom DivIcon for Map Markers using lucide-react aesthetics
const createCustomIcon = (level) => {
  const color = getContribColor(level)
  return L.divIcon({
    html: `
      <div style="position: relative; width: 24px; height: 24px;">
        <div style="
          position: absolute; width: 100%; height: 100%; border-radius: 50%;
          background-color: ${color}; opacity: 0.3; animation: pulse 2s infinite;
        "></div>
        <div style="
          position: absolute; top: 15%; left: 15%; width: 70%; height: 70%; 
          border-radius: 50%; background-color: ${color}; border: 2px solid white;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2); opacity: 0; }
        }
      </style>
    `,
    className: 'custom-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })
}

// A component to auto-fit bounds based on markers
function MapBounds({ locations }) {
  const map = useMap();
  useEffect(() => {
    if (locations && locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(loc => [loc.coordinates?.lat || 20, loc.coordinates?.lng || 78]))
      // Add a bit of padding so pins aren't cut off at the edges
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 })
    }
  }, [locations, map])
  return null;
}


export default function IndiaMap({ ngoLocations = [] }) {
  // Center of India coordinates
  const center = [22.5937, 78.9629]

  return (
    <div className="relative w-full rounded-3xl overflow-hidden" style={{ height: '520px', boxShadow: '0 18px 30px rgba(45, 106, 79, 0.12)' }}>
      <MapContainer center={center} zoom={4.5} scrollWheelZoom={false} style={{ height: '100%', width: '100%', zIndex: 1 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {ngoLocations.length > 0 && <MapBounds locations={ngoLocations} />}

        {ngoLocations.map((ngo, idx) => {
          const lat = ngo.coordinates?.lat
          const lng = ngo.coordinates?.lng
          if (!lat || !lng) return null

          return (
            <Marker key={ngo._id || idx} position={[lat, lng]} icon={createCustomIcon(ngo.contributionLevel)}>
              <Popup className="custom-popup" closeButton={false}>
                <div className="min-w-[200px]">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold leading-tight m-0 p-0" style={{ color: 'var(--green-8)' }}>{ngo.name}</h4>
                    {ngo.isVerified && (
                      <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: '#D8F3DC', color: '#2D6A4F' }}>
                        Verified
                      </span>
                    )}
                  </div>
                  
                  <div className="mb-2 flex items-center gap-1.5 text-xs m-0" style={{ color: 'var(--text-muted)' }}>
                    <MapPin size={11} />
                    <span>{ngo.city}, {ngo.state}</span>
                  </div>
                  
                  <div className="mb-2 grid grid-cols-2 gap-2 mt-2">
                    <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(216, 243, 220, 0.5)' }}>
                      <Users size={12} className="mx-auto mb-0.5" style={{ color: 'var(--green-6)' }} />
                      <p className="text-xs font-bold my-0" style={{ color: 'var(--green-8)' }}>{ngo.volunteerCount}</p>
                      <p className="text-[9px] m-0" style={{ color: 'var(--text-soft)' }}>Volunteers</p>
                    </div>
                    <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(76, 201, 240, 0.12)' }}>
                      <Award size={12} className="mx-auto mb-0.5" style={{ color: 'var(--blue-accent)' }} />
                      <p className="text-xs font-bold my-0" style={{ color: 'var(--green-8)' }}>{ngo.impactScore}</p>
                      <p className="text-[9px] m-0" style={{ color: 'var(--text-soft)' }}>Impact Score</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ngo.focusAreas?.map((area) => (
                      <span
                        key={area}
                        className="rounded-full px-2 py-0.5 text-[9px] font-medium"
                        style={{ backgroundColor: 'rgba(64,145,108,0.08)', color: '#2D6A4F' }}
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[400] bg-white rounded-xl p-3 shadow-lg border border-green-100" style={{ background: 'rgba(255, 255, 255, 0.96)' }}>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 font-manrope">Contribution Level</p>
        <div className="flex gap-3">
          {[
            { label: 'Critical', color: '#9D4EDD' },
            { label: 'High', color: '#4CC9F0' },
            { label: 'Medium', color: '#40916C' },
            { label: 'Low', color: '#52B788' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span className="text-[11px] font-semibold text-gray-700 font-manrope">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

