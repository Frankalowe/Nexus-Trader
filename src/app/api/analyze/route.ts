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
1. **1-Minute (M1) Scalping Focus**: Analyze the chart specifically for ultra-short-term scalping opportunities. Identify M1 market structure shifts and micro-liquidity sweeps.
2. **5-Minute Entry Window**: Suggested entry must be executable within the NEXT 5 MINUTES from the current timestamp.
3. **30-Minute Exit/Expiry**: The setup should hit its target or reach a conclusion within roughly 30 MINUTES of entry.
4. **Timezone**: Use UTC+5:30 (India Standard Time) for all timestamps.
5. **Executable Entry**: Suggested entry must be reachable from the current price (Retracement or Breakout). No fantasy prices.
6. **Realistic Risk/Reward**: Aim for logical scalping RR (e.g. 1:1.5 to 1:2). Place SL tightly behind micro-structure.
7. **Data Over Vague Text**: NEVER use placeholders like "[Price Level]". Provide EXACT NUMBERS from the chart's Y-axis scale.

RESPONSE FORMAT:
You MUST return a JSON object with the following structure:
{
  "analysis": "A detailed markdown analysis focusing on the M1 scalp opportunity...",
  "signal": {
    "action": "BUY" | "SELL" | "NEUTRAL",
    "confidence": "XX%",
    "entry": "EXACT NUMBER",
    "sl": "EXACT NUMBER",
    "tp": "EXACT NUMBER",
    "entryTime": "IST Entry Window (e.g. 10:45 AM - 10:50 AM)",
    "exitTime": "IST Target Window (e.g. By 11:20 AM)"
  }
}

The "analysis" field should include these sections:
1. **Market DNA**: Current M1 momentum and bias.
2. **Scalp Context**: Micro-confluence checklist.
3. **🎯 SCALP SIGNAL**: Summary of the fast-execution signal.
4. **🧠 Micro-Anatomy**: Breakdown of the M1 setup.
5. **📜 Execution Rules**: Fast management rules.`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `CURRENT TIMESTAMP (IST): 2026-01-18 05:00 AM. 
                            Look closely at the attached 1-minute chart. Find the current price on the right-hand Y-axis and analyze the candlestick patterns to generate an ultra-fast scalp signal. 
                            Ensure the entry is within 5 minutes and exit is within 30 minutes of now. Use numbers, not text placeholders.`
                        },
                        { type: "image_url", image_url: { url: image, detail: "high" } }
                    ],
                },
            ],
            max_tokens: 1000,
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Analysis error:', error.message || error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
