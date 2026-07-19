import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { TimeEntry } from "../lib/types";
import { formatHours, formatMoney, weeklyHours } from "../lib/time";
import ClockCard from "../components/ClockCard";
import ShiftHistory from "../components/ShiftHistory";
import Header from "../components/Header";
import StatTile from "../components/StatTile";
import PullToRefresh from "../components/PullToRefresh";

export default function EmployeeView() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { entries } = await api.get<{ entries: TimeEntry[] }>("/entries");
      setEntries(entries);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEntry = entries.find((e) => e.clock_out === null) ?? null;
  const weekHours = weeklyHours(entries);
  const weekPay = weekHours * (profile?.hourly_rate ?? 0);

  async function clockIn() {
    setBusy(true);
    try {
      await api.post("/clock", { action: "in" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function clockOut() {
    setBusy(true);
    try {
      await api.post("/clock", { action: "out" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-6 text-muted">Loading…</div>;

  return (
    <PullToRefresh onRefresh={load}>
      <div className="pb-16">
        <Header title="Your shift" />

        <div className="px-4 mt-2">
          <ClockCard openEntry={openEntry} busy={busy} onClockIn={clockIn} onClockOut={clockOut} />
        </div>

        <div className="flex gap-3 px-5 mt-6">
          <StatTile label="This week" value={`${formatHours(weekHours)}h`} />
          <StatTile label="Est. pay" value={formatMoney(weekPay)} />
          <StatTile label="Rate" value={formatMoney(profile?.hourly_rate ?? 0) + "/h"} />
        </div>

        <div className="px-4 mt-8">
          <h2 className="text-sm text-muted tracking-[0.15em] uppercase font-body mb-3 px-1">History</h2>
          <ShiftHistory entries={entries} emptyLabel="Clock in to start your first shift." />
        </div>
      </div>
    </PullToRefresh>
  );
}
