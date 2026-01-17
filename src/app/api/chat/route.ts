import { NextResponse } from 'next/server';
import { openai } from '@/lib/ai';

export async function POST(req: Request) {
    try {
        const { messages, context, image } = await req.json();

        const systemPrompt = `You are a professional Alpha Deep-Vision Assistant. 
You CAN see images with extreme precision. You are looking at the high-resolution chart screenshot provided.
NEVER use placeholders like "[Price]". ALWAYS provide EXACT NUMERICAL VALUES based on the chart's price scale.
Your primary task is to answer follow-up questions about this specific chart. 
Provide direct, data-driven, and numerical answers. 
NEVER claim you cannot see the image or that you need more data. Use the visual evidence in the history.`;

        // Construct the full history for the model
        // 1. Initial visual context (simulated as first turn)
        const initialTurn = [
            {
                role: "user",
                content: [
                    { type: "text", text: "I am providing you with this chart screenshot for analysis. You MUST use this visual data to answer my questions. Look at the numbers on the axes and the indicators shown." },
                    { type: "image_url", image_url: { url: image, detail: "high" } }
                ]
            },
            {
                role: "assistant",
                content: `I have received and thoroughly analyzed the chart image. Current Context: ${context || 'Visual data loaded.'}`
            }
        ];

        // 2. Append actual conversation history
        const conversationHistory = messages.map((m: any) => ({
            role: m.role,
            content: m.content
        }));

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                ...initialTurn,
                ...conversationHistory
            ],
            max_tokens: 500,
        });

        return NextResponse.json({ reply: response.choices[0].message.content });
    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
