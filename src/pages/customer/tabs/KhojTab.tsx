// File: src/pages/customer/tabs/KhojTab.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useCustomerStore } from '../../../store/useCustomerStore';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

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
  
  // State
  const [mapDistance, setMapDistance] = useState<string | null>(null);
  const [khojSearch, setKhojSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);

  // 1. INITIALIZE MAP (Only Once)
  useEffect(() => {
    const initMap = () => {
      const L = (window as any).L;
      
      // Wait for Leaflet to download
      if (typeof L === 'undefined') {
        setTimeout(initMap, 100);
        return;
      }

      // Prevent "Map already initialized" error
      if (mapRef.current || !mapContainerRef.current) return;

      // Default center (India)
      const initialLoc: [number, number] = [20.5937, 78.9629];
      
      // Create Map
      mapRef.current = L.map(mapContainerRef.current, { zoomControl: false }).setView(initialLoc, 5);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(mapRef.current);
      
      // Create Marker Layer Group
      markersRef.current = L.layerGroup().addTo(mapRef.current);

      // Draw Base Shops
      drawBaseShops(L);

      // Get Actual User Location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setUserLoc(loc);
            mapRef.current.setView(loc, 13);
            
            // User Location Dot
            L.circleMarker(loc, { radius: 8, fillColor: '#3b82f6', color: '#fff', weight: 3, opacity: 1, fillOpacity: 1 })
             .addTo(mapRef.current)
             .bindPopup("You are here");
          },
          (err) => console.warn("Location access denied or failed.", err),
          { timeout: 10000 }
        );
      }

      // Safe Event Delegation for Routing (Catches clicks inside popups)
      mapRef.current.on('popupopen', () => {
        const routeBtn = document.getElementById('khoj-route-btn');
        if (routeBtn) {
          routeBtn.onclick = () => {
            const lat = Number(routeBtn.getAttribute('data-lat'));
            const lng = Number(routeBtn.getAttribute('data-lng'));
            drawRoute(lat, lng);
            mapRef.current.closePopup();
          };
        }
      });
    };

    initMap();

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Run only once on mount

  // 2. FIX GREY MAP BUG (Resize when tab becomes visible)
  useEffect(() => {
    if (isActive && mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 100);
    }
  }, [isActive]);

  // Helper: Draw all shops as basic dots
  const drawBaseShops = (L: any) => {
    if (!markersRef.current) return;
    Object.values(shopsMap || {}).forEach(shop => {
      if (shop.lat && shop.lng) {
        const dotIcon = L.divIcon({ className: 'custom-div-icon', iconSize: [14, 14] });
        L.marker([shop.lat, shop.lng], { icon: dotIcon }).addTo(markersRef.current);
      }
    });
  };

  // Helper: Draw Route Line
  const drawRoute = (targetLat: number, targetLng: number) => {
    const L = (window as any).L;
    if (!L || !L.Routing) return alert("Routing engine is still loading...");
    if (!userLoc) return alert("Please enable GPS location to get directions.");

    // Clear old route
    if (routingRef.current) {
      mapRef.current.removeControl(routingRef.current);
    }

    routingRef.current = L.Routing.control({
      waypoints: [L.latLng(userLoc[0], userLoc[1]), L.latLng(targetLat, targetLng)],
      routeWhileDragging: false, 
      addWaypoints: false, 
      show: false, // Hides the bulky text directions
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
    if (userLoc && mapRef.current) {
      mapRef.current.setView(userLoc, 13);
    }
  };

  // 3. SEARCH LOGIC
  const handleKhojSearch = async () => {
    if (!khojSearch.trim()) {
      // If search is empty, just reset the map
      markersRef.current?.clearLayers();
      drawBaseShops((window as any).L);
      return;
    }

    setIsSearching(true);
    const L = (window as any).L;
    markersRef.current?.clearLayers();
    drawBaseShops(L); // Keep base dots

    try {
      const q = khojSearch.toLowerCase().trim();
      const prodSnap = await getDocs(collectionGroup(db, 'products'));
      const foundShops: Record<string, { shop: any, matches: number, minPrice: number }> = {};

      prodSnap.forEach(d => {
        const p = d.data();
        const sId = d.ref.parent.parent?.id;
        
        if (p.name?.toLowerCase().includes(q) && sId && shopsMap[sId]) {
          const price = p.variants?.[0]?.price || 0;
          if (!foundShops[sId]) {
            foundShops[sId] = { shop: shopsMap[sId], matches: 1, minPrice: price };
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
              <button id="khoj-route-btn" data-lat="${shop.lat}" data-lng="${shop.lng}" style="width:100%; background:#6366f1; color:white; border:none; padding:8px; border-radius:8px; font-weight:800; cursor:pointer;">
                Get Route
              </button>
            </div>
          `;

          L.marker([shop.lat, shop.lng], { icon: pinIcon }).addTo(markersRef.current).bindPopup(popupHtml);
        });

        // Zoom to fit all found shops
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
      {/* The Map Container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: 'calc(100vh - 140px)', borderRadius: '24px 24px 0 0', zIndex: 1 }}></div>
      
      {/* Floating Search Bar */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', zIndex: 1000, background: 'white', padding: '10px 16px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '12px', border: '1.5px solid var(--brand-primary)' }}>
          <i className="fa-solid fa-radar" style={{ color: 'var(--brand-primary)', fontSize: '18px' }}></i>
          <input 
            type="text" 
            placeholder="Find 'Atta' nearby..." 
            value={khojSearch} 
            onChange={e => setKhojSearch(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleKhojSearch()}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '15px', fontWeight: 600 }} 
          />
          <button onClick={handleKhojSearch} disabled={isSearching} style={{ background: 'var(--brand-primary)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', transition: '0.2s' }}>
            {isSearching ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-magnifying-glass"></i>}
          </button>
      </div>

      {/* Floating Route Info & Controls */}
      <div style={{ position: 'absolute', top: '90px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
        
        {/* Recenter Button */}
        <button onClick={clearRoute} style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '10px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} title="Recenter">
          <i className="fa-solid fa-location-crosshairs"></i>
        </button>

        {/* Distance Badge */}
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