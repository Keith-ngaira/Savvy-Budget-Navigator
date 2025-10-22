import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, Plus, Unlink, Sliders } from "lucide-react";
import { googleCalendarService } from "@/services/googleCalendar";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatError } from "@/lib/errorUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RecurringTransaction = Tables<"recurring_transactions">;
type Goal = Tables<"goals">;

interface GoogleCalendarRemindersProps {
  recurringTransactions: RecurringTransaction[];
  goals: Goal[];
  onSync?: () => void;
}

export const GoogleCalendarReminders = ({
  recurringTransactions,
  goals,
  onSync,
}: GoogleCalendarRemindersProps) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState("1");
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("google_calendar_token");
    if (token) {
      setAccessToken(token);
      setIsConnected(true);
    }
  }, []);

  const handleConnectGoogleCalendar = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "https://www.googleapis.com/auth/calendar",
          redirectTo: window.location.origin,
        },
      });
    } catch (e) {
      toast({
        title: "Google Calendar OAuth Error",
        description: "Failed to start Google sign-in. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSyncToCalendar = async () => {
    if (!accessToken) {
      toast({
        title: "Error",
        description: "Please connect to Google Calendar first",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);

    try {
      const activeTransactions = recurringTransactions.filter((t) => t.is_active);
      const futureGoals = goals.filter((g) => !g.is_completed && g.target_date);

      const reminderDays = parseInt(reminderDaysBefore);

      // Sync recurring transactions
      let transactionResult: { success: boolean; message: string; eventIds?: string[] } = { success: true, message: "" };
      if (activeTransactions.length > 0) {
        transactionResult = await googleCalendarService.syncRecurringTransactions(
          { accessToken },
          activeTransactions,
          reminderDays
        );
      }

      // Sync goals
      let goalsResult: { success: boolean; message: string; eventIds?: string[] } = { success: true, message: "" };
      if (futureGoals.length > 0) {
        goalsResult = await googleCalendarService.syncGoals(
          { accessToken },
          futureGoals,
          reminderDays
        );
      }

      if (transactionResult.success && goalsResult.success) {
        setLastSyncTime(new Date().toLocaleString());
        toast({
          title: "Sync Successful",
          description: `${transactionResult.message} and ${goalsResult.message}`,
        });
        onSync?.();
      } else {
        const errors = [];
        if (!transactionResult.success) errors.push(transactionResult.message);
        if (!goalsResult.success) errors.push(goalsResult.message);

        toast({
          title: "Partial Sync",
          description: errors.join(". "),
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

  const handleDisconnect = () => {
    setIsConnected(false);
    setAccessToken("");
    setLastSyncTime(null);
    localStorage.removeItem("google_calendar_token");
    toast({
      title: "Disconnected",
      description: "Google Calendar connection removed",
    });
  };

  const activeTransactions = recurringTransactions.filter((t) => t.is_active);
  const futureGoals = goals.filter((g) => !g.is_completed && g.target_date);

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Reminders
        </CardTitle>
        <CardDescription>
          Sync recurring bills and goal deadlines to Google Calendar
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <p className="text-sm font-medium">Connect Google Calendar:</p>
              <p className="text-xs text-muted-foreground">
                Your reminders will be synced to Google Calendar including:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                <li>• {activeTransactions.length} active recurring transactions</li>
                <li>• {futureGoals.length} upcoming goal deadlines</li>
                <li>• Custom reminder notifications</li>
              </ul>
            </div>

            <Button
              onClick={handleConnectGoogleCalendar}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Connect Google Calendar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connected status */}
            <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
              <p className="text-sm font-medium text-accent">✓ Connected</p>
              {lastSyncTime && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last synced: {lastSyncTime}
                </p>
              )}
            </div>

            {/* Reminder settings */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                Remind me before (days)
              </Label>
              <Select value={reminderDaysBefore} onValueChange={setReminderDaysBefore}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Same day</SelectItem>
                  <SelectItem value="1">1 day before</SelectItem>
                  <SelectItem value="3">3 days before</SelectItem>
                  <SelectItem value="7">1 week before</SelectItem>
                  <SelectItem value="14">2 weeks before</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                You'll receive both email and popup notifications
              </p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-muted/50 rounded text-center">
                <p className="text-xs text-muted-foreground">Recurring Items</p>
                <p className="text-xl font-bold">{activeTransactions.length}</p>
              </div>
              <div className="p-2 bg-muted/50 rounded text-center">
                <p className="text-xs text-muted-foreground">Goal Deadlines</p>
                <p className="text-xl font-bold">{futureGoals.length}</p>
              </div>
            </div>

            {/* Sync button */}
            <Button
              onClick={handleSyncToCalendar}
              disabled={
                isSyncing ||
                (activeTransactions.length === 0 && futureGoals.length === 0)
              }
              className="w-full"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              Sync to Calendar
            </Button>

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
            <strong>Auto-sync:</strong> Calendar events will automatically update when you
            add or modify recurring transactions and goals.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleCalendarReminders;
