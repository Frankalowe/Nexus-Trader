import { NextResponse } from 'next/server';
import { openai } from '@/lib/ai';
import { supabase } from '@/lib/supabase';

interface Signal {
    id?: string;
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
    const action = signal.action.toUpperCase();
    const isBuy = action === 'BUY';
    const isSell = action === 'SELL';

    if (!isBuy && !isSell) {
        return {
            ...result,
            signal: {
                ...signal,
                status: 'NEUTRAL - NO SETUP',
                confidence: '0%'
            }
        };
    }

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
                tp,
                status: 'FAILED'
            }
        };
    }

    // Validate SL is on the correct side
    if (isBuy && sl >= entry) {
        return {
            ...result,
            error: `Invalid BUY setup: Stop Loss ($${sl}) must be BELOW Entry ($${entry}).`,
            signal: { ...signal, status: 'INVALID SL' }
        };
    }
    if (isSell && sl <= entry) {
        return {
            ...result,
            error: `Invalid SELL setup: Stop Loss ($${sl}) must be ABOVE Entry ($${entry}).`,
            signal: { ...signal, status: 'INVALID SL' }
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
            signal: { ...signal, status: 'LOW RR' }
        };
    }

    // Calculate position size
    const riskAmount = equity * (riskPercentage / 100);
    let positionSizeStr = "";

    const sym = symbol.toLowerCase();
    const isGold = sym.includes('xau') || sym.includes('gold');
    const isSilver = sym.includes('xag') || sym.includes('silver');
    const isJpy = sym.includes('jpy');
    const isCrypto = sym.includes('btc') || sym.includes('eth') || sym.includes('sol') || sym.includes('crypto');
    const isIndex = sym.includes('us30') || sym.includes('nas100') || sym.includes('spx500') || sym.includes('ger40') || sym.includes('dji') || sym.includes('nsx') || sym.includes('spx');
    const isForex = !isGold && !isSilver && !isCrypto && !isIndex && (sym.includes('fx:') || sym.includes('usd') || sym.includes('eur') || sym.includes('gbp') || sym.includes('aud'));

    if (isGold) {
        const units = riskAmount / riskDistance;
        const lots = (units / 100).toFixed(2); // 1 Lot = 100 oz
        positionSizeStr = `${lots} Lots (Gold)`;
    } else if (isSilver) {
        const units = riskAmount / riskDistance;
        const lots = (units / 5000).toFixed(2); // 1 Lot = 5000 oz
        positionSizeStr = `${lots} Lots (Silver)`;
    } else if (isCrypto) {
        const units = (riskAmount / riskDistance).toFixed(4);
        positionSizeStr = `${units} Units`;
    } else if (isIndex) {
        const units = (riskAmount / riskDistance).toFixed(2);
        positionSizeStr = `${units} Contracts`;
    } else if (isForex) {
        const units = riskAmount / riskDistance;
        const lots = isJpy ? (units / 1000).toFixed(2) : (units / 100000).toFixed(2);
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

        if (!images || !images.h4 || !images.h1 || !images.m15 || !images.m1) {
            return NextResponse.json({ error: 'Missing images for 4H, 1H, 15m, or 1m timeframes.' }, { status: 400 });
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

        // Fetch Feedback Loop Context
        let historicalContext = "";
        try {
            const { data: history } = await supabase
                .from('signals')
                .select('feedback, feedback_notes, analysis')
                .eq('symbol', symbol)
                .not('feedback', 'is', null)
                .order('created_at', { ascending: false })
                .limit(5);

            if (history && history.length > 0) {
                historicalContext = history.map((h, i) =>
                    `[Prior Trade ${i + 1}: Result ${h.feedback.toUpperCase()}]\nNotes: ${h.feedback_notes || 'No notes'}\nContext: ${h.analysis.substring(0, 200)}...`
                ).join("\n\n");
            }
        } catch (dbErr) {
            console.error('History fetch error:', dbErr);
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `You are the Nexus Elite Algorithmic Analyst. 
Your task is to perform an ultra-precise TOP-DOWN Institutional Analysis.

TRADING FRAMEWORK:
- **Smart Money Concepts (SMC)**: Order Blocks, Breakers, Fair Value Gaps (FVG).
- **ICT Methodology**: Power of 3 (AMD), Liquidity Sweeps, Market Structure Shifts (MSS/CHoCH).
- **Institutional Markers**: Inducement (IDM), Displacement (strong impulse), IRL/ERL Flow.

${historicalContext ? `---
HISTORICAL PERFORMANCE (Learn from these past outcomes):
${historicalContext}
---` : ""}

ANALYSIS PROTOCOL (CHAIN OF THOUGHT):
1. **HTF Context (4H)**: Define the dominant institutional bias. Is the market currently in an expansion or retracement?
2. **MTF Structure (1H)**: Identify the most recent break of structure (BOS) and the current trading range.
3. **Internal Liquidity (15m)**: Locate "Inducement" (IDM) - the liquidity trap that must be swept before entry. Look for BSL/SSL sweeps.
4. **Execution Snapshot (1m)**: Search for "Displacement" - a high-energy move following a liquidity sweep that creates a FVG or leaves a refined OB.
5. **Precision Entry**: Entry MUST be at the refined 1m zone. SL MUST be placed behind the liquidity sweep high/low or structural anchor.

STRICT OPERATING RULES:
- **Current Price Anchor**: Check the latest price on the 1m chart. Only propose entries that are logic-bound to this price.
- **No Hallucinations**: Read exact levels from the TradingView Y-axis.
- **Risk Management**: Minimum 1:2 RR. If the setup requires a wide SL that kills RR, ignore it.
- **Neutral Bias**: If timeframes are non-confluent or inducement hasn't been swept, mark action as "NEUTRAL".

ASSET: ${symbol}
TIME (IST): ${istTime}
EQUITY: $${equity}
RISK: ${riskPercentage}%

RISK COMPLIANCE:
- You MUST calculate position size based on EXACTLY ${riskPercentage}% risk of $${equity}.
- This is a PROP FIRM account. Preservation of capital is the #1 priority.
- If the SL is too wide or RR is less than 1:2, you MUST flag it as "LOW RR" or "INVALID SETUP".`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Perform a top-down institutional analysis for ${symbol}. 

REQUIRED OUTPUT FORMAT (JSON):
{
  "analysis": "### 1. HTF Bias (4H)\n[Details]\n\n### 2. MTF Structure (1H)\n[Details]\n\n### 3. LTF Liquidity & Inducement (15m)\n[Details on where the trap is]\n\n### 4. Micro Entry Trigger (1m)\n[Details of displacement/sweep/FVG]\n\n### 5. Institutional Logic\n**Why this SL?**: [Reason]\n**Why this TP?**: [Reason]",
  "signal": {
    "action": "BUY" | "SELL" | "NEUTRAL",
    "confidence": "XX%",
    "entry": "Exact number",
    "sl": "Exact number",
    "tp": "Exact number",
    "entryTime": "IST window",
    "exitTime": "Target window"
  }
}`,
                        },
                        { type: "image_url", image_url: { url: images.h4, detail: "high" } },
                        { type: "image_url", image_url: { url: images.h1, detail: "high" } },
                        { type: "image_url", image_url: { url: images.m15, detail: "high" } },
                        { type: "image_url", image_url: { url: images.m1, detail: "high" } }
                    ],
                },
            ],
            max_tokens: 1500,
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');
        const validated = validateSignal(result, equity, riskPercentage, symbol);

        // Persistent Feedback Loop: Save to Supabase
        let signalId = null;
        try {
            const { data, error } = await supabase
                .from('signals')
                .insert({
                    symbol,
                    analysis: validated.analysis || "",
                    signal_data: validated.signal || {}
                })
                .select('id')
                .single();

            if (!error && data) {
                signalId = data.id;
            }
        } catch (dbErr) {
            console.error('Failed to save signal to DB:', dbErr);
        }

        return NextResponse.json({ ...validated, id: signalId });
    } catch (error: any) {
        console.error('Analysis error:', error.message || error);
        return NextResponse.json({
            error: error.message || 'Error processing analysis. Please try again.'
        }, { status: 500 });
    }
}
