import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // Check if JSON request (e.g. load default sample)
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      if (body.loadSample) {
        return handleParseSample();
      }
    }

    // Handle Multipart Form Data (file upload)
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded." },
        { status: 400 }
      );
    }

    const originalName = file.name;
    const extension = path.extname(originalName).toLowerCase();

    if (![".pdf", ".xlsx", ".xls", ".csv"].includes(extension)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file format ${extension}. Please upload a PDF, Excel (.xlsx, .xls), or CSV file.`,
        },
        { status: 400 }
      );
    }

    // Write file to a temp directory
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(
      tempDir,
      `complaint_upload_${Date.now()}_${path.basename(originalName)}`
    );

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(tempFilePath, buffer);

    try {
      const scriptPath = path.join(process.cwd(), "scripts", "parse_complaint.py");
      const { stdout, stderr } = await execFileAsync("python", [
        scriptPath,
        tempFilePath,
      ], {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
      });

      if (stderr && !stdout) {
        console.error("Python parsing stderr:", stderr);
        return NextResponse.json(
          { success: false, error: stderr },
          { status: 500 }
        );
      }

      const result = JSON.parse(stdout.trim());
      
      // Store extracted complaints in Supabase complaints table
      if (result.success && result.complaints && result.complaints.length > 0) {
        try {
          const { saveComplaintsToSupabase } = await import("@/lib/supabaseComplaints");
          const sbResult = await saveComplaintsToSupabase(result.complaints);
          result.supabaseSaved = sbResult.success;
          if (sbResult.error) {
            result.supabaseError = sbResult.error.message || sbResult.error;
          }
        } catch (sbErr: any) {
          result.supabaseSaved = false;
          result.supabaseError = sbErr.message || "Failed to persist to Supabase";
        }
      }

      return NextResponse.json(result);
    } finally {
      // Clean up temporary file
      if (fs.existsSync(tempFilePath)) {
        await fs.promises.unlink(tempFilePath).catch(() => {});
      }
    }
  } catch (err: any) {
    console.error("Error in parse-complaint API:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process complaint file" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleParseSample();
}

async function handleParseSample() {
  try {
    // Check possible sample paths
    const possiblePaths = [
      path.join(process.cwd(), "public", "samples", "complaint_report_das_updated.pdf"),
      "C:\\Users\\Dhashanth R\\Downloads\\complaint_report_das_updated.pdf",
      path.join(process.cwd(), "public", "samples", "ncrp_complaint_details_realistic.pdf"),
      "C:\\Users\\Dhashanth R\\Downloads\\ncrp_complaint_details_realistic.pdf",
    ];

    let targetSample = "";
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        targetSample = p;
        break;
      }
    }

    if (!targetSample) {
      return NextResponse.json(
        { success: false, error: "Sample realistic complaint PDF not found." },
        { status: 404 }
      );
    }

    const scriptPath = path.join(process.cwd(), "scripts", "parse_complaint.py");
    const { stdout, stderr } = await execFileAsync("python", [
      scriptPath,
      targetSample,
    ], {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stderr && !stdout) {
      return NextResponse.json({ success: false, error: stderr }, { status: 500 });
    }

    const result = JSON.parse(stdout.trim());
    if (result.success && result.complaints && result.complaints.length > 0) {
      try {
        const { saveComplaintsToSupabase } = await import("@/lib/supabaseComplaints");
        const sbResult = await saveComplaintsToSupabase(result.complaints);
        result.supabaseSaved = sbResult.success;
        if (sbResult.error) {
          result.supabaseError = sbResult.error.message || sbResult.error;
        }
      } catch (sbErr: any) {
        result.supabaseSaved = false;
        result.supabaseError = sbErr.message || "Failed to persist to Supabase";
      }
    }
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error in handleParseSample:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to parse sample file" },
      { status: 500 }
    );
  }
}
