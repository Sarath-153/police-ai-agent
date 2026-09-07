"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUp, Download, Loader2, UploadCloud, FileSpreadsheet, FileText, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Complaint } from "@/lib/types"
import { cn } from "@/lib/utils"
import * as XLSX from "xlsx"

interface DataManagementProps {
  onUpload: (newData: Complaint[]) => void;
  complaints: Complaint[];
}

export function DataManagement({ onUpload, complaints }: DataManagementProps) {
  const { toast } = useToast()
  const [isDragging, setIsDragging] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [processingStatus, setProcessingStatus] = React.useState("Processing...")

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const processUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    setIsProcessing(true)
    setProcessingStatus(`Parsing ${file.name} using Python parser...`)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/parse-complaint", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to parse file")
      }

      const extractedComplaints: Complaint[] = result.complaints || []

      if (extractedComplaints.length === 0) {
        toast({
          variant: "destructive",
          title: "No Complaints Found",
          description: "The file was read but no valid complaint records could be extracted.",
        })
      } else {
        onUpload(extractedComplaints)
        toast({
          title: "Extraction Successful",
          description: `Extracted ${extractedComplaints.length} exact complaint record(s) from ${file.name}.`,
        })
      }
    } catch (error: any) {
      console.error("Upload error:", error)
      toast({
        variant: "destructive",
        title: "Upload / Parse Error",
        description: error.message || "An error occurred while processing the file with Python modules.",
      })
    } finally {
      setIsProcessing(false)
      setIsDragging(false)
    }
  }

  const handleLoadSamplePdf = async () => {
    setIsProcessing(true)
    setProcessingStatus("Reading realistic NCRP complaint PDF with Python...")
    try {
      const response = await fetch("/api/parse-complaint", {
        method: "GET",
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to load realistic complaint")
      }

      const extractedComplaints: Complaint[] = result.complaints || []
      onUpload(extractedComplaints)
      toast({
        title: "Realistic Complaint Loaded",
        description: `Successfully loaded Rahul Kumar (ID: ${extractedComplaints[0]?.complaintId}) directly from NCRP PDF.`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Load Error",
        description: error.message || "Failed to load sample complaint PDF.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    processUpload(e.dataTransfer.files)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processUpload(e.target.files)
    e.target.value = ""
  }

  const handleDownloadExcel = () => {
    if (complaints.length === 0) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "There is no data available to export. Please upload a file first.",
      });
      return;
    }

    toast({
      title: "Generating Report",
      description: "Preparing your Excel file for download...",
    })

    try {
      const dataToExport = complaints.map(c => ({
        "Acknowledgement / Complaint ID": c.complaintId,
        "Complaint Date": new Date(c.date).toLocaleDateString(),
        "Incident Date & Time": c.incidentDateTime || "",
        "Complainant Name": c.complainantName,
        "Mobile": c.complainantPhone,
        "Email / UserId": c.complainantEmail,
        "Crime Category": c.category || c.crimeType,
        "Sub Category": c.subCategory || "",
        "Father/Mother/Spouse": c.fatherOrSpouseName || "",
        "Police Station": c.policeStation || "",
        "District": c.district || "",
        "State": c.state || "",
        "Pincode": c.pincode || "",
        "Address": c.address || "",
        "Platform": c.platform,
        "Amount Lost (₹)": c.amountLost,
        "Status": c.status.replace(/_/g, ' ').toUpperCase(),
        "Description": c.description
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Complaints");

      const fileName = `NCRP_Intelligence_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Download Successful",
        description: "The Excel intelligence report has been saved to your device.",
      })
    } catch (error) {
      console.error("Excel Export Error:", error);
      toast({
        variant: "destructive",
        title: "Export Error",
        description: "An unexpected error occurred while generating the Excel file.",
      })
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Drag & Drop Upload Zone */}
      <Card className="md:col-span-2 border-dashed border-2 bg-muted/30 transition-colors">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center w-full h-36 cursor-pointer rounded-lg border border-dashed",
              isDragging ? "bg-primary/5 border-primary" : "hover:bg-muted/50 border-muted-foreground/20"
            )}
          >
            <div className="flex flex-col items-center justify-center pt-2 pb-2">
              {isProcessing ? (
                <>
                  <Loader2 className="h-9 w-9 text-primary animate-spin mb-2" />
                  <p className="text-sm font-medium text-primary">{processingStatus}</p>
                  <p className="text-xs text-muted-foreground mt-1">Using Python pdfplumber & pandas extraction engine</p>
                </>
              ) : (
                <>
                  <UploadCloud className={cn("h-9 w-9 mb-2", isDragging ? "text-primary" : "text-muted-foreground")} />
                  <p className="mb-1 text-sm text-muted-foreground">
                    <span className="font-semibold text-primary">Click to upload</span> or drag and drop complaint files
                  </p>
                  <p className="text-xs text-muted-foreground">PDF (NCRP Complaint Format), Excel (.xlsx, .xls), or CSV</p>
                </>
              )}
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept=".pdf,.csv,.xlsx,.xls" 
              onChange={handleFileChange}
              disabled={isProcessing}
            />
          </label>

          <div className="mt-3 flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Python module extractor active (Exact PDF Table Extraction)
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadSamplePdf}
              disabled={isProcessing}
              className="text-xs h-7 gap-1 text-primary border-primary/30 hover:bg-primary/5"
            >
              <FileText className="h-3.5 w-3.5" />
              Load Realistic NCRP PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Action Card */}
      <Card className="flex flex-col justify-between">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-secondary" />
            Reporting & Export
          </CardTitle>
          <CardDescription>Export extracted data for offline police analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleDownloadExcel} 
            variant="secondary" 
            className="w-full flex items-center justify-center gap-2"
            disabled={complaints.length === 0}
          >
            <Download className="h-4 w-4" />
            Download Excel Sheet (.xlsx)
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            * Fully compatible with NCRP field structure & Microsoft Excel.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
