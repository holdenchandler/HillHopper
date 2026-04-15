import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, MapPin, Flag, History, Trash2, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Slider } from '../ui/slider';
import { motion, AnimatePresence } from 'motion/react';
import { getDistance } from '../../lib/utils';

interface USSearchProps {
  onSelect: (lat: number, lng: number, label: string) => void;
  userLocation: [number, number] | null;
  searchRadius?: number;
  onRadiusChange?: (radius: number) => void;
  placeholder?: string;
}

// Haversine formula for distance in miles
export const USSearch: React.FC<USSearchProps> = ({ 
  onSelect, 
  userLocation, 
  searchRadius = 25,
  onRadiusChange,
  placeholder = "Search addresses, businesses, mountains..."
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('hillhopper_search_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse search history", e);
      }
    }
  }, []);

  const saveToHistory = (item: any) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.id !== item.id);
      const newHistory = [item, ...filtered].slice(0, 5);
      localStorage.setItem('hillhopper_search_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('hillhopper_search_history');
  };

  const removeFromHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory(prev => {
      const newHistory = prev.filter(h => h.id !== id);
      localStorage.setItem('hillhopper_search_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  useEffect(() => {
    let count = 0;
    let timeoutId: NodeJS.Timeout;
    const checkGoogle = () => {
      if ((window as any).google?.maps?.places) {
        setGoogleReady(true);
      } else if (count < 20) { // Check for 10 seconds
        count++;
        timeoutId = setTimeout(checkGoogle, 500);
      }
    };
    checkGoogle();
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (googleReady && !autocompleteService.current) {
      autocompleteService.current = new (window as any).google.maps.places.AutocompleteService();
      // Dummy element for PlacesService
      const dummy = document.createElement('div');
      placesService.current = new (window as any).google.maps.places.PlacesService(dummy);
    }
  }, [googleReady]);

  const performNominatimSearch = async (val: string, radius: number): Promise<any[]> => {
    let viewbox = "";
    if (userLocation) {
      const deg = radius / 69;
      viewbox = `${userLocation[1] - deg},${userLocation[0] + deg},${userLocation[1] + deg},${userLocation[0] - deg}`;
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=us&limit=10${viewbox ? `&viewbox=${viewbox}&bounded=1` : ''}`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'HillHopper-App/1.0 (holdenchandler@gmail.com)' }
    });
    
    if (!response.ok) throw new Error("Search failed");
    const data = await response.json();
    
    return data.map((res: any) => ({
      id: res.place_id,
      display_name: res.display_name,
      lat: res.lat,
      lon: res.lon,
      type: res.type,
      source: 'nominatim'
    }));
  };

  const performGoogleSearch = (val: string): Promise<any[]> => {
    return new Promise((resolve) => {
      if (!autocompleteService.current || !(window as any).google?.maps) return resolve([]);

      const options: any = {
        input: val,
        componentRestrictions: { country: 'us' }
      };

      if (userLocation && typeof userLocation[0] === 'number' && typeof userLocation[1] === 'number') {
        try {
          // Use location and radius for biasing
          options.location = new (window as any).google.maps.LatLng(userLocation[0], userLocation[1]);
          options.radius = 50000; // 50km bias
        } catch (e) {
          console.error("Error creating LatLng for Google Search", e);
        }
      }

      autocompleteService.current.getPlacePredictions(options, (predictions: any, status: any) => {
        if (status !== (window as any).google.maps.places.PlacesServiceStatus.OK) {
          if (status === (window as any).google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            return resolve([]);
          }
          console.error("Google Predictions Error:", status);
          return resolve([]); // Resolve empty instead of rejecting to allow fallback
        }

        resolve(predictions.map((p: any) => ({
          id: p.place_id,
          display_name: p.description,
          type: p.types[0] || 'place',
          source: 'google'
        })));
      });
    });
  };

  const fetchGoogleDetails = (placeId: string): Promise<{lat: number, lng: number}> => {
    return new Promise((resolve, reject) => {
      if (!placesService.current) return reject(new Error("Places service not ready"));
      placesService.current.getDetails({ placeId }, (place: any, status: any) => {
        if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && place.geometry?.location) {
          resolve({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          });
        } else {
          reject(new Error(`Details failed: ${status}`));
        }
      });
    });
  };

  const handleSearch = async (val: string) => {
    setQuery(val);
    setError(null);
    if (val.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      let googleResults: any[] = [];
      let nominatimResults: any[] = [];
      
      if (googleReady) {
        googleResults = await performGoogleSearch(val);
      }
      
      // Always try Nominatim as well, or as fallback
      if (googleResults.length < 5) {
        nominatimResults = await performNominatimSearch(val, searchRadius);
      }

      // Merge results, prioritizing Google
      let searchResults = [...googleResults];
      
      // Add Nominatim results if they aren't already in the list (by name)
      nominatimResults.forEach(nr => {
        if (!searchResults.some(sr => sr.display_name.toLowerCase() === nr.display_name.toLowerCase())) {
          searchResults.push(nr);
        }
      });

      if (userLocation) {
        // For Nominatim we already have lat/lon. For Google we'll need to fetch them on selection or here.
        // To keep it fast, we'll only fetch distance for Nominatim results here.
        // For Google, we'll show them without distance or fetch a few? 
        // Let's just map them.
        searchResults = searchResults.map(res => {
          if (res.lat && res.lon) {
            return {
              ...res,
              distance: getDistance(userLocation[0], userLocation[1], parseFloat(res.lat), parseFloat(res.lon))
            };
          }
          return res;
        });
      }

      setResults(searchResults);
      if (searchResults.length === 0) {
        setError("No local results found. Try expanding your search area.");
      }
    } catch (error) {
      console.error("Search failed", error);
      setError("Search failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (res: any) => {
    try {
      saveToHistory(res);
      if (res.source === 'google') {
        setIsLoading(true);
        const coords = await fetchGoogleDetails(res.id);
        onSelect(coords.lat, coords.lng, res.display_name);
      } else {
        onSelect(parseFloat(res.lat), parseFloat(res.lon), res.display_name);
      }
      setResults([]);
      setQuery('');
    } catch (err) {
      console.error("Selection failed", err);
      setError("Could not load location details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#40513B]/40">
          <SearchIcon size={20} />
        </div>
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          className={`pl-12 pr-24 h-14 bg-white/90 backdrop-blur border-4 rounded-2xl font-bold text-lg focus-visible:ring-[#40513B] shadow-lg transition-all ${
            error ? 'border-red-400' : 'border-[#40513B]/20'
          }`}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setError(null);
              }}
              className="p-1 hover:bg-[#40513B]/10 rounded-full transition-colors text-[#40513B]/40"
            >
              <X size={18} />
            </button>
          )}
          {isLoading && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-[#40513B] border-t-transparent rounded-full"
            />
          )}
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md">
            <Flag size={12} className="text-blue-600" />
            <span className="text-[10px] font-black text-blue-600 uppercase">{googleReady ? 'Google Maps' : 'U.S. Only'}</span>
          </div>
        </div>
      </div>

      {userLocation && onRadiusChange && (
        <div className="mt-4 px-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase text-[#40513B]/50 tracking-widest">Search Radius</span>
            <span className="text-xs font-bold text-[#40513B]">{searchRadius} miles</span>
          </div>
          <Slider 
            value={[searchRadius]} 
            onValueChange={(vals) => onRadiusChange(vals[0])}
            min={5}
            max={50}
            step={5}
          />
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-xs font-bold mt-2 ml-4"
          >
            {error}
          </motion.p>
        )}
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <Card className="bg-white/95 backdrop-blur shadow-2xl border-4 border-[#40513B]/20 rounded-2xl overflow-hidden">
              {results.map((res, i) => (
                <div
                  key={i}
                  onClick={() => handleSelect(res)}
                  className="w-full p-4 flex items-start gap-3 hover:bg-[#40513B]/5 transition-colors text-left border-b border-[#40513B]/10 last:border-0 cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(res);
                    }
                  }}
                >
                  <MapPin size={18} className="text-[#40513B]/40 mt-1 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-[#141414] text-sm line-clamp-1">{res.display_name}</p>
                    <p className="text-[10px] font-medium text-[#40513B]/60 uppercase tracking-wider">
                      {res.type} • {res.source === 'google' ? 'Google Result' : (res.address?.state || 'USA')}
                    </p>
                  </div>
                  {res.distance !== undefined && (
                    <span className="text-[10px] font-black text-[#40513B]/40 whitespace-nowrap">
                      {res.distance.toFixed(1)} mi
                    </span>
                  )}
                </div>
              ))}
            </Card>
          </motion.div>
        )}
        {isFocused && query === '' && history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <Card className="bg-white/95 backdrop-blur shadow-2xl border-4 border-[#40513B]/20 rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-[#40513B]/10 flex justify-between items-center bg-[#40513B]/5">
                <span className="text-[10px] font-black uppercase text-[#40513B]/50 tracking-widest">Recent Searches</span>
                <button 
                  onClick={clearHistory}
                  className="text-[10px] font-black uppercase text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  Clear All
                </button>
              </div>
              {history.map((res, i) => (
                <div
                  key={res.id || i}
                  onClick={() => handleSelect(res)}
                  className="w-full p-4 flex items-start gap-3 hover:bg-[#40513B]/5 transition-colors text-left border-b border-[#40513B]/10 last:border-0 group cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(res);
                    }
                  }}
                >
                  <History size={18} className="text-[#40513B]/40 mt-1 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-[#141414] text-sm line-clamp-1">{res.display_name}</p>
                    <p className="text-[10px] font-medium text-[#40513B]/60 uppercase tracking-wider">
                      {res.type} • {res.source === 'google' ? 'Google Result' : (res.address?.state || 'USA')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => removeFromHistory(e, res.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded-full transition-all"
                    aria-label="Remove from history"
                  >
                    <X size={14} className="text-red-400" />
                  </button>
                </div>
              ))}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
