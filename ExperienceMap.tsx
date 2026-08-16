import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { Journal } from '../types';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { Link } from 'react-router-dom';
import { Plus, Minus, Navigation, MapPin, Save } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Vite/Webpack
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const journalIcon = L.divIcon({
  className: 'custom-journal-icon',
  html: `<div style="background-color: #4f46e5; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4); transition: all 0.2s;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const offlineIcon = L.divIcon({
  className: 'custom-offline-icon',
  html: `<div style="background-color: #10b981; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4); transition: all 0.2s;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

interface OfflineLocation {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export function ExperienceMap() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [offlineLocations, setOfflineLocations] = useState<OfflineLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJournal, setActiveJournal] = useState<Journal | null>(null);
  const [activeOfflineLocation, setActiveOfflineLocation] = useState<OfflineLocation | null>(null);
  
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('journals')
          .select('*')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        if (error) throw error;
        
        if (data) {
          const mappedData = data.map(d => ({
            id: d.id,
            title: d.title,
            content: d.content,
            authorId: d.author_id,
            authorName: d.author_name,
            authorUsername: d.author_username,
            isPublic: d.is_public,
            imageUrls: d.image_urls,
            createdAt: d.created_at,
            likes: d.likes,
            commentCount: d.comment_count,
            latitude: d.latitude,
            longitude: d.longitude,
            locationName: d.location_name
          })) as Journal[];
          setJournals(mappedData);
        }
      } catch (err) {
        console.error("Error fetching map locations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
    
    // Load offline locations
    const stored = localStorage.getItem('offline-user-locations');
    if (stored) {
      try {
        setOfflineLocations(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  if (loading) return <LoadingScreen />;

  // Map Handlers
  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };
  
  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 10, {
            animate: true,
            duration: 1.5
          });
        },
        (err) => {
          console.error("Geolocation error:", err);
          alert("Unable to retrieve your location. Please ensure you have granted location permissions.");
        }
      );
    }
  };

  const saveCurrentLocationOffline = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLoc: OfflineLocation = {
            id: Date.now().toString(),
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            timestamp: new Date().toISOString()
          };
          
          const updatedLocs = [...offlineLocations, newLoc];
          setOfflineLocations(updatedLocs);
          localStorage.setItem('offline-user-locations', JSON.stringify(updatedLocs));
          
          mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 12, {
            animate: true,
            duration: 1.5
          });
        },
        (err) => {
          console.error("Geolocation error:", err);
          alert("Unable to retrieve your location to save. Please ensure you have granted location permissions.");
        }
      );
    }
  };

  return (
    <div className="w-full h-[calc(100dvh-11rem)] rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800 relative bg-[#e0e7ff] dark:bg-[#1e1b4b]">
      
      <MapContainer 
        center={[20, 0]} 
        zoom={3} 
        scrollWheelZoom={true}
        zoomControl={false} // We provide custom controls
        className="w-full h-full z-0"
        ref={mapRef}
        minZoom={2}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
          noWrap={true}
        />

        {journals.map(journal => (
          <Marker 
            key={journal.id} 
            position={[journal.latitude!, journal.longitude!]}
            icon={journalIcon}
            eventHandlers={{
              click: () => {
                setActiveJournal(journal);
                setActiveOfflineLocation(null);
                mapRef.current?.flyTo([journal.latitude!, journal.longitude!], 8, { animate: true });
              }
            }}
          />
        ))}

        {offlineLocations.map(loc => (
          <Marker 
            key={loc.id} 
            position={[loc.latitude, loc.longitude]}
            icon={offlineIcon}
            eventHandlers={{
              click: () => {
                setActiveOfflineLocation(loc);
                setActiveJournal(null);
                mapRef.current?.flyTo([loc.latitude, loc.longitude], 12, { animate: true });
              }
            }}
          />
        ))}
      </MapContainer>

      {/* Map Controls */}
      <div className="absolute right-4 bottom-8 flex flex-col gap-2 z-10">
        <button 
          onClick={saveCurrentLocationOffline}
          className="bg-emerald-500 hover:bg-emerald-600 p-2 rounded-lg shadow-md text-white transition-colors group flex items-center justify-center"
          title="Save Location Offline"
        >
          <Save className="w-5 h-5" />
        </button>
        <button 
          onClick={handleMyLocation}
          className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors group"
          title="My Location"
        >
          <Navigation className="w-5 h-5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
        </button>
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden mt-4">
          <button 
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors border-b border-gray-200 dark:border-gray-700"
            title="Zoom In"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button 
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Info Window */}
      {activeJournal && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-4 border border-gray-100 dark:border-gray-800 z-10">
          <button 
            onClick={() => setActiveJournal(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            &times;
          </button>
          <h3 className="font-bold text-base mb-1 pr-4 text-gray-900 dark:text-white">{activeJournal.title}</h3>
          {activeJournal.locationName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{activeJournal.locationName}</p>
          )}
          <p className="text-sm line-clamp-2 mb-3 text-gray-700 dark:text-gray-300">{activeJournal.content}</p>
          <Link 
            to={`/journal/${activeJournal.id}`} 
            className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline inline-block"
          >
            Read Journal &rarr;
          </Link>
        </div>
      )}

      {activeOfflineLocation && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-4 border border-gray-100 dark:border-gray-800 z-10 flex flex-col items-center text-center">
          <button 
            onClick={() => setActiveOfflineLocation(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            &times;
          </button>
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2">
            <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="font-bold text-base mb-1 text-gray-900 dark:text-white">Saved Location</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {new Date(activeOfflineLocation.timestamp).toLocaleDateString()} at {new Date(activeOfflineLocation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-xs font-mono text-gray-400 mt-2">
            {activeOfflineLocation.latitude.toFixed(4)}, {activeOfflineLocation.longitude.toFixed(4)}
          </p>
        </div>
      )}
      
      <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/80 px-4 py-2 rounded-lg text-sm font-medium shadow-sm border border-gray-200 dark:border-gray-800 backdrop-blur-sm text-gray-900 dark:text-white flex items-center gap-2 pointer-events-none z-10">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        Global Map
      </div>
    </div>
  );
}
