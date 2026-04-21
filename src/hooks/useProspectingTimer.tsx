import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";

interface TimerCtx {
  seconds: number;
  running: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

const Ctx = createContext<TimerCtx>({} as TimerCtx);
const KEY = "prospec_timer_v1";

export function ProspectingTimerProvider({ children }: { children: ReactNode }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        const { seconds: s, running: r, lastTick } = JSON.parse(raw);
        let base = s ?? 0;
        if (r && lastTick) base += Math.floor((Date.now() - lastTick) / 1000);
        setSeconds(base);
        setRunning(!!r);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ seconds, running, lastTick: Date.now() }));
  }, [seconds, running]);

  const start = () => { setSeconds(0); setRunning(true); };
  const pause = () => setRunning(false);
  const resume = () => setRunning(true);
  const stop = () => { setRunning(false); setSeconds(0); localStorage.removeItem(KEY); };

  return <Ctx.Provider value={{ seconds, running, start, pause, resume, stop }}>{children}</Ctx.Provider>;
}

export const useProspectingTimer = () => useContext(Ctx);

export function formatTimer(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
