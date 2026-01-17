'use client';

import Link from 'next/link';
import { BarChart3, User, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
    currentSymbol: string;
    onSymbolChange: (symbol: string) => void;
}

const ASSETS = [
    { name: 'EURUSD', symbol: 'FX:EURUSD' },
    { name: 'GBPUSD', symbol: 'FX:GBPUSD' },
    { name: 'USDJPY', symbol: 'FX:USDJPY' },
    { name: 'BTCUSD', symbol: 'BITSTAMP:BTCUSD' },
    { name: 'ETHUSD', symbol: 'BITSTAMP:ETHUSD' },
];

export function Header({ currentSymbol, onSymbolChange }: HeaderProps) {
    return (
        <header className="h-16 border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-4 md:gap-8 overflow-hidden">
                <Link href="/" className="flex items-center gap-2 group shrink-0">
                    <div className="size-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all">
                        <BarChart3 className="text-white size-5" />
                    </div>
                    <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent hidden sm:block">
                        Nexus Trading
                    </span>
                </Link>

                {/* Asset Switcher - Scrollable on mobile */}
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar max-w-[200px] xs:max-w-[300px] sm:max-w-none">
                    {ASSETS.map((item) => (
                        <button
                            key={item.symbol}
                            onClick={() => onSymbolChange(item.symbol)}
                            className={cn(
                                "px-2.5 md:px-3 py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all whitespace-nowrap",
                                currentSymbol === item.symbol
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {item.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4 shrink-0">
                <button className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors p-2 md:p-0">
                    <User className="size-4 md:size-5" />
                    <span className="hidden md:inline">Profile</span>
                </button>
            </div>
        </header>
    );
}
