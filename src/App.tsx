import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mountain, 
  Navigation as NavIcon, 
  Search as SearchIcon, 
  Settings as SettingsIcon,
  AlertTriangle,
  Cloud,
  Wind,
  Compass,
  Home as HomeIcon,
  Map as MapIcon,
  MapPin,
  ShieldAlert,
  ChevronRight,
  Info,
  Camera
} from 'lucide-react';
import { CartoonMap } from './components/Map/CartoonMap';
import { NavigationOverlay } from './components/Navigation/NavigationOverlay';
import { USSearch } from './components/Search/USSearch';
import { calculateWildlifeRisk, getWildlifeZones, createWildlifeReport } from './services/deerService';
import { getMountainRoute } from './services/routingService';
import { RiskLevel, RouteStep, DeerZone, MountainPoint, WildlifeReport, WildlifeType } from './lib/types';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';

type AppScreen = 'home' | 'navigation' | 'search' | 'settings' | 'hazards' | 'location-setup';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [isNavigating, setIsNavigating] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [carLocation, setCarLocation] = useState<[number, number]>([41.3242, -74.8018]); // Default to Milford, PA
  const [carHeading, setCarHeading] = useState(45);
  const [searchRadius, setSearchRadius] = useState(25);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'active' | 'denied'>('pending');
  const [deerRisk, setDeerRisk] = useState<{ level: RiskLevel; reason: string }>({ level: 'low', reason: '' });
  const [deerZones, setDeerZones] = useState<DeerZone[]>([]);
  const [wildlifeReports, setWildlifeReports] = useState<WildlifeReport[]>([]);
  const [route, setRoute] = useState<RouteStep[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const ONBOARDING_STEPS = [
    {
      title: "Welcome to the Hills!",
      desc: "HillHopper is your cozy companion for mountain driving. We prioritize safety and adventure.",
      icon: <Mountain size={64} className="text-[#40513B]" />
    },
    {
      title: "Deer-Risk Zones",
      desc: "Our dynamic system predicts deer activity based on time, season, and terrain. Watch for the glow!",
      icon: <ShieldAlert size={64} className="text-orange-500" />
    },
    {
      title: "Mountain Flow Engine",
      desc: "We avoid steep grades and washed-out roads, while highlighting the best scenic overlooks.",
      icon: <Wind size={64} className="text-blue-500" />
    }
  ];

  const renderOnboarding = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#40513B] flex items-center justify-center p-6"
    >
      <Card className="w-full max-w-sm bg-white rounded-[3rem] p-8 flex flex-col items-center text-center gap-6 shadow-2xl border-0">
        <motion.div
          key={onboardingStep}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-32 h-32 bg-[#40513B]/5 rounded-full flex items-center justify-center"
        >
          {ONBOARDING_STEPS[onboardingStep].icon}
        </motion.div>
        
        <div>
          <h2 className="text-2xl font-black mb-2">{ONBOARDING_STEPS[onboardingStep].title}</h2>
          <p className="text-[#40513B]/60 font-medium leading-relaxed">{ONBOARDING_STEPS[onboardingStep].desc}</p>
        </div>

        <div className="flex gap-2">
          {ONBOARDING_STEPS.map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all ${i === onboardingStep ? 'w-8 bg-[#40513B]' : 'w-2 bg-[#40513B]/20'}`} />
          ))}
        </div>

        <Button 
          className="w-full h-14 rounded-2xl bg-[#40513B] text-white font-black uppercase tracking-widest"
          onClick={() => {
            if (onboardingStep < ONBOARDING_STEPS.length - 1) {
              setOnboardingStep(onboardingStep + 1);
            } else {
              setShowOnboarding(false);
            }
          }}
        >
          {onboardingStep === ONBOARDING_STEPS.length - 1 ? "Let's Hop!" : "Next"}
        </Button>
      </Card>
    </motion.div>
  );

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const MOCK_POINTS: MountainPoint[] = [
    { lat: 41.33, lng: -74.81, elevation: 1200, type: 'peak', label: 'High Point' },
    { lat: 41.31, lng: -74.79, elevation: 800, type: 'overlook', label: 'Delaware View' },
    { lat: 41.32, lng: -74.805, elevation: 950, type: 'cabin', label: 'Cozy Cabin' },
  ];

  useEffect(() => {
    if (!showOnboarding) {
      requestLocation();
    }
  }, [showOnboarding]);

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setCarLocation([latitude, longitude]);
          setLocationStatus('active');
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationStatus('denied');
          setScreen('location-setup');
        }
      );
    } else {
      setLocationStatus('denied');
      setScreen('location-setup');
    }
  };

  const handleManualLocation = async (query: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=us&limit=1`,
        { headers: { 'User-Agent': 'HillHopper-App/1.0' } }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setUserLocation([lat, lon]);
        setCarLocation([lat, lon]);
        setLocationStatus('active');
        setScreen('home');
      }
    } catch (error) {
      console.error("Manual location failed", error);
    }
  };

  useEffect(() => {
    // Update deer risk periodically
    const updateRisk = () => {
      const risk = calculateWildlifeRisk(carLocation[0], carLocation[1], wildlifeReports);
      setDeerRisk(risk);
      setDeerZones(getWildlifeZones(carLocation, wildlifeReports));
    };

    // Clean up expired reports
    const cleanupReports = () => {
      const now = Date.now();
      setWildlifeReports(prev => prev.filter(r => r.expiresAt > now));
    };

    updateRisk();
    const interval = setInterval(() => {
      updateRisk();
      cleanupReports();
    }, 30000);
    return () => clearInterval(interval);
  }, [carLocation, wildlifeReports]);

  const startNavigation = async (dest: [number, number]) => {
    try {
      const newRoute = await getMountainRoute(carLocation, dest);
      setRoute(newRoute);
      setCurrentStepIndex(0);
      setIsNavigating(true);
      setScreen('navigation');
    } catch (error) {
      console.error("Load failed", error);
    }
  };

  const renderScreen = () => {
    if (locationStatus === 'pending' && !showOnboarding) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Compass size={48} className="text-[#40513B]" />
          </motion.div>
          <p className="text-[#40513B] font-black uppercase text-xs tracking-widest">Finding your mountain...</p>
        </div>
      );
    }

    switch (screen) {
      case 'home':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-6 p-6 h-full"
          >
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-black text-[#141414] tracking-tighter flex items-center gap-2">
                  HillHopper <Mountain className="text-[#40513B]" size={32} />
                </h1>
                <p className="text-[#40513B]/60 font-bold uppercase text-xs tracking-widest mt-1">Milford, Pennsylvania</p>
              </div>
              <Button variant="outline" size="icon" className="rounded-2xl border-4 border-[#40513B]/10" onClick={() => setScreen('settings')}>
                <SettingsIcon />
              </Button>
            </div>

            <Card className="bg-gradient-to-br from-[#40513B] to-[#2D3A2A] text-white p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden border-0">
              <div className="relative z-10">
                <Badge className="bg-white/20 text-white border-0 mb-4 font-black uppercase tracking-widest">Live Conditions</Badge>
                <h2 className="text-3xl font-black leading-tight">Deer Activity is <span className="text-yellow-300">Moderate</span></h2>
                <p className="text-white/70 mt-2 font-medium">Dusk is approaching. Watch the forest edges on Mountain Rd.</p>
                <div className="flex gap-4 mt-6">
                  <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-xl">
                    <Cloud size={16} /> <span className="text-sm font-bold">Foggy</span>
                  </div>
                  <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-xl">
                    <Wind size={16} /> <span className="text-sm font-bold">12mph</span>
                  </div>
                </div>
              </div>
              {/* Decorative Background Elements */}
              <div className="absolute -right-10 -bottom-10 opacity-10">
                <Mountain size={200} />
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => setScreen('search')}
                className="h-32 rounded-[2rem] bg-white border-4 border-[#40513B]/10 text-[#141414] hover:bg-[#40513B]/5 flex flex-col gap-2 shadow-lg"
              >
                <SearchIcon size={32} className="text-[#40513B]" />
                <span className="font-black uppercase text-xs tracking-widest">Where to?</span>
              </Button>
              <Button 
                onClick={() => setScreen('hazards')}
                className="h-32 rounded-[2rem] bg-white border-4 border-[#40513B]/10 text-[#141414] hover:bg-[#40513B]/5 flex flex-col gap-2 shadow-lg"
              >
                <AlertTriangle size={32} className="text-orange-500" />
                <span className="font-black uppercase text-xs tracking-widest">Report Hazard</span>
              </Button>
            </div>

            <div className="flex-1 overflow-hidden">
              <h3 className="font-black uppercase text-xs tracking-widest text-[#40513B]/50 mb-4">Recent Adventures</h3>
              <div className="space-y-3">
                {['High Point State Park', 'Grey Towers', 'Dingmans Falls'].map((place, i) => (
                  <Card key={i} className="p-4 rounded-2xl border-4 border-[#40513B]/5 hover:border-[#40513B]/20 transition-all cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#40513B]/10 rounded-xl flex items-center justify-center">
                        <MapIcon size={20} className="text-[#40513B]" />
                      </div>
                      <span className="font-bold text-[#141414]">{place}</span>
                    </div>
                    <ChevronRight size={18} className="text-[#40513B]/30" />
                  </Card>
                ))}
              </div>
            </div>
          </motion.div>
        );
      case 'navigation':
        return (
          <div className="relative h-full">
            <CartoonMap 
              center={carLocation}
              zoom={14}
              deerZones={deerZones}
              wildlifeReports={wildlifeReports}
              points={MOCK_POINTS}
              carLocation={carLocation}
              carHeading={carHeading}
            />
            <NavigationOverlay 
              currentStep={route[currentStepIndex]}
              nextStep={route[currentStepIndex + 1]}
              deerRisk={deerRisk}
              wildlifeReports={wildlifeReports}
              carLocation={carLocation}
              eta="4:45 PM"
              distanceRemaining="12.4 mi"
              onReportHazard={(type) => {
                const report = createWildlifeReport(carLocation[0], carLocation[1], type);
                setWildlifeReports(prev => [...prev, report]);
              }}
            />
            <div className="absolute top-6 left-6 pointer-events-auto">
              <Button 
                variant="secondary" 
                className="rounded-2xl border-4 border-[#40513B]/10 bg-white/90 backdrop-blur font-black uppercase text-xs tracking-widest"
                onClick={() => {
                  setIsNavigating(false);
                  setScreen('home');
                }}
              >
                Exit
              </Button>
            </div>
          </div>
        );
      case 'search':
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 h-full bg-[#F5F5F0]"
          >
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" className="rounded-xl" onClick={() => setScreen('home')}>
                <HomeIcon />
              </Button>
              <h2 className="text-2xl font-black">Plan Your Route</h2>
            </div>
            <USSearch 
              onSelect={(lat, lng, label) => startNavigation([lat, lng])} 
              userLocation={userLocation || carLocation}
              searchRadius={searchRadius}
              onRadiusChange={setSearchRadius}
            />
            
            <div className="mt-12">
              <h3 className="font-black uppercase text-xs tracking-widest text-[#40513B]/50 mb-6">Mountain Categories</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Scenic Overlooks', icon: <Camera />, color: 'bg-blue-100 text-blue-600' },
                  { label: 'Hiking Trails', icon: <Wind />, color: 'bg-green-100 text-green-600' },
                  { label: 'Cozy Cabins', icon: <HomeIcon />, color: 'bg-orange-100 text-orange-600' },
                  { label: 'Wildlife Spots', icon: <ShieldAlert />, color: 'bg-yellow-100 text-yellow-600' },
                ].map((cat, i) => (
                  <Card key={i} className={`p-6 rounded-3xl border-0 shadow-md flex flex-col gap-3 ${cat.color}`}>
                    {cat.icon}
                    <span className="font-black text-sm leading-tight">{cat.label}</span>
                  </Card>
                ))}
              </div>
            </div>
          </motion.div>
        );
      case 'hazards':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 h-full bg-white"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black italic">Report Wildlife</h2>
              <Button variant="ghost" onClick={() => setScreen('home')}>Close</Button>
            </div>
            <p className="text-[#40513B]/60 font-medium mb-8">Help other Hoppers stay safe. What did you see?</p>
            
            <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[60vh] pb-8 pr-2">
              {[
                { 
                  id: 'deer-live',
                  label: 'Deer Seen', 
                  desc: 'Live deer crossing',
                  icon: '🦌', 
                  color: 'bg-orange-50 border-orange-200 text-orange-700' 
                },
                { 
                  id: 'deer-dead',
                  label: 'Dead Deer', 
                  desc: 'Carcass on roadway',
                  icon: '🦴', 
                  color: 'bg-stone-50 border-stone-200 text-stone-700' 
                },
                { 
                  id: 'bear',
                  label: 'Bear', 
                  desc: 'Bear sighting nearby',
                  icon: '🐻', 
                  color: 'bg-amber-50 border-amber-200 text-amber-900' 
                },
                { 
                  id: 'raccoon',
                  label: 'Raccoon', 
                  desc: 'Live or dead raccoon',
                  icon: '🦝', 
                  color: 'bg-slate-50 border-slate-200 text-slate-700' 
                },
                { 
                  id: 'squirrel',
                  label: 'Squirrel', 
                  desc: 'Live or dead squirrel',
                  icon: '🐿️', 
                  color: 'bg-orange-50 border-orange-100 text-orange-800' 
                },
              ].map((h) => (
                <Button 
                  key={h.id}
                  className={`h-28 rounded-3xl border-4 flex items-center justify-start px-6 gap-6 ${h.color} hover:scale-[1.02] transition-transform shadow-sm`}
                  variant="outline"
                  onClick={() => {
                    const report = createWildlifeReport(carLocation[0], carLocation[1], h.id as WildlifeType);
                    setWildlifeReports(prev => [...prev, report]);
                    setScreen('navigation');
                  }}
                >
                  <span className="text-4xl">{h.icon}</span>
                  <div className="text-left">
                    <span className="font-black uppercase text-lg tracking-tight block leading-none">{h.label}</span>
                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{h.desc}</span>
                  </div>
                </Button>
              ))}
            </div>
            
            <div className="mt-8 p-6 bg-[#40513B]/5 rounded-3xl border-2 border-dashed border-[#40513B]/20 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#40513B]/40">
                Your report helps strengthen local risk zones
              </p>
            </div>
          </motion.div>
        );
      case 'location-setup':
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 h-full flex flex-col items-center justify-center text-center gap-8"
          >
            <div className="w-24 h-24 bg-[#40513B]/10 rounded-full flex items-center justify-center">
              <MapPin size={48} className="text-[#40513B]" />
            </div>
            <div>
              <h2 className="text-3xl font-black mb-4">Where are you, Hopper?</h2>
              <p className="text-[#40513B]/60 font-medium leading-relaxed">
                We couldn't find your GPS. Please enter your ZIP code or nearest town to anchor your mountain adventure.
              </p>
            </div>
            <div className="w-full space-y-4">
              <USSearch 
                onSelect={(lat, lng) => {
                  setUserLocation([lat, lng]);
                  setCarLocation([lat, lng]);
                  setLocationStatus('active');
                  setScreen('home');
                }}
                userLocation={null}
                searchRadius={100} // Wide search for anchor
                placeholder="ZIP or Town (e.g. 18337, Milford)"
              />
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F5F5F0] font-sans text-[#141414] overflow-hidden">
      <div className="max-w-md mx-auto h-full shadow-2xl bg-white relative">
        <AnimatePresence mode="wait">
          {showOnboarding ? renderOnboarding() : renderScreen()}
        </AnimatePresence>

        {/* Global Navigation Bar (Only on certain screens) */}
        {['home', 'search', 'settings'].includes(screen) && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent">
            <Tabs value={screen} onValueChange={(v) => setScreen(v as AppScreen)} className="w-full">
              <TabsList className="w-full h-16 bg-[#40513B]/5 border-4 border-[#40513B]/10 rounded-2xl p-1">
                <TabsTrigger value="home" className="flex-1 rounded-xl data-[state=active]:bg-[#40513B] data-[state=active]:text-white transition-all">
                  <HomeIcon size={20} />
                </TabsTrigger>
                <TabsTrigger value="search" className="flex-1 rounded-xl data-[state=active]:bg-[#40513B] data-[state=active]:text-white transition-all">
                  <SearchIcon size={20} />
                </TabsTrigger>
                <TabsTrigger value="navigation" className="flex-1 rounded-xl data-[state=active]:bg-[#40513B] data-[state=active]:text-white transition-all" disabled={!isNavigating}>
                  <NavIcon size={20} />
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex-1 rounded-xl data-[state=active]:bg-[#40513B] data-[state=active]:text-white transition-all">
                  <SettingsIcon size={20} />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
