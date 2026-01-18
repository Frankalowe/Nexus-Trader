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
    };
    error?: string;
}

function validateSignal(result: Signal, equity: number, riskPercentage: number): Signal {
    if (!result.signal || result.error) {
        return result;
    }

    const signal = result.signal;
    const entry = parseFloat(String(signal.entry));
    const sl = parseFloat(String(signal.sl));
    const tp = parseFloat(String(signal.tp));

    // Check if values are valid numbers
    if (isNaN(entry) || isNaN(sl) || isNaN(tp)) {
        return {
            ...result,
            error: 'Invalid price levels. Entry, SL, and TP must be numeric values.',
            signal: {
                ...signal,
                entry,
                sl,
                tp
            }
        };
    }

    // Determine trade direction
    const isBuy = signal.action === 'BUY';
    
    // Validate SL is on the correct side
    if (isBuy && sl >= entry) {
        return {
            ...result,
            error: `For BUY signals, Stop Loss ($${sl}) must be BELOW Entry ($${entry}).`,
            signal
        };
    }
    if (!isBuy && sl <= entry) {
        return {
            ...result,
            error: `For SELL signals, Stop Loss ($${sl}) must be ABOVE Entry ($${entry}).`,
            signal
        };
    }

    // Calculate risk in pips/points
    const riskDistance = Math.abs(entry - sl);
    const rewardDistance = Math.abs(tp - entry);
    const riskRewardRatio = rewardDistance / riskDistance;

    // Validate minimum 1:2 RR
    if (riskRewardRatio < 1.95) {
        return {
            ...result,
            error: `Risk/Reward ratio is ${riskRewardRatio.toFixed(2)}:1. MINIMUM required is 2:1. TP needs adjustment.`,
            signal: {
                ...signal,
                entry,
                sl,
                tp
            }
        };
    }

    // Validate minimum risk is reasonable (at least 10 pips or 0.0010 for forex)
    const minRisk = 0.001;
    if (riskDistance < minRisk) {
        return {
            ...result,
            error: `Risk distance is too small (${riskDistance.toFixed(4)}). Minimum acceptable risk is ${minRisk}. SL placement needs adjustment.`,
            signal
        };
    }

    // Calculate position size based on equity and risk
    const riskAmount = equity * (riskPercentage / 100);
    const positionSize = (riskAmount / riskDistance).toFixed(2);

    return {
        ...result,
        signal: {
            ...signal,
            entry,
            sl,
            tp,
            positionSize: `${positionSize} Units (Risk: $${riskAmount.toFixed(2)}, Reward: $${(positionSize * rewardDistance).toFixed(2)})`,
            riskRewardRatio: `${riskRewardRatio.toFixed(2)}:1`,
            status: 'VALIDATED ✓'
        }
    };
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { image, equity = 10000, riskPercentage = 0.5 } = body;

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY') {
            return NextResponse.json({ error: 'OpenAI API key is not configured. Please add your key to .env.local' }, { status: 500 });
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
            messages: [
                {
                    role: "system",
                    content: `You are a Pro Alpha Deep-Vision Signal Generator.
YOU ARE CURRENTLY LOOKING AT A LIVE CHART IMAGE provided by a professional trader. 
Your goal is to provide PRACTICAL, EXECUTABLE signals based on high-level technical analysis (Price Action, Liquidity, SMC/ICT concepts, and Indicator Confluence).

RISK MANAGEMENT RULES:
1. **Capital Core**: The user has $${equity} equity and wants to risk EXACTLY ${riskPercentage}% ($${(equity * riskPercentage / 100).toFixed(2)}) per trade.
2. **Position Sizing**: You MUST calculate the recommended position size (Lot size for FX, or Units for Crypto/Indices) based on the distance between Entry and Stop Loss.
3. **Hard Stop Loss**: SL is mandatory and must be placed at a logical structural point.

PRACTICALITY RULES:
1. **1-Minute (M1) Scalping Focus**: Analyze the chart specifically for ultra-short-term scalping opportunities. Identify M1 market structure shifts and micro-liquidity sweeps.
2. **5-Minute Entry Window**: Suggested entry must be executable within the NEXT 5 MINUTES from the current timestamp.
3. **30-Minute Exit/Expiry**: The setup should hit its target or reach a conclusion within roughly 30 MINUTES of entry.
4. **Timezone**: Use UTC+5:30 (India Standard Time) for all timestamps.
5. **Executable Entry**: Suggested entry must be reachable from the current price (Retracement or Breakout). No fantasy prices.
6. **Realistic Risk/Reward**: You MUST maintain a MINIMUM 1:2 RR ratio (Take Profit must be at least twice as far from Entry as Stop Loss is). Place SL tightly behind micro-structure.
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
    "positionSize": "E.g. 0.45 Lots or 1,200 Units",
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
                            text: `CURRENT TIMESTAMP (IST): ${istTime}. 
                            USER EQUITY: $${equity}. 
                            RISK PER TRADE: ${riskPercentage}%.
                            Look closely at the attached 1-minute chart. Find the current price on the right-hand Y-axis and analyze the candlestick patterns to generate an ultra-fast scalp signal. 
                            Ensure the entry is within 5 minutes and exit is within 30 minutes of now. 
                            MANDATORY: Maintain a minimum 1:2 Risk-to-Reward ratio. 
                            Use numbers, not text placeholders.`
                        },
                        { type: "image_url", image_url: { url: image, detail: "high" } }
                    ],
                },
            ],
            max_tokens: 1000,
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');
        
        // Validate Risk/Reward Ratio and SL/TP calculations
        const validated = validateSignal(result, equity, riskPercentage);
        
        return NextResponse.json(validated);
    } catch (error: any) {
        console.error('Analysis error:', error.message || error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
