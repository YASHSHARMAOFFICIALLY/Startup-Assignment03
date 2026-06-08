"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

const PERIOD_OPTIONS = [
  { value: "all-time", label: "All Time" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
];

export function SettingsForm({
  initialCommissionRate,
  initialDefaultPeriod,
}: {
  initialCommissionRate: number;
  initialDefaultPeriod: string;
}) {
  const [commissionRate, setCommissionRate] = useState(
    String(initialCommissionRate),
  );
  const [defaultPeriod, setDefaultPeriod] = useState(initialDefaultPeriod);
  const [savingCommission, setSavingCommission] = useState(false);
  const [savingPeriod, setSavingPeriod] = useState(false);

  const saveCommission = async () => {
    setSavingCommission(true);
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Commission must be 0–100.");
      setSavingCommission(false);
      return;
    }
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionRate: rate }),
      });
      if (res.ok) toast.success("Commission rate saved.");
      else toast.error("Failed to save.");
    } catch {
      toast.error("Network error.");
    }
    setSavingCommission(false);
  };

  const savePeriod = async () => {
    setSavingPeriod(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultPeriod }),
      });
      if (res.ok) toast.success("Default period saved.");
      else toast.error("Failed to save.");
    } catch {
      toast.error("Network error.");
    }
    setSavingPeriod(false);
  };

  return (
    <>
      <Toaster />

      {/* Commission */}
      <Panel className="animate-stagger-2">
        <h2 className="text-[15px] font-medium text-brand-textPrimary mb-4">
          Commission
        </h2>
        <div className="space-y-3">
          <div>
            <Label htmlFor="commission">Commission Rate</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Input
                id="commission"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="w-28"
              />
              <span className="text-sm text-brand-textMuted">%</span>
              <Button
                size="sm"
                onClick={saveCommission}
                disabled={savingCommission}
                className="ml-2"
              >
                {savingCommission ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
              </Button>
            </div>
            <p className="text-[11px] text-brand-textFaint mt-1.5">
              Applied to closer cash collected. Shows as &ldquo;Commissions
              Paid&rdquo; in KPI panels.
            </p>
          </div>
        </div>
      </Panel>

      {/* Default Period */}
      <Panel className="animate-stagger-3">
        <h2 className="text-[15px] font-medium text-brand-textPrimary mb-4">
          Default Period
        </h2>
        <div className="space-y-3">
          <div>
            <Label>Period when no filter is selected</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Select value={defaultPeriod} onValueChange={setDefaultPeriod}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={savePeriod}
                disabled={savingPeriod}
              >
                {savingPeriod ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
              </Button>
            </div>
          </div>
        </div>
      </Panel>
    </>
  );
}
