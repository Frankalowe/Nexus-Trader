'use client';

import Link from 'next/link';
import { BarChart3, User, Menu, ArrowUpCircle, ArrowDownCircle, Target, ShieldAlert, Sparkles, Clock, Maximize2, ChevronDown, Wallet, ShieldCheck, Percent } from 'lucide-react';
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
    rr?: string;
    riskRewardRatio?: string;
    status?: string;
}

interface HeaderProps {
    currentSymbol: string;
    onSymbolChange: (symbol: string) => void;
    equity: number;
    onEquityChange: (equity: number) => void;
    riskPercentage: number;
    onRiskChange: (risk: number) => void;
    signal?: TradeSignal | null;
    onAnalyze: () => void;
    isAnalyzing: boolean;
    hasAnalysis: boolean;
}

const ASSET_CATEGORIES = [
    {
        label: 'Commodities',
        assets: [
            { name: 'XAUUSD', symbol: 'OANDA:XAUUSD' },
            { name: 'XAGUSD', symbol: 'OANDA:XAGUSD' },
        ]
    },
    {
        label: 'Forex',
        assets: [
            { name: 'EURUSD', symbol: 'FX:EURUSD' },
            { name: 'GBPUSD', symbol: 'FX:GBPUSD' },
            { name: 'USDJPY', symbol: 'FX:USDJPY' },
            { name: 'AUDUSD', symbol: 'FX:AUDUSD' },
            { name: 'USDCHF', symbol: 'FX:USDCHF' },
            { name: 'USDCAD', symbol: 'FX:USDCAD' },
            { name: 'AUDCHF', symbol: 'FX:AUDCHF' },
            { name: 'AUDCAD', symbol: 'FX:AUDCAD' },
            { name: 'AUDNZD', symbol: 'FX:AUDNZD' },
            { name: 'AUDJPY', symbol: 'FX:AUDJPY' },
            { name: 'EURJPY', symbol: 'FX:EURJPY' },
            { name: 'GBPJPY', symbol: 'FX:GBPJPY' },
            { name: 'CHFJPY', symbol: 'FX:CHFJPY' },
            { name: 'CADJPY', symbol: 'FX:CADJPY' },
            { name: 'NZDJPY', symbol: 'FX:NZDJPY' },
            { name: 'ZARJPY', symbol: 'FX:ZARJPY' },
            { name: 'MXNJPY', symbol: 'FX:MXNJPY' },
        ]
    },
    {
        label: 'Crypto',
        assets: [
            { name: 'BTCUSD', symbol: 'BITSTAMP:BTCUSD' },
            { name: 'ETHUSD', symbol: 'BITSTAMP:ETHUSD' },
            { name: 'SOLUSD', symbol: 'BINANCE:SOLUSD' },
        ]
    },
    {
        label: 'Indices',
        assets: [
            { name: 'US30', symbol: 'FOREXCOM:DJI' },
            { name: 'NAS100', symbol: 'FOREXCOM:NSXUSD' },
            { name: 'SPX500', symbol: 'FOREXCOM:SPXUSD' },
        ]
    }
];

const ASSETS = ASSET_CATEGORIES.flatMap(c => c.assets);

export function Header({
    currentSymbol,
    onSymbolChange,
    equity,
    onEquityChange,
    riskPercentage,
    onRiskChange,
    signal,
    onAnalyze,
    isAnalyzing,
    hasAnalysis,
}: HeaderProps) {
    return (
        <header className="h-16 border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-4 md:gap-8 overflow-hidden flex-1">
                <Link href="/" className="flex items-center gap-2 group shrink-0">
                    <div className="size-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all">
                        <BarChart3 className="text-white size-5" />
                    </div>
                </Link>

                {/* Asset Selector Dropdown */}
                <div className="hidden sm:flex items-center relative group">
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-blue-500/30 transition-all cursor-pointer">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                            {ASSETS.find(a => a.symbol === currentSymbol)?.name || 'Select Asset'}
                        </span>
                        <ChevronDown className="size-3.5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <select
                        value={currentSymbol}
                        onChange={(e) => onSymbolChange(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    >
                        {ASSET_CATEGORIES.map((category) => (
                            <optgroup key={category.label} label={category.label}>
                                {category.assets.map((item) => (
                                    <option key={item.symbol} value={item.symbol}>
                                        {item.name}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                {/* Risk Management Controls */}
                <div className="hidden lg:flex items-center gap-4 border-l border-white/10 pl-6 h-8">
                    <div className="flex items-center gap-3 group">
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 focus-within:border-blue-500/50 transition-all">
                            <Wallet className="size-3.5 text-zinc-500" />
                            <div className="flex flex-col">
                                <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest leading-none">Equity</span>
                                <input
                                    type="number"
                                    value={equity}
                                    onChange={(e) => onEquityChange(parseInt(e.target.value) || 0)}
                                    className="bg-transparent text-[11px] font-bold text-white w-20 outline-none border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 focus-within:border-emerald-500/50 transition-all">
                            <ShieldCheck className="size-3.5 text-emerald-500/70" />
                            <div className="flex flex-col">
                                <span className="text-[7px] font-black text-emerald-500/70 uppercase tracking-widest leading-none">Risk %</span>
                                <div className="flex items-center">
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        max="5"
                                        value={riskPercentage}
                                        onChange={(e) => onRiskChange(parseFloat(e.target.value))}
                                        className="bg-transparent text-[11px] font-bold text-white w-10 outline-none border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <span className="text-[10px] font-bold text-zinc-500">%</span>
                                </div>
                            </div>
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

                        <div className="flex flex-col pl-4 border-l border-white/10 text-right">
                            <span className="text-[8px] text-emerald-400 uppercase font-black tracking-tighter flex items-center justify-end gap-1">
                                <Maximize2 className="size-2 text-emerald-400" /> Reward Ratio
                            </span>
                            <span className="text-[11px] font-black text-emerald-400 whitespace-nowrap tabular-nums">1:2</span>
                        </div>

                        {signal.positionSize && (
                            <div className="flex flex-col pl-4 border-l border-white/10 text-right">
                                <span className="text-[8px] text-blue-400 uppercase font-black tracking-tighter flex items-center justify-end gap-1">
                                    <Sparkles className="size-2" /> Risk Unit ({riskPercentage}%)
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
