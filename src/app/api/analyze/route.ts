import { NextResponse } from 'next/server';
import { openai } from '@/lib/ai';

interface Signal {
    analysis?: string;
    signal?: {
        action: string;
        confidence: string;
        entry: number | string;
        sl: number | string;
        tp: number | string;
        positionSize?: string;
        entryTime?: string;
        exitTime?: string;
        riskRewardRatio?: string;
        status?: string;
    };
    error?: string;
}

function cleanNumber(val: any): number {
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[$,]/g, '');
    return parseFloat(cleaned);
}

function validateSignal(result: Signal, equity: number, riskPercentage: number, symbol: string): Signal {
    if (!result.signal || result.error) {
        return result;
    }

    const signal = result.signal;
    const entry = cleanNumber(signal.entry);
    const sl = cleanNumber(signal.sl);
    const tp = cleanNumber(signal.tp);

    // Check if values are valid numbers
    if (isNaN(entry) || isNaN(sl) || isNaN(tp)) {
        return {
            ...result,
            error: 'Invalid price levels. AI hallucinated non-numeric values.',
            signal: {
                ...signal,
                entry,
                sl,
                tp
            }
        };
    }

    // Determine trade direction
    const action = signal.action.toUpperCase();
    const isBuy = action === 'BUY';
    const isSell = action === 'SELL';

    if (!isBuy && !isSell) {
        return { ...result, signal: { ...signal, status: 'NEUTRAL - NO SETUP' } };
    }

    // Validate SL is on the correct side
    if (isBuy && sl >= entry) {
        return {
            ...result,
            error: `Invalid BUY setup: Stop Loss ($${sl}) must be BELOW Entry ($${entry}).`,
            signal
        };
    }
    if (isSell && sl <= entry) {
        return {
            ...result,
            error: `Invalid SELL setup: Stop Loss ($${sl}) must be ABOVE Entry ($${entry}).`,
            signal
        };
    }

    // Calculate distances
    const riskDistance = Math.abs(entry - sl);
    const rewardDistance = Math.abs(tp - entry);

    if (riskDistance === 0) {
        return { ...result, error: 'Risk distance is zero. SL cannot be equal to Entry.', signal };
    }

    const riskRewardRatio = rewardDistance / riskDistance;

    // Validate minimum 1:2 RR
    if (riskRewardRatio < 1.9) { // Slight buffer for rounding
        return {
            ...result,
            error: `Risk/Reward ratio is ${riskRewardRatio.toFixed(2)}:1. MINIMUM required is 2:1. Move TP further or tighten SL.`,
            signal
        };
    }

    // Calculate position size
    const riskAmount = equity * (riskPercentage / 100);
    let positionSizeStr = "";

    // Determine if it's Forex for Lot calculation
    const isForex = symbol.includes('FX:') || symbol.includes('USD') || symbol.includes('JPY') || symbol.includes('EUR') || symbol.includes('GBP');

    if (isForex) {
        const units = riskAmount / riskDistance;
        const lots = (units / 100000).toFixed(2);
        positionSizeStr = `${lots} Lots`;
    } else {
        const units = (riskAmount / riskDistance).toFixed(2);
        positionSizeStr = `${units} Units`;
    }

    return {
        ...result,
        signal: {
            ...signal,
            entry,
            sl,
            tp,
            positionSize: `${positionSizeStr} ($${riskAmount.toFixed(2)} Risk)`,
            riskRewardRatio: `${riskRewardRatio.toFixed(2)}:1`,
            status: 'VALIDATED ✓'
        }
    };
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { images, equity = 10000, riskPercentage = 0.5, symbol = "Unknown" } = body;

        if (!images || !images.h4 || !images.h1 || !images.m15) {
            return NextResponse.json({ error: 'Missing images for 4H, 1H, or 15m timeframes.' }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY') {
            return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 500 });
        }

        const istTime = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(new Date());

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `You are the Nexus Elite Algorithmic Analyst. 
Your task is to perform a professional TOP-DOWN analysis with 99.9% precision.
You specialize in Smart Money Concepts (SMC), ICT, Liquidity Sweeps, and Market Structure Shifts (MSS).

STRICT OPERATING PROTOCOL:
1. **Multi-Timeframe Flow**: 
   - 4H (HTF): Determine the primary bias and major Supply/Demand levels.
   - 1H (MTF): Identify refined structure, FVG areas, and intermediate liquidity.
   - 15m (LTF): Look for the execution trigger (MSS, CHoCH, Induction, or Liquidity Sweep).
2. **Chain of Thought**: You MUST analyze the alignment across H4, H1, and M15 before generating the signal.
3. **High Probability Only**: If timeframes are not in confluence, return "action": "NEUTRAL".
4. **Precision Pricing**: Read the Y-axis carefully from the M15 chart for exact Entry, SL, and TP.
5. **1:2 RR Minimum**: You MUST ensure TP is at least twice the distance of SL from Entry.

ASSET CONTEXT: ${symbol}
CURRENT IST TIME: ${istTime}
EQUITY: $${equity}
RISK: ${riskPercentage}%`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze these three charts for ${symbol} and generate an ultra-fast scalp signal based on Top-Down confluence.

CHARTS PROVIDED:
1. Higher Time Frame (4H)
2. Medium Time Frame (1H)
3. Execution Time Frame (15m)

Follow this logical flow:
1. Describe the 4H Bias and key levels.
2. Describe the 1H structural alignment/FVGs.
3. Use the 15m chart to pinpoint the entry (look for Liquidity Sweep followed by MSS).

Return JSON:
{
  "analysis": "### 1. HTF Context (4H)\n... \n### 2. MTF Refinement (1H)\n... \n### 3. LTF Execution (15m)\n... \n### 4. Confluence Summary\n...",
  "signal": {
    "action": "BUY" | "SELL" | "NEUTRAL",
    "confidence": "XX%",
    "entry": "Exact number from 15m chart",
    "sl": "Exact number from 15m chart",
    "tp": "Exact number from 15m chart",
    "entryTime": "IST window",
    "exitTime": "IST window"
  }
}`
                        },
                        { type: "image_url", image_url: { url: images.h4, detail: "high" } },
                        { type: "image_url", image_url: { url: images.h1, detail: "high" } },
                        { type: "image_url", image_url: { url: images.m15, detail: "high" } }
                    ],
                },
            ],
            max_tokens: 1500,
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');
        const validated = validateSignal(result, equity, riskPercentage, symbol);

        return NextResponse.json(validated);
    } catch (error: any) {
        console.error('Analysis error:', error.message || error);
        return NextResponse.json({
            error: error.message || 'Error processing analysis. Please try again.'
        }, { status: 500 });
    }
}
