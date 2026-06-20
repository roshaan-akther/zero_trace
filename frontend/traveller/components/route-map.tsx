"use client"

import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface LatLng {
  lat: number
  lng: number
}

interface Stop {
  id: string
  name: string
  lat: number
  lng: number
}

interface Props {
  polyline: LatLng[]
  stops?: Stop[]
  fromStop?: string
  toStop?: string
  className?: string
}

const defaultIcon = L.divIcon({
  className: "",
  html: `<div style="width:12px;height:12px;border-radius:50%;background:hsl(var(--primary));border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
})

const fromIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#22c55e;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold">A</div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const toIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold">B</div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

export function RouteMap({ polyline, stops, fromStop, toStop, className = "" }: Props) {
  const mapRef = useRef<L.Map>(null)

  const positions: [number, number][] = polyline.map(p => [p.lat, p.lng])

  useEffect(() => {
    if (mapRef.current && positions.length > 0) {
      const bounds = L.latLngBounds(positions)
      mapRef.current.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [positions])

  if (!polyline.length) {
    return (
      <div className={`flex items-center justify-center h-48 bg-muted/20 rounded-lg text-sm text-muted-foreground ${className}`}>
        No route data available
      </div>
    )
  }

  return (
    <div className={`rounded-lg overflow-hidden border ${className}`} style={{ height: "300px" }}>
      <MapContainer
        ref={mapRef}
        center={positions[Math.floor(positions.length / 2)] || [6.9, 79.9]}
        zoom={12}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline
          positions={positions}
          pathOptions={{ color: "hsl(var(--primary))", weight: 4, opacity: 0.8 }}
        />
        {stops?.map((stop) => {
          let icon = defaultIcon
          if (stop.name === fromStop) icon = fromIcon
          else if (stop.name === toStop) icon = toIcon
          return (
            <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={icon}>
              <Popup>
                <span className="text-sm font-medium">{stop.name}</span>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
