"use client"

import * as React from "react";
import { mockComplaints as initialComplaints } from "@/lib/mock-data";
import { StatCards } from "@/components/dashboard/StatCards";
import { DashboardCharts } from "@/components/dashboard/Charts";
import { ComplaintTable } from "@/components/complaints/ComplaintTable";
import { DataManagement } from "@/components/complaints/DataManagement";
import { ShieldCheck, Search, LayoutDashboard, Settings, Bell, Database, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Complaint } from "@/lib/types";

export default function DashboardPage() {
  const [complaints, setComplaints] = React.useState<Complaint[]>(initialComplaints);
  const [rlsWarning, setRlsWarning] = React.useState(false);
  const [isLoadingSupabase, setIsLoadingSupabase] = React.useState(true);

  // Fetch stored complaints from Supabase on load
  React.useEffect(() => {
    async function loadSupabaseData() {
      setIsLoadingSupabase(true);
      try {
        const res = await fetch("/api/complaints");
        const json = await res.json();
        if (json.success && Array.isArray(json.complaints) && json.complaints.length > 0) {
          setComplaints(json.complaints);
        }
      } catch (err) {
        console.error("Failed to load complaints from Supabase:", err);
      } finally {
        setIsLoadingSupabase(false);
      }
    }
    loadSupabaseData();
  }, []);

  const handleDataUpdate = async (newData: Complaint[]) => {
    // 1. Update UI state immediately
    setComplaints(prev => {
      const newIds = new Set(newData.map(c => c.complaintId));
      const remainingPrev = prev.filter(c => !newIds.has(c.complaintId));
      return [...newData, ...remainingPrev];
    });

    // 2. Persist to Supabase
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaints: newData }),
      });
      const result = await res.json();
      if (!result.success && result.error && String(result.error).includes("row-level security")) {
        setRlsWarning(true);
      }
    } catch (err) {
      console.error("Failed to persist to Supabase:", err);
    }
  };

  const handleRefresh = async () => {
    setComplaints([]);
    // Optionally clear in Supabase if desired or just reset local view
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span>NCRP <span className="text-secondary">Insights</span></span>
        </div>
        
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6 ml-8">
          <a href="#" className="flex items-center gap-2 text-primary font-semibold">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <Search className="h-4 w-4" />
            Investigate
          </a>
          <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <Settings className="h-4 w-4" />
            Settings
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs hidden sm:flex">
            <Database className="h-3 w-3 text-emerald-600" />
            Supabase Connected
          </Badge>

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-destructive"></span>
          </Button>
          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
            AD
          </div>
        </div>
      </header>

      {/* RLS Notice Banner */}
      {rlsWarning && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Supabase RLS Policy:</strong> Row-Level Security is enabled on your <code className="bg-amber-500/20 px-1 py-0.5 rounded text-xs font-mono">complaints</code> table.
              To allow inserting complaints via the client, run in your Supabase SQL Editor:{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono font-semibold select-all">
                ALTER TABLE complaints DISABLE ROW LEVEL SECURITY;
              </code>
            </span>
          </div>
          <button onClick={() => setRlsWarning(false)} className="text-amber-800 hover:text-amber-950 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto w-full">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Intelligence Dashboard</h2>
            <p className="text-muted-foreground">
              Real-time monitoring and analysis of reported cybercrime complaints.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleRefresh} variant="outline" className="border-primary text-primary hover:bg-primary/5">
              Reset Data
            </Button>
          </div>
        </div>

        {/* Top Management Tools */}
        <DataManagement onUpload={handleDataUpdate} complaints={complaints} />

        {/* Statistics Overview */}
        <StatCards complaints={complaints} />

        {/* Visual Analytics */}
        <DashboardCharts complaints={complaints} />

        <Separator />

        {/* Complaint Records */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Active Complaints</h3>
            <span className="text-sm text-muted-foreground">
              Showing {complaints.length} entries {isLoadingSupabase ? "(Syncing Supabase...)" : ""}
            </span>
          </div>
          <ComplaintTable data={complaints} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-6 px-4 md:px-6 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-[1600px] mx-auto w-full text-sm text-muted-foreground">
          <p>© 2024 NCRP Insights - Cybercrime Data Intelligence Platform</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-primary underline-offset-4 hover:underline">Privacy Policy</a>
            <a href="#" className="hover:text-primary underline-offset-4 hover:underline">Usage Terms</a>
            <a href="#" className="hover:text-primary underline-offset-4 hover:underline">Help Desk</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
