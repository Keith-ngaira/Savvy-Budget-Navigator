import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { formatKSh } from "@/lib/currency";
import type { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;

interface DailySummaryProps {
  transactions: Transaction[];
}

export const DailySummary = ({ transactions }: DailySummaryProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayTransactions = transactions.filter(t => {
    const txDate = new Date(t.date);
    txDate.setHours(0, 0, 0, 0);
    return txDate.getTime() === today.getTime();
  });

  const todayIncome = todayTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const todayExpenses = todayTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const todayNet = todayIncome - todayExpenses;

  // Get top expense category today
  const expensesByCategory = todayTransactions
    .filter(t => t.type === "expense")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const topCategory = Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a)[0];

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Today's Summary
        </CardTitle>
        <CardDescription>
          {today.toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' })}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Income */}
          <div className="p-3 rounded-lg bg-income/10 border border-income/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-income">Income</span>
              <TrendingUp className="h-4 w-4 text-income" />
            </div>
            <p className="text-2xl font-bold text-income">{formatKSh(todayIncome, true)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {todayTransactions.filter(t => t.type === "income").length} transaction
              {todayTransactions.filter(t => t.type === "income").length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Expenses */}
          <div className="p-3 rounded-lg bg-expense/10 border border-expense/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-expense">Expenses</span>
              <TrendingDown className="h-4 w-4 text-expense" />
            </div>
            <p className="text-2xl font-bold text-expense">{formatKSh(todayExpenses, true)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {todayTransactions.filter(t => t.type === "expense").length} transaction
              {todayTransactions.filter(t => t.type === "expense").length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Net balance */}
        <div className="p-3 rounded-lg bg-muted/50 border mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Net Today</span>
            {todayNet >= 0 ? (
              <Badge variant="default" className="bg-income">Positive</Badge>
            ) : (
              <Badge variant="default" className="bg-expense">Negative</Badge>
            )}
          </div>
          <p className={`text-2xl font-bold ${todayNet >= 0 ? 'text-income' : 'text-expense'}`}>
            {todayNet >= 0 ? '+' : ''}{formatKSh(todayNet, true)}
          </p>
        </div>

        {/* Top category */}
        {topCategory && (
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-sm font-medium text-muted-foreground mb-1">Top Expense Category</p>
            <div className="flex items-center justify-between">
              <span className="font-medium">{topCategory[0]}</span>
              <span className="text-lg font-bold text-accent">{formatKSh(topCategory[1], true)}</span>
            </div>
          </div>
        )}

        {/* No transactions today */}
        {todayTransactions.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">No transactions recorded yet today</p>
          </div>
        )}

        {/* Recent transactions today */}
        {todayTransactions.length > 0 && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Transactions</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {todayTransactions
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map(txn => (
                  <div key={txn.id} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{txn.description}</p>
                      <p className="text-xs text-muted-foreground">{txn.category}</p>
                    </div>
                    <p className={`font-medium text-right ml-2 ${
                      txn.type === "income" ? "text-income" : "text-expense"
                    }`}>
                      {txn.type === "income" ? "+" : "-"}{formatKSh(txn.amount)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailySummary;
