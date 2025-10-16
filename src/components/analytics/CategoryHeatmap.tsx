import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  color: string;
  intensity: number;
}

interface CategoryHeatmapProps {
  transactions: Transaction[];
}

export const CategoryHeatmap = ({ transactions }: CategoryHeatmapProps) => {
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);

  useEffect(() => {
    generateHeatmap();
  }, [transactions]);

  const generateHeatmap = () => {
    const categoryMap = new Map<string, number>();
    const colors: { [key: string]: string } = {
      "Food & Dining": "#FF6B6B",
      "Transportation": "#4ECDC4",
      "Shopping": "#FFE66D",
      "Entertainment": "#95E1D3",
      "Bills & Utilities": "#C7CEEA",
      "Healthcare": "#F8B195",
      "Education": "#A8E6CF",
      "Travel": "#FFD3B6",
      "Other": "#B5EAD7",
    };

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    transactions
      .filter(t => {
        const txnDate = new Date(t.date);
        return (
          t.type === "expense" &&
          txnDate.getMonth() === currentMonth &&
          txnDate.getFullYear() === currentYear
        );
      })
      .forEach(txn => {
        const current = categoryMap.get(txn.category) || 0;
        categoryMap.set(txn.category, current + Number(txn.amount));
      });

    const total = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);
    const maxAmount = Math.max(...Array.from(categoryMap.values()), 1);

    const data: CategoryData[] = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        color: colors[category] || "#D4A5A5",
        intensity: amount / maxAmount,
      }))
      .sort((a, b) => b.amount - a.amount);

    setCategoryData(data);
  };

  const total = categoryData.reduce((sum, d) => d.amount, 0);

  const getIntensityOpacity = (intensity: number): string => {
    if (intensity >= 0.8) return "opacity-100";
    if (intensity >= 0.6) return "opacity-75";
    if (intensity >= 0.4) return "opacity-50";
    return "opacity-30";
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Spending by Category Heatmap</CardTitle>
        <CardDescription>
          Visual representation of where your money goes this month
        </CardDescription>
      </CardHeader>
      <CardContent>
        {categoryData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No expense data available for this month
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categoryData.map((cat, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer ${getIntensityOpacity(cat.intensity)}`}
                  style={{
                    backgroundColor: `${cat.color}20`,
                    borderColor: cat.color,
                  }}
                >
                  <p className="text-xs font-medium text-muted-foreground truncate mb-1">
                    {cat.category}
                  </p>
                  <p className="text-sm font-semibold">
                    KSh {cat.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cat.percentage.toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">This Month Total</span>
                <span className="text-lg font-semibold text-expense">
                  KSh {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Category Distribution</p>
                {categoryData.map((cat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                    <span className="text-xs text-muted-foreground ml-auto">
                      {cat.percentage.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-3">Top Spending</p>
              <div className="space-y-2">
                {categoryData.slice(0, 3).map((cat, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm">{idx + 1}. {cat.category}</span>
                    <Badge variant="secondary">KSh {cat.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
