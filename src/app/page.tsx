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
  const [currentSymbol, setCurrentSymbol] = useState('BITSTAMP:BTCUSD');
  const [isMobile, setIsMobile] = useState(false);
  const [signal, setSignal] = useState<TradeSignal | null>(null);
  const [equity, setEquity] = useState<string>('10000');

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
    setHubOpen(true);
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
          equity: parseFloat(equity) || 10000,
          riskPercentage: 0.5,
          symbol: currentSymbol
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis failed');

      setAnalysis(data.analysis);
      setSignal(data.signal);
      setState('complete');
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
        equity={equity}
        onEquityChange={setEquity}
      />

      <main className="flex-1 flex overflow-hidden relative">
        {/* Main Chart Area */}
        <div className="flex-1 relative bg-slate-950">
          <TradingViewWidget symbol={currentSymbol} />
        </div>

        {/* Floating Hub Toggle */}
        {!isHubOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setHubOpen(true)}
            className="fixed bottom-6 left-6 z-50 size-16 md:size-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40 text-white border-4 border-white/10"
          >
            <div className="relative">
              <Sparkles className="size-8" />
              {state === 'complete' && (
                <div className="absolute -top-1 -right-1 size-4 bg-emerald-500 rounded-full border-2 border-[#0c0c0e]" />
              )}
            </div>
          </motion.button>
        )}

        {/* Floating Analysis Hub */}
        <AnimatePresence>
          {isHubOpen && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                height: isMinimized ? 'auto' : (isMobile ? '80vh' : '700px')
              }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className={cn(
                "fixed z-50 bg-[#0c0c0e]/95 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col transition-all duration-300",
                isMobile ? "bottom-0 inset-x-0 rounded-t-3xl" : "bottom-6 left-6 w-[450px] rounded-3xl"
              )}
            >
              {/* Hub Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-white text-sm">Nexus Hub Analysis</h2>
                  {hasActiveStream && (
                    <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 text-zinc-400"><Minimize2 className="size-4" /></button>
                  <button onClick={() => setHubOpen(false)} className="p-2 text-zinc-400"><X className="size-4" /></button>
                </div>
              </div>

              {/* Hub Body */}
              <AnimatePresence mode="wait">
                {!isMinimized && (
                  <motion.div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">

                      {/* Capture Wizard */}
                      {state.startsWith('capturing_') && (
                        <div className="space-y-6 py-4">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            <span>Top-Down Capture Sequence</span>
                            <span>{state === 'capturing_h4' ? '1/3' : state === 'capturing_h1' ? '2/3' : '3/3'}</span>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {['h4', 'h1', 'm15'].map((time) => (
                              <div key={time} className={cn(
                                "h-1 rounded-full transition-all duration-500",
                                images[time as keyof MultiImages] ? "bg-emerald-500" : (state === `capturing_${time}` ? "bg-blue-500 animate-pulse" : "bg-white/10")
                              )} />
                            ))}
                          </div>

                          <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-6 text-center space-y-4">
                            <div className="size-12 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto">
                              <Camera className="size-6 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-white font-bold text-sm">
                                Switch to {state === 'capturing_h4' ? '4 Hour' : state === 'capturing_h1' ? '1 Hour' : '15 Minute'} Chart
                              </p>
                              <p className="text-xs text-zinc-500 mt-1">Make sure the {state.split('_')[1].toUpperCase()} timeframe is visible.</p>
                            </div>
                            <button
                              onClick={captureCurrentStep}
                              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest"
                            >
                              Snap {state.split('_')[1].toUpperCase()} Chart
                            </button>
                          </div>
                        </div>
                      )}

                      {state === 'analyzing' && (
                        <div className="h-40 flex flex-col items-center justify-center space-y-4">
                          <Loader2 className="size-8 text-blue-500 animate-spin" />
                          <p className="text-white text-xs font-bold uppercase tracking-widest">Processing Top-Down Context...</p>
                        </div>
                      )}

                      {analysis && (
                        <div className="space-y-6">
                          <div className="prose prose-invert prose-xs max-w-none">
                            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-slate-200 leading-relaxed text-xs">
                              <ReactMarkdown>{analysis}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}

                      {messages.length > 0 && (
                        <div className="space-y-4 pt-6 border-t border-white/5">
                          {messages.map((msg, idx) => (
                            <div key={idx} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                              <div className={cn("rounded-2xl p-3 max-w-[85%] text-xs", msg.role === 'user' ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-200")}>
                                {msg.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/10">
                      {state === 'complete' ? (
                        <form onSubmit={handleSendMessage} className="relative">
                          <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about this setup..."
                            className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white"
                          />
                          <button type="submit" className="absolute right-2 top-2 p-2 text-blue-500"><Send className="size-4" /></button>
                        </form>
                      ) : state === 'idle' && (
                        <button
                          onClick={startMultiCapture}
                          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest"
                        >
                          Start Top-Down Analysis
                        </button>
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
