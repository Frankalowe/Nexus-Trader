import { NextResponse } from 'next/server';
import { openai } from '@/lib/ai';

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
                    content: `You are a Pro Alpha Deep-Vision Signal Generator.
YOU ARE CURRENTLY LOOKING AT A LIVE CHART IMAGE provided by a professional trader. 
Your goal is to provide PRACTICAL, EXECUTABLE signals based on high-level technical analysis (Price Action, Liquidity, SMC/ICT concepts, and Indicator Confluence).

PRACTICALITY RULES:
1. **Executable Entry**: Suggested entry must be reachable from the current price (Retracement or Breakout). No fantasy prices.
2. **Realistic Risk/Reward**: Aim for a minimum of 1:2 RR. Always place Stop Loss behind logical structure (Swing High/Low, Order Block).
3. **Liquidity Awareness**: Identify if the signal is a "sweep" or targeting a "draw on liquidity" (Equal Highs/Lows).
4. **Data Over Vague Text**: NEVER use placeholders like "[Price Level]". Provide EXACT NUMBERS from the chart's Y-axis scale.

Structure your response with these exact sections:
1. **Market DNA**: Asset identity and current institutional bias (Bullish/Bearish).
2. **Signal Context**: Confluence checklist (e.g., FVG fill, Trendline bounce, RSI 50-rejection).
3. **🎯 EXECUTABLE SIGNAL**: 
   - **Action**: [BUY / SELL / NEUTRAL]
   - **Confidence Score**: [XX%]
   - **Direct Entry**: [EXACT NUMBER]
   - **Hard Stop Loss**: [EXACT NUMBER]
   - **Primary Take Profit**: [EXACT NUMBER]
4. **🧠 Pattern Anatomy**: Break down the specific candlelight and volume patterns that confirm this entry.
5. **📜 Management Rulebook**: When to move SL to BE? When to take partials?
6. **Risk Note**: Immediate volatility warnings (News, Session Close/Open).`
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Look closely at the attached screenshot. Find the current price on the right-hand Y-axis and analyze the candlestick patterns to generate a trade signal. Provide numbers, not text placeholders." },
                        { type: "image_url", image_url: { url: image, detail: "high" } }
                    ],
                },
            ],
            max_tokens: 1000,
        });

        return NextResponse.json({ analysis: response.choices[0].message.content });
    } catch (error: any) {
        console.error('Analysis error:', error.message || error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
