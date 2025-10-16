import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Repeat2, AlertCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type RecurringTransaction = Tables<"recurring_transactions">;

export const RecurringTransactions = () => {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecurringTransactions();
  }, []);

  const fetchRecurringTransactions = async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("recurring_transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("next_due_date", { ascending: true });

      if (error) throw error;
      setRecurring(data || []);
    } catch (err) {
      console.error("Error fetching recurring transactions:", err);
      toast({
        title: "Error",
        description: "Failed to fetch recurring transactions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("recurring_transactions")
        .update({ is_active: !isActive })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      fetchRecurringTransactions();
      toast({
        title: "Success",
        description: `Recurring transaction ${!isActive ? "activated" : "deactivated"}`,
      });
    } catch (err) {
      console.error("Error updating recurring transaction:", err);
      toast({
        title: "Error",
        description: "Failed to update recurring transaction",
        variant: "destructive",
      });
    }
  };

  const deleteRecurring = async (id: string) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("recurring_transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      fetchRecurringTransactions();
      toast({
        title: "Success",
        description: "Recurring transaction deleted",
      });
    } catch (err) {
      console.error("Error deleting recurring transaction:", err);
      toast({
        title: "Error",
        description: "Failed to delete recurring transaction",
        variant: "destructive",
      });
    }
  };

  const getNextDueDate = (nextDueDate: string) => {
    const date = new Date(nextDueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue === 0) return "Today";
    if (daysUntilDue === 1) return "Tomorrow";
    if (daysUntilDue < 0) return "Overdue";
    return `In ${daysUntilDue} days`;
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat2 className="h-5 w-5" />
            Recurring Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse text-muted-foreground text-center py-8">
            Loading recurring transactions...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat2 className="h-5 w-5" />
            Recurring Transactions
          </div>
          <Badge variant="secondary">{recurring.length}</Badge>
        </CardTitle>
        <CardDescription>
          Automatically tracked recurring payments and income
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recurring.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recurring transactions set up yet
          </div>
        ) : (
          <div className="space-y-3">
            {recurring.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-medium">{txn.description}</h4>
                    <Badge variant="outline" className="capitalize">
                      {txn.frequency}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{txn.category}</span>
                    <span className="flex items-center gap-1">
                      {getNextDueDate(txn.next_due_date)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`font-semibold text-lg ${
                      txn.type === "income" ? "text-income" : "text-expense"
                    }`}>
                      {txn.type === "income" ? "+" : "-"}KSh {Number(txn.amount).toLocaleString()}
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRecurring(txn.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
