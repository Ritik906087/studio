
'use client';

import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export function IntelligenceTracker() {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    if (!user || !firestore || !profile) return;

    const now = Date.now();
    if (now - lastSyncRef.current < 600000) return;
    lastSyncRef.current = now;

    const captureIntelligence = async () => {
      try {
        let ip = "Unknown";
        try {
            const ipRes = await fetch('/api/get-client-ip', { cache: 'no-store' });
            if (ipRes.ok) {
                const ipData = await ipRes.json();
                ip = ipData.ip;
            }
        } catch (e) {}

        let geoData: any = {};
        try {
            const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
            if (geoRes.ok) geoData = await geoRes.json();
        } catch (e) {}

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

        // SECURE FINGERPRINT GENERATION (Matches registration logic)
        const components = [
            navigator.hardwareConcurrency || 0,
            (navigator as any).deviceMemory || 0,
            gpuInfo,
            window.screen.width,
            window.screen.height,
            window.screen.colorDepth,
            navigator.platform,
            navigator.maxTouchPoints || 0,
            new Date().getTimezoneOffset(),
            navigator.language
        ];
        const hardwareFingerprint = btoa(components.join('|')).replace(/[/+=]/g, '').slice(0, 32).toUpperCase();

        const intel = {
            network: {
                ipv4: ip,
                isp: geoData.org || geoData.isp || "Unknown",
                type: connection?.effectiveType || "WiFi/Cellular",
            },
            geo: {
                country: geoData.country_name || "Unknown",
                city: geoData.city || "Unknown",
            },
            hardware: {
                cpu: `${navigator.hardwareConcurrency || 'Unknown'} Cores`,
                ram: (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : "Unknown",
                gpu: gpuInfo,
                resolution: `${window.screen.width}x${window.screen.height}`,
            },
            software: {
                ua: navigator.userAgent,
                os: navigator.platform,
            },
            risk: {
                vpn: (geoData.org || '').toLowerCase().includes('vpn') ? 'warning' : 'safe',
                proxy: (geoData.org || '').toLowerCase().includes('proxy') ? 'warning' : 'safe',
            },
            lastUpdated: new Date().toISOString()
        };

        await updateDoc(doc(firestore, 'users', user.uid), { 
          intelligence: intel,
          hardwareFingerprint: hardwareFingerprint // Continuously verify hardware link
        });

      } catch (error) {
        console.warn("Tracker exception caught.");
      }
    };

    captureIntelligence();
  }, [user, firestore, profile]);

  return null;
}
