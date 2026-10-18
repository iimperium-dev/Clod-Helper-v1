import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Toggle } from "./Toggle";
import { leakGuardSet, leakGuardStatus } from "../lib/api";
import type { LeakGuardStatus } from "../lib/types";
import { cn } from "../lib/cn";

const SERVICES = [
  { id: "claude", name: "Claude", hint: "Claude Desktop, Claude Code, сайт" },
  { id: "telegram", name: "Telegram", hint: "Приложение и веб-версия" },
] as const;

/*
  «Защита от утечек» (macOS): брандмауэр закрывает прямой выход к Claude и
  Telegram — мимо моста они просто не соединятся, IP не утечёт. Каждое
  переключение — одно окно пароля Mac.
*/
export function LeakGuardCard() {
  const [st, setSt] = useState<LeakGuardStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setSt(await leakGuardStatus().catch(() => null));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const on = new Set(st?.enabled ? st.services.split(",").filter(Boolean) : []);

  const toggle = async (id: string) => {
    const next = new Set(on);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setBusy(id);
    setError(null);
    try {
      setSt(await leakGuardSet([...next]));
    } catch (e) {
      setError(String(e));
      void load();
    } finally {
      setBusy(null);
    }
  };

  const claudeOn = on.has("claude");
  return (
    <section className="surface-card p-4" aria-label="Защита от утечек">
      <div className="flex items-start gap-3">
        <ShieldCheck className={cn("mt-0.5 h-4 w-4 shrink-0", on.size ? "text-vb-emerald" : "text-vb-silver-dim")} />
        <div className="min-w-0">
          <div className="text-[14px] font-medium text-vb-fg">Защита от утечек</div>
          <div className="text-[12px] leading-snug text-vb-silver-faint">
            Брандмауэр не выпустит эти сервисы мимо прокси — ваш IP не уйдёт, даже если программа обойдёт мост
          </div>
        </div>
      </div>
      <div className="mt-3 divide-y divide-vb-border/70 rounded-lg border border-vb-border/70">
        {SERVICES.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-4 px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-[13px] text-vb-fg">{s.name}</div>
              <div className="text-[11px] text-vb-silver-faint">{s.hint}</div>
            </div>
            {st === null || busy === s.id ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-vb-silver-dim" />
            ) : (
              <Toggle
                checked={on.has(s.id)}
                onChange={() => void toggle(s.id)}
                disabled={busy !== null}
                label={`Защита ${s.name}`}
              />
            )}
          </div>
        ))}
      </div>
      {error ? (
        <p className="mt-3 text-[12px] text-vb-warn">{error}</p>
      ) : claudeOn && st?.verified === true ? (
        <p className="mt-3 text-[12px] text-vb-emerald">Проверено: напрямую к Claude не пройти</p>
      ) : claudeOn && st?.verified === false ? (
        <p className="mt-3 text-[12px] text-vb-warn">Правила стоят, но прямое соединение прошло — выключите и включите снова</p>
      ) : on.size > 0 && st && !st.auto_restore ? (
        <p className="mt-3 text-[12px] text-vb-warn">После перезагрузки защита не вернётся — включите заново</p>
      ) : null}
    </section>
  );
}
