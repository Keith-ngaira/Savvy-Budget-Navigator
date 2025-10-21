import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthPage } from "@/components/auth/AuthPage";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { BudgetManager } from "@/components/budget/BudgetManager";
import { FinancialCharts } from "@/components/analytics/FinancialCharts";
import { NetWorthManager } from "@/components/networth/NetWorthManager";
import { DebtManager } from "@/components/debts/DebtManager";
import { InvestmentManager } from "@/components/investments/InvestmentManager";
import { EndOfMonthReport } from "@/components/analytics/EndOfMonthReport";
import { EncryptedBackups } from "@/components/analytics/EncryptedBackups";
import { ExportData } from "@/components/analytics/ExportData";
import { GoalsManager } from "@/components/goals/GoalsManager";
import { GoalForecasts } from "@/components/goals/GoalForecasts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Target, Download, Home, Wallet, FileText, AlertCircle } from "lucide-react";
import type { User, Session } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";
import { IncomeManager } from "@/components/income/IncomeManager";
import { BillsManager } from "@/components/bills/BillsManager";
import { ReceiptsManager } from "@/components/receipts/ReceiptsManager";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Tables<"transactions">[]>([]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        // Persist Google provider token for integrations (Sheets/Calendar)
        const providerToken = (session as any)?.provider_token as string | undefined;
        if (providerToken) {
          localStorage.setItem('google_access_token', providerToken);
          localStorage.setItem('google_sheets_token', providerToken);
          localStorage.setItem('google_calendar_token', providerToken);
        }
        if (!session) {
          localStorage.removeItem('google_access_token');
          localStorage.removeItem('google_sheets_token');
          localStorage.removeItem('google_calendar_token');
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      const providerToken = (session as any)?.provider_token as string | undefined;
      if (providerToken) {
        localStorage.setItem('google_access_token', providerToken);
        localStorage.setItem('google_sheets_token', providerToken);
        localStorage.setItem('google_calendar_token', providerToken);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="text-center">
          <div className="animate-pulse">
            <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-4">
              Budget Navigator
            </h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return user ? (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <Tabs defaultValue="dashboard" className="w-full">
        <div className="container mx-auto px-4 py-6 pt-0 pb-[calc(env(safe-area-inset-bottom)+64px)]">
          <TabsContent value="dashboard">
            <Dashboard 
              transactions={transactions}
              onTransactionsChange={setTransactions}
            />
          </TabsContent>
          <TabsContent value="budget">
            <BudgetManager transactions={transactions} />
          </TabsContent>
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FinancialCharts transactions={transactions} />
              <NetWorthManager />
            </div>
            <div className="mt-6">
              <DebtManager />
            </div>
            <div className="mt-6">
              <InvestmentManager />
            </div>
            <div className="mt-6">
              <EndOfMonthReport />
            </div>
            <div className="mt-6">
              <EncryptedBackups />
            </div>
          </TabsContent>
          <TabsContent value="income">
            <IncomeManager />
          </TabsContent>
          <TabsContent value="goals">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GoalForecasts />
              <GoalsManager />
            </div>
          </TabsContent>
          <TabsContent value="export">
            <ExportData transactions={transactions} />
          </TabsContent>
          <TabsContent value="bills">
            <BillsManager />
          </TabsContent>
          <TabsContent value="receipts">
            <ReceiptsManager />
          </TabsContent>
        </div>
        {/* Fixed Bottom Navigation - placed at the end to guarantee bottom placement */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/50 backdrop-blur-sm border-t pb-[env(safe-area-inset-bottom)] overflow-x-auto">
          <div className="container mx-auto px-4 min-w-full">
            <TabsList className="grid w-full grid-cols-8 h-12 gap-0">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="budget" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Budget</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="income" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">Income</span>
              </TabsTrigger>
              <TabsTrigger value="bills" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Bills</span>
              </TabsTrigger>
              <TabsTrigger value="goals" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Goals</span>
              </TabsTrigger>
              <TabsTrigger value="receipts" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Receipts</span>
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
      </Tabs>
    </div>
  ) : <AuthPage />;
};

export default Index;
