import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import PinPad from "../components/PinPad";

interface DirectoryEntry {
  id: string;
  full_name: string;
}

type Mode = "select" | "pin" | "new-name" | "new-pin" | "new-confirm";

export default function Login() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>("select");
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [selected, setSelected] = useState<DirectoryEntry | null>(null);
  const [pin, setPin] = useState("");
  const [newName, setNewName] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadDirectory();
  }, []);

  async function loadDirectory() {
    try {
      const { employees } = await api.get<{ employees: DirectoryEntry[] }>("/directory");
      setDirectory(employees);
    } catch {
      setDirectory([]);
    } finally {
      setLoadingDirectory(false);
    }
  }

  function resetToSelect() {
    setMode("select");
    setSelected(null);
    setPin("");
    setNewName("");
    setFirstPin("");
    setError(null);
  }

  async function handleSignInPin(value: string) {
    setPin(value);
    if (value.length !== 4 || !selected) return;
    setBusy(true);
    setError(null);
    try {
      await login(selected.id, value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That PIN didn't match. Try again.");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  function handleNewPinFirst(value: string) {
    setFirstPin(value);
    if (value.length === 4) {
      setMode("new-confirm");
      setPin("");
    }
  }

  async function handleNewPinConfirm(value: string) {
    setPin(value);
    if (value.length !== 4) return;
    if (value !== firstPin) {
      setError("Those PINs didn't match. Let's try again.");
      setMode("new-pin");
      setFirstPin("");
      setPin("");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signup(newName, value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create that account.");
      setMode("new-name");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl text-paper">Punch</h1>
            <div className="h-9 w-9 rounded-full bg-brass flex items-center justify-center">
              <span className="font-mono text-ink font-semibold text-xs">IN</span>
            </div>
          </div>
          <p className="text-muted font-body normal-case tracking-normal mt-1">Staff time clock</p>
        </div>

        {mode === "select" && (
          <div className="space-y-2">
            {loadingDirectory ? (
              <p className="text-muted text-sm text-center font-body normal-case tracking-normal">Loading…</p>
            ) : (
              directory.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => {
                    setSelected(entry);
                    setMode("pin");
                    setError(null);
                  }}
                  className="ticket w-full px-5 py-4 text-left text-paper font-body font-medium normal-case tracking-normal"
                >
                  {entry.full_name}
                </button>
              ))
            )}

            {!loadingDirectory && directory.length === 0 && (
              <p className="text-muted text-sm text-center font-body normal-case tracking-normal py-4">
                No one's signed up here yet.
              </p>
            )}

            <button onClick={() => setMode("new-name")} className="btn-ghost w-full py-3 text-sm mt-4">
              I'm new here
            </button>
          </div>
        )}

        {mode === "pin" && selected && (
          <div>
            <p className="text-center text-paper font-body font-medium normal-case tracking-normal mb-6">
              {selected.full_name}
              <br />
              <span className="text-muted text-xs">Enter your PIN</span>
            </p>
            <PinPad value={pin} onChange={handleSignInPin} />
            {error && <p className="text-alert text-sm text-center mt-4">{error}</p>}
            <button
              onClick={resetToSelect}
              className="mt-8 w-full text-center text-sm text-muted font-body normal-case tracking-normal underline"
            >
              Not you?
            </button>
          </div>
        )}

        {mode === "new-name" && (
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Your full name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            {error && <p className="text-alert text-sm">{error}</p>}
            <button
              onClick={() => newName.trim() && setMode("new-pin")}
              className="btn-primary w-full py-3 text-sm"
            >
              Continue
            </button>
            <button
              onClick={resetToSelect}
              className="w-full text-center text-sm text-muted font-body normal-case tracking-normal underline"
            >
              Back
            </button>
          </div>
        )}

        {mode === "new-pin" && (
          <div>
            <p className="text-center text-paper font-body normal-case tracking-normal mb-6">
              Choose a 4-digit PIN
            </p>
            <PinPad value={firstPin} onChange={handleNewPinFirst} />
            {error && <p className="text-alert text-sm text-center mt-4">{error}</p>}
          </div>
        )}

        {mode === "new-confirm" && (
          <div>
            <p className="text-center text-paper font-body normal-case tracking-normal mb-6">
              Enter it once more to confirm
            </p>
            <PinPad value={pin} onChange={handleNewPinConfirm} />
            {busy && <p className="text-muted text-sm text-center mt-4">Setting up your account…</p>}
            {error && <p className="text-alert text-sm text-center mt-4">{error}</p>}
          </div>
        )}

        {mode !== "select" && mode !== "pin" && (
          <p className="mt-8 text-xs text-muted font-body normal-case tracking-normal text-center">
            Your manager sets your hourly rate after your first sign-in.
          </p>
        )}
      </div>
    </div>
  );
}
