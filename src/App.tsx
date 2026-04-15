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
  Download,
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
import { CAR_MODELS, CarModelId } from './lib/carModels';
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

type AppScreen = 'home' | 'navigation' | 'search' | 'settings' | 'hazards';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [mapType, setMapType] = useState<'cartoon' | 'real'>('cartoon');
  const [isNavigating, setIsNavigating] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [carLocation, setCarLocation] = useState<[number, number]>([41.3242, -74.8018]); // Default to Milford, PA
  const carLocationRef = useRef<[number, number]>(carLocation);
  
  useEffect(() => {
    carLocationRef.current = carLocation;
  }, [carLocation]);

  // Auto-activate GPS on mount
  useEffect(() => {
    locateMe();
  }, []);

  const [carHeading, setCarHeading] = useState(45);
  const [searchRadius, setSearchRadius] = useState(25);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const [carModelId, setCarModelId] = useState<CarModelId>('sedan');
  const [favorites, setFavorites] = useState<CategoryLocation[]>([]);
  const [navHistory, setNavHistory] = useState<CategoryLocation[]>([]);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'active' | 'denied'>('active');
  const [deerRisk, setDeerRisk] = useState<{ level: RiskLevel; reason: string }>({ level: 'low', reason: '' });
  const [deerZones, setDeerZones] = useState<DeerZone[]>([]);
  const [wildlifeReports, setWildlifeReports] = useState<WildlifeReport[]>([]);
  const [route, setRoute] = useState<RouteStep[]>([]);
  const [previewRoute, setPreviewRoute] = useState<RouteStep[] | null>(null);
  const [previewDestination, setPreviewDestination] = useState<{lat: number, lng: number, label: string} | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [downloadedCounties, setDownloadedCounties] = useState<string[]>(['Pike County, PA']);
  const [isPreloadingMap, setIsPreloadingMap] = useState<string | null>(null);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'info' | 'error' | 'success' } | null>(null);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const showStatus = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

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
          // Don't set screen to location-setup as it's removed
        }
      );
    } else {
      setLocationStatus('denied');
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
            setRoute([]);
            setScreen('home');
            return prev;
          }
        });
      }, 800); // Advance every 800ms for smoother road following
    }
    return () => clearInterval(interval);
  }, [isNavigating, route]);

  useEffect(() => {
    if (isNavigating && screen === 'home') {
      setScreen('navigation');
    }
  }, [isNavigating, screen]);

  const startNavigation = async (dest: [number, number], name?: string) => {
    setIsCalculating(true);
    showStatus("Calculating optimal route...", "info");
    try {
      const newRoute = await getMountainRoute(carLocation, dest);
      setRoute(newRoute);
      setPreviewRoute(null);
      setPreviewDestination(null);
      setCurrentStepIndex(0);
      setIsNavigating(true);
      setScreen('navigation');
      setIsCalculating(false);
      
      if (name) {
        const newHistoryItem = { name, lat: dest[0], lng: dest[1] };
        setNavHistory(prev => {
          const filtered = prev.filter(h => h.name !== name);
          return [newHistoryItem, ...filtered].slice(0, 10);
        });
      }
    } catch (error) {
      console.error("Load failed", error);
      showStatus("Failed to calculate route. Please try again.", "error");
      setIsCalculating(false);
    }
  };

  const showPreview = async (dest: [number, number], label: string) => {
    try {
      const newRoute = await getMountainRoute(carLocation, dest);
      setPreviewRoute(newRoute);
      setPreviewDestination({ lat: dest[0], lng: dest[1], label });
      setScreen('home');
    } catch (error) {
      console.error("Preview failed", error);
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
          showStatus("GPS Activated! Your location has been updated.", "success");
        },
        (error) => {
          console.error("Locate me failed:", error);
          showStatus("Could not access GPS. Please check your device settings.", "error");
        }
      );
    }
  };

  const downloadCounty = (county: string) => {
    if (downloadedCounties.includes(county)) {
      // If already downloaded, maybe center on it?
      showStatus(`Centered map on ${county}`, "info");
      return;
    }
    setIsPreloadingMap(county);
    setTimeout(() => {
      setDownloadedCounties(prev => [...prev, county]);
      setIsPreloadingMap(null);
      showStatus(`${county} maps installed for offline use!`, "success");
    }, 2000);
  };

  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-6 p-6 h-full overflow-y-auto pb-32 scrollbar-hide"
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

            <Card className="bg-gradient-to-br from-[#40513B] to-[#2D3A2A] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden border-0 min-h-[280px] flex flex-col justify-center">
              <div className="relative z-10">
                <Badge className="bg-white/20 text-white border-0 mb-4 font-black uppercase tracking-widest">Live Conditions</Badge>
                <h2 className="text-4xl font-black leading-tight">Deer Activity is <span className="text-yellow-300">Moderate</span></h2>
                <p className="text-white/70 mt-4 font-medium text-lg">Dusk is approaching. Watch the forest edges on Mountain Rd.</p>
                <div className="flex gap-4 mt-8">
                  <div className="flex items-center gap-3 bg-black/20 px-4 py-3 rounded-2xl">
                    <Cloud size={20} /> <span className="text-base font-bold">Foggy</span>
                  </div>
                  <div className="flex items-center gap-3 bg-black/20 px-4 py-3 rounded-2xl">
                    <Wind size={20} /> <span className="text-base font-bold">12mph</span>
                  </div>
                </div>
              </div>
              {/* Decorative Background Elements */}
              <div className="absolute -right-6 -bottom-6 opacity-10">
                <Mountain size={240} />
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => setScreen('search')}
                className="h-20 rounded-2xl bg-white border-4 border-[#40513B]/10 text-[#141414] hover:bg-[#40513B]/5 flex flex-row items-center justify-center gap-3 shadow-md"
              >
                <SearchIcon size={24} className="text-[#40513B]" />
                <span className="font-black uppercase text-[10px] tracking-widest">Where to?</span>
              </Button>
              <Button 
                onClick={() => setScreen('hazards')}
                className="h-20 rounded-2xl bg-white border-4 border-[#40513B]/10 text-[#141414] hover:bg-[#40513B]/5 flex flex-row items-center justify-center gap-3 shadow-md"
              >
                <AlertTriangle size={24} className="text-orange-500" />
                <span className="font-black uppercase text-[10px] tracking-widest">Report</span>
              </Button>
            </div>

            <div className="flex justify-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setScreen('search')}
                className="text-[10px] font-black uppercase tracking-widest text-[#40513B]/40 hover:text-[#40513B]"
              >
                <MapPin size={12} className="mr-1" /> ZIP Code
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={locateMe}
                className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600"
              >
                <LocateFixed size={12} className="mr-1" /> Activate GPS
              </Button>
            </div>

            {/* Map Preview Area */}
            <div className="flex-1 relative rounded-[2.5rem] overflow-hidden border-4 border-[#40513B]/10 shadow-inner bg-[#F5F5F0]">
              {mapType === 'cartoon' ? (
                <CartoonMap 
                  center={carLocation}
                  zoom={12}
                  deerZones={deerZones}
                  wildlifeReports={wildlifeReports}
                  points={MOCK_POINTS}
                  carLocation={carLocation}
                  carHeading={carHeading}
                  carModelId={carModelId}
                  route={previewRoute || []}
                  isPreview={true}
                  themeColors={currentTheme.colors.map}
                />
              ) : (
                <RealMap 
                  center={carLocation}
                  zoom={12}
                  carLocation={carLocation}
                  carHeading={carHeading}
                  carModelId={carModelId}
                  route={previewRoute || []}
                  isPreview={true}
                  deerZones={deerZones}
                  wildlifeReports={wildlifeReports}
                  points={MOCK_POINTS}
                />
              )}

              {previewRoute && previewDestination && (
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="absolute bottom-4 left-4 right-4 z-10"
                >
                  <Card className="p-4 rounded-3xl border-4 border-[#40513B]/20 bg-white/95 backdrop-blur shadow-2xl flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-[10px] font-black uppercase text-[#40513B]/50 tracking-widest">Previewing Route to</p>
                      <h4 className="font-black text-sm truncate">{previewDestination.label}</h4>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="rounded-xl font-black uppercase text-[10px] tracking-widest"
                        onClick={() => {
                          setPreviewRoute(null);
                          setPreviewDestination(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        className="rounded-xl bg-[#40513B] text-white font-black uppercase text-[10px] tracking-widest px-4"
                        onClick={() => startNavigation([previewDestination.lat, previewDestination.lng], previewDestination.label)}
                      >
                        Start
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </div>

            <div className="overflow-hidden">
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

            <div className="overflow-hidden">
              <h3 className="font-black uppercase text-xs tracking-widest text-[#40513B]/50 mb-4">Nearby Adventures</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {CATEGORIES.flatMap(cat => cat.data.map(loc => ({ ...loc, category: cat.label, icon: cat.icon })))
                  .map(loc => ({ ...loc, distance: getDistance(carLocation[0], carLocation[1], loc.lat, loc.lng) }))
                  .filter(loc => loc.distance < 25)
                  .sort((a, b) => a.distance - b.distance)
                  .slice(0, 8)
                  .map((place, i) => (
                    <Card 
                      key={i} 
                      className="p-4 rounded-3xl border-4 border-[#40513B]/5 hover:border-[#40513B]/20 transition-all min-w-[180px] cursor-pointer group bg-white"
                      onClick={() => startNavigation([place.lat, place.lng], place.name)}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="w-10 h-10 bg-[#40513B]/10 rounded-xl flex items-center justify-center">
                             {place.icon === 'Camera' && <Camera size={20} className="text-[#40513B]" />}
                             {place.icon === 'Wind' && <Wind size={20} className="text-[#40513B]" />}
                             {place.icon === 'Home' && <HomeIcon size={20} className="text-[#40513B]" />}
                             {place.icon === 'ShieldAlert' && <ShieldAlert size={20} className="text-[#40513B]" />}
                          </div>
                          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-2">
                            {place.distance.toFixed(1)} mi
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-[#141414] line-clamp-1">{place.name}</h4>
                          <p className="text-[10px] font-bold text-[#40513B]/40 uppercase tracking-widest mt-1">{place.category}</p>
                        </div>
                      </div>
                    </Card>
                  ))
                }
              </div>
            </div>

            <div className="overflow-hidden">
              <h3 className="font-black uppercase text-xs tracking-widest text-[#40513B]/50 mb-4">Offline Map Library</h3>
              <div className="relative mb-4">
                <SearchIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#40513B]/30" />
                <input 
                  type="text"
                  placeholder="Search for a county..."
                  value={mapSearchQuery}
                  onChange={(e) => setMapSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl border-2 border-[#40513B]/5 bg-white text-xs font-bold focus:outline-none focus:border-[#40513B]/20 transition-all"
                />
              </div>
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                {[
                  'Pike County, PA',
                  'Wayne County, PA',
                  'Sussex County, NJ',
                  'Orange County, NY',
                  'Sullivan County, NY',
                  'Monroe County, PA',
                  'Carbon County, PA',
                  'Lackawanna County, PA'
                ].filter(c => c.toLowerCase().includes(mapSearchQuery.toLowerCase()))
                  .map((county, i) => {
                    const isDownloaded = downloadedCounties.includes(county);
                    const isDownloading = isPreloadingMap === county;
                    return (
                      <Card 
                        key={i} 
                        className={`p-3 rounded-2xl border-2 min-w-[160px] flex flex-col gap-2 transition-all ${isDownloaded ? 'bg-green-50/50 border-green-100' : 'bg-white border-[#40513B]/5'}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded flex items-center justify-center ${isDownloaded ? 'bg-green-100 text-green-600' : 'bg-[#40513B]/5 text-[#40513B]/30'}`}>
                            <MapIcon size={12} />
                          </div>
                          <span className="text-[10px] font-bold truncate">{county}</span>
                        </div>
                        <Button 
                          size="sm"
                          variant={isDownloaded ? "ghost" : "default"}
                          disabled={isDownloading}
                          onClick={() => downloadCounty(county)}
                          className={`h-7 rounded-lg font-black uppercase text-[8px] tracking-widest ${isDownloaded ? 'text-green-600' : 'bg-[#40513B] text-white'}`}
                        >
                          {isDownloading ? '...' : isDownloaded ? (
                            <span className="flex items-center gap-1"><Check size={10} /> Installed</span>
                          ) : (
                            <span className="flex items-center gap-1"><Download size={10} /> Download</span>
                          )}
                        </Button>
                      </Card>
                    );
                  })
                }
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
                  carModelId={carModelId}
                  route={route.slice(currentStepIndex)}
                  themeColors={currentTheme.colors.map}
                />
              ) : (
                <RealMap 
                  center={carLocation}
                  zoom={14}
                  carLocation={carLocation}
                  carHeading={carHeading}
                  carModelId={carModelId}
                  route={route.slice(currentStepIndex)}
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
                    setRoute([]);
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
              <Button variant="ghost" className="rounded-xl" onClick={() => setScreen(isNavigating ? 'navigation' : 'home')}>
                <HomeIcon />
              </Button>
              <h2 className="text-2xl font-black">Plan Your Route</h2>
            </div>
            <div className="flex gap-2 items-start max-w-2xl mx-auto">
              <div className="flex-1">
                <USSearch 
                  onSelect={(lat, lng, label) => showPreview([lat, lng], label)} 
                  userLocation={userLocation || carLocation}
                  searchRadius={searchRadius}
                  onRadiusChange={setSearchRadius}
                />
                <div className="mt-4 text-center">
                  <p className="text-[10px] font-black uppercase text-[#40513B]/40 tracking-widest">Tip: Selecting a result starts navigation immediately</p>
                </div>
              </div>
              <Button 
                onClick={() => setScreen(isNavigating ? 'navigation' : 'home')}
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
                          className="p-3 rounded-2xl border-4 border-[#40513B]/5 bg-white min-w-[140px] cursor-pointer hover:border-[#40513B]/20 transition-all active:scale-95"
                          onClick={() => showPreview([fav.lat, fav.lng], fav.name)}
                        >
                          <p className="font-bold text-xs truncate">{fav.name}</p>
                          <p className="text-[9px] text-[#40513B]/40 font-black uppercase mt-1">Preview Route</p>
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
                          className="flex items-center justify-between p-3 bg-white rounded-2xl border-2 border-[#40513B]/5 cursor-pointer hover:bg-[#40513B]/5 transition-all active:scale-95"
                          onClick={() => showPreview([item.lat, item.lng], item.name)}
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
                          Start Navigation
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
              <Button variant="ghost" onClick={() => setScreen(isNavigating ? 'navigation' : 'home')}>Close</Button>
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
              <Button variant="ghost" className="rounded-xl" onClick={() => setScreen(isNavigating ? 'navigation' : 'home')}>
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
                <h3 className="font-black uppercase text-xs tracking-widest text-[#40513B]/50 mb-4 flex items-center gap-2">
                  <NavIcon size={14} /> Vehicle Model
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {CAR_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setCarModelId(model.id)}
                      className={`p-4 rounded-2xl border-4 flex flex-col items-center gap-2 transition-all ${
                        carModelId === model.id 
                          ? 'border-[#40513B] bg-white shadow-md' 
                          : 'border-transparent bg-white/50 hover:bg-white'
                      }`}
                    >
                      <span className="text-3xl">{model.emoji}</span>
                      <span className="font-bold text-[10px] uppercase tracking-wider">{model.name}</span>
                      {carModelId === model.id && <div className="absolute top-2 right-2"><Check size={12} className="text-[#40513B]" /></div>}
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

        {/* Loading Overlay */}
        <AnimatePresence>
          {isCalculating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[200] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="mb-6"
              >
                <Compass size={64} className="text-[#40513B]" />
              </motion.div>
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Calculating Route</h3>
              <p className="text-sm font-bold text-[#40513B]/60 uppercase tracking-widest">Finding the safest path through the hills...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Status Toast */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-24 left-6 right-6 z-[100]"
            >
              <div className={`p-4 rounded-2xl shadow-2xl border-2 flex items-center gap-3 ${
                statusMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
                statusMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
                'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  statusMessage.type === 'error' ? 'bg-red-100' :
                  statusMessage.type === 'success' ? 'bg-green-100' :
                  'bg-blue-100'
                }`}>
                  {statusMessage.type === 'error' ? <AlertTriangle size={16} /> : <MapPin size={16} />}
                </div>
                <p className="text-xs font-black uppercase tracking-tight">{statusMessage.text}</p>
              </div>
            </motion.div>
          )}
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
