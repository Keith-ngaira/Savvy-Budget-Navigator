import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Zap, Flame, Target, TrendingUp } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;
type Goal = Tables<"goals">;

interface Achievement {
  id: string;
  icon: React.ReactNode;
  name: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  condition: string;
}

interface AchievementBadgesProps {
  transactions: Transaction[];
  goals: Goal[];
}

export const AchievementBadges = ({ transactions, goals }: AchievementBadgesProps) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    generateAchievements();
  }, [transactions, goals]);

  const generateAchievements = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const txArray = Array.isArray(transactions) ? transactions : [];
    const monthTransactions = txArray.filter(t => {
      const txnDate = new Date(t.date);
      return txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear;
    });

    const achievements: Achievement[] = [];

    // 1. First Transaction
    achievements.push({
      id: "first-transaction",
      icon: <Star className="h-6 w-6" />,
      name: "First Step",
      description: "Record your first transaction",
      unlocked: transactions.length > 0,
      condition: "Record 1 transaction",
    });

    // 2. Budget Tracker (5 transactions)
    achievements.push({
      id: "budget-tracker",
      icon: <Target className="h-6 w-6" />,
      name: "Budget Tracker",
      description: "Record 5 transactions",
      unlocked: transactions.length >= 5,
      progress: Math.min((transactions.length / 5) * 100, 100),
      condition: `${transactions.length} / 5 transactions`,
    });

    // 3. Consistent Logger (10 transactions this month)
    achievements.push({
      id: "consistent-logger",
      icon: <Flame className="h-6 w-6" />,
      name: "Consistent Logger",
      description: "Log 10 transactions this month",
      unlocked: monthTransactions.length >= 10,
      progress: Math.min((monthTransactions.length / 10) * 100, 100),
      condition: `${monthTransactions.length} / 10 this month`,
    });

    // 4. Goal Setter
    achievements.push({
      id: "goal-setter",
      icon: <Trophy className="h-6 w-6" />,
      name: "Goal Setter",
      description: "Create your first savings goal",
      unlocked: goals.length > 0,
      condition: "Create 1 goal",
    });

    // 5. Goal Achiever (Complete a goal)
    const completedGoals = goals.filter(g => g.is_completed).length;
    achievements.push({
      id: "goal-achiever",
      icon: <Trophy className="h-6 w-6" />,
      name: "Goal Achiever",
      description: "Complete a savings goal",
      unlocked: completedGoals > 0,
      progress: completedGoals > 0 ? 100 : 0,
      condition: `${completedGoals} goal(s) completed`,
    });

    // 6. Saver (Save more than you spend)
    const income = monthTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = monthTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const savingsRate = income > 0 ? (income - expenses) / income : 0;

    achievements.push({
      id: "saver",
      icon: <TrendingUp className="h-6 w-6" />,
      name: "Saver",
      description: "Save more than 20% of income",
      unlocked: savingsRate >= 0.2,
      progress: Math.min(savingsRate * 100, 100),
      condition: `${(savingsRate * 100).toFixed(0)}% savings rate`,
    });

    // 7. Super Saver (Save more than 50%)
    achievements.push({
      id: "super-saver",
      icon: <Zap className="h-6 w-6" />,
      name: "Super Saver",
      description: "Save more than 50% of income",
      unlocked: savingsRate >= 0.5,
      progress: Math.min(savingsRate * 100, 100),
      condition: `${(savingsRate * 100).toFixed(0)}% savings rate`,
    });

    // 8. Category Master (Log expenses in 5+ categories)
    const categoriesUsed = new Set(monthTransactions.map(t => t.category)).size;
    achievements.push({
      id: "category-master",
      icon: <Flame className="h-6 w-6" />,
      name: "Category Master",
      description: "Log expenses in 5+ categories",
      unlocked: categoriesUsed >= 5,
      progress: Math.min((categoriesUsed / 5) * 100, 100),
      condition: `${categoriesUsed} / 5 categories`,
    });

    setAchievements(achievements);
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Achievements
          </div>
          <Badge variant="secondary">
            {unlockedCount} / {totalCount}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Overview */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {unlockedCount} / {totalCount} unlocked
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all"
                style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>

          {/* Achievements Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border transition-all ${
                  achievement.unlocked
                    ? "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
                    : "bg-muted/50 border-muted opacity-50"
                }`}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div
                    className={`${
                      achievement.unlocked ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"
                    }`}
                  >
                    {achievement.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{achievement.name}</p>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  </div>
                </div>

                {achievement.progress !== undefined && (
                  <div className="space-y-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 transition-all"
                        style={{ width: `${achievement.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {achievement.condition}
                    </p>
                  </div>
                )}

                {achievement.progress === undefined && (
                  <p className="text-xs text-muted-foreground">
                    {achievement.condition}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
