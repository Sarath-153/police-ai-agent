export type ComplaintStatus = 'registered' | 'under_investigation' | 'fir_filed' | 'resolved';

export type Complaint = {
  id: string;
  complaintId: string;
  date: string;
  complainantName: string;
  complainantEmail: string;
  complainantPhone: string;
  crimeType: 'Financial Fraud' | 'Identity Theft' | 'Cyber Stalking' | 'Data Breach' | 'Hacking' | 'Social Media Scam';
  platform: 'WhatsApp' | 'Facebook' | 'Telegram' | 'Instagram' | 'Banking' | 'E-commerce' | 'Other';
  amountLost: number;
  status: ComplaintStatus;
  description: string;
  category?: string;
  subCategory?: string;
  fatherOrSpouseName?: string;
  policeStation?: string;
  district?: string;
  state?: string;
  pincode?: string;
  address?: string;
  incidentDateTime?: string;
  rawFields?: Record<string, string>;
};

export type DashboardStats = {
  totalComplaints: number;
  totalAmountLost: number;
  statusDistribution: Record<ComplaintStatus, number>;
  crimeTypeDistribution: Record<string, number>;
  platformDistribution: Record<string, number>;
  monthlyTrends: { month: string; amount: number; count: number }[];
};
