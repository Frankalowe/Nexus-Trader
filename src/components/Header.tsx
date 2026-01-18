'use client';

import Link from 'next/link';
import { BarChart3, User, Menu, ArrowUpCircle, ArrowDownCircle, Target, ShieldAlert, Sparkles, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradeSignal {
    action: 'BUY' | 'SELL' | 'NEUTRAL';
    entry: string;
    sl: string;
    tp: string;
    confidence?: string;
    entryTime?: string;
    exitTime?: string;
    positionSize?: string;
}

interface HeaderProps {
    currentSymbol: string;
    onSymbolChange: (symbol: string) => void;
    signal?: TradeSignal | null;
    onAnalyze: () => void;
    isAnalyzing: boolean;
    hasAnalysis: boolean;
    equity: string;
    onEquityChange: (equity: string) => void;
}

const ASSETS = [
    { name: 'BTCUSD', symbol: 'BITSTAMP:BTCUSD' },
    { name: 'EURUSD', symbol: 'FX:EURUSD' },
    { name: 'GBPUSD', symbol: 'FX:GBPUSD' },
    { name: 'USDJPY', symbol: 'FX:USDJPY' },
    { name: 'ETHUSD', symbol: 'BITSTAMP:ETHUSD' },
];

export function Header({
    currentSymbol,
    onSymbolChange,
    signal,
    onAnalyze,
    isAnalyzing,
    hasAnalysis,
    equity,
    onEquityChange
}: HeaderProps) {
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
                <div className="hidden sm:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
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

                {/* Equity & Risk Management */}
                <div className="hidden lg:flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 ml-2 group hover:border-blue-500/30 transition-all">
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Global Equity</span>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-zinc-400">$</span>
                            <input
                                type="number"
                                value={equity}
                                onChange={(e) => onEquityChange(e.target.value)}
                                className="bg-transparent text-xs font-bold text-white w-20 outline-none tabular-nums"
                                placeholder="10000"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-4 shrink-0 flex-1 justify-end">
                {/* Signal Display - Moved next to analyze button */}
                {signal && (
                    <div className="hidden md:flex items-center gap-4 px-4 py-1.5 bg-white/5 rounded-2xl border border-white/10 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                            {signal.action === 'BUY' ? (
                                <ArrowUpCircle className="size-4 text-emerald-500" />
                            ) : signal.action === 'SELL' ? (
                                <ArrowDownCircle className="size-4 text-rose-500" />
                            ) : null}
                            <span className={cn(
                                "font-black text-xs uppercase tracking-widest",
                                signal.action === 'BUY' ? "text-emerald-500" : signal.action === 'SELL' ? "text-rose-500" : "text-zinc-400"
                            )}>
                                {signal.action}
                            </span>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                                <span className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter">Level</span>
                                <span className="text-xs font-bold text-white tabular-nums">{signal.entry}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] text-rose-500/80 uppercase font-black tracking-tighter flex items-center gap-1">
                                    <ShieldAlert className="size-2" /> Stop
                                </span>
                                <span className="text-xs font-bold text-rose-500 tabular-nums">{signal.sl}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] text-emerald-500/80 uppercase font-black tracking-tighter flex items-center gap-1">
                                    <Target className="size-2" /> Target
                                </span>
                                <span className="text-xs font-bold text-emerald-500 tabular-nums">{signal.tp}</span>
                            </div>
                        </div>

                        {signal.positionSize && (
                            <div className="flex flex-col pl-4 border-l border-white/10 text-right">
                                <span className="text-[8px] text-blue-400 uppercase font-black tracking-tighter flex items-center justify-end gap-1">
                                    <Sparkles className="size-2" /> Risk Size (0.5%)
                                </span>
                                <span className="text-[11px] font-black text-blue-400 whitespace-nowrap tabular-nums">{signal.positionSize}</span>
                            </div>
                        )}

                        {(signal.entryTime || signal.exitTime) && (
                            <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                                {signal.entryTime && (
                                    <div className="flex flex-col text-right">
                                        <span className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter flex items-center justify-end gap-1">
                                            <Clock className="size-2" /> Entry
                                        </span>
                                        <span className="text-[10px] font-bold text-white whitespace-nowrap">{signal.entryTime}</span>
                                    </div>
                                )}
                                {signal.exitTime && (
                                    <div className="flex flex-col text-right">
                                        <span className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter flex items-center justify-end gap-1">
                                            <Clock className="size-2" /> Exit
                                        </span>
                                        <span className="text-[10px] font-bold text-white whitespace-nowrap">{signal.exitTime}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {signal.confidence && (
                            <div className="ml-2 pl-4 border-l border-white/10">
                                <span className="text-[8px] text-blue-400/80 uppercase font-black tracking-tighter block">Confidence</span>
                                <span className="text-xs font-bold text-blue-400 tabular-nums">{signal.confidence}</span>
                            </div>
                        )}
                    </div>
                )}

                <button
                    onClick={onAnalyze}
                    disabled={isAnalyzing}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all",
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
                        <Sparkles className="size-3.5" />
                    )}
                    <span>{isAnalyzing ? "Processing" : hasAnalysis ? "Re-Analyze" : "Analyze Chart"}</span>
                </button>
            </div>
        </header>
    );
}
