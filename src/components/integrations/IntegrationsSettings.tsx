import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Settings, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;
type Budget = Tables<"budgets">;
type Goal = Tables<"goals">;
type RecurringTransaction = Tables<"recurring_transactions">;

interface IntegrationsSettingsProps {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  recurringTransactions: RecurringTransaction[];
}

export const IntegrationsSettings = ({
  transactions,
  budgets,
  goals,
  recurringTransactions,
}: IntegrationsSettingsProps) => {
  const [user, setUser] = useState<any>(null);
  const [googleSheetsConnected, setGoogleSheetsConnected] = useState(false);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsLoadingUser(false);

      // Check for existing connections (would be stored in user metadata or separate table)
      // For now, just checking if we have tokens in localStorage
      const sheetsToken = localStorage.getItem("google_sheets_token");
      const calendarToken = localStorage.getItem("google_calendar_token");

      setGoogleSheetsConnected(!!sheetsToken);
      setGoogleCalendarConnected(!!calendarToken);
    };

    getUser();
  }, []);

  const handleGoogleSheetsAuth = async () => {
    // This would open Google OAuth flow in a real implementation
    // For MVP, we'll show instructions
    const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" +
      "client_id=" + (import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID") +
      "&redirect_uri=" + encodeURIComponent(window.location.origin + "/auth/google-callback") +
      "&response_type=code" +
      "&scope=" + encodeURIComponent("https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive");

    // Open in new window or show instructions
    toast({
      title: "Google Sheets OAuth",
      description: "Set up OAuth in Google Cloud Console to enable this feature. Documentation: https://developers.google.com/sheets/api",
    });
  };

  const handleGoogleCalendarAuth = async () => {
    // Similar OAuth flow for Calendar
    const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" +
      "client_id=" + (import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID") +
      "&redirect_uri=" + encodeURIComponent(window.location.origin + "/auth/google-callback") +
      "&response_type=code" +
      "&scope=" + encodeURIComponent("https://www.googleapis.com/auth/calendar");

    toast({
      title: "Google Calendar OAuth",
      description: "Set up OAuth in Google Cloud Console to enable this feature. Documentation: https://developers.google.com/calendar/api",
    });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Integrations & Sync
          </CardTitle>
          <CardDescription>
            Connect your external services for automated backup and reminders
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Google Sheets */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded flex items-center justify-center text-white font-bold">
                📊
              </div>
              <div>
                <CardTitle className="text-lg">Google Sheets</CardTitle>
                <CardDescription>Backup and sync all financial data</CardDescription>
              </div>
            </div>
            <Badge variant={googleSheetsConnected ? "default" : "secondary"}>
              {googleSheetsConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Transactions</p>
              <p className="text-lg font-semibold">{transactions.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Summary Stats</p>
              <p className="text-lg font-semibold">Auto-Sync</p>
            </div>
            <div>
              <p className="text-muted-foreground">Budgets</p>
              <p className="text-lg font-semibold">{budgets.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Goals</p>
              <p className="text-lg font-semibold">{goals.length}</p>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium mb-2">What gets synced:</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>✓ All transactions (income & expenses)</li>
              <li>✓ Financial summary (totals & balance)</li>
              <li>✓ Budget tracking by category</li>
              <li>✓ Goals and progress</li>
              <li>✓ Auto-sync on every change</li>
            </ul>
          </div>

          <Button
            onClick={handleGoogleSheetsAuth}
            variant={googleSheetsConnected ? "outline" : "default"}
            className="w-full"
          >
            {googleSheetsConnected ? (
              <>
                <LinkIcon className="h-4 w-4 mr-2" />
                Reconnect Google Sheets
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Google Sheets
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Google Calendar */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded flex items-center justify-center text-white font-bold">
                📅
              </div>
              <div>
                <CardTitle className="text-lg">Google Calendar</CardTitle>
                <CardDescription>Get reminders for bills and goals</CardDescription>
              </div>
            </div>
            <Badge variant={googleCalendarConnected ? "default" : "secondary"}>
              {googleCalendarConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Recurring Items</p>
              <p className="text-lg font-semibold">
                {recurringTransactions.filter((t) => t.is_active).length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Goal Deadlines</p>
              <p className="text-lg font-semibold">
                {goals.filter((g) => !g.is_completed && g.target_date).length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Reminders</p>
              <p className="text-lg font-semibold">Email + Popup</p>
            </div>
            <div>
              <p className="text-muted-foreground">Auto-Sync</p>
              <p className="text-lg font-semibold">Enabled</p>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium mb-2">What gets synced:</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>✓ Active recurring bills/income as repeating events</li>
              <li>✓ Goal target dates as calendar events</li>
              <li>✓ Email & popup reminders</li>
              <li>✓ Customizable reminder timing (1-14 days)</li>
              <li>✓ Auto-sync on every change</li>
            </ul>
          </div>

          <Button
            onClick={handleGoogleCalendarAuth}
            variant={googleCalendarConnected ? "outline" : "default"}
            className="w-full"
          >
            {googleCalendarConnected ? (
              <>
                <LinkIcon className="h-4 w-4 mr-2" />
                Reconnect Google Calendar
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Google Calendar
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card className="shadow-card bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base">Setup Instructions</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium mb-2">1. Enable Google APIs</p>
            <p className="text-muted-foreground mb-2">
              Create a Google Cloud project and enable:
            </p>
            <ul className="text-xs space-y-1 ml-4 text-muted-foreground">
              <li>• Google Sheets API</li>
              <li>• Google Calendar API</li>
              <li>• Google Drive API</li>
            </ul>
          </div>

          <div>
            <p className="font-medium mb-2">2. Create OAuth Credentials</p>
            <p className="text-muted-foreground text-xs">
              Set up OAuth 2.0 credentials (Web application) with redirect URIs pointing to your app.
            </p>
          </div>

          <div>
            <p className="font-medium mb-2">3. Configure Environment Variables</p>
            <p className="text-muted-foreground text-xs font-mono bg-muted p-2 rounded mb-2">
              VITE_GOOGLE_CLIENT_ID=your_client_id<br/>
              VITE_GOOGLE_CLIENT_SECRET=your_client_secret
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a
                href="https://developers.google.com/sheets/api"
                target="_blank"
                rel="noopener noreferrer"
              >
                Sheets API Docs →
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a
                href="https://developers.google.com/calendar/api"
                target="_blank"
                rel="noopener noreferrer"
              >
                Calendar API Docs →
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationsSettings;
