import { useEffect, useRef, useState } from "react";
import type { GameSnapshot } from "../types";
import type { SpyBluffAdvisorResult } from "./spyBluff";

export function useSpyBluffAdvisor(snapshot: GameSnapshot, enabled: boolean) {
  const [result, setResult] = useState<SpyBluffAdvisorResult | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [progress, setProgress] = useState({ checked: 0, unique: 0 });
  const [error, setError] = useState("");
  const [run, setRun] = useState({ id: 0, deep: false });
  const request = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      setResult(null);
      return;
    }

    const id = ++request.current;
    let worker: Worker | null = null;
    setStatus("running");
    setProgress({ checked: 0, unique: 0 });
    setError("");

    // Spy Grimoire entry is often done quickly seat-by-seat. Debouncing keeps
    // us from starting a new expensive search after every dropdown click.
    const timer = window.setTimeout(() => {
      try {
        worker = new Worker(new URL("./spyBluff.worker.ts", import.meta.url), { type: "module" });
        worker.onmessage = (event: MessageEvent) => {
          const data = event.data;
          if (data.request !== id) return;
          if (data.type === "progress") {
            setProgress({ checked: data.checked, unique: data.unique });
          } else if (data.type === "result") {
            setResult(data.result as SpyBluffAdvisorResult);
            setStatus("done");
            worker?.terminate();
          } else {
            setError(String(data.message));
            setStatus("error");
            worker?.terminate();
          }
        };
        worker.onerror = (event) => {
          setError(event.message || "ブラフ計算でエラーが発生しました");
          setStatus("error");
          worker?.terminate();
        };
        worker.postMessage({ snapshot, request: id, deep: run.deep });
      } catch (cause) {
        setError(String(cause));
        setStatus("error");
      }
    }, 650);

    return () => {
      window.clearTimeout(timer);
      worker?.terminate();
    };
  }, [snapshot, enabled, run]);

  return {
    result,
    status,
    progress,
    error,
    rerun: (deep = false) => setRun((current) => ({ id: current.id + 1, deep })),
  };
}
