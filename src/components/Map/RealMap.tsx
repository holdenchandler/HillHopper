import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RouteStep, DeerZone, WildlifeReport, MountainPoint } from '../../lib/types';
import { CarModelId, CAR_MODELS } from '../../lib/carModels';

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
  carModelId?: CarModelId;
  route?: RouteStep[];
  isPreview?: boolean;
  deerZones: DeerZone[];
  wildlifeReports?: WildlifeReport[];
  points: MountainPoint[];
}

// Component to handle map centering
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, {
      duration: 1.5,
      easeLinearity: 0.25
    });
  }, [center, zoom, map]);
  return null;
}

export const RealMap: React.FC<RealMapProps> = ({
  center,
  zoom,
  carLocation,
  carHeading,
  carModelId = 'sedan',
  route = [],
  isPreview = false,
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

  const carEmoji = CAR_MODELS.find(m => m.id === carModelId)?.emoji || '🚗';

  const carIcon = L.divIcon({
    className: 'custom-car-icon',
    html: `<div style="transform: rotate(${carHeading || 0}deg); font-size: 24px; transition: transform 0.3s ease-out; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.3));">${carEmoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  return (
    <div className="w-full h-full rounded-3xl overflow-hidden border-4 border-[#40513B]/20 shadow-inner">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
      >
        <ChangeView center={carLocation} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Route */}
        {routePath.length > 1 && (
          <>
            <Polyline 
              positions={routePath} 
              color={isPreview ? "#3B82F6" : "#9333EA"} 
              weight={16} 
              opacity={isPreview ? 0.1 : 0.15} 
              className={isPreview ? "" : "waze-glow"} 
            />
            <Polyline 
              positions={routePath} 
              color={isPreview ? "#3B82F6" : "#9333EA"} 
              weight={12} 
              opacity={isPreview ? 0.2 : 0.3} 
            />
            <Polyline 
              positions={routePath} 
              color="white" 
              weight={8} 
              opacity={1} 
              dashArray={isPreview ? "10, 10" : undefined}
            />
            <Polyline 
              positions={routePath} 
              color={isPreview ? "#60A5FA" : "#A855F7"} 
              weight={5} 
              opacity={1} 
            />
            {/* Destination Marker */}
            <Marker 
              position={routePath[routePath.length - 1]} 
              icon={L.divIcon({
                className: 'dest-icon',
                html: `<div style="font-size: 30px; filter: drop-shadow(0 0 5px rgba(239, 68, 68, 0.5));">📍</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 30]
              })}
            />
          </>
        )}

        {/* Car */}
        <Marker position={carLocation} icon={carIcon} />

        {/* Deer Zones */}
        {deerZones.map(zone => {
          const isHighRisk = zone.riskLevel === 'high' || zone.riskLevel === 'extreme';
          const color = zone.riskLevel === 'extreme' ? '#EF4444' : 
                       zone.riskLevel === 'high' ? '#FB923C' : 
                       zone.riskLevel === 'moderate' ? '#FACC15' : '#4ADE80';
          
          return (
            <React.Fragment key={zone.id}>
              {/* Outer Glow */}
              <Circle 
                center={zone.center}
                radius={zone.radius * 1.2}
                pathOptions={{ 
                  color: color,
                  fillColor: color,
                  fillOpacity: isHighRisk ? 0.1 : 0.05,
                  weight: 0
                }}
              />
              {/* Main Zone */}
              <Circle 
                center={zone.center}
                radius={zone.radius}
                pathOptions={{ 
                  color: color,
                  fillColor: color,
                  fillOpacity: isHighRisk ? 0.3 : 0.2,
                  weight: isHighRisk ? 3 : 1,
                  dashArray: isHighRisk ? undefined : '5, 10'
                }}
              />
            </React.Fragment>
          );
        })}

        {/* Wildlife Reports */}
        {wildlifeReports.map(report => (
          <Marker 
            key={report.id} 
            position={[report.lat, report.lng]}
            icon={L.divIcon({
              className: 'wildlife-icon',
              html: `<div style="font-size: 20px;">${
                report.type === 'deer-live' ? '🦌' : 
                report.type === 'deer-dead' ? '🦴' :
                report.type === 'bear' ? '🐻' :
                report.type === 'raccoon' ? '🦝' :
                report.type === 'squirrel' ? '🐿️' : '🐾'
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
