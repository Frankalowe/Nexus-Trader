import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Trade signal with risk/reward calculations
 */
export interface TradeSignal {
    action: "BUY" | "SELL" | "NEUTRAL";
    confidence: string;
    entry: number;
    sl: number;
    tp: number;
}

/**
 * Calculate risk/reward ratio
 * RR = (TP - Entry) / (Entry - SL) for BUY
 * RR = (Entry - TP) / (SL - Entry) for SELL
 */
export function calculateRiskRewardRatio(signal: TradeSignal): number {
    const { action, entry, sl, tp } = signal;
    
    if (action === "BUY") {
        const risk = entry - sl;
        const reward = tp - entry;
        if (risk === 0) return 0;
        return reward / risk;
    } else if (action === "SELL") {
        const risk = sl - entry;
        const reward = entry - tp;
        if (risk === 0) return 0;
        return reward / risk;
    }
    return 0;
}

/**
 * Calculate minimal risk with 1:2 RR ratio
 * Ensures TP is exactly 2x the risk distance from entry
 */
export function enforceRiskRewardRatio(signal: TradeSignal, targetRatio: number = 2): TradeSignal {
    const { action, entry, sl } = signal;
    
    if (action === "NEUTRAL") return signal;
    
    let risk: number;
    let newTp: number;
    
    if (action === "BUY") {
        risk = entry - sl;
        if (risk <= 0) {
            console.warn("Invalid BUY signal: Entry must be above Stop Loss");
            return signal;
        }
        // TP = Entry + (Risk × Ratio)
        newTp = entry + (risk * targetRatio);
    } else {
        // SELL
        risk = sl - entry;
        if (risk <= 0) {
            console.warn("Invalid SELL signal: Stop Loss must be above Entry");
            return signal;
        }
        // TP = Entry - (Risk × Ratio)
        newTp = entry - (risk * targetRatio);
    }
    
    return {
        ...signal,
        tp: parseFloat(newTp.toFixed(2))
    };
}

/**
 * Validate signal has minimal risk (risk per trade < 2% recommended)
 */
export interface RiskMetrics {
    riskPercentage: number;
    riskAmount: number;
    rewardAmount: number;
    ratio: number;
    isValid: boolean;
}

export function validateMinimalRisk(
    signal: TradeSignal,
    accountSize: number = 10000,
    maxRiskPercentage: number = 2
): RiskMetrics {
    const { action, entry, sl, tp } = signal;
    
    if (action === "NEUTRAL") {
        return {
            riskPercentage: 0,
            riskAmount: 0,
            rewardAmount: 0,
            ratio: 0,
            isValid: true
        };
    }
    
    let riskAmount: number;
    let rewardAmount: number;
    
    if (action === "BUY") {
        riskAmount = entry - sl;
        rewardAmount = tp - entry;
    } else {
        riskAmount = sl - entry;
        rewardAmount = entry - tp;
    }
    
    const riskPercentage = (riskAmount / entry) * 100;
    const ratio = rewardAmount / (riskAmount || 1);
    const isValid = riskPercentage <= maxRiskPercentage && ratio >= 2;
    
    return {
        riskPercentage: parseFloat(riskPercentage.toFixed(2)),
        riskAmount: parseFloat(riskAmount.toFixed(2)),
        rewardAmount: parseFloat(rewardAmount.toFixed(2)),
        ratio: parseFloat(ratio.toFixed(2)),
        isValid
    };
}
