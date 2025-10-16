import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

type Goal = Tables<"goals">;

interface GoalVisualProgressProps {
  goals: Goal[];
}

export const GoalVisualProgress = ({ goals }: GoalVisualProgressProps) => {
  const [activeGoalIndex, setActiveGoalIndex] = useState(0);
  const activeGoal = goals[activeGoalIndex];

  if (!activeGoal) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Goal Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No goals to display
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = (Number(activeGoal.current_amount) / Number(activeGoal.target_amount)) * 100;
  const remaining = Number(activeGoal.target_amount) - Number(activeGoal.current_amount);
  const daysLeft = activeGoal.target_date
    ? Math.ceil((new Date(activeGoal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Generate milestone data
  const milestones = [
    { label: "0%", amount: 0 },
    { label: "25%", amount: Number(activeGoal.target_amount) * 0.25 },
    { label: "50%", amount: Number(activeGoal.target_amount) * 0.5 },
    { label: "75%", amount: Number(activeGoal.target_amount) * 0.75 },
    { label: "100%", amount: Number(activeGoal.target_amount) },
  ];

  // Jar visualization data
  const jarSegments = 10;
  const fillPercentage = Math.min(progress, 100);
  const filledSegments = Math.ceil((fillPercentage / 100) * jarSegments);

  const getMotivationalMessage = () => {
    if (activeGoal.is_completed) return "🎉 Goal Complete!";
    if (progress >= 75) return "🚀 You're almost there!";
    if (progress >= 50) return "💪 Halfway done!";
    if (progress >= 25) return "✨ Great start!";
    return "🎯 Let's begin!";
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Goal Progress Tracker</span>
          {goals.length > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => setActiveGoalIndex(Math.max(0, activeGoalIndex - 1))}
                className="px-2 py-1 text-sm rounded border hover:bg-muted"
                disabled={activeGoalIndex === 0}
              >
                ←
              </button>
              <span className="text-xs px-2 py-1 bg-muted rounded">
                {activeGoalIndex + 1} / {goals.length}
              </span>
              <button
                onClick={() => setActiveGoalIndex(Math.min(goals.length - 1, activeGoalIndex + 1))}
                className="px-2 py-1 text-sm rounded border hover:bg-muted"
                disabled={activeGoalIndex === goals.length - 1}
              >
                →
              </button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Goal Header */}
          <div>
            <h3 className="text-xl font-bold mb-1">{activeGoal.name}</h3>
            {activeGoal.description && (
              <p className="text-sm text-muted-foreground">{activeGoal.description}</p>
            )}
            <p className="text-lg font-semibold text-primary mt-2">{getMotivationalMessage()}</p>
          </div>

          {/* Jar Visualization */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Jar Container */}
              <div className="w-32 h-48 border-4 border-primary rounded-b-2xl rounded-t-lg overflow-hidden bg-muted/30 flex flex-col-reverse">
                {/* Fill */}
                <div
                  className="w-full bg-gradient-to-t from-primary/80 to-primary/40 transition-all duration-500"
                  style={{ height: `${fillPercentage}%` }}
                />
              </div>
              {/* Jar Cap */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-16 h-4 bg-primary rounded-full" />
              {/* Percentage Label */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{progress.toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Amount Display */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted text-center">
              <p className="text-xs text-muted-foreground mb-1">Current</p>
              <p className="font-semibold text-sm">
                KSh {Number(activeGoal.current_amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted text-center">
              <p className="text-xs text-muted-foreground mb-1">Target</p>
              <p className="font-semibold text-sm">
                KSh {Number(activeGoal.target_amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 text-center border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Remaining</p>
              <p className="font-semibold text-sm text-primary">
                KSh {remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Timeline */}
          {daysLeft !== null && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Target Date</span>
                <Badge
                  variant={
                    daysLeft < 0
                      ? "destructive"
                      : daysLeft <= 7
                      ? "secondary"
                      : "default"
                  }
                >
                  {daysLeft < 0
                    ? `${Math.abs(daysLeft)} days overdue`
                    : daysLeft === 0
                    ? "Today!"
                    : daysLeft === 1
                    ? "Tomorrow"
                    : `${daysLeft} days left`}
                </Badge>
              </div>
              {daysLeft > 0 && remaining > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Need to save KSh {(remaining / Math.max(daysLeft, 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })} per day
                </div>
              )}
            </div>
          )}

          {/* Milestones */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Milestones</p>
            <div className="space-y-1.5">
              {milestones.map((milestone, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-12 text-xs font-medium text-muted-foreground">{milestone.label}</div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        Number(activeGoal.current_amount) >= milestone.amount
                          ? "bg-primary"
                          : "bg-muted"
                      }`}
                      style={{
                        width:
                          (milestone.amount / Number(activeGoal.target_amount)) * 100 + "%",
                      }}
                    />
                  </div>
                  <div className="w-24 text-right text-xs text-muted-foreground">
                    KSh {milestone.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Goal Status */}
          <div className="p-3 rounded-lg bg-muted/50 border text-center">
            {activeGoal.is_completed ? (
              <p className="text-sm font-medium text-income">✅ Goal Completed!</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {remaining > 0
                  ? `Save KSh ${remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })} more to reach your goal`
                  : "Goal completed!"}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
