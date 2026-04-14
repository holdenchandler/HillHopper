import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RouteStep, RiskLevel, WildlifeReport, WildlifeType } from '../../lib/types';
import { 
  Navigation, 
  ChevronRight, 
  AlertCircle, 
  Wind, 
  Mountain, 
  Clock, 
  MapPin,
  ShieldAlert,
  Skull,
  PawPrint
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";

interface NavigationOverlayProps {
  currentStep: RouteStep;
  nextStep?: RouteStep;
  deerRisk: { level: RiskLevel; reason: string };
  wildlifeReports?: WildlifeReport[];
  carLocation?: [number, number];
  eta: string;
  distanceRemaining: string;
  onReportHazard?: (type: WildlifeType) => void;
}

const RISK_COLORS = {
  low: 'bg-green-100 text-green-700 border-green-200',
  moderate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  extreme: 'bg-red-100 text-red-700 border-red-200'
};

export const NavigationOverlay: React.FC<NavigationOverlayProps> = ({
  currentStep,
  nextStep,
  deerRisk,
  wildlifeReports = [],
  carLocation,
  eta,
  distanceRemaining,
  onReportHazard
}) => {
  // Find nearby user-reported hazards
  const nearbyHazard = carLocation ? wildlifeReports.find(r => {
    const dist = Math.sqrt(Math.pow(r.lat - carLocation[0], 2) + Math.pow(r.lng - carLocation[1], 2));
    return dist < 0.005; // Within 500m
  }) : null;

  const getHazardLabel = (type: WildlifeType) => {
    switch(type) {
      case 'deer-live': return 'Live Deer Spotted!';
      case 'deer-dead': return 'Roadkill Hazard Ahead';
      case 'bear': return 'Bear Sighting Nearby!';
      case 'raccoon': return 'Raccoon on Roadway';
      case 'squirrel': return 'Squirrel Activity';
      default: return 'Wildlife Activity';
    }
  };

  const getHazardIcon = (type: WildlifeType) => {
    switch(type) {
      case 'deer-live': return <ShieldAlert className="text-orange-700" />;
      case 'bear': return <ShieldAlert className="text-amber-900" />;
      case 'deer-dead': return <Skull className="text-stone-700" />;
      default: return <AlertCircle className="text-[#40513B]" />;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
      {/* Top Bar: Current Instruction & Hazard Alerts */}
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="w-full max-w-xl mx-auto pointer-events-auto space-y-4"
      >
        <Card className="bg-white/95 backdrop-blur-md border-4 border-[#40513B]/20 shadow-2xl rounded-3xl p-6 overflow-hidden relative">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-[#40513B] rounded-2xl flex items-center justify-center shadow-lg">
              <Navigation className="text-white rotate-45" size={32} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-[#141414] leading-tight">
                {currentStep.instruction}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-[#40513B]/60 font-bold uppercase text-xs tracking-widest">
                <Clock size={14} />
                <span>{currentStep.distance}m remaining</span>
              </div>
            </div>
          </div>

          {currentStep.hazardInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-4 p-3 bg-orange-50 border-2 border-orange-200 rounded-xl flex items-center gap-3"
            >
              <AlertCircle className="text-orange-500 shrink-0" />
              <p className="text-sm font-bold text-orange-700">{currentStep.hazardInfo}</p>
            </motion.div>
          )}
        </Card>

        {/* User Reported Hazard Alert */}
        <AnimatePresence>
          {nearbyHazard && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
            >
              <Card className={`p-4 border-4 rounded-2xl shadow-xl flex items-center gap-4 ${
                nearbyHazard.type === 'bear' ? 'bg-amber-50 border-amber-400' : 
                nearbyHazard.type.includes('deer') ? 'bg-orange-50 border-orange-400' : 'bg-slate-50 border-slate-400'
              }`}>
                <div className={`p-2 rounded-xl ${
                  nearbyHazard.type === 'bear' ? 'bg-amber-200' : 
                  nearbyHazard.type.includes('deer') ? 'bg-orange-200' : 'bg-slate-200'
                }`}>
                  {getHazardIcon(nearbyHazard.type)}
                </div>
                <div className="flex-1">
                  <h4 className="font-black uppercase text-xs tracking-widest text-[#141414]">
                    {getHazardLabel(nearbyHazard.type)}
                  </h4>
                  <p className="text-[10px] font-bold text-[#40513B]/60 uppercase">
                    Reported by {nearbyHazard.reportCount} Hopper{nearbyHazard.reportCount > 1 ? 's' : ''} nearby
                  </p>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-3 h-3 rounded-full bg-red-500"
                />
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Middle: Deer Risk Alert */}
      <AnimatePresence>
        {deerRisk.level !== 'low' && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-72 pointer-events-auto"
          >
            <Card className={`p-4 border-4 rounded-3xl shadow-xl ${RISK_COLORS[deerRisk.level]}`}>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/50 rounded-xl">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 className="font-black uppercase text-sm tracking-tighter">Deer Risk: {deerRisk.level}</h3>
                  <p className="text-xs font-medium mt-1 leading-relaxed">{deerRisk.reason}</p>
                  <p className="text-[10px] italic mt-2 opacity-70">"Keep those eyes peeled, Hopper!" 🦌</p>
                </div>
              </div>
              
              {/* Animated Forest Edge Indicator */}
              <div className="mt-3 h-2 w-full bg-black/5 rounded-full overflow-hidden">
                <motion.div
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className={`h-full w-1/3 blur-sm ${
                    deerRisk.level === 'extreme' ? 'bg-red-500' : 'bg-orange-400'
                  }`}
                />
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Bar: Stats & Next Step */}
      <div className="flex justify-between items-end relative">
        <motion.div
          initial={{ x: -100 }}
          animate={{ x: 0 }}
          className="pointer-events-auto"
        >
          <Card className="bg-white/95 backdrop-blur-md border-4 border-[#40513B]/20 rounded-3xl p-4 shadow-xl flex items-center gap-6">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase text-[#40513B]/50 tracking-widest">Arrival</p>
              <p className="text-2xl font-black text-[#141414]">{eta}</p>
            </div>
            <div className="w-px h-10 bg-[#40513B]/10" />
            <div className="text-center">
              <p className="text-[10px] font-black uppercase text-[#40513B]/50 tracking-widest">Distance</p>
              <p className="text-2xl font-black text-[#141414]">{distanceRemaining}</p>
            </div>
          </Card>
        </motion.div>

        {/* Thumbnail Wildlife Hazard Button */}
        <div className="absolute right-0 bottom-24 pointer-events-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="w-10 h-10 rounded-full bg-[#40513B] border-2 border-white shadow-lg hover:scale-110 transition-transform"
              >
                <PawPrint className="text-white" size={20} />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-48 p-2 rounded-2xl border-2 border-[#40513B]/20 shadow-xl bg-white/95 backdrop-blur">
              <div className="flex flex-col gap-1">
                {[
                  { id: 'deer-live', label: 'Deer Seen', icon: '🦌' },
                  { id: 'deer-dead', label: 'Dead Deer', icon: '🦴' },
                  { id: 'bear', label: 'Bear', icon: '🐻' },
                  { id: 'raccoon', label: 'Raccoon', icon: '🦝' },
                  { id: 'squirrel', label: 'Squirrel', icon: '🐿️' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onReportHazard?.(item.id as WildlifeType)}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-[#40513B]/5 rounded-xl transition-colors text-left"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-xs font-bold text-[#141414]">{item.label}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {nextStep && (
          <motion.div
            initial={{ x: 100 }}
            animate={{ x: 0 }}
            className="pointer-events-auto"
          >
            <Card className="bg-[#40513B] text-white rounded-3xl p-4 shadow-xl flex items-center gap-4 max-w-xs">
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase text-white/50 tracking-widest">Next</p>
                <p className="text-sm font-bold truncate">{nextStep.instruction}</p>
              </div>
              <ChevronRight className="text-white/50" />
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};
