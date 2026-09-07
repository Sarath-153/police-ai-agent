import { NextRequest, NextResponse } from 'next/server';
import { getComplaintsFromSupabase, saveComplaintsToSupabase } from '@/lib/supabaseComplaints';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const result = await getComplaintsFromSupabase();
  if (result.error) {
    return NextResponse.json(
      { success: false, error: result.error.message || result.error, complaints: [] },
      { status: 200 } // Return 200 so UI can gracefully handle empty/error state
    );
  }
  return NextResponse.json({ success: true, complaints: result.data });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const complaints = Array.isArray(body) ? body : body.complaints || [body];
    const result = await saveComplaintsToSupabase(complaints);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save to Supabase' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const complaintId = searchParams.get('id');

    if (complaintId) {
      const { error } = await supabase.from('complaints').delete().eq('complaint_id', complaintId);
      if (error) throw error;
    } else {
      // Clear all
      const { error } = await supabase.from('complaints').delete().neq('complaint_id', '');
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
