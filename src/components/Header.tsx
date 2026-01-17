'use client';

import Link from 'next/link';
import { BarChart3, User, Menu, ArrowUpCircle, ArrowDownCircle, Target, ShieldAlert, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradeSignal {
    action: 'BUY' | 'SELL' | 'NEUTRAL';
    entry: string;
    sl: string;
    tp: string;
    confidence?: string;
}

interface HeaderProps {
    currentSymbol: string;
    onSymbolChange: (symbol: string) => void;
    signal?: TradeSignal | null;
    onAnalyze: () => void;
    isAnalyzing: boolean;
    hasAnalysis: boolean;
}

const ASSETS = [
    { name: 'BTCUSD', symbol: 'BITSTAMP:BTCUSD' },
    { name: 'EURUSD', symbol: 'FX:EURUSD' },
    { name: 'GBPUSD', symbol: 'FX:GBPUSD' },
    { name: 'USDJPY', symbol: 'FX:USDJPY' },
    { name: 'ETHUSD', symbol: 'BITSTAMP:ETHUSD' },
];

export function Header({ currentSymbol, onSymbolChange, signal, onAnalyze, isAnalyzing, hasAnalysis }: HeaderProps) {
    return (
        <header className="h-16 border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-4 md:gap-8 overflow-hidden flex-1">
                <Link href="/" className="flex items-center gap-2 group shrink-0">
                    <div className="size-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all">
                        <BarChart3 className="text-white size-5" />
                    </div>
                    <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent hidden lg:block">
                        Nexus Trading
                    </span>
                </Link>

                {/* Asset Switcher - Scrollable on mobile */}
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar max-w-[120px] xs:max-w-none">
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
                            {item.name.replace('USD', '')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-4 shrink-0 flex-1 justify-end">
                {/* Signal Display - Moved next to analyze button */}
                {signal && (
                    <div className="flex items-center gap-2 md:gap-4 px-2 md:px-4 py-1.5 bg-white/5 rounded-2xl border border-white/10 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden shrink min-w-0">
                        <div className="flex items-center gap-1 md:gap-2 border-r border-white/10 pr-2 md:pr-4 shrink-0">
                            {signal.action === 'BUY' ? (
                                <ArrowUpCircle className="size-3 md:size-4 text-emerald-500" />
                            ) : signal.action === 'SELL' ? (
                                <ArrowDownCircle className="size-3 md:size-4 text-rose-500" />
                            ) : null}
                            <span className={cn(
                                "font-black text-[10px] md:text-xs uppercase tracking-widest",
                                signal.action === 'BUY' ? "text-emerald-500" : signal.action === 'SELL' ? "text-rose-500" : "text-zinc-400"
                            )}>
                                {signal.action}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 md:gap-6 overflow-hidden">
                            <div className="flex flex-col min-w-0">
                                <span className="text-[7px] md:text-[8px] text-zinc-500 uppercase font-black tracking-tighter truncate">Entry</span>
                                <span className="text-[10px] md:text-xs font-bold text-white tabular-nums truncate">{signal.entry}</span>
                            </div>
                            <div className="flex flex-col min-w-0 hidden xs:flex">
                                <span className="text-[7px] md:text-[8px] text-rose-500/80 uppercase font-black tracking-tighter flex items-center gap-0.5 md:gap-1">
                                    <ShieldAlert className="size-1.5 md:size-2" /> SL
                                </span>
                                <span className="text-[10px] md:text-xs font-bold text-rose-500 tabular-nums truncate">{signal.sl}</span>
                            </div>
                            <div className="flex flex-col min-w-0 hidden xs:flex">
                                <span className="text-[7px] md:text-[8px] text-emerald-500/80 uppercase font-black tracking-tighter flex items-center gap-0.5 md:gap-1">
                                    <Target className="size-1.5 md:size-2" /> TP
                                </span>
                                <span className="text-[10px] md:text-xs font-bold text-emerald-500 tabular-nums truncate">{signal.tp}</span>
                            </div>
                        </div>

                        {signal.confidence && (
                            <div className="ml-1 md:ml-2 pl-2 md:pl-4 border-l border-white/10 hidden sm:block shrink-0">
                                <span className="text-[7px] md:text-[8px] text-blue-400/80 uppercase font-black tracking-tighter block">Conf.</span>
                                <span className="text-[10px] md:text-xs font-bold text-blue-400 tabular-nums">{signal.confidence}</span>
                            </div>
                        )}
                    </div>
                )}

                <button
                    onClick={onAnalyze}
                    disabled={isAnalyzing}
                    className={cn(
                        "flex items-center gap-1 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest transition-all shrink-0",
                        isAnalyzing
                            ? "bg-white/5 text-zinc-500 cursor-not-allowed"
                            : hasAnalysis
                                ? "bg-white/5 text-blue-400 border border-blue-500/20 hover:bg-blue-500/10"
                                : "bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.02]"
                    )}
                >
                    {isAnalyzing ? (
                        <div className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Sparkles className="size-3 md:size-3.5" />
                    )}
                    <span>{isAnalyzing ? "..." : hasAnalysis ? "Re-Analyze" : "Analyze"}</span>
                </button>
            </div>
        </header>
    );
}
