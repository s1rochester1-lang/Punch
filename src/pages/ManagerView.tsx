import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { Profile, TimeEntry } from "../lib/types";
import { formatHours, formatMoney, weeklyHours } from "../lib/time";
import Header from "../components/Header";
import StatTile from "../components/StatTile";
import ShiftHistory from "../components/ShiftHistory";
import ManualEntryModal from "../components/ManualEntryModal";
import ResetPinModal from "../components/ResetPinModal";

export default function ManagerView() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [entriesByEmployee, setEntriesByEmployee] = useState<Record<string, TimeEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [modalEntry, setModalEntry] = useState<TimeEntry | null | "new">(null);
  const [rateDraft, setRateDraft] = useState<string>("");
  const [resettingPin, setResettingPin] = useState(false);

  const load = useCallback(async () => {
    const { employees, entries } = await api.get<{ employees: Profile[]; entries: TimeEntry[] }>("/team");
    setEmployees(employees);
    const grouped: Record<string, TimeEntry[]> = {};
    for (const e of entries) {
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
    if (!selected) return;
    if (values.id) {
      await api.patch("/entries", {
        id: values.id,
        clockIn: values.clock_in,
        clockOut: values.clock_out,
        notes: values.notes,
      });
    } else {
      await api.post("/entries", {
        employeeId: selected.id,
        clockIn: values.clock_in,
        clockOut: values.clock_out,
        notes: values.notes,
      });
    }
    await load();
  }

  async function deleteEntry(id: string) {
    await api.del("/entries", { id });
    await load();
  }

  async function saveRate() {
    if (!selected) return;
    const rate = parseFloat(rateDraft);
    if (Number.isNaN(rate) || rate < 0) return;
    await api.post("/rate", { employeeId: selected.id, hourlyRate: rate });
    await load();
    setSelected((s) => (s ? { ...s, hourly_rate: rate } : s));
  }

  if (loading) return <div className="p-6 text-muted">Loading…</div>;

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
            No staff accounts yet.
          </p>
        )}
      </div>
    </div>
  );
}
