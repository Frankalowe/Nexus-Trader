'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { useChartCapture } from '@/hooks/use-chart-capture';
import { Camera, MessageSquare, Send, Sparkles, X, ChevronRight, Loader2, RefreshCw, BarChart2, PanelRightOpen, PanelRightClose, Maximize2, Minimize2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamic import for TradingView to avoid SSR issues
const TradingViewWidget = dynamic(() => import('@/components/TradingViewWidget'), { ssr: false });

type AnalysisState = 'idle' | 'capturing_h4' | 'capturing_h1' | 'capturing_m15' | 'analyzing' | 'complete' | 'error';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TradeSignal {
  action: 'BUY' | 'SELL' | 'NEUTRAL';
  entry: string;
  sl: string;
  tp: string;
  confidence?: string;
  entryTime?: string;
  exitTime?: string;
  positionSize?: string;
  riskRewardRatio?: string;
  status?: string;
}

interface MultiImages {
  h4: string | null;
  h1: string | null;
  m15: string | null;
}

export default function Home() {
  const [state, setState] = useState<AnalysisState>('idle');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [images, setImages] = useState<MultiImages>({ h4: null, h1: null, m15: null });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isHubOpen, setHubOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSymbol, setCurrentSymbol] = useState('FX:EURUSD');
  const [isMobile, setIsMobile] = useState(false);
  const [signal, setSignal] = useState<TradeSignal | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { captureScreen, stopStream, hasActiveStream } = useChartCapture();

  const resetAnalysis = () => {
    setState('idle');
    setImages({ h4: null, h1: null, m15: null });
    setAnalysis(null);
    setSignal(null);
    setError(null);
    setMessages([]);
  };

  const startMultiCapture = () => {
    resetAnalysis();
    setState('capturing_h4');
    setHubOpen(false);
    setIsMinimized(false);
  };

  const captureCurrentStep = async () => {
    const currentStep = state;
    if (!currentStep.startsWith('capturing_')) return;

    // Temporarily hide hub for clean shot
    setIsMinimized(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    const imageBase64 = await captureScreen();
    setIsMinimized(false);

    if (!imageBase64) {
      setError('Capture failed or cancelled');
      return;
    }

    if (currentStep === 'capturing_h4') {
      setImages(prev => ({ ...prev, h4: imageBase64 }));
      setState('capturing_h1');
    } else if (currentStep === 'capturing_h1') {
      setImages(prev => ({ ...prev, h1: imageBase64 }));
      setState('capturing_m15');
    } else if (currentStep === 'capturing_m15') {
      const finalImages = { ...images, m15: imageBase64 };
      setImages(finalImages);
      runTopDownAnalysis(finalImages);
    }
  };

  const runTopDownAnalysis = async (finalImages: MultiImages) => {
    setState('analyzing');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: finalImages,
          riskPercentage: 0.5,
          symbol: currentSymbol
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis failed');

      setAnalysis(data.analysis);
      setSignal(data.signal);
      setState('complete');
      setHubOpen(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred');
      setState('error');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !images.m15) return;

    const newMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, newMsg]);
    setInput('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newMsg],
          context: analysis,
          image: images.m15 // Use 15m chart as primary chat context
        }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden font-sans relative">
      <Header
        currentSymbol={currentSymbol}
        onSymbolChange={setCurrentSymbol}
        signal={signal}
        onAnalyze={startMultiCapture}
        isAnalyzing={state === 'analyzing' || state.startsWith('capturing_')}
        hasAnalysis={!!analysis}
      />

      <main className="flex-1 flex overflow-hidden relative">
        {/* Main Chart Area */}
        <div className="flex-1 relative bg-slate-950">
          <TradingViewWidget symbol={currentSymbol} />
        </div>

        {/* Floating AI Hub & Capture Controller */}
        <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-4">
          <AnimatePresence mode="wait">
            {/* Capture Step Indicator / Controller */}
            {state.startsWith('capturing_') && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="bg-[#0c0c0e]/95 backdrop-blur-2xl border border-white/10 p-4 rounded-3xl shadow-2xl flex flex-col gap-4 min-w-[280px]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Step {state === 'capturing_h4' ? '1' : state === 'capturing_h1' ? '2' : '3'} of 3</span>
                    <h3 className="text-sm font-bold text-white">
                      {state === 'capturing_h4' ? '4 Hour Analysis' : state === 'capturing_h1' ? '1 Hour Context' : '15m Entry Setup'}
                    </h3>
                  </div>
                  <div className="flex gap-1.5">
                    {['h4', 'h1', 'm15'].map((tf) => (
                      <div
                        key={tf}
                        className={cn(
                          "size-1.5 rounded-full transition-all duration-500",
                          images[tf as keyof MultiImages] ? "bg-emerald-500" : (state === `capturing_${tf}` ? "bg-blue-500 animate-pulse scale-125" : "bg-white/10")
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Please switch your TradingView chart to the <span className="text-white font-bold">{state.split('_')[1].toUpperCase()}</span> timeframe, then click snap.
                  </p>

                  <button
                    onClick={captureCurrentStep}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    <Camera className="size-4" />
                    Snap {state.split('_')[1].toUpperCase()} Chart
                  </button>

                  <button
                    onClick={resetAnalysis}
                    className="w-full py-2 text-[9px] text-zinc-500 hover:text-zinc-300 font-bold uppercase tracking-widest transition-colors"
                  >
                    Cancel Analysis
                  </button>
                </div>
              </motion.div>
            )}

            {/* Analyzing State */}
            {state === 'analyzing' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0c0c0e]/95 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 min-w-[240px]"
              >
                <div className="relative">
                  <div className="size-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                  <Sparkles className="size-5 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black text-white uppercase tracking-widest">Brainstorming...</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Cross-referencing timeframes</p>
                </div>
              </motion.div>
            )}

            {/* Main Toggle Button (When not capturing/analyzing) */}
            {!state.startsWith('capturing_') && state !== 'analyzing' && !isHubOpen && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setHubOpen(true)}
                className="size-16 md:size-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40 text-white border-4 border-white/10 group relative"
              >
                <div className="absolute inset-0 rounded-full bg-blue-400 group-hover:animate-ping opacity-0 group-hover:opacity-20 transition-all" />
                <div className="relative">
                  {state === 'complete' ? <MessageSquare className="size-8" /> : <Sparkles className="size-8" />}
                  {state === 'complete' && (
                    <div className="absolute -top-1 -right-1 size-4 bg-emerald-500 rounded-full border-2 border-[#0c0c0e] flex items-center justify-center">
                      <div className="size-1.5 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Analysis Hub (The Main Window) */}
        <AnimatePresence>
          {isHubOpen && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9, x: isMobile ? 0 : -20 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                x: 0,
                height: isMinimized ? 'auto' : (isMobile ? '80vh' : '700px')
              }}
              exit={{ opacity: 0, y: 50, scale: 0.9, x: isMobile ? 0 : -20 }}
              className={cn(
                "fixed z-50 bg-[#0b0b0d]/98 backdrop-blur-3xl border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.6)] flex flex-col transition-all duration-300",
                isMobile ? "bottom-0 inset-x-0 rounded-t-[2.5rem]" : "bottom-6 left-6 w-[480px] rounded-[2.5rem]"
              )}
            >
              {/* Hub Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/20 flex items-center justify-center">
                    <Sparkles className="size-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="font-black text-white text-xs uppercase tracking-[0.2em]">Nexus AI Intelligence</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Neural Link Active</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="size-8 rounded-full flex items-center justify-center hover:bg-white/5 text-zinc-400 transition-colors"
                  >
                    <Minimize2 className="size-4" />
                  </button>
                  <button
                    onClick={() => setHubOpen(false)}
                    className="size-8 rounded-full flex items-center justify-center hover:bg-white/5 text-zinc-400 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Hub Body */}
              <AnimatePresence mode="wait">
                {!isMinimized && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col overflow-hidden"
                  >
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                      {/* Empty State / Welcome */}
                      {state === 'idle' && !analysis && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12">
                          <div className="size-20 rounded-[2.5rem] bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                            <BarChart2 className="size-10 text-blue-500" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">Top-Down Analysis</h3>
                            <p className="text-sm text-zinc-500 max-w-[280px] mx-auto mt-2">
                              Nexus AI will analyze the chart across multiple timeframes to provide high-probability trade setups.
                            </p>
                          </div>
                          <button
                            onClick={startMultiCapture}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                          >
                            Begin Sequence
                          </button>
                        </div>
                      )}

                      {/* Analysis Results */}
                      {analysis && (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Market Intel</span>
                            <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Confidence: {signal?.confidence || 'N/A'}</span>
                            </div>
                          </div>

                          <div className="prose prose-invert prose-sm max-w-none">
                            <div className="p-6 rounded-[2rem] bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 text-zinc-300 leading-relaxed text-sm shadow-inner">
                              <ReactMarkdown>{analysis}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Chat Messages */}
                      {messages.length > 0 && (
                        <div className="space-y-6 pt-8 border-t border-white/5">
                          {messages.map((msg, idx) => (
                            <div key={idx} className={cn("flex flex-col gap-2", msg.role === 'user' ? "items-end" : "items-start")}>
                              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-1">
                                {msg.role === 'user' ? 'You' : 'Nexus AI'}
                              </span>
                              <div className={cn(
                                "rounded-[1.5rem] p-4 max-w-[90%] text-sm leading-relaxed shadow-sm",
                                msg.role === 'user'
                                  ? "bg-blue-600 text-white rounded-tr-none"
                                  : "bg-[#16161a] border border-white/5 text-zinc-300 rounded-tl-none"
                              )}>
                                {msg.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Interaction Footer */}
                    <div className="p-6 border-t border-white/5 bg-black/20">
                      {state === 'complete' ? (
                        <form onSubmit={handleSendMessage} className="relative group">
                          <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a follow-up question..."
                            className="w-full bg-[#16161a] border border-white/10 focus:border-blue-500/50 rounded-2xl px-5 py-4 text-sm text-white outline-none transition-all placeholder:text-zinc-600 pr-14"
                          />
                          <button
                            type="submit"
                            disabled={!input.trim()}
                            className="absolute right-2 top-2 size-10 rounded-xl bg-blue-600 flex items-center justify-center text-white hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-lg shadow-blue-600/20"
                          >
                            <Send className="size-4" />
                          </button>
                        </form>
                      ) : state === 'idle' && (
                        <div className="flex gap-4">
                          <button
                            onClick={startMultiCapture}
                            className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                          >
                            New Analysis
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function TradingViewWidgetWrapper({ symbol }: { symbol: string }) {
  return (
    <div className="h-full w-full">
      <TradingViewWidget symbol={symbol} />
    </div>
  );
}
