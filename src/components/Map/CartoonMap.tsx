import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { DeerZone, MountainPoint, WildlifeReport, WildlifeType } from '../../lib/types';
import { Trees as TreeIcon, Mountain as MountainIcon, Tent, Camera, AlertTriangle, Skull } from 'lucide-react';

interface CartoonMapProps {
  center: [number, number];
  zoom: number;
  deerZones: DeerZone[];
  wildlifeReports?: WildlifeReport[];
  points: MountainPoint[];
  carLocation: [number, number];
  carHeading: number;
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

export const CartoonMap: React.FC<CartoonMapProps> = ({
  center,
  zoom,
  deerZones,
  wildlifeReports = [],
  points,
  carLocation,
  carHeading
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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

  // D3 Projection
  const projection = d3.geoMercator()
    .center([center[1], center[0]])
    .scale(zoom * 100000)
    .translate([dimensions.width / 2, dimensions.height / 2]);

  return (
    <div className="relative w-full h-full bg-[#E5E7EB] overflow-hidden rounded-3xl border-8 border-[#40513B]/20 shadow-inner">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="cursor-grab active:cursor-grabbing"
        style={{ background: CARTOON_COLORS.grass }}
      >
        {/* Decorative "Hand-drawn" Grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Deer Zones (Glowing) */}
        <g>
          {deerZones.map(zone => {
            const [x, y] = projection([zone.center[1], zone.center[0]]) || [0, 0];
            return (
              <g key={zone.id}>
                <motion.circle
                  cx={x}
                  cy={y}
                  r={zone.radius / 10}
                  fill={CARTOON_COLORS.risk[zone.riskLevel]}
                  fillOpacity={0.2}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: [0.9, 1.1, 0.9],
                    opacity: [0.2, 0.4, 0.2]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={zone.radius / 20}
                  fill="none"
                  stroke={CARTOON_COLORS.risk[zone.riskLevel]}
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              </g>
            );
          })}
        </g>

        {/* Roads (Simulated) */}
        <path
          d={`M ${dimensions.width/2 - 200} ${dimensions.height/2 + 200} Q ${dimensions.width/2} ${dimensions.height/2} ${dimensions.width/2 + 200} ${dimensions.height/2 - 200}`}
          fill="none"
          stroke={CARTOON_COLORS.road}
          strokeWidth="12"
          strokeLinecap="round"
          className="opacity-80"
        />

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
            return (
              <g key={i} transform={`translate(${x}, ${y})`}>
                <motion.g
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  {pt.type === 'peak' && <MountainIcon size={24} className="text-[#40513B]" />}
                  {pt.type === 'cabin' && <Tent size={24} className="text-[#8B4513]" />}
                  {pt.type === 'overlook' && <Camera size={24} className="text-[#6096B4]" />}
                  {pt.type === 'deer-crossing' && <AlertTriangle size={24} className="text-orange-500" />}
                  <text
                    y={30}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-[#40513B] font-sans uppercase tracking-wider"
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
          <g transform="translate(-15, -10)">
            {/* Cartoon Car Body */}
            <rect width="30" height="20" rx="6" fill="#EF4444" stroke="#000" strokeWidth="2" />
            <rect x="5" y="2" width="20" height="10" rx="2" fill="#BAE6FD" stroke="#000" strokeWidth="1" />
            {/* Headlights (Glow at night) */}
            <circle cx="28" cy="5" r="2" fill="#FEF08A" />
            <circle cx="28" cy="15" r="2" fill="#FEF08A" />
          </g>
        </motion.g>
      </svg>

      {/* Compass / Map Controls Overlay */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
        <button className="w-12 h-12 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center border-2 border-[#40513B]/20 hover:scale-110 transition-transform">
          <MountainIcon className="text-[#40513B]" />
        </button>
      </div>
    </div>
  );
};
