"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Complaint, ComplaintStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { Eye, ShieldCheck, Phone, Mail, FileText } from "lucide-react"

const statusMap: Record<ComplaintStatus, { label: string; className: string }> = {
  registered: { label: "Registered", className: "bg-blue-100 text-blue-800 border-blue-200" },
  under_investigation: { label: "In Investigation / Review", className: "bg-orange-100 text-orange-800 border-orange-200" },
  fir_filed: { label: "FIR Filed", className: "bg-red-100 text-red-800 border-red-200" },
  resolved: { label: "Resolved", className: "bg-teal-100 text-teal-800 border-teal-200" },
};

function formatDateSafe(dateStr?: string) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return format(d, "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

export function ComplaintTable({ data }: { data: Complaint[] }) {
  const [filter, setFilter] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [selectedComplaint, setSelectedComplaint] = React.useState<Complaint | null>(null)

  const filteredData = data.filter(item => {
    const matchesSearch = 
      item.complaintId.toLowerCase().includes(filter.toLowerCase()) ||
      item.complainantName.toLowerCase().includes(filter.toLowerCase()) ||
      item.crimeType.toLowerCase().includes(filter.toLowerCase()) ||
      (item.subCategory && item.subCategory.toLowerCase().includes(filter.toLowerCase())) ||
      (item.district && item.district.toLowerCase().includes(filter.toLowerCase())) ||
      (item.platform && item.platform.toLowerCase().includes(filter.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Extract raw fields for modal display
  const rawEntries = React.useMemo(() => {
    if (!selectedComplaint) return [];
    if (selectedComplaint.rawFields && Object.keys(selectedComplaint.rawFields).length > 0) {
      return Object.entries(selectedComplaint.rawFields).filter(
        ([key, val]) => val !== undefined && val !== null && String(val).trim() !== ""
      );
    }

    // Dynamic fallback if rawFields is not present: ONLY include fields that have a real value
    const dynamicFields: [string, string][] = [];
    if (selectedComplaint.complaintId) dynamicFields.push(["Complaint ID / Ack No", selectedComplaint.complaintId]);
    if (selectedComplaint.date) dynamicFields.push(["Date", formatDateSafe(selectedComplaint.date)]);
    if (selectedComplaint.incidentDateTime) dynamicFields.push(["Incident Date/Time", selectedComplaint.incidentDateTime]);
    if (selectedComplaint.complainantName) dynamicFields.push(["Complainant Name", selectedComplaint.complainantName]);
    if (selectedComplaint.complainantPhone) dynamicFields.push(["Phone / Mobile", selectedComplaint.complainantPhone]);
    if (selectedComplaint.complainantEmail) dynamicFields.push(["Email / User ID", selectedComplaint.complainantEmail]);
    if (selectedComplaint.category || selectedComplaint.crimeType) dynamicFields.push(["Category of Complaint", selectedComplaint.category || selectedComplaint.crimeType]);
    if (selectedComplaint.subCategory) dynamicFields.push(["Sub Category", selectedComplaint.subCategory]);
    if (selectedComplaint.platform) dynamicFields.push(["Platform", selectedComplaint.platform]);
    if (selectedComplaint.fatherOrSpouseName) dynamicFields.push(["Father/Mother/Spouse Name", selectedComplaint.fatherOrSpouseName]);
    if (selectedComplaint.policeStation) dynamicFields.push(["Police Station", selectedComplaint.policeStation]);
    if (selectedComplaint.address) dynamicFields.push(["Address", selectedComplaint.address]);
    if (selectedComplaint.district) dynamicFields.push(["District", selectedComplaint.district]);
    if (selectedComplaint.state) dynamicFields.push(["State", selectedComplaint.state]);
    if (selectedComplaint.pincode) dynamicFields.push(["Pincode", selectedComplaint.pincode]);
    if (selectedComplaint.amountLost !== undefined) dynamicFields.push(["Amount Lost", `₹${selectedComplaint.amountLost.toLocaleString('en-IN')}`]);
    if (selectedComplaint.status) dynamicFields.push(["Status", selectedComplaint.status]);
    if (selectedComplaint.description) dynamicFields.push(["Description of Incident", selectedComplaint.description]);

    return dynamicFields;
  }, [selectedComplaint]);

  // Check if description is present separately
  const descriptionEntry = rawEntries.find(([k]) => 
    k.toLowerCase().includes("description")
  );
  const tableEntries = rawEntries.filter(([k]) => 
    !k.toLowerCase().includes("description")
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-2 w-full md:max-w-md">
          <Input 
            placeholder="Search by ID, Name, Category, Platform..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="registered">Registered</SelectItem>
              <SelectItem value="under_investigation">Investigation / Review</SelectItem>
              <SelectItem value="fir_filed">FIR Filed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold">Complaint / Ack ID</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Complainant</TableHead>
              <TableHead className="font-semibold">Crime Category</TableHead>
              <TableHead className="font-semibold">Platform / Location</TableHead>
              <TableHead className="font-semibold text-right">Amount Lost</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((complaint) => {
                // Determine location or platform display strictly from available data
                const hasLocation = complaint.policeStation || complaint.district;
                const locationText = [
                  complaint.policeStation,
                  complaint.district ? `${complaint.district}${complaint.state ? ', ' + complaint.state : ''}` : ''
                ].filter(Boolean).join(' • ');

                return (
                  <TableRow key={complaint.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono font-medium text-primary">
                      {complaint.complaintId}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{formatDateSafe(complaint.date)}</span>
                        {complaint.incidentDateTime && (
                          <span className="text-[11px] text-muted-foreground">
                            Inc: {complaint.incidentDateTime}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{complaint.complainantName}</span>
                        {complaint.complainantPhone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {complaint.complainantPhone}
                          </span>
                        )}
                        {complaint.complainantEmail && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {complaint.complainantEmail}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-xs">
                          {complaint.category || complaint.crimeType}
                        </Badge>
                        {complaint.subCategory && (
                          <span className="text-xs font-semibold text-muted-foreground px-1 py-0.5 bg-muted rounded">
                            {complaint.subCategory}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {hasLocation ? (
                        <div className="flex flex-col text-xs">
                          {complaint.policeStation && (
                            <span className="font-medium text-foreground">
                              {complaint.policeStation}
                            </span>
                          )}
                          {(complaint.district || complaint.state) && (
                            <span className="text-muted-foreground">
                              {[complaint.district, complaint.state].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>
                      ) : complaint.platform ? (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-muted text-foreground">
                          {complaint.platform}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      ₹{complaint.amountLost.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("status-badge-animate border", statusMap[complaint.status]?.className || "bg-blue-100 text-blue-800")}>
                        {statusMap[complaint.status]?.label || complaint.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedComplaint(complaint)}
                        className="h-8 px-2.5 text-xs gap-1 hover:bg-primary/10 hover:text-primary"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No complaints found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Exact Document Details Dialog */}
      <Dialog open={!!selectedComplaint} onOpenChange={(open) => !open && setSelectedComplaint(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <DialogTitle>Complaint Details (Exact Extracted Fields)</DialogTitle>
            </div>
            <DialogDescription>
              Showing only the fields present in the uploaded document. Zero placeholder data.
            </DialogDescription>
          </DialogHeader>

          {selectedComplaint && (
            <div className="space-y-4 pt-2">
              {/* Exact Fields Table */}
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted border-b">
                      <th className="text-left py-2.5 px-4 font-semibold text-muted-foreground w-2/5">Field in Document</th>
                      <th className="text-left py-2.5 px-4 font-semibold text-foreground">Extracted Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tableEntries.map(([fieldKey, fieldValue]) => (
                      <tr key={fieldKey} className="hover:bg-muted/30">
                        <td className="py-2.5 px-4 font-medium text-muted-foreground bg-muted/10">
                          {fieldKey}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-foreground break-words">
                          {fieldKey.toLowerCase().includes("id") || fieldKey.toLowerCase().includes("number") ? (
                            <span className="font-mono font-semibold text-primary">{String(fieldValue)}</span>
                          ) : (
                            String(fieldValue)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Description of Incident Block if present */}
              {descriptionEntry && descriptionEntry[1] && (
                <div className="border rounded-md p-3.5 bg-muted/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <FileText className="h-3.5 w-3.5" />
                    {descriptionEntry[0]}
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                    {descriptionEntry[1]}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
