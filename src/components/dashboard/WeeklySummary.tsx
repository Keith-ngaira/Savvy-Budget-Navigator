import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, AlertCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;

interface WeeklySummaryData {
  weekStart: Date;
  weekEnd: Date;
  income: number;
  expenses: number;
  balance: number;
  topExpenseCategory: string;
  topExpenseAmount: number;
  dayWithMostSpending: string;
  dayWithMostSpendingAmount: number;
}

interface WeeklySummaryProps {
  transactions: Transaction[];
}

export const WeeklySummary = ({ transactions }: WeeklySummaryProps) => {
  const [summary, setSummary] = useState<WeeklySummaryData | null>(null);

  useEffect(() => {
    generateWeeklySummary();
  }, [transactions]);

  const generateWeeklySummary = () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekTransactions = transactions.filter(t => {
      const txnDate = new Date(t.date);
      return txnDate >= weekStart && txnDate <= weekEnd;
    });

    const income = weekTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = weekTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const categoryExpenses = new Map<string, number>();
    weekTransactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        const current = categoryExpenses.get(t.category) || 0;
        categoryExpenses.set(t.category, current + Number(t.amount));
      });

    const topCategory = Array.from(categoryExpenses.entries())
      .sort((a, b) => b[1] - a[1])[0] || ["Other", 0];

    const dailyExpenses = new Map<string, number>();
    weekTransactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        const date = new Date(t.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const current = dailyExpenses.get(date) || 0;
        dailyExpenses.set(date, current + Number(t.amount));
      });

    const topDay = Array.from(dailyExpenses.entries())
      .sort((a, b) => b[1] - a[1])[0] || ["No data", 0];

    setSummary({
      weekStart,
      weekEnd,
      income,
      expenses,
      balance: income - expenses,
      topExpenseCategory: topCategory[0],
      topExpenseAmount: topCategory[1],
      dayWithMostSpending: topDay[0],
      dayWithMostSpendingAmount: topDay[1],
    });
  };

  if (!summary) return null;

  const spendingPercentage = summary.income > 0 ? (summary.expenses / summary.income) * 100 : 0;
  const isOnTrack = spendingPercentage < 80;

  return (
    <Card className="shadow-card bg-gradient-to-br from-primary/10 to-accent/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Weekly Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Week Range */}
          <div className="text-sm text-muted-foreground">
            <p>Week of {summary.weekStart.toLocaleDateString()} - {summary.weekEnd.toLocaleDateString()}</p>
          </div>

          {/* Main Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-card/50 border">
              <p className="text-xs text-muted-foreground mb-1">Income</p>
              <p className="text-lg font-semibold text-income">
                KSh {summary.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card/50 border">
              <p className="text-xs text-muted-foreground mb-1">Expenses</p>
              <p className="text-lg font-semibold text-expense">
                KSh {summary.expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card/50 border">
              <p className="text-xs text-muted-foreground mb-1">Balance</p>
              <p className={`text-lg font-semibold ${summary.balance >= 0 ? 'text-income' : 'text-expense'}`}>
                KSh {summary.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Spending Alert */}
          <div className={`p-3 rounded-lg border flex items-start gap-2 ${
            isOnTrack 
              ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
              : 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
          }`}>
            <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
              isOnTrack ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
            }`} />
            <div className={`text-sm ${
              isOnTrack 
                ? 'text-green-900 dark:text-green-100' 
                : 'text-orange-900 dark:text-orange-100'
            }`}>
              <p className="font-medium">
                {isOnTrack 
                  ? `You've spent ${spendingPercentage.toFixed(0)}% of your income`
                  : `You've spent ${spendingPercentage.toFixed(0)}% of your income - approaching limit!`}
              </p>
            </div>
          </div>

          {/* Insights */}
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground">This Week's Insights</p>
            
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <span className="text-sm">Top spending category</span>
              <Badge variant="secondary">
                {summary.topExpenseCategory}: KSh {summary.topExpenseAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <span className="text-sm">Highest spending day</span>
              <Badge variant="secondary">
                {summary.dayWithMostSpending}: KSh {summary.dayWithMostSpendingAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </Badge>
            </div>

            {summary.balance > 0 && (
              <div className="flex items-center gap-2 p-2 bg-income/10 rounded text-income text-sm">
                <TrendingUp className="h-4 w-4" />
                <span>You're saving KSh {summary.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })} this week!</span>
              </div>
            )}

            {summary.balance < 0 && (
              <div className="flex items-center gap-2 p-2 bg-expense/10 rounded text-expense text-sm">
                <TrendingDown className="h-4 w-4" />
                <span>You're overspending by KSh {Math.abs(summary.balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
