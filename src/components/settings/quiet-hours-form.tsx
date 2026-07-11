"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateQuietHours } from "@/lib/actions/notifications";
import { TIMEZONE_OPTIONS } from "@/lib/quiet-hours";

interface Initial {
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
}

// Postgres "time" columns round-trip as "HH:MM:SS" — <input type="time">
// only wants "HH:MM", so trim before handing values to the input.
function toInputTime(value: string | null) {
  return value ? value.slice(0, 5) : "";
}

export function QuietHoursForm({ initial }: { initial: Initial }) {
  const [enabled, setEnabled] = useState(initial.quietHoursStart !== null && initial.quietHoursEnd !== null);
  const [start, setStart] = useState(toInputTime(initial.quietHoursStart) || "22:00");
  const [end, setEnd] = useState(toInputTime(initial.quietHoursEnd) || "08:00");
  const [timezone, setTimezone] = useState(initial.timezone);
  const [isPending, startTransition] = useTransition();

  function save(next: { enabled: boolean; start: string; end: string; timezone: string }) {
    startTransition(async () => {
      await updateQuietHours({
        quietHoursStart: next.enabled ? next.start : null,
        quietHoursEnd: next.enabled ? next.end : null,
        timezone: next.timezone,
      });
      toast.success("Preferências salvas");
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <label className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Horário de silêncio</p>
          <p className="text-xs text-muted-foreground">Não enviar notificações durante esse período.</p>
        </div>
        <Switch
          checked={enabled}
          disabled={isPending}
          onCheckedChange={(checked) => {
            setEnabled(checked);
            save({ enabled: checked, start, end, timezone });
          }}
        />
      </label>

      {enabled && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="quiet-start">Das</Label>
            <Input
              id="quiet-start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              onBlur={() => save({ enabled, start, end, timezone })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quiet-end">Até</Label>
            <Input
              id="quiet-end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              onBlur={() => save({ enabled, start, end, timezone })}
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="timezone">Fuso horário</Label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => {
            setTimezone(e.target.value);
            save({ enabled, start, end, timezone: e.target.value });
          }}
          className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
