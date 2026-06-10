"use client";

import { useState } from "react";
import Link from "next/link";
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
import { navItems } from "@/lib/nav-config";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

const PERIOD_OPTIONS = [
  { value: "all-time", label: "All Time" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
];

const AUTO_SYNC_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Daily" },
  { value: "hourly", label: "Hourly" },
];

export function SettingsForm({
  initialCommissionRate,
  initialDefaultPeriod,
  initialAutoSyncMode,
  initialDefaultLandingPage,
  initialLeaderboardRows,
  commissionOverrideCount,
}: {
  initialCommissionRate: number;
  initialDefaultPeriod: string;
  initialAutoSyncMode: string;
  initialDefaultLandingPage: string;
  initialLeaderboardRows: number;
  commissionOverrideCount: number;
}) {
  const [commissionRate, setCommissionRate] = useState(
    String(initialCommissionRate),
  );
  const [defaultPeriod, setDefaultPeriod] = useState(initialDefaultPeriod);
  const [autoSyncMode, setAutoSyncMode] = useState(initialAutoSyncMode);
  const [defaultLandingPage, setDefaultLandingPage] = useState(
    initialDefaultLandingPage,
  );
  const [leaderboardRows, setLeaderboardRows] = useState(
    String(initialLeaderboardRows),
  );
  const [savingCommission, setSavingCommission] = useState(false);
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [savingAutoSync, setSavingAutoSync] = useState(false);
  const [savingLanding, setSavingLanding] = useState(false);
  const [savingRows, setSavingRows] = useState(false);

  const putSettings = async (body: Record<string, unknown>, success: string) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) toast.success(success);
      else toast.error("Failed to save.");
    } catch {
      toast.error("Network error.");
    }
  };

  const saveCommission = async () => {
    setSavingCommission(true);
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Commission must be 0–100.");
      setSavingCommission(false);
      return;
    }
    await putSettings({ commissionRate: rate }, "Commission rate saved.");
    setSavingCommission(false);
  };

  const savePeriod = async () => {
    setSavingPeriod(true);
    await putSettings({ defaultPeriod }, "Default period saved.");
    setSavingPeriod(false);
  };

  const saveAutoSync = async () => {
    setSavingAutoSync(true);
    await putSettings({ autoSyncMode }, "Auto-sync mode saved.");
    setSavingAutoSync(false);
  };

  const saveLanding = async () => {
    setSavingLanding(true);
    await putSettings(
      { defaultLandingPage },
      "Default landing page saved.",
    );
    setSavingLanding(false);
  };

  const saveRows = async () => {
    setSavingRows(true);
    const rows = parseInt(leaderboardRows, 10);
    if (isNaN(rows) || rows < 3 || rows > 25) {
      toast.error("Leaderboard rows must be 3–25.");
      setSavingRows(false);
      return;
    }
    await putSettings({ leaderboardRows: rows }, "Leaderboard rows saved.");
    setSavingRows(false);
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
            {commissionOverrideCount > 0 && (
              <p className="text-[11px] text-brand-textFaint mt-1.5">
                {commissionOverrideCount}{" "}
                {commissionOverrideCount === 1 ? "rep has" : "reps have"} a
                personal override — manage in{" "}
                <Link
                  href="/rep-management"
                  className="underline underline-offset-2 hover:text-brand-textSecondary transition-colors"
                >
                  Rep Management
                </Link>
                .
              </p>
            )}
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

      {/* Auto-sync */}
      <Panel className="animate-stagger-3">
        <h2 className="text-[15px] font-medium text-brand-textPrimary mb-4">
          Auto-sync
        </h2>
        <div className="space-y-3">
          <div>
            <Label>Scheduled sheet sync</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Select value={autoSyncMode} onValueChange={setAutoSyncMode}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTO_SYNC_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={saveAutoSync}
                disabled={savingAutoSync}
              >
                {savingAutoSync ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
              </Button>
            </div>
            <p className="text-[11px] text-brand-textFaint mt-1.5">
              The platform cron runs once a day on the Hobby plan — Hourly
              only takes effect if the platform cron runs more often. Off also
              pauses dashboard background polling.
            </p>
          </div>
        </div>
      </Panel>

      {/* Default Landing Page */}
      <Panel className="animate-stagger-4">
        <h2 className="text-[15px] font-medium text-brand-textPrimary mb-4">
          Default Landing Page
        </h2>
        <div className="space-y-3">
          <div>
            <Label>Page shown after signing in</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Select
                value={defaultLandingPage}
                onValueChange={setDefaultLandingPage}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {navItems.map((item) => (
                    <SelectItem key={item.href} value={item.href}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={saveLanding}
                disabled={savingLanding}
              >
                {savingLanding ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
              </Button>
            </div>
            <p className="text-[11px] text-brand-textFaint mt-1.5">
              Manager-only pages fall back to the dashboard for non-managers.
            </p>
          </div>
        </div>
      </Panel>

      {/* Leaderboard Rows */}
      <Panel className="animate-stagger-4">
        <h2 className="text-[15px] font-medium text-brand-textPrimary mb-4">
          Leaderboard Rows
        </h2>
        <div className="space-y-3">
          <div>
            <Label htmlFor="leaderboardRows">
              Rows shown in the dashboard leaderboard
            </Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Input
                id="leaderboardRows"
                type="number"
                min={3}
                max={25}
                step={1}
                value={leaderboardRows}
                onChange={(e) => setLeaderboardRows(e.target.value)}
                className="w-28"
              />
              <Button
                size="sm"
                onClick={saveRows}
                disabled={savingRows}
              >
                {savingRows ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
              </Button>
            </div>
            <p className="text-[11px] text-brand-textFaint mt-1.5">
              Between 3 and 25 rows.
            </p>
          </div>
        </div>
      </Panel>
    </>
  );
}
