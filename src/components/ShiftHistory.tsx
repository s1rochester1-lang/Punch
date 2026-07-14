import { TimeEntry } from "../lib/types";
import { formatClock, formatDate, formatHours, groupByDay, hoursBetween } from "../lib/time";

interface Props {
  entries: TimeEntry[];
  emptyLabel?: string;
  onEdit?: (entry: TimeEntry) => void;
}

export default function ShiftHistory({ entries, emptyLabel, onEdit }: Props) {
  if (entries.length === 0) {
    return (
      <p className="text-muted text-sm font-body normal-case tracking-normal py-6 text-center">
        {emptyLabel ?? "No shifts yet."}
      </p>
    );
  }

  const groups = groupByDay(entries);

  return (
    <div className="space-y-6">
      {groups.map(({ day, entries: dayEntries }) => (
        <div key={day}>
          <p className="text-muted text-xs tracking-[0.15em] uppercase font-body mb-2 px-1">
            {formatDate(dayEntries[0].clock_in)}
          </p>
          <div className="space-y-2">
            {dayEntries.map((entry) => {
              const hrs = hoursBetween(entry.clock_in, entry.clock_out);
              return (
                <button
                  key={entry.id}
                  onClick={() => onEdit?.(entry)}
                  disabled={!onEdit}
                  className="ticket w-full flex items-center justify-between px-5 py-3 text-left"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="stamp text-paper">{formatClock(entry.clock_in)}</span>
                    <span className="text-muted text-xs">&rarr;</span>
                    <span className="stamp text-paper">
                      {entry.clock_out ? formatClock(entry.clock_out) : "active"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.source === "manager" && (
                      <span className="text-[10px] uppercase tracking-wide text-brass font-body">edited</span>
                    )}
                    <span className="stamp text-brassBright text-sm">{formatHours(hrs)}h</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
