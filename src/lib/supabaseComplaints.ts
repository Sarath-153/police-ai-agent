import { supabase } from './supabase';
import { Complaint } from './types';

export function mapComplaintToSupabase(complaint: Complaint) {
  return {
    complaint_id: complaint.complaintId,
    date: complaint.date,
    complainant_name: complaint.complainantName,
    complainant_email: complaint.complainantEmail || '',
    complainant_phone: complaint.complainantPhone || '',
    crime_type: complaint.crimeType,
    platform: complaint.platform || 'Banking',
    amount_lost: complaint.amountLost || 0,
    status: complaint.status || 'registered',
    description: complaint.description || '',
    district: complaint.district || '',
    state: complaint.state || '',
    pincode: complaint.pincode || '',
    address: complaint.address || '',
  };
}

export function mapSupabaseToComplaint(row: any): Complaint {
  return {
    id: row.id ? String(row.id) : `complaint-${row.complaint_id}`,
    complaintId: row.complaint_id || '',
    date: row.date || new Date().toISOString(),
    complainantName: row.complainant_name || 'Unknown',
    complainantEmail: row.complainant_email || '',
    complainantPhone: row.complainant_phone || '',
    crimeType: row.crime_type || 'Financial Fraud',
    platform: row.platform || 'Banking',
    amountLost: Number(row.amount_lost || 0),
    status: row.status || 'registered',
    description: row.description || '',
    district: row.district || '',
    state: row.state || '',
    pincode: row.pincode || '',
    address: row.address || '',
    rawFields: row.description && row.description.startsWith('{') ? tryParseJson(row.description) : undefined,
  };
}

function tryParseJson(str: string) {
  try {
    return JSON.parse(str);
  } catch {
    return undefined;
  }
}

/**
 * Fetch all complaints from Supabase
 */
export async function getComplaintsFromSupabase(): Promise<{ data: Complaint[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      return { data: [], error };
    }

    const mapped = (data || []).map(mapSupabaseToComplaint);
    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: [], error: err };
  }
}

/**
 * Save one or multiple complaints to Supabase
 */
export async function saveComplaintsToSupabase(
  complaints: Complaint[]
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    if (!complaints || complaints.length === 0) {
      return { success: true, data: [] };
    }

    const rows = complaints.map(mapComplaintToSupabase);

    // Upsert by complaint_id
    const { data, error } = await supabase
      .from('complaints')
      .upsert(rows, { onConflict: 'complaint_id' })
      .select();

    if (error) {
      console.error('Error saving to Supabase:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Exception in saveComplaintsToSupabase:', err);
    return { success: false, error: err };
  }
}
