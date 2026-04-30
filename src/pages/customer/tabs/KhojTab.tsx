import React, { useEffect, useRef, useState } from 'react';
import { useCustomerStore } from '../../../store/useCustomerStore';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

declare const L: any;

interface KhojTabProps {
  isActive: boolean;
}

export const KhojTab: React.FC<KhojTabProps> = ({ isActive }) => {
  const { shopsMap } = useCustomerStore();
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const routingRef = useRef<any>(null);
  const [mapDistance, setMapDistance] = useState<string | null>(null);
  const [khojSearch, setKhojSearch] = useState('');
useEffect(() => {
    if (isActive && !mapRef.current) {
      // 🛑 CRITICAL FIX: Wait for Leaflet to download before drawing the map!
      const initMap = () => {
        if (typeof (window as any).L === 'undefined') {
          setTimeout(initMap, 100); // Check again in 100ms
          return;
        }

        const L = (window as any).L;
        const initialLoc = [20.5937, 78.9629];
        mapRef.current = L.map('leafletMap', { zoomControl: false }).setView(initialLoc, 5);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(mapRef.current);
        markersRef.current = L.layerGroup().addTo(mapRef.current);

        // Render base shop dots safely
        Object.values(shopsMap || {}).forEach(shop => {
          if (shop.lat && shop.lng) {
            const dotIcon = L.divIcon({ className: 'custom-div-icon', iconSize: [14, 14] });
            L.marker([shop.lat, shop.lng], { icon: dotIcon }).addTo(markersRef.current);
          }
        });

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(pos => {
            const loc = [pos.coords.latitude, pos.coords.longitude];
            mapRef.current.setView(loc, 13);
            L.circleMarker(loc, { radius: 8, fillColor: '#3b82f6', color: '#fff', weight: 3, opacity: 1, fillOpacity: 1 }).addTo(mapRef.current).bindPopup("You are here");
            
            let minD = Infinity; let nearest: any = null;
            Object.values(shopsMap || {}).forEach(s => {
              if (s.lat && s.lng) {
                const d = Math.sqrt(Math.pow(s.lat - loc[0], 2) + Math.pow(s.lng - loc[1], 2));
                if (d < minD) { minD = d; nearest = s; }
              }
            });

            if (nearest) {
              const pinIcon = L.divIcon({ className: 'matched-pin', html: '<i class="fa-solid fa-location-dot pin-icon"></i>', iconSize: [38, 38], iconAnchor: [19, 38], popupAnchor: [0, -38] });
              L.marker([nearest.lat, nearest.lng], { icon: pinIcon }).addTo(markersRef.current)
                .bindPopup(`<div style="text-align:center;"><b>Nearest Shop: ${nearest.name}</b><br><button onclick="window.drawRoute(${nearest.lat}, ${nearest.lng}, ${loc[0]}, ${loc[1]})" style="background:#6366f1;color:white;border:none;padding:5px 10px;border-radius:5px;margin-top:5px;cursor:pointer;">Get Route</button></div>`).openPopup();
            }
          });
        }

        (window as any).drawRoute = (tLat: number, tLng: number, uLat: number, uLng: number) => {
          if (routingRef.current) mapRef.current.removeControl(routingRef.current);
          
          // Safety check: ensure Routing machine loaded
          if (typeof L.Routing === 'undefined') {
            alert("Routing library is still loading. Please try again in a second.");
            return;
          }

          routingRef.current = L.Routing.control({
            waypoints: [L.latLng(uLat, uLng), L.latLng(tLat, tLng)],
            routeWhileDragging: false, addWaypoints: false, show: false,
            lineOptions: { styles: [{ color: '#6366f1', opacity: 0.8, weight: 6 }] }
          }).addTo(mapRef.current);

          routingRef.current.on('routesfound', (e: any) => {
            setMapDistance(`${(e.routes[0].summary.totalDistance / 1000).toFixed(2)} km`);
          });
        };
      };

      // Start the initialization loop
      initMap();
    }
  }, [isActive, shopsMap]);

  const handleKhojSearch = async () => {
    if (!khojSearch) return;
    markersRef.current.clearLayers();
    
    Object.values(shopsMap || {}).forEach(shop => {
      if (shop.lat && shop.lng) L.marker([shop.lat, shop.lng], { icon: L.divIcon({ className: 'custom-div-icon', iconSize: [14, 14] }) }).addTo(markersRef.current);
    });

    try {
      const q = khojSearch.toLowerCase();
      const prodSnap = await getDocs(collectionGroup(db, 'products'));
      const foundShops: Record<string, any> = {};

      prodSnap.forEach(d => {
        const p = d.data();
        const sId = d.ref.parent.parent?.id;
        if (p.name?.toLowerCase().includes(q) && sId && shopsMap[sId]) {
          if (!foundShops[sId]) foundShops[sId] = { shop: shopsMap[sId], products: [] };
          foundShops[sId].products.push(p);
        }
      });

      if (Object.keys(foundShops).length > 0) {
        const pinIcon = L.divIcon({ className: 'matched-pin', html: '<i class="fa-solid fa-location-dot pin-icon"></i>', iconSize: [38, 38], iconAnchor: [19, 38], popupAnchor: [0, -38] });
        Object.values(foundShops).forEach(s => {
          L.marker([s.shop.lat, s.shop.lng], { icon: pinIcon }).addTo(markersRef.current)
            .bindPopup(`<div style="text-align:center;"><b>${s.shop.name}</b><br>Has ${s.products.length} matches.</div>`);
        });
        mapRef.current.fitBounds(new L.featureGroup(markersRef.current.getLayers()).getBounds().pad(0.1));
      } else {
        alert("No shops found selling this item nearby.");
      }
    } catch (e) {
      console.error(e);
      alert("Search failed. Ensure internet connection.");
    }
  };

  return (
    <main className={`tab-view ${isActive ? 'active' : ''}`} style={{ padding: 0 }}>
      <div id="leafletMap" style={{ width: '100%', height: 'calc(100vh - 140px)', borderRadius: '24px 24px 0 0' }}></div>
      <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', zIndex: 1000, background: 'white', padding: '14px 20px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '12px', border: '1.5px solid var(--brand-primary)' }}>
          <i className="fa-solid fa-radar" style={{ color: 'var(--brand-primary)' }}></i>
          <input type="text" placeholder="Find 'Atta' nearby..." value={khojSearch} onChange={e => setKhojSearch(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', fontWeight: 600 }} />
          <button onClick={handleKhojSearch} style={{ background: 'var(--brand-primary)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '12px', fontWeight: 800 }}><i className="fa-solid fa-magnifying-glass"></i></button>
      </div>
      {mapDistance && <div style={{ position: 'fixed', top: '90px', left: '50%', transform: 'translateX(-50%)', background: 'var(--brand-primary)', color: 'white', padding: '10px 20px', borderRadius: '20px', fontWeight: 800, fontSize: '12px', zIndex: 2000, boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}><i className="fa-solid fa-route"></i> Distance: {mapDistance}</div>}
    </main>
  );
};
