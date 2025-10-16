import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Calendar, Clock, TrendingUp, AlertTriangle } from "lucide-react";

type Transaction = Tables<"transactions">;
type Income = Tables<"income_sources">;
type Goal = Tables<"goals">;

function monthKey(date: Date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
}

function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Math.max(0, Math.ceil(months)));
  return d;
}

export const GoalForecasts = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [txRes, incRes, goalRes] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", user.id),
        supabase.from("income_sources").select("*").eq("user_id", user.id),
        supabase.from("goals").select("*").eq("user_id", user.id)
      ]);
      setTransactions(txRes.data || []);
      setIncomes(incRes.data || []);
      setGoals(goalRes.data || []);
    };
    load();
  }, []);

  // Build monthly totals for last 6 months
  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthKey(d));
  }

  const monthTotals = months.map((m) => ({ month: m, income: 0, expense: 0 }));
  const byMonth = new Map(monthTotals.map((m) => [m.month, m]));

  [...transactions].forEach((t) => {
    const mk = monthKey(new Date(t.date));
    if (byMonth.has(mk)) {
      if (t.type === "income") byMonth.get(mk)!.income += Number(t.amount);
      else byMonth.get(mk)!.expense += Number(t.amount);
    }
  });
  [...incomes].forEach((i) => {
    const mk = monthKey(new Date(i.date));
    if (byMonth.has(mk)) byMonth.get(mk)!.income += Number(i.amount);
  });

  const last3 = monthTotals.slice(-3);
  const avgMonthlySavings = last3.length > 0
    ? last3.reduce((acc, m) => acc + (m.income - m.expense), 0) / last3.length
    : 0;

  function forecast(goal: Goal) {
    const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount));
    const targetDate = goal.target_date ? new Date(goal.target_date) : null;

    if (remaining === 0) {
      return { status: "Completed" as const };
    }

    if (avgMonthlySavings <= 0) {
      // Not saving on average: show required per month if target provided
      let requiredPerMonth: number | null = null;
      if (targetDate) {
        const now = new Date();
        const monthsLeft = Math.max(1, (endOfMonth(targetDate).getTime() - startOfMonth(now).getTime()) / (1000 * 60 * 60 * 24 * 30));
        requiredPerMonth = remaining / monthsLeft;
      }
      return { status: "No positive savings trend" as const, requiredPerMonth };
    }

    const monthsNeeded = remaining / avgMonthlySavings;
    const estimatedDate = addMonths(new Date(), monthsNeeded);
    const onTrack = targetDate ? estimatedDate <= targetDate : undefined;

    return { status: "Estimated" as const, monthsNeeded, estimatedDate, onTrack };
  }

  const activeGoals = goals.filter((g) => !g.is_completed);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg">Savings Goal Forecasts</CardTitle>
        <CardDescription>
          Based on average monthly savings over the last 3 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeGoals.length === 0 ? (
          <div className="text-sm text-muted-foreground">No active goals to forecast.</div>
        ) : (
          <div className="space-y-4">
            {activeGoals.map((g) => {
              const res = forecast(g);
              const remaining = Math.max(0, Number(g.target_amount) - Number(g.current_amount));
              return (
                <div key={g.id} className="p-4 rounded-lg border bg-card/50">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium">{g.name}</div>
                    <Badge variant={g.is_completed ? "default" : "secondary"}>
                      KSh {remaining.toLocaleString()} remaining
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">Target: KSh {Number(g.target_amount).toLocaleString()}</div>
                  {res.status === "Completed" && (
                    <div className="text-income text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Completed</div>
                  )}
                  {res.status === "No positive savings trend" && (
                    <div className="text-warning text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" />
                      No positive savings trend. {res.requiredPerMonth ? (
                        <span>Need ~KSh {res.requiredPerMonth.toFixed(0)} per month to meet the target date.</span>
                      ) : (
                        <span>Set a target date to see required monthly savings.</span>
                      )}
                    </div>
                  )}
                  {res.status === "Estimated" && (
                    <div className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Estimated completion: <span className="font-medium">
                        {res.estimatedDate?.toLocaleDateString()}
                      </span>
                      {typeof res.onTrack === "boolean" && (
                        <Badge variant={res.onTrack ? "default" : "destructive"} className="ml-2">
                          {res.onTrack ? "On Track" : "Behind"}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="text-xs text-muted-foreground">
              Average monthly savings (last 3 months): KSh {avgMonthlySavings.toFixed(0)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
