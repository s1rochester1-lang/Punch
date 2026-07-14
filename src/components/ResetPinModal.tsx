import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import PinPad from "./PinPad";

interface Props {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
}

export default function ResetPinModal({ employeeId, employeeName, onClose }: Props) {
  const [step, setStep] = useState<"enter" | "confirm" | "done">("enter");
  const [firstPin, setFirstPin] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFirst(value: string) {
    setFirstPin(value);
    if (value.length === 4) {
      setStep("confirm");
      setPin("");
    }
  }

  async function handleConfirm(value: string) {
    setPin(value);
    if (value.length !== 4) return;
    if (value !== firstPin) {
      setError("Those didn't match. Start over.");
      setStep("enter");
      setFirstPin("");
      setPin("");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ employeeId, newPin: value }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't reset the PIN.");
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reset the PIN.");
      setStep("enter");
      setFirstPin("");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/80 flex items-end sm:items-center justify-center z-50 px-4">
      <div className="bg-panel rounded-card w-full max-w-sm p-5 mb-0 sm:mb-auto text-center">
        <h2 className="text-lg text-paper mb-1">Reset PIN</h2>
        <p className="text-muted text-xs font-body normal-case tracking-normal mb-6">{employeeName}</p>

        {step === "enter" && (
          <>
            <p className="text-paper text-sm font-body normal-case tracking-normal mb-4">
              Enter a new 4-digit PIN
            </p>
            <PinPad value={firstPin} onChange={handleFirst} />
          </>
        )}

        {step === "confirm" && (
          <>
            <p className="text-paper text-sm font-body normal-case tracking-normal mb-4">Confirm it</p>
            <PinPad value={pin} onChange={handleConfirm} />
            {busy && <p className="text-muted text-sm mt-4">Saving…</p>}
          </>
        )}

        {step === "done" && (
          <p className="text-active text-sm font-body normal-case tracking-normal py-4">
            PIN updated. Let {employeeName.split(" ")[0]} know their new PIN.
          </p>
        )}

        {error && <p className="text-alert text-sm mt-4">{error}</p>}

        <button
          onClick={onClose}
          className="btn-ghost w-full py-3 text-sm mt-6"
        >
          {step === "done" ? "Close" : "Cancel"}
        </button>
      </div>
    </div>
  );
}
