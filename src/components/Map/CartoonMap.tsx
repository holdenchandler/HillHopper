import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { DeerZone, MountainPoint, WildlifeReport, WildlifeType, RouteStep } from '../../lib/types';
import { CarModelId } from '../../lib/carModels';
import { Trees as TreeIcon, Mountain as MountainIcon, Tent, Camera, AlertTriangle, Skull, MapPin, Binoculars, Home } from 'lucide-react';

interface CartoonMapProps {
  center: [number, number];
  zoom: number;
  deerZones: DeerZone[];
  wildlifeReports?: WildlifeReport[];
  points: MountainPoint[];
  carLocation: [number, number];
  carHeading: number;
  carModelId?: CarModelId;
  route?: RouteStep[];
  isPreview?: boolean;
  themeColors?: {
    grass: string;
    forest: string;
    road: string;
    water: string;
    mountain: string;
  };
}

const CARTOON_COLORS = {
  grass: '#9DC08B',
  forest: '#40513B',
  road: '#444444',
  water: '#6096B4',
  mountain: '#606C5D',
  accent: '#F7E1AE',
  risk: {
    low: '#4ADE80',
    moderate: '#FACC15',
    high: '#FB923C',
    extreme: '#EF4444'
  }
};

const MAJOR_ROADS = [
  { name: 'US-209', points: [[41.33, -74.81], [41.30, -74.85], [41.25, -74.90]] },
  { name: 'PA-739', points: [[41.35, -74.80], [41.32, -74.82], [41.28, -74.88]] },
  { name: 'Broad St', points: [[41.32, -74.80], [41.33, -74.79], [41.34, -74.78]] },
  { name: 'High St', points: [[41.325, -74.805], [41.325, -74.795]] },
  { name: 'River Rd', points: [[41.31, -74.82], [41.30, -74.83], [41.29, -74.84]] },
  { name: 'Mountain View Rd', points: [[41.34, -74.82], [41.35, -74.83], [41.36, -74.84]] },
  { name: 'Forest Dr', points: [[41.31, -74.78], [41.30, -74.77], [41.29, -74.76]] }
];

export const CartoonMap: React.FC<CartoonMapProps> = ({
  center,
  zoom,
  deerZones,
  wildlifeReports = [],
  points,
  carLocation,
  carHeading,
  carModelId = 'sedan',
  route = [],
  isPreview = false,
  themeColors = CARTOON_COLORS
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState(d3.zoomIdentity);

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        setDimensions({
          width: svgRef.current.parentElement.clientWidth,
          height: svgRef.current.parentElement.clientHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        setTransform(event.transform);
      });

    d3.select(svgRef.current).call(zoomBehavior);
  }, []);

  // Smoothly follow car if navigating
  useEffect(() => {
    if (route.length > 0 && svgRef.current) {
      // We could animate the d3-zoom transform here to follow the car
      // but for now let's keep it simple and just ensure the projection is centered
    }
  }, [carLocation, route.length]);

  // D3 Projection
  const projection = d3.geoMercator()
    .center([center[1], center[0]])
    .scale(zoom * 100000)
    .translate([dimensions.width / 2, dimensions.height / 2]);

  const lastStep = route.length > 0 ? route[route.length - 1] : null;
  const isNearDestination = lastStep && 
    Math.sqrt(Math.pow(carLocation[0] - lastStep.lat, 2) + Math.pow(carLocation[1] - lastStep.lng, 2)) < 0.0005;

  return (
    <div className="relative w-full h-full bg-[#E5E7EB] overflow-hidden rounded-3xl border-8 border-[#40513B]/20 shadow-inner">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="cursor-grab active:cursor-grabbing"
        style={{ background: themeColors.grass }}
      >
        {/* Decorative "Hand-drawn" Grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1" filter="url(#hand-drawn)" />
          </pattern>
          
          {/* Glow Filters */}
          <filter id="glow-low" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-moderate" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-high" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-extreme" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="hand-drawn" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          <filter id="sketchy-texture" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="noise" />
            <feColorMatrix type="matrix" values="0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 -1 1" />
            <feComposite operator="in" in2="SourceGraphic" result="textured" />
            <feBlend mode="multiply" in="textured" in2="SourceGraphic" />
          </filter>

          <filter id="paper-texture" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
            <feDiffuseLighting in="noise" lightingColor="#fff" surfaceScale="2">
              <feDistantLight azimuth="45" elevation="60" />
            </feDiffuseLighting>
            <feComposite operator="in" in2="SourceGraphic" />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" filter="url(#paper-texture)" />

        <motion.g 
          ref={gRef}
          animate={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`
          }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          {/* Major Roads with Names */}
          <g>
            {MAJOR_ROADS.map((road, i) => {
              const lineGenerator = d3.line<number[]>()
                .x(d => projection([d[1], d[0]])?.[0] || 0)
                .y(d => projection([d[1], d[0]])?.[1] || 0)
                .curve(d3.curveCatmullRom.alpha(0.5));

              const pathData = lineGenerator(road.points) || '';
              const id = `road-${i}`;

              return (
                <g key={id}>
                  <path
                    id={id}
                    d={pathData}
                    fill="none"
                    stroke={themeColors.road}
                    strokeWidth="8"
                    strokeLinecap="round"
                    filter="url(#sketchy-texture)"
                    className="opacity-40"
                  />
                  <text className="text-[8px] font-black uppercase tracking-widest fill-[#40513B]/60">
                    <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
                      {road.name}
                    </textPath>
                  </text>
                </g>
              );
            })}
          </g>
          {/* Deer Zones (Glowing) */}
          <g>
            {deerZones.map(zone => {
              const [x, y] = projection([zone.center[1], zone.center[0]]) || [0, 0];
              const riskColor = CARTOON_COLORS.risk[zone.riskLevel];
              const isHighRisk = zone.riskLevel === 'high' || zone.riskLevel === 'extreme';
              
              return (
                <g key={zone.id}>
                  {/* Outer Aura */}
                  <motion.circle
                    cx={x}
                    cy={y}
                    r={zone.radius / 8}
                    fill={riskColor}
                    fillOpacity={isHighRisk ? 0.15 : 0.1}
                    filter={`url(#glow-${zone.riskLevel})`}
                    animate={{ 
                      scale: isHighRisk ? [1, 1.2, 1] : [0.95, 1.05, 0.95],
                      opacity: isHighRisk ? [0.1, 0.3, 0.1] : [0.05, 0.15, 0.05]
                    }}
                    transition={{ 
                      duration: zone.riskLevel === 'extreme' ? 1.5 : 3, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  
                  {/* Middle Glow */}
                  <motion.circle
                    cx={x}
                    cy={y}
                    r={zone.radius / 12}
                    fill={riskColor}
                    fillOpacity={isHighRisk ? 0.3 : 0.2}
                    animate={{ 
                      scale: isHighRisk ? [0.9, 1.1, 0.9] : [1, 1, 1],
                    }}
                    transition={{ 
                      duration: zone.riskLevel === 'extreme' ? 1 : 2, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />

                  {/* Core Circle */}
                  <circle
                    cx={x}
                    cy={y}
                    r={zone.radius / 20}
                    fill={riskColor}
                    fillOpacity={isHighRisk ? 0.6 : 0.4}
                    stroke="white"
                    strokeWidth={isHighRisk ? 2 : 1}
                    strokeDasharray={isHighRisk ? "none" : "4 4"}
                    filter="url(#hand-drawn)"
                  />

                  {/* Risk Icon for Extreme */}
                  {zone.riskLevel === 'extreme' && (
                    <g transform={`translate(${x - 8}, ${y - 8})`}>
                      <motion.g
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                      >
                        <Skull size={16} className="text-white drop-shadow-lg" />
                      </motion.g>
                    </g>
                  )}
                  {zone.riskLevel === 'high' && (
                    <g transform={`translate(${x - 8}, ${y - 8})`}>
                      <AlertTriangle size={16} className="text-white drop-shadow-lg" />
                    </g>
                  )}
                </g>
              );
            })}
          </g>

        {/* Route Path (Travel Line) */}
        {route.length > 1 && (
          <g>
            {/* Outer Glow/Shadow */}
            <motion.path
              d={d3.line<RouteStep>()
                .x(d => projection([d.lng, d.lat])?.[0] || 0)
                .y(d => projection([d.lng, d.lat])?.[1] || 0)
                .curve(d3.curveCatmullRom.alpha(0.5))(route.filter(r => typeof r.lat === 'number' && typeof r.lng === 'number')) || ''}
              fill="none"
              stroke="#9333EA"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-20 blur-[2px]"
              transition={{ duration: 0.5 }}
            />
            {/* White Border */}
            <motion.path
              d={d3.line<RouteStep>()
                .x(d => projection([d.lng, d.lat])?.[0] || 0)
                .y(d => projection([d.lng, d.lat])?.[1] || 0)
                .curve(d3.curveCatmullRom.alpha(0.5))(route.filter(r => typeof r.lat === 'number' && typeof r.lng === 'number')) || ''}
              fill="none"
              stroke="white"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#hand-drawn)"
              className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
              transition={{ duration: 0.5 }}
            />
            {/* Main Waze Purple Path */}
            <motion.path
              d={d3.line<RouteStep>()
                .x(d => projection([d.lng, d.lat])?.[0] || 0)
                .y(d => projection([d.lng, d.lat])?.[1] || 0)
                .curve(d3.curveCatmullRom.alpha(0.5))(route.filter(r => typeof r.lat === 'number' && typeof r.lng === 'number')) || ''}
              fill="none"
              stroke={isPreview ? "#60A5FA" : "#A855F7"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={isPreview ? "10, 10" : "none"}
              filter={isPreview ? "url(#hand-drawn)" : "url(#sketchy-texture)"}
              animate={isPreview ? { strokeDashoffset: [0, -20] } : {}}
              transition={isPreview ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0.5 }}
            />
            {/* Destination Marker */}
            {(() => {
              const last = route[route.length - 1];
              const [x, y] = projection([last.lng, last.lat]) || [0, 0];
              return (
                <g transform={`translate(${x}, ${y})`}>
                  {/* Arrival Pulse Rings */}
                  <AnimatePresence>
                    {isNearDestination && (
                      <>
                        <motion.circle
                          r="12"
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="2"
                          initial={{ scale: 1, opacity: 0.8 }}
                          animate={{ scale: 3, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                        />
                        <motion.circle
                          r="12"
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="2"
                          initial={{ scale: 1, opacity: 0.8 }}
                          animate={{ scale: 2.5, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut", delay: 0.5 }}
                        />
                      </>
                    )}
                  </AnimatePresence>

                  <motion.circle
                    r="12"
                    fill="#EF4444"
                    initial={{ scale: 0 }}
                    animate={{ 
                      scale: isNearDestination ? [1, 1.3, 1] : 1,
                    }}
                    transition={{ 
                      scale: { repeat: Infinity, duration: isNearDestination ? 1 : 2 }
                    }}
                    filter="url(#hand-drawn)"
                  />
                  <MapPin size={16} className="text-white -translate-x-2 -translate-y-4" />
                </g>
              );
            })()}
          </g>
        )}

        {/* Roads (Simulated - now only if no route) */}
        {route.length <= 1 && (
          <g className="opacity-0" />
        )}

        {/* User Reported Wildlife Hazards */}
        <g>
          {wildlifeReports.map((report) => {
            const [x, y] = projection([report.lng, report.lat]) || [0, 0];
            const now = Date.now();
            const lifeRemaining = (report.expiresAt - now) / (report.expiresAt - report.timestamp);
            const opacity = Math.max(0.2, lifeRemaining);

            const getIcon = (type: WildlifeType) => {
              switch(type) {
                case 'deer-live': return '🦌';
                case 'deer-dead': return '🦴';
                case 'bear': return '🐻';
                case 'raccoon': return '🦝';
                case 'squirrel': return '🐿️';
                default: return '🐾';
              }
            };

            const getColor = (type: WildlifeType) => {
              switch(type) {
                case 'deer-live': return '#FB923C';
                case 'bear': return '#78350F';
                case 'deer-dead': return '#78716C';
                default: return '#40513B';
              }
            };

            return (
              <g key={report.id} transform={`translate(${x}, ${y})`}>
                <motion.g
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity }}
                  transition={{ type: 'spring', damping: 12 }}
                  filter="url(#hand-drawn)"
                >
                  <circle r="15" fill={getColor(report.type)} fillOpacity="0.2" />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="text-xl select-none"
                  >
                    {getIcon(report.type)}
                  </text>
                  {report.reportCount > 1 && (
                    <circle cx="10" cy="-10" r="6" fill="#EF4444" stroke="white" strokeWidth="1" />
                  )}
                </motion.g>
              </g>
            );
          })}
        </g>

        {/* Points of Interest */}
        <g>
          {points.map((pt, i) => {
            const [x, y] = projection([pt.lng, pt.lat]) || [0, 0];
            const getPOIStyles = (type: string) => {
              switch(type) {
                case 'peak': return { bg: '#FEF3C7', icon: <MountainIcon size={14} />, color: '#92400E' };
                case 'cabin': return { bg: '#DCFCE7', icon: <Home size={14} />, color: '#166534' };
                case 'overlook': return { bg: '#DBEAFE', icon: <Binoculars size={14} />, color: '#1E40AF' };
                case 'deer-crossing': return { bg: '#FFEDD5', icon: <AlertTriangle size={14} />, color: '#9A3412' };
                default: return { bg: '#F3F4F6', icon: <MapPin size={14} />, color: '#374151' };
              }
            };
            const styles = getPOIStyles(pt.type);

            return (
              <g key={i} transform={`translate(${x}, ${y})`}>
                <motion.g
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  {/* Marker Shadow */}
                  <ellipse cx="0" cy="4" rx="10" ry="4" fill="black" fillOpacity="0.1" className="blur-[1px]" />
                  
                  {/* Marker Body */}
                  <motion.g
                    whileHover={{ scale: 1.1, y: -2 }}
                    filter="url(#hand-drawn)"
                  >
                    <rect 
                      x="-12" 
                      y="-24" 
                      width="24" 
                      height="24" 
                      rx="6" 
                      fill={styles.bg} 
                      stroke={styles.color} 
                      strokeWidth="1.5" 
                    />
                    <g transform="translate(-7, -19)" style={{ color: styles.color }}>
                      {styles.icon}
                    </g>
                  </motion.g>

                  <text
                    y={12}
                    textAnchor="middle"
                    className="text-[9px] font-black uppercase tracking-widest"
                    style={{ fill: styles.color, filter: 'drop-shadow(0 1px 1px rgba(255,255,255,0.5))' }}
                  >
                    {pt.label}
                  </text>
                </motion.g>
              </g>
            );
          })}
        </g>

        {/* Car Avatar */}
        <motion.g
          animate={{
            x: projection([carLocation[1], carLocation[0]])?.[0] || 0,
            y: projection([carLocation[1], carLocation[0]])?.[1] || 0,
            rotate: carHeading
          }}
          transition={{ type: 'spring', stiffness: 50, damping: 15 }}
        >
          {/* Car Shadow */}
          <ellipse cx="0" cy="12" rx="18" ry="8" fill="black" fillOpacity="0.2" className="blur-[2px]" />
          
          {carModelId === 'sedan' && (
            <g transform="translate(-15, -10)">
              {/* 3D effect body */}
              <rect width="30" height="20" rx="6" fill="#EF4444" stroke="#991B1B" strokeWidth="2" filter="url(#hand-drawn)" />
              <rect x="2" y="2" width="26" height="16" rx="4" fill="#DC2626" />
              <rect x="5" y="4" width="20" height="8" rx="2" fill="#BAE6FD" stroke="#000" strokeWidth="1" />
              <circle cx="28" cy="5" r="2" fill="#FEF08A" />
              <circle cx="28" cy="15" r="2" fill="#FEF08A" />
            </g>
          )}
          {carModelId === 'suv' && (
            <g transform="translate(-15, -12)">
              <rect width="30" height="24" rx="4" fill="#3B82F6" stroke="#1E3A8A" strokeWidth="2" filter="url(#hand-drawn)" />
              <rect x="2" y="2" width="26" height="20" rx="3" fill="#2563EB" />
              <rect x="4" y="4" width="22" height="12" rx="2" fill="#BAE6FD" stroke="#000" strokeWidth="1" />
              <rect x="2" y="18" width="26" height="4" fill="#1E293B" />
              <circle cx="28" cy="6" r="2.5" fill="#FEF08A" />
              <circle cx="28" cy="18" r="2.5" fill="#FEF08A" />
            </g>
          )}
          {carModelId === 'truck' && (
            <g transform="translate(-15, -10)">
              <rect width="18" height="20" rx="2" fill="#10B981" stroke="#065F46" strokeWidth="2" filter="url(#hand-drawn)" />
              <rect x="18" y="4" width="12" height="12" fill="#10B981" stroke="#065F46" strokeWidth="2" filter="url(#hand-drawn)" />
              <rect x="4" y="4" width="10" height="12" rx="1" fill="#BAE6FD" stroke="#000" strokeWidth="1" />
              <circle cx="16" cy="5" r="2" fill="#FEF08A" />
              <circle cx="16" cy="15" r="2" fill="#FEF08A" />
            </g>
          )}
          {carModelId === 'van' && (
            <g transform="translate(-15, -11)">
              <rect width="32" height="22" rx="4" fill="#F59E0B" stroke="#92400E" strokeWidth="2" filter="url(#hand-drawn)" />
              <rect x="2" y="2" width="28" height="18" rx="3" fill="#D97706" />
              <rect x="4" y="4" width="8" height="14" rx="1" fill="#BAE6FD" stroke="#000" strokeWidth="1" />
              <rect x="14" y="4" width="14" height="14" rx="1" fill="#BAE6FD" stroke="#000" strokeWidth="1" />
              <circle cx="30" cy="6" r="2" fill="#FEF08A" />
              <circle cx="30" cy="16" r="2" fill="#FEF08A" />
            </g>
          )}
          {carModelId === 'sports' && (
            <g transform="translate(-15, -9)">
              <path d="M0,5 L25,0 L30,5 L30,13 L25,18 L0,13 Z" fill="#8B5CF6" stroke="#4C1D95" strokeWidth="2" filter="url(#hand-drawn)" />
              <path d="M2,6 L23,2 L28,6 L28,12 L23,16 L2,12 Z" fill="#7C3AED" />
              <path d="M5,4 L20,2 L22,6 L22,12 L20,16 L5,14 Z" fill="#BAE6FD" stroke="#000" strokeWidth="1" />
              <circle cx="28" cy="4" r="1.5" fill="#FEF08A" />
              <circle cx="28" cy="14" r="1.5" fill="#FEF08A" />
            </g>
          )}
        </motion.g>
      </motion.g>
    </svg>

      {/* Compass / Map Controls Overlay */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
        <button 
          onClick={() => {
            if (svgRef.current) {
              d3.select(svgRef.current).transition().duration(750).call(
                d3.zoom<SVGSVGElement, unknown>().transform as any, 
                d3.zoomIdentity
              );
            }
          }}
          className="w-12 h-12 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center border-2 border-[#40513B]/20 hover:scale-110 transition-transform group"
          title="Recenter Map"
        >
          <MapPin className="text-[#40513B] group-hover:animate-bounce" size={20} />
        </button>
        <button className="w-12 h-12 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center border-2 border-[#40513B]/20 hover:scale-110 transition-transform">
          <MountainIcon className="text-[#40513B]" />
        </button>
      </div>
    </div>
  );
};
