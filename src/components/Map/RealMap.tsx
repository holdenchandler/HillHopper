import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RouteStep, DeerZone, WildlifeReport, MountainPoint } from '../../lib/types';

// Use CDN for default marker icons to avoid build issues
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface RealMapProps {
  center: [number, number];
  zoom: number;
  carLocation: [number, number];
  carHeading: number;
  route?: RouteStep[];
  deerZones: DeerZone[];
  wildlifeReports?: WildlifeReport[];
  points: MountainPoint[];
}

// Component to handle map centering
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export const RealMap: React.FC<RealMapProps> = ({
  center,
  zoom,
  carLocation,
  carHeading,
  route = [],
  deerZones,
  wildlifeReports = [],
  points
}) => {
  useEffect(() => {
    console.log("RealMap mounted at", carLocation);
  }, []);

  const routePath = route
    .filter(step => typeof step.lat === 'number' && typeof step.lng === 'number')
    .map(step => [step.lat, step.lng] as [number, number]);

  const carIcon = L.divIcon({
    className: 'custom-car-icon',
    html: `<div style="transform: rotate(${carHeading || 0}deg); font-size: 24px; transition: transform 0.3s ease-out;">🚗</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  return (
    <div className="w-full h-full rounded-3xl overflow-hidden border-4 border-[#40513B]/20 shadow-inner">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <ChangeView center={carLocation} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Route */}
        {routePath.length > 1 && (
          <Polyline positions={routePath} color="#40513B" weight={5} opacity={0.7} dashArray="10, 10" />
        )}

        {/* Car */}
        <Marker position={carLocation} icon={carIcon} />

        {/* Deer Zones */}
        {deerZones.map(zone => (
          <Circle 
            key={zone.id}
            center={zone.center}
            radius={zone.radius}
            pathOptions={{ 
              color: zone.riskLevel === 'extreme' ? 'red' : 'orange',
              fillColor: zone.riskLevel === 'extreme' ? 'red' : 'orange',
              fillOpacity: 0.2
            }}
          />
        ))}

        {/* Wildlife Reports */}
        {wildlifeReports.map(report => (
          <Marker 
            key={report.id} 
            position={[report.lat, report.lng]}
            icon={L.divIcon({
              className: 'wildlife-icon',
              html: `<div style="font-size: 20px;">${
                report.type === 'deer-live' ? '🦌' : 
                report.type === 'bear' ? '🐻' : '🐾'
              }</div>`,
              iconSize: [25, 25]
            })}
          />
        ))}

        {/* Points of Interest */}
        {points.map((pt, i) => (
          <Marker 
            key={i} 
            position={[pt.lat, pt.lng]}
            icon={L.divIcon({
              className: 'poi-icon',
              html: `<div style="font-size: 18px;">${
                pt.type === 'peak' ? '🏔️' : 
                pt.type === 'cabin' ? '🏠' : '📷'
              }</div>`,
              iconSize: [20, 20]
            })}
          >
            <Popup>{pt.label}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
