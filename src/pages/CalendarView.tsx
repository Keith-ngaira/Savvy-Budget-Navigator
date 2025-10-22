import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as DayPickerCalendar } from "@/components/ui/calendar";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";

// Simple in-app calendar visualization of goals and recurring items (current month)

type Goal = Tables<"goals">;
type Recurring = Tables<"recurring_transactions">;

interface DatedEvent {
  date: string; // YYYY-MM-DD
  type: "goal" | "recurring";
  title: string;
  meta?: string;
}

function formatDateKey(d: Date) {
  return d.toISOString().split("T")[0];
}

function getMonthRange(view: Date) {
  const start = new Date(view.getFullYear(), view.getMonth(), 1);
  const end = new Date(view.getFullYear(), view.getMonth() + 1, 0);
  return { start, end };
}

function expandRecurringInMonth(recurring: Recurring[], view: Date): DatedEvent[] {
  const { start, end } = getMonthRange(view);
  const events: DatedEvent[] = [];

  for (const r of recurring) {
    if (!r.is_active) continue;
    if (!r.start_date) continue;
    const freq = (r.frequency || "monthly").toLowerCase();

    // Generate occurrences from max(start_date, monthStart) to monthEnd
    const first = new Date(r.start_date);
    let cursor = new Date(Math.max(first.getTime(), start.getTime()));

    // Align cursor to the next occurrence >= month start
    const alignCursor = () => {
      if (freq === "weekly") {
        // Move back to the weekday of the first start, then advance to >= start
        const firstDow = first.getDay();
        while (cursor.getDay() !== firstDow) {
          cursor.setDate(cursor.getDate() - 1);
        }
        while (cursor < start) {
          cursor.setDate(cursor.getDate() + 7);
        }
      } else if (freq === "monthly") {
        // Keep the day of month from "first"
        cursor = new Date(start.getFullYear(), start.getMonth(), first.getDate());
        if (cursor < start) {
          cursor = new Date(start.getFullYear(), start.getMonth() + 1, first.getDate());
        }
      } else if (freq === "yearly") {
        cursor = new Date(start.getFullYear(), first.getMonth(), first.getDate());
        if (cursor < start) {
          cursor = new Date(start.getFullYear() + 1, first.getMonth(), first.getDate());
        }
      } else {
        // daily (or default)
        if (cursor < start) cursor = new Date(start);
      }
    };

    alignCursor();

    const until = r.end_date ? new Date(r.end_date) : undefined;

    while (cursor <= end) {
      if (!until || cursor <= until) {
        events.push({
          date: formatDateKey(cursor),
          type: "recurring",
          title: `[${r.type?.toUpperCase() || "TXN"}] ${r.description}`,
          meta: `KSh ${r.amount}`,
        });
      }

      // Advance by frequency
      if (freq === "weekly") {
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 7);
      } else if (freq === "monthly") {
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
      } else if (freq === "yearly") {
        cursor = new Date(cursor.getFullYear() + 1, cursor.getMonth(), cursor.getDate());
      } else {
        // daily
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }

  return events;
}

export const CalendarView = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recurrings, setRecurrings] = useState<Recurring[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }
        const [goalsRes, recRes] = await Promise.all([
          supabase.from("goals").select("*").eq("user_id", user.id),
          supabase.from("recurring_transactions").select("*").eq("user_id", user.id),
        ]);
        if (goalsRes.data) setGoals(goalsRes.data);
        if (recRes.data) setRecurrings(recRes.data);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const monthEvents = useMemo(() => {
    const goalEvents: DatedEvent[] = goals
      .filter((g) => g.target_date && !g.is_completed)
      .map((g) => ({
        date: g.target_date!.split("T")[0],
        type: "goal" as const,
        title: `Goal: ${g.name}`,
        meta: `Target KSh ${g.target_amount}`,
      }));
    const recurringEvents = expandRecurringInMonth(recurrings, viewDate);
    const all = [...goalEvents, ...recurringEvents];
    const map = new Map<string, DatedEvent[]>();
    for (const e of all) {
      const arr = map.get(e.date) || [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [goals, recurrings, viewDate]);

  const selected = undefined; // DayPicker internally manages month; we use viewDate state to recompute events

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Calendar</h1>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Monthly View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DayPickerCalendar
                onMonthChange={(d) => setViewDate(d)}
                showOutsideDays
              />
            </div>
            <div className="space-y-3">
              <h2 className="font-semibold">Events this month</h2>
              <div className="space-y-2 max-h-[420px] overflow-auto pr-2">
                {Array.from(monthEvents.entries()).length === 0 && (
                  <p className="text-sm text-muted-foreground">No events this month</p>
                )}
                {Array.from(monthEvents.entries())
                  .sort(([a], [b]) => (a < b ? -1 : 1))
                  .map(([date, items]) => (
                    <div key={date} className="border rounded p-2">
                      <div className="text-xs text-muted-foreground">{date}</div>
                      <ul className="mt-1 space-y-1">
                        {items.map((e, idx) => (
                          <li key={idx} className="text-sm">
                            <span className={e.type === "goal" ? "text-primary" : "text-accent-foreground"}>
                              {e.title}
                            </span>
                            {e.meta ? <span className="text-muted-foreground"> — {e.meta}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarView;
