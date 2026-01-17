'use client';

import React, { useEffect, useRef, memo } from 'react';

interface Props {
    symbol?: string;
}

function TradingViewWidget({ symbol = "FX:EURUSD" }: Props) {
    const container = useRef<HTMLDivElement>(null);
    const widgetId = useRef(`tradingview_${Math.random().toString(36).substring(7)}`);

    useEffect(() => {
        // Clear previous widget if any
        if (container.current) {
            container.current.innerHTML = '';
        }

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = JSON.stringify({
            "autosize": true,
            "symbol": symbol,
            "interval": "1",
            "timezone": "Asia/Kolkata",
            "theme": "dark",
            "style": "1",
            "locale": "en",
            "enable_publishing": false,
            "hide_side_toolbar": false,
            "allow_symbol_change": true,
            "save_image": false,
            "calendar": false,
            "support_host": "https://www.tradingview.com"
        });

        container.current?.appendChild(script);
    }, [symbol]);

    return (
        <div className="tradingview-widget-container h-full w-full relative" ref={container} id={widgetId.current}>
            <div className="tradingview-widget-container__widget h-full w-full"></div>
        </div>
    );
}

export default memo(TradingViewWidget);
