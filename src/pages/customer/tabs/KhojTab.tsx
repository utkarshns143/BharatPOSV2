// File: src/pages/customer/tabs/KhojTab.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useCustomerStore } from '../../../store/useCustomerStore';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { searchAddress, getAddressFromCoords } from '../../../utils/geocoding';

interface KhojTabProps {
  isActive: boolean;
}

export const KhojTab: React.FC<KhojTabProps> = ({ isActive }) => {
  const { shopsMap } = useCustomerStore();
  
  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const routingRef = useRef<any>(null);
  
  // General Map State
  const [mapDistance, setMapDistance] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  
  // Geocoding Search State
  const [locationInput, setLocationInput] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Khoj Product Search State
  const [khojSearch, setKhojSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 1. INITIALIZE MAP
  useEffect(() => {
    const initMap = () => {
      const L = (window as any).L;
      
      // Wait for Leaflet to download
      if (typeof L === 'undefined') {
        setTimeout(initMap, 100);
        return;
      }

      // Prevent "already initialized" error
      if (mapRef.current || !mapContainerRef.current) return;

      const initialLoc: [number, number] = [20.5937, 78.9629];
      
      mapRef.current = L.map(mapContainerRef.current, { zoomControl: false }).setView(initialLoc, 5);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(mapRef.current);
      markersRef.current = L.layerGroup().addTo(mapRef.current);

      drawBaseShops(L);

      // Get GPS Location on load
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setUserLoc(loc);
            mapRef.current.setView(loc, 13);
            
            L.circleMarker(loc, { radius: 8, fillColor: '#3b82f6', color: '#fff', weight: 3, opacity: 1, fillOpacity: 1 })
             .addTo(mapRef.current)
             .bindPopup("You are here");
          },
          (err) => console.warn("Location access denied or failed.", err),
          { timeout: 10000 }
        );
      }

      // Safe Event Delegation for Routing Buttons inside Popups
      mapRef.current.on('popupopen', (e: any) => {
        const routeBtn = e.popup._contentNode.querySelector('.khoj-route-btn');
        if (routeBtn) {
          routeBtn.onclick = () => {
            const lat = Number(routeBtn.getAttribute('data-lat'));
            const lng = Number(routeBtn.getAttribute('data-lng'));
            drawRoute(lat, lng);
            mapRef.current.closePopup();
          };
        }
      });

      // 🛑 THE PRO-TIP: Click map to Reverse Geocode Address
      mapRef.current.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        setUserLoc([lat, lng]); // Move their invisible GPS point
        
        // Draw a new pin for visual feedback
        L.circleMarker([lat, lng], { radius: 8, fillColor: '#10b981', color: '#fff', weight: 3, opacity: 1, fillOpacity: 1 })
          .addTo(mapRef.current)
          .bindPopup("Delivery Location")
          .openPopup();

        // Ask Nominatim what the address is at that click!
        const addressName = await getAddressFromCoords(lat, lng);
        if (addressName) {
          setLocationInput(addressName); // Fill the search bar with the real street name
        } else {
          setLocationInput(`${lat.toFixed(4)}, ${lng.toFixed(4)}`); // Fallback if API is slow
        }
      });
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fix Map Grey Box Bug when switching tabs
  useEffect(() => {
    if (isActive && mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 100);
    }
  }, [isActive]);

  // --- HELPER: Draw Base Shops ---
  const drawBaseShops = (L: any) => {
    if (!markersRef.current) return;
    
    Object.values(shopsMap || {}).forEach((shop: any) => {
      if (typeof shop.lat === 'number' && typeof shop.lng === 'number' && !isNaN(shop.lat)) {
        const dotIcon = L.divIcon({ className: 'custom-div-icon', iconSize: [14, 14] });
        
        const popupHtml = `
          <div style="text-align:center; min-width:120px; font-family: 'Plus Jakarta Sans', sans-serif;">
            <div style="font-weight:800; font-size:14px; color:#1e293b; margin-bottom:8px;">${shop.name}</div>
            <button class="khoj-route-btn" data-lat="${shop.lat}" data-lng="${shop.lng}" style="width:100%; background:#6366f1; color:white; border:none; padding:6px; border-radius:6px; font-weight:800; cursor:pointer;">
              Get Route
            </button>
          </div>
        `;

        L.marker([shop.lat, shop.lng], { icon: dotIcon })
         .addTo(markersRef.current)
         .bindPopup(popupHtml); 
      }
    });
  };

  // --- HELPER: Draw Route ---
  const drawRoute = (targetLat: number, targetLng: number) => {
    const L = (window as any).L;
    if (!L || !L.Routing) return alert("Routing engine is loading...");
    if (!userLoc) return alert("Please enable GPS location or tap the map to set a location.");

    if (routingRef.current) {
      mapRef.current.removeControl(routingRef.current);
    }

    routingRef.current = L.Routing.control({
      waypoints: [L.latLng(userLoc[0], userLoc[1]), L.latLng(targetLat, targetLng)],
      routeWhileDragging: false, addWaypoints: false, show: false,
      lineOptions: { styles: [{ color: '#6366f1', opacity: 0.8, weight: 6 }] }
    }).addTo(mapRef.current);

    routingRef.current.on('routesfound', (e: any) => {
      setMapDistance(`${(e.routes[0].summary.totalDistance / 1000).toFixed(2)} km`);
    });
  };

  const clearRoute = () => {
    if (routingRef.current && mapRef.current) {
      mapRef.current.removeControl(routingRef.current);
      routingRef.current = null;
      setMapDistance(null);
    }
    if (userLoc && mapRef.current) mapRef.current.setView(userLoc, 13);
  };

  // --- SEARCH LOGIC 1: Location Geocoding ---
  const handleLocationSearch = async () => {
    if (!locationInput.trim()) return;
    setIsLocating(true);
    
    const coords = await searchAddress(locationInput);
    
    if (coords && mapRef.current) {
      setUserLoc(coords);
      mapRef.current.flyTo(coords, 14, { animate: true, duration: 1.5 });
      
      const L = (window as any).L;
      L.circleMarker(coords, { radius: 8, fillColor: '#10b981', color: '#fff', weight: 3, opacity: 1, fillOpacity: 1 })
        .addTo(mapRef.current)
        .bindPopup(`<b>Delivery Location</b><br/>${locationInput}`)
        .openPopup();
    } else {
      alert("Could not find that address. Try being more specific (e.g., 'Sector 62, Noida').");
    }
    setIsLocating(false);
  };

  // --- SEARCH LOGIC 2: Khoj Products ---
  const handleKhojSearch = async () => {
    const L = (window as any).L;
    if (!khojSearch.trim()) {
      markersRef.current?.clearLayers();
      drawBaseShops(L);
      return;
    }

    setIsSearching(true);
    markersRef.current?.clearLayers();
    drawBaseShops(L); 

    try {
      const q = khojSearch.toLowerCase().trim();
      const prodSnap = await getDocs(collectionGroup(db, 'products'));
      const foundShops: Record<string, { shop: any, matches: number, minPrice: number }> = {};

      prodSnap.forEach(d => {
        const p = d.data();
        const sId = d.ref.parent.parent?.id;
        const shop = sId ? shopsMap[sId] : null;
        
        if (p.name?.toLowerCase().includes(q) && sId && shop && typeof shop.lat === 'number') {
          const price = p.variants?.[0]?.price || 0;
          if (!foundShops[sId]) {
            foundShops[sId] = { shop: shop, matches: 1, minPrice: price };
          } else {
            foundShops[sId].matches += 1;
            if (price < foundShops[sId].minPrice) foundShops[sId].minPrice = price;
          }
        }
      });

      const foundKeys = Object.keys(foundShops);

      if (foundKeys.length > 0) {
        const pinIcon = L.divIcon({ 
          className: 'matched-pin', 
          html: '<div style="font-size:32px; color:#f59e0b; filter:drop-shadow(0 4px 4px rgba(0,0,0,0.3));">📍</div>', 
          iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] 
        });

        foundKeys.forEach(key => {
          const { shop, matches, minPrice } = foundShops[key];
          const popupHtml = `
            <div style="text-align:center; min-width:140px; font-family: 'Plus Jakarta Sans', sans-serif;">
              <div style="font-weight:800; font-size:15px; color:#1e293b; margin-bottom:4px;">${shop.name}</div>
              <div style="font-size:12px; color:#64748b; font-weight:600; margin-bottom:8px;">${matches} items match</div>
              <div style="font-size:14px; color:#10b981; font-weight:800; margin-bottom:12px;">Starts ₹${minPrice}</div>
              <button class="khoj-route-btn" data-lat="${shop.lat}" data-lng="${shop.lng}" style="width:100%; background:#6366f1; color:white; border:none; padding:8px; border-radius:8px; font-weight:800; cursor:pointer;">
                Get Route
              </button>
            </div>
          `;
          L.marker([shop.lat, shop.lng], { icon: pinIcon }).addTo(markersRef.current).bindPopup(popupHtml);
        });

        const group = new L.featureGroup(markersRef.current.getLayers());
        mapRef.current.fitBounds(group.getBounds().pad(0.1));
      } else {
        alert("No shops found selling this item nearby.");
      }
    } catch (e) {
      console.error(e);
      alert("Search failed. Ensure internet connection.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <main className={`tab-view ${isActive ? 'active' : ''}`} style={{ padding: 0, position: 'relative', display: isActive ? 'block' : 'none' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: 'calc(100vh - 140px)', borderRadius: '24px 24px 0 0', zIndex: 1 }}></div>
      
      {/* Double Search Bar UI */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          {/* Geocoding Bar */}
          <div style={{ background: 'white', padding: '8px 16px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '12px', border: '1.5px solid #e2e8f0' }}>
              <i className="fa-solid fa-location-dot" style={{ color: '#ef4444', fontSize: '16px' }}></i>
              <input 
                type="text" 
                placeholder="Set delivery area (e.g. Noida)" 
                value={locationInput} 
                onChange={e => setLocationInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleLocationSearch()}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', fontWeight: 600 }} 
              />
              <button onClick={handleLocationSearch} disabled={isLocating} style={{ background: '#f1f5f9', color: 'var(--text-main)', border: 'none', padding: '8px 12px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>
                {isLocating ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Go'}
              </button>
          </div>

          {/* Product Search Bar */}
          <div style={{ background: 'white', padding: '10px 16px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '12px', border: '1.5px solid var(--brand-primary)' }}>
              <i className="fa-solid fa-radar" style={{ color: 'var(--brand-primary)', fontSize: '18px' }}></i>
              <input 
                type="text" 
                placeholder="Find 'Atta' nearby..." 
                value={khojSearch} 
                onChange={e => setKhojSearch(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleKhojSearch()}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '15px', fontWeight: 600 }} 
              />
              <button onClick={handleKhojSearch} disabled={isSearching} style={{ background: 'var(--brand-primary)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>
                {isSearching ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-magnifying-glass"></i>}
              </button>
          </div>
      </div>

      <div style={{ position: 'absolute', top: '150px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
        <button onClick={clearRoute} style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '10px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} title="Recenter">
          <i className="fa-solid fa-location-crosshairs"></i>
        </button>
        {mapDistance && (
          <div style={{ background: 'var(--brand-primary)', color: 'white', padding: '10px 20px', borderRadius: '20px', fontWeight: 800, fontSize: '13px', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.3s' }}>
            <i className="fa-solid fa-route"></i> {mapDistance}
            <button onClick={clearRoute} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: '4px' }}>✕</button>
          </div>
        )}
      </div>
    </main>
  );
};