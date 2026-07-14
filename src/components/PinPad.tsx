import { useEffect } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

export default function PinPad({ value, onChange, length = 4 }: Props) {
  function press(key: string) {
    if (key === "") return;
    if (key === "back") {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length < length) onChange(value + key);
  }

  // Let a physical/on-screen keyboard type digits too.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (/^\d$/.test(e.key)) press(e.key);
      if (e.key === "Backspace") press("back");
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div>
      <div className="flex justify-center gap-3 mb-8">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`h-3.5 w-3.5 rounded-full border border-brass ${
              i < value.length ? "bg-brassBright" : "bg-transparent"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
        {KEYS.map((key, i) =>
          key === "" ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(key)}
              className={`h-16 rounded-card font-mono text-2xl flex items-center justify-center ${
                key === "back" ? "text-muted text-base" : "bg-panelRaised text-paper"
              }`}
            >
              {key === "back" ? "⌫" : key}
            </button>
          )
        )}
      </div>
    </div>
  );
}
