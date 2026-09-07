import { Complaint } from './types';

/**
 * Initial complaints start empty.
 * Data is populated when the user uploads a complaint file (PDF/CSV/Excel)
 * or clicks "Load Realistic NCRP PDF".
 */
export const mockComplaints: Complaint[] = [];
