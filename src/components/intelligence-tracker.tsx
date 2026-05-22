'use client';

import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * Background component that captures hardware, network, and geo intelligence
 * for the current user and syncs it to their Firestore profile.
 */
export function IntelligenceTracker() {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    if (!user || !firestore || !profile) return;

    // Limit sync to once per 10 minutes to save resources
    const now = Date.now();
    if (now - lastSyncRef.current < 600000) return;
    lastSyncRef.current = now;

    const captureIntelligence = async () => {
      try {
        // 1. Get real client IP via server-side bridge
        let ip = "Unknown";
        try {
            const ipRes = await fetch('/api/get-client-ip', { cache: 'no-store' });
            if (ipRes.ok) {
                const ipData = await ipRes.json();
                ip = ipData.ip;
            }
        } catch (e) { /* silent fallback */ }

        // 2. Fetch Network/Geo enrichment (Real-time per user)
        let geoData: any = {};
        try {
            const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
            if (geoRes.ok) {
                geoData = await geoRes.json();
            } else {
                const altRes = await fetch('https://ip-api.com/json/');
                if (altRes.ok) geoData = await altRes.json();
            }
        } catch (e) { 
            console.warn("Geo fetch restricted by provider."); 
        }

        // 3. Hardware Fingerprinting
        const battery: any = (navigator as any).getBattery ? await (navigator as any).getBattery() : null;
        const connection: any = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        
        let gpuInfo = "Unknown";
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
                gpuInfo = debugInfo ? (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "Generic WebGL";
            }
        } catch (e) {}

        const fingerprintRaw = `${navigator.userAgent}|${window.screen.width}x${window.screen.height}|${new Date().getTimezoneOffset()}`;
        const fingerprintId = btoa(fingerprintRaw).slice(0, 16).toUpperCase();

        const intel = {
            network: {
                ipv4: ip,
                isp: geoData.org || geoData.isp || "Unknown",
                asn: geoData.asn || geoData.as || "Unknown",
                type: connection?.effectiveType || "WiFi/Cellular",
                downlink: connection?.downlink ? `${connection.downlink} Mbps` : "Unknown",
            },
            geo: {
                country: geoData.country_name || geoData.country || "Unknown",
                region: geoData.region || geoData.regionName || "Unknown",
                city: geoData.city || "Unknown",
                zip: geoData.postal || geoData.zip || "Unknown",
                lat: geoData.latitude || geoData.lat || 0,
                lon: geoData.longitude || geoData.lon || 0,
                timezone: geoData.timezone || "Unknown",
            },
            hardware: {
                cpu: `${navigator.hardwareConcurrency || 'Unknown'} Cores`,
                ram: (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : "Unknown",
                gpu: gpuInfo,
                battery: battery ? `${Math.round(battery.level * 100)}% (${battery.charging ? 'Charging' : 'Unplugged'})` : "Unknown",
                resolution: `${window.screen.width}x${window.screen.height}`,
            },
            software: {
                ua: navigator.userAgent,
                os: navigator.platform,
                lang: navigator.language,
                fingerprint: fingerprintId,
            },
            risk: {
                vpn: (geoData.org || '').toLowerCase().includes('vpn') ? 'warning' : 'safe',
                proxy: 'safe',
                tor: 'safe',
            },
            lastUpdated: new Date().toISOString()
        };

        await updateDoc(doc(firestore, 'users', user.uid), { intelligence: intel });

      } catch (error) {
        console.warn("Tracker exception caught.");
      }
    };

    captureIntelligence();
  }, [user, firestore, profile]);

  return null;
}
