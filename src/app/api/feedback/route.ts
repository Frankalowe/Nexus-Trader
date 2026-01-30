import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { id, feedback, notes } = await req.json();

        if (!id || !feedback) {
            return NextResponse.json({ error: 'Signal ID and feedback type are required.' }, { status: 400 });
        }

        const { error } = await supabase
            .from('signals')
            .update({
                feedback,
                feedback_notes: notes
            })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Feedback error:', error.message || error);
        return NextResponse.json({
            error: error.message || 'Error processing feedback.'
        }, { status: 500 });
    }
}
