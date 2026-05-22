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
    // Only track if user is logged in and firestore is ready
    if (!user || !firestore || !profile) return;

    // Limit sync to once per 30 minutes to save resources
    const now = Date.now();
    if (now - lastSyncRef.current < 1800000) return;
    lastSyncRef.current = now;

    const captureIntelligence = async () => {
      try {
        // 1. Get real client IP from our secure API
        let ip = "127.0.0.1";
        try {
            const ipRes = await fetch('/api/get-client-ip', { cache: 'no-store' });
            if (ipRes.ok) {
                const ipData = await ipRes.json();
                ip = ipData.ip;
            }
        } catch (e) { console.warn("Local IP detection used."); }

        // 2. Fetch Network/Geo enrichment with error handling
        let geoData: any = {};
        try {
            const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
            if (geoRes.ok) {
                geoData = await geoRes.json();
            }
        } catch (e) { console.error("Geo fetch failed, using fallback."); }

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

        const fingerprintRaw = `${navigator.userAgent}|${window.screen.width}x${window.screen.height}|${new Date().getTimezoneOffset()}|${navigator.language}`;
        const fingerprintId = btoa(fingerprintRaw).slice(0, 16).toUpperCase();

        const intel = {
            network: {
                ipv4: ip,
                isp: geoData.org || "Unknown",
                asn: geoData.asn || "Unknown",
                type: connection?.effectiveType || "WiFi/Cellular",
                downlink: connection?.downlink ? `${connection.downlink} Mbps` : "Unknown",
            },
            geo: {
                country: geoData.country_name || "Unknown",
                region: geoData.region || "Unknown",
                city: geoData.city || "Unknown",
                zip: geoData.postal || "Unknown",
                lat: geoData.latitude || 0,
                lon: geoData.longitude || 0,
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
                vpn: geoData.org?.toLowerCase().includes('vpn') || geoData.org?.toLowerCase().includes('hosting') ? 'warning' : 'safe',
                proxy: 'safe',
                tor: 'safe',
                bot: /bot|googlebot|crawler|spider|robot/i.test(navigator.userAgent) ? 'danger' : 'safe',
            },
            lastUpdated: new Date().toISOString()
        };

        // Update the user profile document
        await updateDoc(doc(firestore, 'users', user.uid), {
            intelligence: intel
        });

      } catch (error) {
        console.error("Critical tracking failure:", error);
      }
    };

    captureIntelligence();
  }, [user, firestore, profile]);

  return null;
}
