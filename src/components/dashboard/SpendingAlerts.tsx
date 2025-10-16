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

    // Detect unusual spending
    const dailyAverages = new Map<string, { sum: number; count: number }>();
    transactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        const category = t.category;
        const current = dailyAverages.get(category) || { sum: 0, count: 0 };
        current.sum += Number(t.amount);
        current.count += 1;
        dailyAverages.set(category, current);
      });

    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = transactions.filter(t => t.date === today && t.type === "expense");

    todayTransactions.forEach(txn => {
      const average = dailyAverages.get(txn.category)?.sum / (dailyAverages.get(txn.category)?.count || 1) || 0;
      if (Number(txn.amount) > average * 2 && average > 0) {
        const percentAboveAverage = ((Number(txn.amount) / average) - 1) * 100;
        generatedAlerts.push({
          id: `unusual-${txn.id}`,
          type: "unusual-spending",
          severity: "warning",
          title: `Unusual ${txn.category} Spending`,
          message: `This KSh ${Number(txn.amount).toLocaleString()} transaction is ${percentAboveAverage.toFixed(0)}% above your average for ${txn.category}`,
          data: {
            category: txn.category,
            amount: Number(txn.amount),
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
