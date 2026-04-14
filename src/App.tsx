import React, { useState, useEffect, useRef } from 'react';
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
  Camera,
  ArrowLeft,
  LocateFixed,
  Palette,
  Check,
  Users,
  Heart,
  History as HistoryIcon,
  Star,
  XCircle
} from 'lucide-react';
import { 
  CATEGORIES, 
  CategoryLocation 
} from './lib/mountainData';
import { THEMES, Theme } from './lib/themes';
import { getDistance } from './lib/utils';
import { CartoonMap } from './components/Map/CartoonMap';
import { RealMap } from './components/Map/RealMap';
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
  const [mapType, setMapType] = useState<'cartoon' | 'real'>('cartoon');
  const [isNavigating, setIsNavigating] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [carLocation, setCarLocation] = useState<[number, number]>([41.3242, -74.8018]); // Default to Milford, PA
  const carLocationRef = useRef<[number, number]>(carLocation);
  
  useEffect(() => {
    carLocationRef.current = carLocation;
  }, [carLocation]);

  const [carHeading, setCarHeading] = useState(45);
  const [searchRadius, setSearchRadius] = useState(25);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const [favorites, setFavorites] = useState<CategoryLocation[]>([]);
  const [navHistory, setNavHistory] = useState<CategoryLocation[]>([]);
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

  useEffect(() => {
    // Load Google Maps API once
    const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
    if (apiKey && !(window as any).google?.maps) {
      // Check if script already exists in DOM
      const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }
  }, []);

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isNavigating && route.length > 0) {
      interval = setInterval(() => {
        setCurrentStepIndex(prev => {
          const next = prev + 1;
          if (next < route.length) {
            const nextStep = route[next];
            const currentLoc = carLocationRef.current;
            
            // Calculate heading
            const dy = nextStep.lat - currentLoc[0];
            const dx = nextStep.lng - currentLoc[1];
            const angle = Math.atan2(dx, dy) * (180 / Math.PI);
            
            if (!isNaN(angle)) {
              setCarHeading(angle);
            }
            
            setCarLocation([nextStep.lat, nextStep.lng]);
            return next;
          } else {
            setIsNavigating(false);
            setScreen('home');
            return prev;
          }
        });
      }, 2000); // Advance every 2 seconds for demo
    }
    return () => clearInterval(interval);
  }, [isNavigating, route]);

  const startNavigation = async (dest: [number, number], name?: string) => {
    console.log("Starting navigation to", dest, name);
    try {
      const newRoute = await getMountainRoute(carLocation, dest);
      console.log("Route calculated:", newRoute);
      setRoute(newRoute);
      setCurrentStepIndex(0);
      setIsNavigating(true);
      setScreen('navigation');
      
      if (name) {
        const newHistoryItem = { name, lat: dest[0], lng: dest[1] };
        setNavHistory(prev => {
          const filtered = prev.filter(h => h.name !== name);
          return [newHistoryItem, ...filtered].slice(0, 10);
        });
      }
    } catch (error) {
      console.error("Load failed", error);
    }
  };

  const toggleFavorite = (loc: CategoryLocation) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.name === loc.name);
      if (exists) {
        return prev.filter(f => f.name !== loc.name);
      }
      return [loc, ...prev];
    });
  };

  const locateMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCarLocation([latitude, longitude]);
          setUserLocation([latitude, longitude]);
          setLocationStatus('active');
        },
        (error) => {
          console.error("Locate me failed:", error);
        }
      );
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

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setScreen('hazards')}
              className="bg-orange-100 border-4 border-orange-200 rounded-[2rem] p-4 flex items-center gap-4 cursor-pointer shadow-sm"
            >
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Users size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-black uppercase text-xs tracking-widest text-orange-700">Become a Hopper</h3>
                <p className="text-[10px] font-bold text-orange-800/60 uppercase tracking-tight">Help the community by reporting deer sightings</p>
              </div>
              <ChevronRight size={20} className="text-orange-500" />
            </motion.div>

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
              <div className="space-y-3 overflow-y-auto max-h-[30vh] pr-2">
                {[
                  { name: 'High Point State Park', lat: 41.3300, lng: -74.6600 },
                  { name: 'Grey Towers', lat: 41.3300, lng: -74.8100 },
                  { name: 'Dingmans Falls', lat: 41.2300, lng: -74.8900 }
                ].map((place, i) => (
                  <Card key={i} className="p-4 rounded-2xl border-4 border-[#40513B]/5 hover:border-[#40513B]/20 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#40513B]/10 rounded-xl flex items-center justify-center">
                        <MapIcon size={20} className="text-[#40513B]" />
                      </div>
                      <span className="font-bold text-[#141414]">{place.name}</span>
                    </div>
                    <Button 
                      size="sm"
                      variant="ghost"
                      className="rounded-xl text-[10px] font-black uppercase tracking-widest text-[#40513B] hover:bg-[#40513B] hover:text-white transition-all"
                      onClick={() => startNavigation([place.lat, place.lng])}
                    >
                      Go <ChevronRight size={14} className="ml-1" />
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </motion.div>
        );
      case 'navigation':
        if (route.length === 0) {
          return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#F5F5F0]">
              <AlertTriangle size={48} className="text-orange-500 mb-4" />
              <h2 className="text-2xl font-black mb-2">Route Not Found</h2>
              <p className="text-[#40513B]/60 mb-6">We couldn't calculate a path to your destination. Please try again.</p>
              <Button onClick={() => setScreen('home')} className="rounded-2xl bg-[#40513B] text-white px-8 h-12 font-black uppercase tracking-widest">
                Go Back
              </Button>
            </div>
          );
        }
        return (
          <div className="relative h-full flex flex-col">
            <div className="relative flex-1 h-full">
              {mapType === 'cartoon' ? (
                <CartoonMap 
                  center={carLocation}
                  zoom={14}
                  deerZones={deerZones}
                  wildlifeReports={wildlifeReports}
                  points={MOCK_POINTS}
                  carLocation={carLocation}
                  carHeading={carHeading}
                  route={route}
                  themeColors={currentTheme.colors.map}
                />
              ) : (
                <RealMap 
                  center={carLocation}
                  zoom={14}
                  carLocation={carLocation}
                  carHeading={carHeading}
                  route={route}
                  deerZones={deerZones}
                  wildlifeReports={wildlifeReports}
                  points={MOCK_POINTS}
                />
              )}
              
              <NavigationOverlay 
                currentStep={route[currentStepIndex] || { instruction: 'Calculating...', distance: 0, duration: 0, type: 'straight', lat: carLocation[0], lng: carLocation[1] }}
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
              <div className="absolute top-6 left-6 pointer-events-auto flex gap-2">
                <Button 
                  variant="secondary" 
                  className="rounded-2xl border-4 border-[#40513B]/10 bg-white/90 backdrop-blur font-black uppercase text-xs tracking-widest flex items-center gap-2"
                  onClick={() => {
                    setIsNavigating(false);
                    setScreen('home');
                  }}
                >
                  <XCircle size={18} className="text-red-500" /> End Navigation
                </Button>
                <Button 
                  variant="secondary" 
                  className="rounded-2xl border-4 border-[#40513B]/10 bg-white/90 backdrop-blur font-black uppercase text-xs tracking-widest flex items-center gap-2"
                  onClick={() => setMapType(mapType === 'cartoon' ? 'real' : 'cartoon')}
                >
                  <MapIcon size={18} className="text-[#40513B]" /> {mapType === 'cartoon' ? 'Real Map' : 'Cartoon Map'}
                </Button>
              </div>
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
            <div className="flex gap-2 items-start max-w-2xl mx-auto">
              <div className="flex-1">
                <USSearch 
                  onSelect={(lat, lng, label) => startNavigation([lat, lng], label)} 
                  userLocation={userLocation || carLocation}
                  searchRadius={searchRadius}
                  onRadiusChange={setSearchRadius}
                />
              </div>
              <Button 
                onClick={() => setScreen('home')}
                className="h-14 rounded-2xl bg-white border-4 border-[#40513B]/20 text-[#40513B] hover:bg-[#40513B]/5 shadow-lg px-4 flex items-center gap-2 shrink-0"
              >
                <HomeIcon size={20} />
                <span className="font-black uppercase text-[10px] tracking-widest hidden sm:inline">Go Home</span>
              </Button>
            </div>

            {(navHistory.length > 0 || favorites.length > 0) && (
              <div className="mt-8 space-y-6">
                {favorites.length > 0 && (
                  <div>
                    <h3 className="font-black uppercase text-[10px] tracking-widest text-[#40513B]/50 mb-3 flex items-center gap-2">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" /> Favorite Places
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {favorites.map((fav, i) => (
                        <Card 
                          key={i} 
                          className="p-3 rounded-2xl border-4 border-[#40513B]/5 bg-white min-w-[140px] cursor-pointer hover:border-[#40513B]/20 transition-all"
                          onClick={() => startNavigation([fav.lat, fav.lng], fav.name)}
                        >
                          <p className="font-bold text-xs truncate">{fav.name}</p>
                          <p className="text-[9px] text-[#40513B]/40 font-black uppercase mt-1">Navigate</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {navHistory.length > 0 && (
                  <div>
                    <h3 className="font-black uppercase text-[10px] tracking-widest text-[#40513B]/50 mb-3 flex items-center gap-2">
                      <HistoryIcon size={12} /> Recent History
                    </h3>
                    <div className="space-y-2">
                      {navHistory.map((item, i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between p-3 bg-white rounded-2xl border-2 border-[#40513B]/5 cursor-pointer hover:bg-[#40513B]/5 transition-all"
                          onClick={() => startNavigation([item.lat, item.lng], item.name)}
                        >
                          <div className="flex items-center gap-3">
                            <MapPin size={14} className="text-[#40513B]/30" />
                            <span className="text-xs font-bold">{item.name}</span>
                          </div>
                          <ChevronRight size={14} className="text-[#40513B]/20" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black uppercase text-xs tracking-widest text-[#40513B]/50">
                  {selectedCategory ? CATEGORIES.find(c => c.id === selectedCategory)?.label : 'Mountain Categories'}
                </h3>
                {selectedCategory && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-[10px] font-black uppercase tracking-widest text-[#40513B]"
                    onClick={() => setSelectedCategory(null)}
                  >
                    <ArrowLeft size={14} className="mr-1" /> Back
                  </Button>
                )}
              </div>

              {!selectedCategory ? (
                <div className="grid grid-cols-2 gap-4">
                  {CATEGORIES.map((cat, i) => {
                    const nearest = CATEGORIES.find(c => c.id === cat.id)?.data.reduce((prev, curr) => {
                      const distPrev = getDistance(carLocation[0], carLocation[1], prev.lat, prev.lng);
                      const distCurr = getDistance(carLocation[0], carLocation[1], curr.lat, curr.lng);
                      return distCurr < distPrev ? prev : curr;
                    });

                    return (
                      <Card 
                        key={i} 
                        className={`p-5 rounded-3xl border-0 shadow-md flex flex-col gap-3 cursor-pointer hover:scale-[1.02] transition-transform ${cat.color}`}
                        onClick={() => setSelectedCategory(cat.id)}
                      >
                        <div className="flex justify-between items-start">
                          {cat.id === 'overlooks' && <Camera />}
                          {cat.id === 'trails' && <Wind />}
                          {cat.id === 'cabins' && <HomeIcon />}
                          {cat.id === 'wild' && <ShieldAlert />}
                        </div>
                        <span className="font-black text-sm leading-tight">{cat.label}</span>
                        <Button 
                          size="sm" 
                          className="mt-2 rounded-xl bg-white/20 hover:bg-white/40 text-current border-0 font-black uppercase text-[9px] tracking-widest h-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (nearest) startNavigation([nearest.lat, nearest.lng]);
                          }}
                        >
                          Navigate Here
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  {CATEGORIES.find(c => c.id === selectedCategory)?.data.map((loc, i) => {
                    const isFav = favorites.some(f => f.name === loc.name);
                    return (
                      <Card key={i} className="p-5 rounded-3xl border-4 border-[#40513B]/5 shadow-sm bg-white">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-black text-[#141414] text-lg leading-tight">{loc.name}</h4>
                            <p className="text-[10px] font-bold text-[#40513B]/40 uppercase tracking-widest mt-1">
                              {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={`rounded-xl ${isFav ? 'text-red-500 bg-red-50' : 'text-[#40513B]/20'}`}
                            onClick={() => toggleFavorite(loc)}
                          >
                            <Heart size={20} fill={isFav ? "currentColor" : "none"} />
                          </Button>
                        </div>
                        <Button 
                          className="w-full rounded-2xl bg-[#40513B] hover:bg-[#2D3A2A] text-white font-black uppercase text-xs tracking-widest h-12"
                          onClick={() => startNavigation([loc.lat, loc.lng], loc.name)}
                        >
                          Navigate Here
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              )}
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
      case 'settings':
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 h-full bg-[#F5F5F0]"
          >
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" className="rounded-xl" onClick={() => setScreen('home')}>
                <HomeIcon />
              </Button>
              <h2 className="text-2xl font-black">Settings</h2>
            </div>

            <div className="space-y-8">
              <section>
                <h3 className="font-black uppercase text-xs tracking-widest text-[#40513B]/50 mb-4 flex items-center gap-2">
                  <Palette size={14} /> Customizable Themes
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setCurrentTheme(theme)}
                      className={`p-4 rounded-2xl border-4 flex items-center justify-between transition-all ${
                        currentTheme.id === theme.id 
                          ? 'border-[#40513B] bg-white shadow-md' 
                          : 'border-transparent bg-white/50 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full border-2 border-black/10" 
                          style={{ backgroundColor: theme.colors.primary }}
                        />
                        <span className="font-bold text-sm">{theme.name}</span>
                      </div>
                      {currentTheme.id === theme.id && <Check size={18} className="text-[#40513B]" />}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="font-black uppercase text-xs tracking-widest text-[#40513B]/50 mb-4">App Preferences</h3>
                <Card className="p-4 rounded-2xl border-4 border-[#40513B]/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">Search Radius</span>
                    <span className="text-xs font-black text-[#40513B]">{searchRadius} mi</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">Units</span>
                    <span className="text-xs font-black text-[#40513B]">Imperial (mi)</span>
                  </div>
                </Card>
              </section>

              <Button 
                variant="outline" 
                className="w-full h-14 rounded-2xl border-4 border-red-100 text-red-500 font-black uppercase tracking-widest hover:bg-red-50"
                onClick={() => {
                  localStorage.removeItem('hillhopper_search_history');
                  alert('Search history cleared!');
                }}
              >
                Clear Search History
              </Button>
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
    <div 
      className="fixed inset-0 font-sans overflow-hidden transition-colors duration-500"
      style={{ 
        backgroundColor: currentTheme.colors.background,
        color: currentTheme.colors.text
      }}
    >
      <div className="max-w-md mx-auto h-full shadow-2xl relative" style={{ backgroundColor: currentTheme.colors.card }}>
        <AnimatePresence mode="wait">
          {showOnboarding ? renderOnboarding() : renderScreen()}
        </AnimatePresence>

        {/* Global Navigation Bar (Only on certain screens) */}
        {['home', 'search', 'settings'].includes(screen) && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-transparent via-white/80 to-transparent">
            <Tabs value={screen} onValueChange={(v) => setScreen(v as AppScreen)} className="w-full">
              <TabsList 
                className="w-full h-16 border-4 rounded-2xl p-1 transition-all"
                style={{ 
                  backgroundColor: `${currentTheme.colors.primary}10`,
                  borderColor: `${currentTheme.colors.primary}20`
                }}
              >
                <TabsTrigger 
                  value="home" 
                  className="flex-1 rounded-xl transition-all data-[state=active]:text-white"
                  style={{ '--active-bg': currentTheme.colors.primary } as any}
                >
                  <HomeIcon size={20} />
                </TabsTrigger>
                <TabsTrigger 
                  value="search" 
                  className="flex-1 rounded-xl transition-all data-[state=active]:text-white"
                  style={{ '--active-bg': currentTheme.colors.primary } as any}
                >
                  <SearchIcon size={20} />
                </TabsTrigger>
                <button 
                  onClick={locateMe}
                  className="flex-1 rounded-xl flex items-center justify-center transition-all"
                  style={{ color: currentTheme.colors.primary }}
                >
                  <LocateFixed size={20} />
                </button>
                <TabsTrigger 
                  value="navigation" 
                  className="flex-1 rounded-xl transition-all data-[state=active]:text-white"
                  disabled={!isNavigating}
                  style={{ '--active-bg': currentTheme.colors.primary } as any}
                >
                  <NavIcon size={20} />
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="flex-1 rounded-xl transition-all data-[state=active]:text-white"
                  style={{ '--active-bg': currentTheme.colors.primary } as any}
                >
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
