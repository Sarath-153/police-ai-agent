"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Complaint } from "@/lib/types";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

export function DashboardCharts({ complaints }: { complaints: Complaint[] }) {
  // Process Data
  const crimeTypeData = complaints.reduce((acc: any[], curr) => {
    const existing = acc.find(i => i.name === curr.crimeType);
    if (existing) existing.value += 1;
    else acc.push({ name: curr.crimeType, value: 1 });
    return acc;
  }, []);

  const platformData = complaints.reduce((acc: any[], curr) => {
    const existing = acc.find(i => i.name === curr.platform);
    if (existing) existing.value += 1;
    else acc.push({ name: curr.platform, value: 1 });
    return acc;
  }, []);

  const chartConfig: ChartConfig = {
    value: { label: "Count" },
    crimeType: { label: "Crime Type" },
    platform: { label: "Platform" },
  };

  const COLORS = ['#3F51B5', '#009688', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];

  const hasData = complaints.length > 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Crime Type Distribution</CardTitle>
          <CardDescription>Frequency of reported cybercrime categories</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {!hasData ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground italic">
              No data available to display distribution.
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={crimeTypeData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} interval={0} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {crimeTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Platform Trends</CardTitle>
          <CardDescription>Breakdown by communication medium</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground italic">
              No data available to display trends.
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <PieChart>
                <Pie
                  data={platformData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                >
                  {platformData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
