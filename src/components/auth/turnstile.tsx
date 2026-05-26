
'use client';

import React, { useEffect, useRef } from 'react';

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark' | 'auto';
}

declare global {
  interface Window {
    onloadTurnstileCallback: () => void;
    turnstile: {
      render: (container: string | HTMLElement, options: any) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function Turnstile({ onVerify, onExpire, onError, theme = 'auto' }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const isRendered = useRef(false);

  useEffect(() => {
    // Load script once
    if (!document.getElementById('cloudflare-turnstile-script')) {
      const script = document.createElement('script');
      script.id = 'cloudflare-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const renderWidget = () => {
      if (window.turnstile && containerRef.current && !isRendered.current) {
        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: '0x4AAAAAADV2Z7AKshcMID_Z',
            callback: (token: string) => {
              onVerify(token);
            },
            'expired-callback': () => {
              onExpire?.();
            },
            'error-callback': () => {
              onError?.();
            },
            theme,
          });
          widgetIdRef.current = id;
          isRendered.current = true;
        } catch (e) {
          console.error("Turnstile Render Failed:", e);
        }
      }
    };

    let interval: NodeJS.Timeout;
    if (window.turnstile) {
      renderWidget();
    } else {
      interval = setInterval(() => {
        if (window.turnstile) {
          renderWidget();
          clearInterval(interval);
        }
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
      // Not removing to prevent re-render flickers on some mobile browsers
    };
  }, [onVerify, onExpire, onError, theme]);

  return (
    <div className="flex justify-center my-2 min-h-[65px] w-full z-0 relative">
      <div 
        className="rounded-2xl overflow-hidden min-h-[65px] flex items-center justify-center"
        style={{ width: '100%', maxWidth: '300px' }}
      >
        <div ref={containerRef} />
      </div>
    </div>
  );
}
