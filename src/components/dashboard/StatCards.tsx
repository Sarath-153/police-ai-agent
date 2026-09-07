import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Complaint } from "@/lib/types";
import { IndianRupee, FileText, AlertCircle, CheckCircle2 } from "lucide-react";

export function StatCards({ complaints }: { complaints: Complaint[] }) {
  const totalAmount = complaints.reduce((sum, c) => sum + c.amountLost, 0);
  const totalComplaints = complaints.length;
  const firFiled = complaints.filter(c => c.status === 'fir_filed').length;
  const pending = complaints.filter(c => c.status === 'registered').length;

  const stats = [
    {
      title: "Total Amount Lost",
      value: `₹${totalAmount.toLocaleString('en-IN')}`,
      icon: IndianRupee,
      color: "text-destructive",
      description: "Aggregated financial impact"
    },
    {
      title: "Total Complaints",
      value: totalComplaints.toString(),
      icon: FileText,
      color: "text-primary",
      description: "All time reported incidents"
    },
    {
      title: "FIRs Filed",
      value: firFiled.toString(),
      icon: CheckCircle2,
      color: "text-secondary",
      description: "Escalated to legal action"
    },
    {
      title: "New Complaints",
      value: pending.toString(),
      icon: AlertCircle,
      color: "text-orange-500",
      description: "Awaiting initial review"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
