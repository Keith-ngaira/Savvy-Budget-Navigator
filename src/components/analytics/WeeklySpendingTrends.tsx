import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;

interface TrendData {
  period: string;
  income: number;
  expenses: number;
  balance: number;
}

interface WeeklySpendingTrendsProps {
  transactions: Transaction[];
  view?: "weekly" | "monthly";
}

export const WeeklySpendingTrends = ({ transactions, view = "weekly" }: WeeklySpendingTrendsProps) => {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [selectedView, setSelectedView] = useState<"weekly" | "monthly">(view);

  useEffect(() => {
    generateTrendData();
  }, [transactions, selectedView]);

  const generateTrendData = () => {
    const now = new Date();
    const data: TrendData[] = [];
    const txArray = Array.isArray(transactions) ? transactions : [];

    if (selectedView === "weekly") {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const dayTransactions = txArray.filter(t => {
          const txnDate = new Date(t.date);
          return txnDate >= dayStart && txnDate <= dayEnd;
        });

        const income = dayTransactions
          .filter(t => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const expenses = dayTransactions
          .filter(t => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        data.push({
          period: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          income,
          expenses,
          balance: income - expenses,
        });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);

        const monthTransactions = txArray.filter(t => {
          const txnDate = new Date(t.date);
          return txnDate >= date && txnDate < nextMonth;
        });

        const income = monthTransactions
          .filter(t => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const expenses = monthTransactions
          .filter(t => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        data.push({
          period: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          income,
          expenses,
          balance: income - expenses,
        });
      }
    }

    setTrendData(data);
  };

  const avgIncome = trendData.reduce((sum, d) => sum + d.income, 0) / trendData.length || 0;
  const avgExpenses = trendData.reduce((sum, d) => sum + d.expenses, 0) / trendData.length || 0;
  const totalBalance = trendData.reduce((sum, d) => sum + d.balance, 0);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Spending Trends</span>
          <div className="flex gap-2">
            <Badge
              variant={selectedView === "weekly" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedView("weekly")}
            >
              Weekly
            </Badge>
            <Badge
              variant={selectedView === "monthly" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedView("monthly")}
            >
              Monthly
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Income vs Expenses {selectedView === "weekly" ? "over the last week" : "over the last year"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Avg Income</p>
              <p className="text-lg font-semibold text-income">KSh {avgIncome.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Avg Expenses</p>
              <p className="text-lg font-semibold text-expense">KSh {avgExpenses.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Net Balance</p>
              <p className={`text-lg font-semibold ${totalBalance >= 0 ? 'text-income' : 'text-expense'}`}>
                KSh {totalBalance.toLocaleString(undefined, {maximumFractionDigits: 0})}
              </p>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => `KSh ${value.toLocaleString()}`}
                />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="hsl(var(--income))" strokeWidth={2} />
                <Line type="monotone" dataKey="expenses" stroke="hsl(var(--expense))" strokeWidth={2} />
                <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
