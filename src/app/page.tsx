'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { useChartCapture } from '@/hooks/use-chart-capture';
import { Camera, MessageSquare, Send, Sparkles, X, ChevronRight, Loader2, RefreshCw, BarChart2, PanelRightOpen, PanelRightClose, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamic import for TradingView to avoid SSR issues
const TradingViewWidget = dynamic(() => import('@/components/TradingViewWidget'), { ssr: false });

type AnalysisState = 'idle' | 'capturing' | 'analyzing' | 'complete' | 'error';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [state, setState] = useState<AnalysisState>('idle');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [chartImage, setChartImage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isHubOpen, setHubOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSymbol, setCurrentSymbol] = useState('FX:EURUSD');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { captureScreen, stopStream, hasActiveStream } = useChartCapture();

  const handleAnalyze = async () => {
    // 1. Hide the hub/bubble before capture to ensure clean screenshot
    setIsMinimized(true);
    setHubOpen(false);
    setState('capturing');
    setError(null);

    // Wait for animation to finish
    await new Promise(resolve => setTimeout(resolve, 300));

    const imageBase64 = await captureScreen();

    // 2. Restore hub and show loading state
    setHubOpen(true);
    setIsMinimized(false);

    if (!imageBase64) {
      setState('error');
      setError('Chart capture cancelled.');
      return;
    }

    setChartImage(imageBase64);
    setState('analyzing');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis failed');

      setAnalysis(data.analysis);
      setState('complete');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred');
      setState('error');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !chartImage) return;

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
          image: chartImage
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
      <Header currentSymbol={currentSymbol} onSymbolChange={setCurrentSymbol} />

      <main className="flex-1 flex overflow-hidden relative">
        {/* Main Chart Area */}
        <div className="flex-1 relative bg-slate-950">
          <TradingViewWidget symbol={currentSymbol} />

          {/* User Instruction if idle and hub closed */}
          {state === 'idle' && !isHubOpen && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 px-6 text-center">
              <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/5 p-6 max-w-sm">
                <BarChart2 className="size-10 md:size-12 text-blue-500 mx-auto mb-4 opacity-50" />
                <h3 className="text-white font-medium mb-1">Signal Intelligence Terminal</h3>
                <p className="text-slate-400 text-xs md:text-sm">Click the <b>Analyze</b> bubble to generate high-alpha trade signals from this chart.</p>
              </div>
            </div>
          )}
        </div>

        {/* Floating Hub Toggle (Bubble) */}
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

        {/* Floating Analysis Hub (The "Window") */}
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
                isMobile
                  ? "bottom-0 inset-x-0 rounded-t-3xl"
                  : "bottom-6 left-6 w-[450px] rounded-3xl"
              )}
            >
              {/* Hub Header */}
              <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                    <Sparkles className="size-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-sm md:text-base leading-tight">Signal Hub</h2>
                    {hasActiveStream && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="size-1 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Live Link</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  {(state === 'complete' || state === 'error') && (
                    <button
                      onClick={handleAnalyze}
                      title="Analyze fresh chart"
                      className="p-2 hover:bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20 transition-all flex items-center gap-2"
                    >
                      <RefreshCw className="size-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">New Analysis</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 transition-colors"
                  >
                    {isMinimized ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
                  </button>
                  <button
                    onClick={() => setHubOpen(false)}
                    className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 transition-colors"
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
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col overflow-hidden"
                  >
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
                      {state === 'idle' && (
                        <div className="h-full flex flex-col items-center justify-center text-center py-10">
                          <div className="size-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 mb-4">
                            <Camera className="size-8 text-zinc-500" />
                          </div>
                          <p className="text-zinc-200 font-bold mb-1">Ready for Signal Capture</p>
                          <p className="text-xs text-zinc-500 max-w-[200px]">Click below to scan the live chart for patterns.</p>
                        </div>
                      )}

                      {(state === 'analyzing' || state === 'capturing') && (
                        <div className="h-full flex flex-col items-center justify-center space-y-4 py-10">
                          <div className="relative">
                            <div className="size-14 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
                            <Sparkles className="absolute inset-0 m-auto size-5 text-blue-500 animate-pulse" />
                          </div>
                          <p className="text-white text-sm font-medium">
                            {state === 'capturing' ? 'Select Chart View...' : 'Generating Alpha Signal...'}
                          </p>
                        </div>
                      )}

                      {analysis && (
                        <div className="space-y-6">
                          <div className="prose prose-invert prose-xs max-w-none">
                            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-slate-200 leading-relaxed text-xs">
                              <ReactMarkdown>{analysis}</ReactMarkdown>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-600/10 border border-blue-500/20 text-[9px] text-blue-400 uppercase font-bold tracking-widest">
                            <Sparkles className="size-3" />
                            Signal Confirmed by Deep-Vision
                          </div>
                        </div>
                      )}

                      {/* Chat Messages */}
                      {messages.length > 0 && (
                        <div className="space-y-4 pt-6 border-t border-white/5">
                          {messages.map((msg, idx) => (
                            <div key={idx} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                              <div className={cn(
                                "rounded-2xl p-3 max-w-[85%] text-xs",
                                msg.role === 'user'
                                  ? "bg-blue-600 text-white rounded-tr-none"
                                  : "bg-zinc-800 text-zinc-200 border border-white/5 rounded-tl-none"
                              )}>
                                {msg.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Functional Footer */}
                    <div className="p-4 md:p-5 border-t border-white/10 bg-white/[0.02]">
                      {state === 'complete' ? (
                        <form onSubmit={handleSendMessage} className="relative">
                          <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about these targets..."
                            className="w-full bg-slate-900 border border-white/5 rounded-xl pl-4 pr-12 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                          />
                          <button
                            type="submit"
                            disabled={!input.trim()}
                            className="absolute right-1.5 top-1.2 p-2 rounded-lg bg-blue-600 text-white disabled:opacity-0 transition-all"
                          >
                            <Send className="size-3.5" />
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={handleAnalyze}
                          disabled={state === 'analyzing' || (state === 'capturing' && !hasActiveStream)}
                          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {state === 'analyzing' ? 'Processing...' : 'Analyze Chart Now'}
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

// Helper icons
function BarChart3(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}
