import { NextResponse } from 'next/server';
import { openai } from '@/lib/ai';
import { enforceRiskRewardRatio, validateMinimalRisk, TradeSignal, RiskMetrics } from '@/lib/utils';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { image } = body;

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY') {
            return NextResponse.json({ error: 'OpenAI API key is not configured. Please add your key to .env.local' }, { status: 500 });
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are a Pro Alpha Deep-Vision Signal Generator with strict risk management.
YOU ARE CURRENTLY LOOKING AT A LIVE CHART IMAGE provided by a professional trader. 
Your goal is to provide PRACTICAL, EXECUTABLE signals based on high-level technical analysis (Price Action, Liquidity, SMC/ICT concepts, and Indicator Confluence).

STRICT RISK MANAGEMENT RULES:
1. **Executable Entry**: Suggested entry must be reachable from the current price (Retracement or Breakout). No fantasy prices.
2. **MANDATORY 1:2 Risk/Reward Ratio**: Every signal MUST have a 1:2 minimum RR ratio. Take Profit MUST be exactly 2x the risk distance from entry.
   - For BUY: Risk = Entry - SL, TP = Entry + (Risk × 2)
   - For SELL: Risk = SL - Entry, TP = Entry - (Risk × 2)
3. **Minimal Risk**: Always place Stop Loss behind logical structures (Swing High/Low, Order Block) to minimize risk amount.
4. **Liquidity Awareness**: Identify if the signal is a "sweep" or targeting a "draw on liquidity" (Equal Highs/Lows).
5. **Data Over Vague Text**: NEVER use placeholders like "[Price Level]". Provide EXACT NUMBERS from the chart's Y-axis scale.

RESPONSE FORMAT:
You MUST return a JSON object with the following structure:
{
  "analysis": "A detailed markdown analysis following the structure below...",
  "signal": {
    "action": "BUY" | "SELL" | "NEUTRAL",
    "confidence": "XX%",
    "entry": "EXACT NUMBER",
    "sl": "EXACT NUMBER",
    "tp": "EXACT NUMBER"
  }
}

The "analysis" field should include these sections:
1. **Market DNA**: Asset identity and current institutional bias.
2. **Signal Context**: Confluence checklist.
3. **🎯 EXECUTABLE SIGNAL**: Summary of the signal.
4. **🧠 Pattern Anatomy**: Breakdown of patterns.
5. **📜 Management Rulebook**: Management instructions.
6. **Risk Note**: Volatility warnings.`
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Look closely at the attached screenshot. Find the current price on the right-hand Y-axis and analyze the candlestick patterns to generate a trade signal. Provide numbers, not text placeholders. Ensure the signal has exactly a 1:2 risk/reward ratio." },
                        { type: "image_url", image_url: { url: image, detail: "high" } }
                    ],
                },
            ],
            max_tokens: 1000,
            response_format: { type: "json_object" }
        });

        let result = JSON.parse(response.choices[0].message.content || '{}');
        
        // Enforce 1:2 risk/reward ratio with minimal risk
        if (result.signal && typeof result.signal === 'object') {
            const signal: TradeSignal = result.signal;
            
            // Validate input values
            if (typeof signal.entry === 'string') signal.entry = parseFloat(signal.entry);
            if (typeof signal.sl === 'string') signal.sl = parseFloat(signal.sl);
            if (typeof signal.tp === 'string') signal.tp = parseFloat(signal.tp);
            
            // Enforce 1:2 ratio
            const enforcedSignal = enforceRiskRewardRatio(signal, 2);
            
            // Get risk metrics
            const metrics = validateMinimalRisk(enforcedSignal);
            
            result.signal = enforcedSignal;
            result.riskMetrics = metrics;
            
            // Add warning if minimal risk threshold exceeded
            if (metrics.riskPercentage > 2) {
                result.warning = `Risk is ${metrics.riskPercentage}% of entry price. Consider reducing position size (recommended max: 2%).`;
            }
        }
        
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Analysis error:', error.message || error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
