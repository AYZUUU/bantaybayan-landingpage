import { useEffect, useState } from "react";
import { getReporterIdPhoto } from "../utils/reports";

type PhotoState =
  | { userId: string; status: "loading" | "missing" | "error" }
  | { userId: string; status: "ready"; url: string };

export default function ReporterIdPhoto({ userId }: { userId: string | null }) {
  const [state, setState] = useState<PhotoState | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void getReporterIdPhoto(userId)
      .then((url) => {
        if (!active) return;
        setState(url ? { userId, status: "ready", url } : { userId, status: "missing" });
      })
      .catch(() => {
        if (active) {
          console.error("Could not load the reporter's ID photo.");
          setState({ userId, status: "error" });
        }
      });
    return () => { active = false; };
  }, [userId, attempt]);

  const status = !userId ? "unlinked" : state?.userId === userId ? state.status : "loading";

  return (
    <div className="border-t border-slate-200/60 pt-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
        Reporter identification
      </p>
      {status === "ready" && state?.status === "ready" ? (
        <img
          src={state.url}
          alt="Reporter identification document"
          className="max-h-52 w-full rounded-xl border border-slate-200 bg-white object-contain"
          onError={() => setState({ userId: state.userId, status: "error" })}
        />
      ) : status === "error" ? (
        <div role="alert" className="text-sm text-rose-700">
          Could not load the reporter&apos;s ID.
          <button
            type="button"
            className="ml-2 font-semibold underline"
            onClick={() => {
              if (!userId) return;
              setState({ userId, status: "loading" });
              setAttempt((value) => value + 1);
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          {status === "loading"
            ? "Loading identification..."
            : status === "unlinked"
              ? "No account is linked to this report."
              : "No ID is on file for this account."}
        </p>
      )}
    </div>
  );
}
