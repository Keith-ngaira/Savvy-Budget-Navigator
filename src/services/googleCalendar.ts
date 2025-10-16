import { formatError } from "@/lib/errorUtils";
import type { Tables } from "@/integrations/supabase/types";

type RecurringTransaction = Tables<"recurring_transactions">;
type Goal = Tables<"goals">;

interface GoogleCalendarConfig {
  accessToken: string;
  calendarId?: string;
}

interface CalendarEvent {
  summary: string;
  description: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  recurrence?: string[];
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: "email" | "popup" | "sms";
      minutes: number;
    }>;
  };
}

class GoogleCalendarService {
  private apiUrl = "https://www.googleapis.com/calendar/v3";
  private defaultReminderMinutes = [1440, 60]; // 1 day and 1 hour before

  async syncRecurringTransactions(
    config: GoogleCalendarConfig,
    transactions: RecurringTransaction[],
    reminderDaysBefore: number = 1
  ): Promise<{ success: boolean; message: string; eventIds?: string[] }> {
    try {
      const calendarId = await this.getOrCreateCalendar(
        config,
        "Savvy Budget - Bills & Income"
      );

      const eventIds: string[] = [];

      for (const txn of transactions) {
        if (!txn.is_active) continue;

        const event = this.buildRecurringTransactionEvent(
          txn,
          reminderDaysBefore
        );
        const eventId = await this.createOrUpdateEvent(config, calendarId, event);
        eventIds.push(eventId);
      }

      return {
        success: true,
        message: `Synced ${eventIds.length} recurring transactions to calendar`,
        eventIds,
      };
    } catch (error) {
      const message = formatError(error);
      console.error("Calendar sync error:", error);
      return {
        success: false,
        message: `Sync failed: ${message}`,
      };
    }
  }

  async syncGoals(
    config: GoogleCalendarConfig,
    goals: Goal[],
    reminderDaysBefore: number = 7
  ): Promise<{ success: boolean; message: string; eventIds?: string[] }> {
    try {
      const calendarId = await this.getOrCreateCalendar(
        config,
        "Savvy Budget - Goals"
      );

      const eventIds: string[] = [];

      for (const goal of goals) {
        if (!goal.target_date || goal.is_completed) continue;

        const event = this.buildGoalEvent(goal, reminderDaysBefore);
        const eventId = await this.createOrUpdateEvent(config, calendarId, event);
        eventIds.push(eventId);
      }

      return {
        success: true,
        message: `Synced ${eventIds.length} goal targets to calendar`,
        eventIds,
      };
    } catch (error) {
      const message = formatError(error);
      console.error("Goal sync error:", error);
      return {
        success: false,
        message: `Sync failed: ${message}`,
      };
    }
  }

  private buildRecurringTransactionEvent(
    txn: RecurringTransaction,
    reminderDaysBefore: number
  ): CalendarEvent {
    const startDate = new Date(txn.start_date);
    const endDate = new Date(txn.start_date);
    endDate.setHours(endDate.getHours() + 1);

    const recurrence = this.frequencyToRRule(txn.frequency, txn.end_date);

    return {
      summary: `[${txn.type.toUpperCase()}] ${txn.description}`,
      description: `${txn.description}\nAmount: KSh ${txn.amount}\nCategory: ${txn.category}\nFrequency: ${txn.frequency}`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "Africa/Nairobi",
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "Africa/Nairobi",
      },
      recurrence,
      reminders: {
        useDefault: false,
        overrides: [
          {
            method: "popup" as const,
            minutes: reminderDaysBefore * 24 * 60,
          },
          {
            method: "email" as const,
            minutes: reminderDaysBefore * 24 * 60,
          },
        ],
      },
    };
  }

  private buildGoalEvent(
    goal: Goal,
    reminderDaysBefore: number
  ): CalendarEvent {
    const targetDate = new Date(goal.target_date!);
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 1);

    const progress = ((goal.current_amount / goal.target_amount) * 100).toFixed(
      0
    );

    return {
      summary: `Goal: ${goal.name}`,
      description: `Target: KSh ${goal.target_amount}\nCurrent: KSh ${goal.current_amount}\nProgress: ${progress}%\nCategory: ${goal.category || "General"}`,
      start: {
        date: targetDate.toISOString().split("T")[0],
      },
      end: {
        date: endDate.toISOString().split("T")[0],
      },
      reminders: {
        useDefault: false,
        overrides: [
          {
            method: "popup" as const,
            minutes: reminderDaysBefore * 24 * 60,
          },
          {
            method: "email" as const,
            minutes: reminderDaysBefore * 24 * 60,
          },
        ],
      },
    };
  }

  private frequencyToRRule(
    frequency: string,
    endDate?: string | null
  ): string[] {
    let rule = "";

    switch (frequency.toLowerCase()) {
      case "daily":
        rule = "FREQ=DAILY";
        break;
      case "weekly":
        rule = "FREQ=WEEKLY";
        break;
      case "monthly":
        rule = "FREQ=MONTHLY";
        break;
      case "yearly":
        rule = "FREQ=YEARLY";
        break;
      default:
        rule = "FREQ=MONTHLY";
    }

    if (endDate) {
      const date = new Date(endDate);
      rule += `;UNTIL=${date.toISOString().split("T")[0].replace(/-/g, "")}`;
    }

    return [rule];
  }

  private async getOrCreateCalendar(
    config: GoogleCalendarConfig,
    calendarName: string
  ): Promise<string> {
    // If calendarId provided, use it
    if (config.calendarId) {
      return config.calendarId;
    }

    try {
      // Try to find existing calendar
      const listResponse = await fetch(
        `${this.apiUrl}/users/me/calendarList`,
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
          },
        }
      );

      if (listResponse.ok) {
        const data = await listResponse.json();
        const existing = data.items?.find(
          (cal: any) => cal.summary === calendarName
        );
        if (existing) {
          return existing.id;
        }
      }

      // Create new calendar
      const createResponse = await fetch(
        `${this.apiUrl}/calendars`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: calendarName,
            timeZone: "Africa/Nairobi",
            description: `Synced from Savvy Budget Navigator`,
          }),
        }
      );

      if (!createResponse.ok) {
        throw new Error("Failed to create calendar");
      }

      const newCalendar = await createResponse.json();
      return newCalendar.id;
    } catch (error) {
      // Fall back to primary calendar
      return "primary";
    }
  }

  private async createOrUpdateEvent(
    config: GoogleCalendarConfig,
    calendarId: string,
    event: CalendarEvent
  ): Promise<string> {
    const response = await fetch(
      `${this.apiUrl}/calendars/${calendarId}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to create calendar event");
    }

    const data = await response.json();
    return data.id;
  }

  async deleteEvent(
    config: GoogleCalendarConfig,
    calendarId: string,
    eventId: string
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.apiUrl}/calendars/${calendarId}/events/${eventId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error("Failed to delete event:", error);
      return false;
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
