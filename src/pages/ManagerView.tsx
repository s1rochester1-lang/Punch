import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Profile, TimeEntry } from "../lib/types";
import { formatHours, formatMoney, weeklyHours } from "../lib/time";
import Header from "../components/Header";
import StatTile from "../components/StatTile";
import ShiftHistory from "../components/ShiftHistory";
import ManualEntryModal from "../components/ManualEntryModal";
import ResetPinModal from "../components/ResetPinModal";
import { useAuth } from "../context/AuthContext";

export default function ManagerView() {
  const { profile: managerProfile } = useAuth();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [entriesByEmployee, setEntriesByEmployee] = useState<Record<string, TimeEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [modalEntry, setModalEntry] = useState<TimeEntry | null | "new">(null);
  const [rateDraft, setRateDraft] = useState<string>("");
  const [resettingPin, setResettingPin] = useState(false);

  const load = useCallback(async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });
    const { data: entries } = await supabase
      .from("time_entries")
      .select("*")
      .order("clock_in", { ascending: false })
      .limit(2000);

    setEmployees((profiles as Profile[]) ?? []);
    const grouped: Record<string, TimeEntry[]> = {};
    for (const e of (entries as TimeEntry[]) ?? []) {
      grouped[e.employee_id] = grouped[e.employee_id] ?? [];
      grouped[e.employee_id].push(e);
    }
    setEntriesByEmployee(grouped);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveEntry(values: { id?: string; clock_in: string; clock_out: string | null; notes: string | null }) {
    if (!selected || !managerProfile) return;
    if (values.id) {
      const { error } = await supabase
        .from("time_entries")
        .update({ clock_in: values.clock_in, clock_out: values.clock_out, notes: values.notes })
        .eq("id", values.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("time_entries").insert({
        employee_id: selected.id,
        clock_in: values.clock_in,
        clock_out: values.clock_out,
        notes: values.notes,
        source: "manager",
        created_by: managerProfile.id,
      });
      if (error) throw error;
    }
    await load();
  }

  async function deleteEntry(id: string) {
    await supabase.from("time_entries").delete().eq("id", id);
    await load();
  }

  async function saveRate() {
    if (!selected) return;
    const rate = parseFloat(rateDraft);
    if (Number.isNaN(rate) || rate < 0) return;
    await supabase.from("profiles").update({ hourly_rate: rate }).eq("id", selected.id);
    await load();
    setSelected((s) => (s ? { ...s, hourly_rate: rate } : s));
  }

  if (loading) return <div className="p-6 text-muted">Loading…</div>;

  // --- Employee detail screen ---
  if (selected) {
    const entries = entriesByEmployee[selected.id] ?? [];
    const weekHours = weeklyHours(entries);
    const weekPay = weekHours * selected.hourly_rate;
    const isOpen = entries.some((e) => e.clock_out === null);

    return (
      <div className="pb-16">
        <div className="px-4 pt-6">
          <button
            onClick={() => setSelected(null)}
            className="text-muted text-xs font-body normal-case tracking-normal underline"
          >
            &larr; All staff
          </button>
          <div className="flex items-center justify-between mt-3">
            <div>
              <h1 className="text-2xl text-paper">{selected.full_name}</h1>
              {isOpen && (
                <span className="text-active text-xs font-body normal-case tracking-normal">
                  &bull; clocked in now
                </span>
              )}
            </div>
            <button onClick={() => setModalEntry("new")} className="btn-primary px-4 py-2 text-xs">
              Add shift
            </button>
          </div>
        </div>

        <div className="flex gap-3 px-5 mt-5">
          <StatTile label="This week" value={`${formatHours(weekHours)}h`} />
          <StatTile label="Est. pay" value={formatMoney(weekPay)} />
        </div>

        <div className="px-5 mt-5 flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted uppercase tracking-wide font-body">Hourly rate</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input mt-1"
              value={rateDraft || String(selected.hourly_rate)}
              onChange={(e) => setRateDraft(e.target.value)}
            />
          </div>
          <button onClick={saveRate} className="btn-ghost px-4 py-3 text-xs">
            Update
          </button>
        </div>

        <div className="px-5 mt-3">
          <button
            onClick={() => setResettingPin(true)}
            className="text-xs text-muted font-body normal-case tracking-normal underline"
          >
            Reset {selected.full_name.split(" ")[0]}'s PIN
          </button>
        </div>

        <div className="px-4 mt-8">
          <h2 className="text-sm text-muted tracking-[0.15em] uppercase font-body mb-3 px-1">Shift history</h2>
          <ShiftHistory
            entries={entries}
            emptyLabel="No shifts logged yet."
            onEdit={(entry) => setModalEntry(entry)}
          />
        </div>

        {modalEntry && (
          <ManualEntryModal
            employeeId={selected.id}
            entry={modalEntry === "new" ? null : modalEntry}
            onClose={() => setModalEntry(null)}
            onSave={saveEntry}
            onDelete={modalEntry !== "new" ? deleteEntry : undefined}
          />
        )}

        {resettingPin && (
          <ResetPinModal
            employeeId={selected.id}
            employeeName={selected.full_name}
            onClose={() => setResettingPin(false)}
          />
        )}
      </div>
    );
  }

  // --- Team roster screen ---
  return (
    <div className="pb-16">
      <Header title="Team" />
      <div className="px-4 mt-2 space-y-2">
        {employees.map((emp) => {
          const entries = entriesByEmployee[emp.id] ?? [];
          const weekHours = weeklyHours(entries);
          const isOpen = entries.some((e) => e.clock_out === null);
          return (
            <button
              key={emp.id}
              onClick={() => {
                setSelected(emp);
                setRateDraft("");
              }}
              className="ticket w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div>
                <p className="text-paper font-body font-medium normal-case tracking-normal">{emp.full_name}</p>
                <p className="text-muted text-xs font-body normal-case tracking-normal mt-0.5">
                  {emp.role === "manager" ? "Manager" : "Staff"} &middot; {formatMoney(emp.hourly_rate)}/h
                  {isOpen && <span className="text-active"> &middot; clocked in</span>}
                </p>
              </div>
              <span className="stamp text-brassBright text-sm">{formatHours(weekHours)}h</span>
            </button>
          );
        })}

        {employees.length === 0 && (
          <p className="text-muted text-sm font-body normal-case tracking-normal py-6 text-center">
            No staff accounts yet. Have them sign up, then set their rate here.
          </p>
        )}
      </div>
    </div>
  );
}
