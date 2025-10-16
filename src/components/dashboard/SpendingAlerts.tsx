import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, Bell, Info } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;
type Budget = Tables<"budgets">;

interface Alert {
  id: string;
  type: "budget-warning" | "unusual-spending" | "budget-exceeded" | "over-limit";
  severity: "info" | "warning" | "danger";
  title: string;
  message: string;
  data: {
    category?: string;
    percentage?: number;
    amount?: number;
    budget?: number;
  };
}

interface SpendingAlertsProps {
  transactions: Transaction[];
  budgets: Budget[];
}

export const SpendingAlerts = ({ transactions, budgets }: SpendingAlertsProps) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    generateAlerts();
  }, [transactions, budgets]);

  const generateAlerts = () => {
    const generatedAlerts: Alert[] = [];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    budgets.forEach((budget) => {
      const spent = transactions
        .filter(t => {
          const txnDate = new Date(t.date);
          return (
            t.type === "expense" &&
            t.category === budget.category &&
            txnDate.getMonth() === currentMonth &&
            txnDate.getFullYear() === currentYear
          );
        })
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const percentage = (spent / Number(budget.amount)) * 100;
      const budgetAmount = Number(budget.amount);

      if (percentage >= 100) {
        generatedAlerts.push({
          id: `exceed-${budget.id}`,
          type: "budget-exceeded",
          severity: "danger",
          title: `${budget.category} Budget Exceeded`,
          message: `You've exceeded your ${budget.category} budget by KSh ${(spent - budgetAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          data: {
            category: budget.category,
            percentage: percentage,
            amount: spent,
            budget: budgetAmount,
          },
        });
      } else if (percentage >= 90) {
        generatedAlerts.push({
          id: `warning-${budget.id}`,
          type: "budget-warning",
          severity: "warning",
          title: `${budget.category} Limit Approaching`,
          message: `You've used ${percentage.toFixed(0)}% of your ${budget.category} budget (KSh ${spent.toLocaleString(undefined, { maximumFractionDigits: 0 })} / KSh ${budgetAmount.toLocaleString()})`,
          data: {
            category: budget.category,
            percentage: percentage,
            amount: spent,
            budget: budgetAmount,
          },
        });
      } else if (percentage >= 75) {
        generatedAlerts.push({
          id: `info-${budget.id}`,
          type: "over-limit",
          severity: "info",
          title: `${budget.category} at ${percentage.toFixed(0)}%`,
          message: `You've spent KSh ${spent.toLocaleString(undefined, { maximumFractionDigits: 0 })} of KSh ${budgetAmount.toLocaleString()}`,
          data: {
            category: budget.category,
            percentage: percentage,
            amount: spent,
            budget: budgetAmount,
          },
        });
      }
    });

    // Detect unusual spending (7-day vs 30-day baseline per category)
    const now = new Date();
    const last7From = new Date(now);
    last7From.setDate(now.getDate() - 7);
    const last30From = new Date(now);
    last30From.setDate(now.getDate() - 30);

    const expenses = transactions.filter(t => t.type === "expense");

    // Build daily sums per category for last 30 days
    const byCatDay = new Map<string, Map<string, number>>();
    expenses.forEach(t => {
      const d = new Date(t.date);
      if (d >= last30From && d <= now) {
        const dayKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().split('T')[0];
        const cat = t.category;
        if (!byCatDay.has(cat)) byCatDay.set(cat, new Map());
        const dayMap = byCatDay.get(cat)!;
        dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + Number(t.amount));
      }
    });

    // Compute baseline mean and std per category across observed days (last 30)
    const baselineStats = new Map<string, { mean: number; std: number }>();
    byCatDay.forEach((dayMap, cat) => {
      const vals = Array.from(dayMap.values());
      const n = vals.length;
      if (n === 0) return;
      const mean = vals.reduce((a, b) => a + b, 0) / n;
      const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
      const std = Math.sqrt(variance);
      baselineStats.set(cat, { mean, std });
    });

    // Compute last 7-day total per category
    const last7Totals = new Map<string, number>();
    expenses.forEach(t => {
      const d = new Date(t.date);
      if (d >= last7From && d <= now) {
        last7Totals.set(t.category, (last7Totals.get(t.category) || 0) + Number(t.amount));
      }
    });

    // Flag categories where 7-day average significantly exceeds 30-day baseline
    last7Totals.forEach((sum7, cat) => {
      const stats = baselineStats.get(cat);
      if (!stats) return;
      const avg7 = sum7 / 7; // average per day recent
      const mean = stats.mean;
      const std = stats.std;

      // Conditions: either z-score > 2 when std > 0, or avg7 > 1.5x mean with a minimum amount threshold
      const z = std > 0 ? (avg7 - mean) / std : Infinity;
      const pctAbove = mean > 0 ? ((avg7 / mean) - 1) * 100 : 0;
      const significantAmount = sum7 >= 1000; // avoid noise on tiny amounts
      if ((std > 0 && z >= 2 && significantAmount) || (avg7 > mean * 1.5 && significantAmount)) {
        generatedAlerts.push({
          id: `unusual-${cat}-${now.toISOString().slice(0,10)}`,
          type: "unusual-spending",
          severity: "warning",
          title: `Unusual ${cat} Spending (7d)`,
          message: `Last 7 days: KSh ${sum7.toLocaleString()} • Avg/day ${(avg7).toFixed(0)} — ${(pctAbove).toFixed(0)}% above your 30-day daily average` + (std > 0 ? ` (z≈${z.toFixed(1)})` : ``),
          data: {
            category: cat,
            amount: sum7,
          },
        });
      }
    });

    setAlerts(generatedAlerts.slice(0, 5));
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "danger":
        return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100";
      case "warning":
        return "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100";
      case "info":
      default:
        return "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "danger":
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />;
      case "warning":
        return <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />;
      case "info":
      default:
        return <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />;
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Spending Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
            <Info className="h-8 w-8 opacity-50" />
            <p>All good! No alerts at the moment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border flex gap-3 ${getSeverityStyles(alert.severity)}`}
              >
                {getSeverityIcon(alert.severity)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{alert.title}</p>
                  <p className="text-sm opacity-90 mt-0.5">{alert.message}</p>
                  {alert.data.percentage && (
                    <div className="mt-2 h-1 bg-black/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          alert.severity === "danger"
                            ? "bg-red-500"
                            : alert.severity === "warning"
                            ? "bg-orange-500"
                            : "bg-blue-500"
                        }`}
                        style={{ width: `${Math.min(alert.data.percentage, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
