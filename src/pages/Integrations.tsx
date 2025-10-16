import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { IntegrationsSettings } from "@/components/integrations/IntegrationsSettings";
import { GoogleSheetSync } from "@/components/integrations/GoogleSheetSync";
import { GoogleCalendarReminders } from "@/components/integrations/GoogleCalendarReminders";
import type { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;
type Budget = Tables<"budgets">;
type Goal = Tables<"goals">;
type RecurringTransaction = Tables<"recurring_transactions">;

interface IntegrationsPageProps {
  onBackClick?: () => void;
}

export const Integrations = ({ onBackClick }: IntegrationsPageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        return;
      }

      setUser(user);

      // Fetch all data
      const [txnData, budgetData, goalData, recurringData] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false }),
        supabase
          .from("budgets")
          .select("*")
          .eq("user_id", user.id),
        supabase
          .from("goals")
          .select("*")
          .eq("user_id", user.id),
        supabase
          .from("recurring_transactions")
          .select("*")
          .eq("user_id", user.id),
      ]);

      if (txnData.data) setTransactions(txnData.data);
      if (budgetData.data) setBudgets(budgetData.data);
      if (goalData.data) setGoals(goalData.data);
      if (recurringData.data) setRecurringTransactions(recurringData.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load integration data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {onBackClick && (
          <Button variant="ghost" size="sm" onClick={onBackClick}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">Connect external services for backup and reminders</p>
        </div>
      </div>

      {/* Main Settings */}
      <IntegrationsSettings
        transactions={transactions}
        budgets={budgets}
        goals={goals}
        recurringTransactions={recurringTransactions}
      />

      {/* Google Sheets Sync */}
      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">Google Sheets Backup</h2>
          <p className="text-muted-foreground">Auto-sync your financial data to Google Sheets</p>
        </div>
        <GoogleSheetSync
          transactions={transactions}
          budgets={budgets}
          goals={goals}
          userEmail={user?.email || ""}
          onSync={fetchData}
        />
      </div>

      {/* Google Calendar Reminders */}
      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">Google Calendar Reminders</h2>
          <p className="text-muted-foreground">Get calendar events for bills and goals</p>
        </div>
        <GoogleCalendarReminders
          recurringTransactions={recurringTransactions}
          goals={goals}
          onSync={fetchData}
        />
      </div>

      {/* Features Summary */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Phase 2 Features</CardTitle>
          <CardDescription>What's included in Phase 2</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Google Sheets Sync ✓</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ All transactions synced</li>
                <li>✓ Financial summary included</li>
                <li>✓ Budgets and goals tracked</li>
                <li>✓ Auto-sync on changes</li>
                <li>✓ Spreadsheet creation</li>
                <li>✓ Manual sync button</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Google Calendar Reminders ✓</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ Recurring bills as events</li>
                <li>✓ Goal deadlines as events</li>
                <li>✓ Email & popup reminders</li>
                <li>✓ Custom reminder timing</li>
                <li>✓ Multiple calendar support</li>
                <li>✓ Auto-sync on changes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Integrations;
