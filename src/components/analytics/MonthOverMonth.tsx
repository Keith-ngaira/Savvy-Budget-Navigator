import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;
type Income = Tables<"income_sources">;

interface MonthOverMonthProps {
  transactions: Transaction[];
  incomes: Income[];
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function inRange(date: string, from: Date, to: Date) {
  const t = new Date(date).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

function sum(arr: number[]) { return arr.reduce((a, b) => a + b, 0); }

function pctChange(curr: number, prev: number) {
  if (prev === 0) return curr === 0 ? 0 : 100; // Avoid div by zero
  return ((curr - prev) / prev) * 100;
}

export const MonthOverMonth = ({ transactions, incomes }: MonthOverMonthProps) => {
  const now = new Date();
  const currFrom = startOfMonth(now);
  const currTo = endOfMonth(now);
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevFrom = startOfMonth(prevMonth);
  const prevTo = endOfMonth(prevMonth);

  const txIncomeCurr = sum(
    transactions
      .filter(t => t.type === "income" && inRange(t.date, currFrom, currTo))
      .map(t => Number(t.amount))
  );
  const txIncomePrev = sum(
    transactions
      .filter(t => t.type === "income" && inRange(t.date, prevFrom, prevTo))
      .map(t => Number(t.amount))
  );

  const incomeSrcCurr = sum(incomes.filter(i => inRange(i.date, currFrom, currTo)).map(i => Number(i.amount)));
  const incomeSrcPrev = sum(incomes.filter(i => inRange(i.date, prevFrom, prevTo)).map(i => Number(i.amount)));

  const incomeCurr = txIncomeCurr + incomeSrcCurr;
  const incomePrev = txIncomePrev + incomeSrcPrev;

  const expenseCurr = sum(
    transactions
      .filter(t => t.type === "expense" && inRange(t.date, currFrom, currTo))
      .map(t => Number(t.amount))
  );
  const expensePrev = sum(
    transactions
      .filter(t => t.type === "expense" && inRange(t.date, prevFrom, prevTo))
      .map(t => Number(t.amount))
  );

  const balanceCurr = incomeCurr - expenseCurr;
  const balancePrev = incomePrev - expensePrev;

  const metrics = [
    {
      title: "Income",
      curr: incomeCurr,
      prev: incomePrev,
      change: pctChange(incomeCurr, incomePrev),
      positiveIsGood: true,
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      title: "Expenses",
      curr: expenseCurr,
      prev: expensePrev,
      change: pctChange(expenseCurr, expensePrev),
      positiveIsGood: false,
      icon: <TrendingDown className="h-4 w-4" />
    },
    {
      title: "Balance",
      curr: balanceCurr,
      prev: balancePrev,
      change: pctChange(balanceCurr, balancePrev),
      positiveIsGood: true,
      icon: <TrendingUp className="h-4 w-4" />
    }
  ];

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg">This Month vs Last Month</CardTitle>
        <CardDescription>Compare income, expenses, and balance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.map((m) => {
            const isUp = m.change >= 0;
            const good = m.positiveIsGood ? isUp : !isUp;
            return (
              <div key={m.title} className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-muted-foreground">{m.title}</div>
                  {m.icon}
                </div>
                <div className="text-2xl font-semibold">KSh {m.curr.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Last month: KSh {m.prev.toLocaleString()}</div>
                <div className={`mt-2 inline-flex items-center gap-1 text-sm ${good ? 'text-income' : 'text-expense'}`}>
                  {isUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {m.change.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
