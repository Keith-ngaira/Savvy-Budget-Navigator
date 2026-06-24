import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { useToast } from "@/hooks/use-toast";

import { Loader2, Sheet, Plus, Unlink } from "lucide-react";

import { googleSheetsService } from "@/services/googleSheets";

import type { Tables } from "@/integrations/supabase/types";

import { formatError } from "@/lib/errorUtils";



type Transaction = Tables<"transactions">;

type Budget = Tables<"budgets">;

type Goal = Tables<"goals">;



interface GoogleSheetSyncProps {

  transactions: Transaction[];

  budgets: Budget[];

  goals: Goal[];

  userEmail: string;

  onSync?: () => void;

}



export const GoogleSheetSync = ({

  transactions,

  budgets,

  goals,

  userEmail,

  onSync,

}: GoogleSheetSyncProps) => {

  const [isSyncing, setIsSyncing] = useState(false);

  const [spreadsheetId, setSpreadsheetId] = useState("");

  const [accessToken, setAccessToken] = useState("");

  const [isConnected, setIsConnected] = useState(false);

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const { toast } = useToast();



  const handleConnectGoogleSheets = async () => {

    // In a real implementation, this would open Google OAuth flow

    // For now, we'll provide instructions

    toast({

      title: "Google Sheets Connection",

      description:

        "To connect Google Sheets, you need to authenticate via Google OAuth. Click the button to set this up in settings.",

    });

  };



  const handleCreateNewSheet = async () => {

    if (!accessToken) {

      toast({

        title: "Error",

        description: "Please connect to Google Sheets first",

        variant: "destructive",

      });

      return;

    }



    setIsSyncing(true);



    try {

      const newSheetId = await googleSheetsService.createSpreadsheet(

        accessToken,

        "Savvy Budget Navigator - Financial Data"

      );



      setSpreadsheetId(newSheetId);

      toast({

        title: "Success",

        description: `Created new spreadsheet: ${newSheetId}`,

      });



      // Auto-sync to new sheet

      await performSync(newSheetId);

    } catch (error) {

      const message = formatError(error);

      toast({

        title: "Error",

        description: `Failed to create spreadsheet: ${message}`,

        variant: "destructive",

      });

    } finally {

      setIsSyncing(false);

    }

  };



  const performSync = async (sheetId: string = spreadsheetId) => {

    if (!sheetId || !accessToken) {

      toast({

        title: "Error",

        description: "Spreadsheet ID or access token missing",

        variant: "destructive",

      });

      return;

    }



    setIsSyncing(true);



    try {

      // Calculate summary

      const totalIncome = transactions

        .filter((t) => t.type === "income")

        .reduce((sum, t) => sum + Number(t.amount), 0);



      const totalExpenses = transactions

        .filter((t) => t.type === "expense")

        .reduce((sum, t) => sum + Number(t.amount), 0);



      const budgetsArray = Array.isArray(budgets) ? budgets : [];
      const totalBudget = budgetsArray.reduce((sum, b) => sum + b.amount, 0);



      const completedGoals = goals.filter((g) => g.is_completed).length;



      const syncData = {

        transactions,

        budgets,

        goals,

        summary: {

          totalIncome,

          totalExpenses,

          netBalance: totalIncome - totalExpenses,

          totalBudget,

          goalsCount: goals.length,

          completedGoals,

        },

        syncedAt: new Date().toISOString(),

      };



      const result = await googleSheetsService.syncToGoogleSheets(

        { spreadsheetId: sheetId, accessToken },

        syncData,

        userEmail

      );



      if (result.success) {

        setLastSyncTime(new Date().toLocaleString());

        toast({

          title: "Sync Successful",

          description: result.message,

        });

        onSync?.();

      } else {

        toast({

          title: "Sync Failed",

          description: result.message,

          variant: "destructive",

        });

      }

    } catch (error) {

      const message = formatError(error);

      toast({

        title: "Error",

        description: `Sync error: ${message}`,

        variant: "destructive",

      });

    } finally {

      setIsSyncing(false);

    }

  };



  const handleManualSync = () => {

    performSync();

  };



  const handleDisconnect = () => {

    setIsConnected(false);

    setAccessToken("");

    setSpreadsheetId("");

    setLastSyncTime(null);

    toast({

      title: "Disconnected",

      description: "Google Sheets connection removed",

    });

  };



  return (

    <Card className="shadow-card animate-fade-in">

      <CardHeader>

        <CardTitle className="flex items-center gap-2">

          <Sheet className="h-5 w-5" />

          Google Sheets Backup

        </CardTitle>

        <CardDescription>

          Automatically sync your financial data to Google Sheets

        </CardDescription>

      </CardHeader>



      <CardContent className="space-y-4">

        {!isConnected ? (

          <div className="space-y-4">

            <div className="p-4 bg-muted/50 rounded-lg space-y-3">

              <p className="text-sm font-medium">Connect Google Sheets:</p>

              <p className="text-xs text-muted-foreground">

                Your data will be synced to a Google Sheet including:

              </p>

              <ul className="text-xs text-muted-foreground space-y-1 ml-4">

                <li>• All transactions</li>

                <li>• Financial summary (income, expenses, balance)</li>

                <li>• Budgets and tracking</li>

                <li>• Goals and progress</li>

              </ul>

            </div>



            <Button

              onClick={handleConnectGoogleSheets}

              className="w-full"

              variant="outline"

            >

              <Plus className="h-4 w-4 mr-2" />

              Connect Google Sheets

            </Button>

          </div>

        ) : (

          <div className="space-y-4">

            {/* Connected status */}

            <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">

              <p className="text-sm font-medium text-accent">✓ Connected</p>

              {spreadsheetId && (

                <p className="text-xs text-muted-foreground mt-1">

                  Spreadsheet ID: {spreadsheetId.substring(0, 20)}...

                </p>

              )}

              {lastSyncTime && (

                <p className="text-xs text-muted-foreground mt-1">

                  Last synced: {lastSyncTime}

                </p>

              )}

            </div>



            {/* Spreadsheet ID input */}

            <div className="space-y-2">

              <Label htmlFor="sheet-id">Spreadsheet ID</Label>

              <Input

                id="sheet-id"

                placeholder="Paste your Google Sheet ID here"

                value={spreadsheetId}

                onChange={(e) => setSpreadsheetId(e.target.value)}

                disabled={isSyncing}

              />

              <p className="text-xs text-muted-foreground">

                Found in the URL after /spreadsheets/d/

              </p>

            </div>



            {/* Sync buttons */}

            <div className="flex gap-2">

              <Button

                onClick={handleCreateNewSheet}

                disabled={isSyncing || !accessToken}

                className="flex-1"

                variant="outline"

              >

                {isSyncing ? (

                  <Loader2 className="h-4 w-4 animate-spin" />

                ) : (

                  <Plus className="h-4 w-4" />

                )}

                Create New Sheet

              </Button>



              <Button

                onClick={handleManualSync}

                disabled={isSyncing || !spreadsheetId}

                className="flex-1"

              >

                {isSyncing ? (

                  <Loader2 className="h-4 w-4 animate-spin" />

                ) : (

                  "Sync Now"

                )}

              </Button>

            </div>



            {/* Disconnect button */}

            <Button

              onClick={handleDisconnect}

              variant="ghost"

              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"

            >

              <Unlink className="h-4 w-4 mr-2" />

              Disconnect

            </Button>

          </div>

        )}



        {/* Info */}

        <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">

          <p className="text-xs text-blue-900 dark:text-blue-200">

            <strong>Auto-sync:</strong> Your data will automatically sync to Google Sheets when you add or update transactions.

          </p>

        </div>

      </CardContent>

    </Card>

  );

};



export default GoogleSheetSync;
