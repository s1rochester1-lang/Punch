import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { TimeEntry } from "../lib/types";
import { formatHours, formatMoney, weeklyHours } from "../lib/time";
import ClockCard from "../components/ClockCard";
import ShiftHistory from "../components/ShiftHistory";
import Header from "../components/Header";
import StatTile from "../components/StatTile";

export default function EmployeeView() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from("time_entries")
      .select("*")
      .eq("employee_id", profile.id)
      .order("clock_in", { ascending: false })
      .limit(100);
    if (!error && data) setEntries(data as TimeEntry[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const openEntry = entries.find((e) => e.clock_out === null) ?? null;
  const weekHours = weeklyHours(entries);
  const weekPay = weekHours * (profile?.hourly_rate ?? 0);

  async function clockIn() {
    if (!profile) return;
    setBusy(true);
    const { error } = await supabase.from("time_entries").insert({
      employee_id: profile.id,
      clock_in: new Date().toISOString(),
      source: "self",
    });
    if (!error) await load();
    setBusy(false);
  }

  async function clockOut() {
    if (!openEntry) return;
    setBusy(true);
    const { error } = await supabase
      .from("time_entries")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", openEntry.id);
    if (!error) await load();
    setBusy(false);
  }

  if (loading) return <div className="p-6 text-muted">Loading…</div>;

  return (
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
  );
}
