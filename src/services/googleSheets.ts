import { formatError } from "@/lib/errorUtils";
import type { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;
type Budget = Tables<"budgets">;
type Goal = Tables<"goals">;

interface GoogleSheetsConfig {
  spreadsheetId: string;
  accessToken: string;
}

interface SyncData {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    totalBudget: number;
    goalsCount: number;
    completedGoals: number;
  };
  syncedAt: string;
}

class GoogleSheetsService {
  private apiUrl = "https://sheets.googleapis.com/v4/spreadsheets";

  async syncToGoogleSheets(
    config: GoogleSheetsConfig,
    data: SyncData,
    userEmail: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verify sheet exists, create if needed
      await this.ensureSheetStructure(config);

      // Clear existing data
      await this.clearSheetData(config);

      // Write summary
      await this.writeSummary(config, data);

      // Write transactions
      await this.writeTransactions(config, data.transactions);

      // Write budgets
      await this.writeBudgets(config, data.budgets);

      // Write goals
      await this.writeGoals(config, data.goals);

      // Write metadata
      await this.writeMetadata(config, userEmail, data.syncedAt);

      return {
        success: true,
        message: `Synced ${data.transactions.length} transactions, ${data.budgets.length} budgets, and ${data.goals.length} goals`,
      };
    } catch (error) {
      const message = formatError(error);
      console.error("Google Sheets sync error:", error);
      return {
        success: false,
        message: `Sync failed: ${message}`,
      };
    }
  }

  private async ensureSheetStructure(config: GoogleSheetsConfig): Promise<void> {
    const requiredSheets = ["Summary", "Transactions", "Budgets", "Goals", "Metadata"];

    const response = await fetch(
      `${this.apiUrl}/${config.spreadsheetId}?fields=sheets.properties.title`,
      {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch sheet structure");

    const data = await response.json();
    const existingSheets = new Set(
      data.sheets?.map((s: any) => s.properties.title) || []
    );

    const sheetsToCreate = requiredSheets.filter(
      (sheet) => !existingSheets.has(sheet)
    );

    if (sheetsToCreate.length > 0) {
      await this.createSheets(config, sheetsToCreate);
    }
  }

  private async createSheets(
    config: GoogleSheetsConfig,
    sheetNames: string[]
  ): Promise<void> {
    const requests = sheetNames.map((title) => ({
      addSheet: {
        properties: { title },
      },
    }));

    const response = await fetch(`${this.apiUrl}/${config.spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) throw new Error("Failed to create sheets");
  }

  private async clearSheetData(config: GoogleSheetsConfig): Promise<void> {
    const ranges = [
      "Summary!A2:Z1000",
      "Transactions!A2:Z10000",
      "Budgets!A2:Z10000",
      "Goals!A2:Z10000",
    ];

    const requests = ranges.map((range) => ({
      deleteRange: {
        range: { sheetId: 0, startRowIndex: 1, endRowIndex: 10000 },
        shiftDimension: "ROWS",
      },
    }));

    // Simple clear via overwrite with empty
    for (const range of ranges) {
      await fetch(
        `${this.apiUrl}/${config.spreadsheetId}/values/${range}:clear`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
    }
  }

  private async writeSummary(
    config: GoogleSheetsConfig,
    data: SyncData
  ): Promise<void> {
    const summaryData = [
      ["Financial Summary Report"],
      ["Generated", new Date().toLocaleString()],
      [],
      ["Metric", "Value"],
      ["Total Income", data.summary.totalIncome],
      ["Total Expenses", data.summary.totalExpenses],
      ["Net Balance", data.summary.netBalance],
      ["Total Budget", data.summary.totalBudget],
      ["Goals Created", data.summary.goalsCount],
      ["Goals Completed", data.summary.completedGoals],
    ];

    await this.appendToSheet(config, "Summary", summaryData);
  }

  private async writeTransactions(
    config: GoogleSheetsConfig,
    transactions: Transaction[]
  ): Promise<void> {
    const headers = [["Date", "Type", "Category", "Description", "Amount", "Tags", "Notes"]];
    const rows = transactions.map((t) => [
      t.date,
      t.type,
      t.category,
      t.description,
      t.amount,
      "", // tags placeholder
      "", // notes placeholder
    ]);

    await this.appendToSheet(config, "Transactions", [...headers, ...rows]);
  }

  private async writeBudgets(
    config: GoogleSheetsConfig,
    budgets: Budget[]
  ): Promise<void> {
    const headers = [
      [
        "Category",
        "Amount",
        "Period",
        "Start Date",
        "End Date",
        "Created At",
      ],
    ];
    const rows = budgets.map((b) => [
      b.category,
      b.amount,
      b.period,
      b.start_date,
      b.end_date,
      b.created_at,
    ]);

    await this.appendToSheet(config, "Budgets", [...headers, ...rows]);
  }

  private async writeGoals(
    config: GoogleSheetsConfig,
    goals: Goal[]
  ): Promise<void> {
    const headers = [
      [
        "Goal Name",
        "Category",
        "Current Amount",
        "Target Amount",
        "Target Date",
        "Progress %",
        "Status",
      ],
    ];
    const rows = goals.map((g) => [
      g.name,
      g.category || "",
      g.current_amount,
      g.target_amount,
      g.target_date || "",
      ((g.current_amount / g.target_amount) * 100).toFixed(2),
      g.is_completed ? "Completed" : "In Progress",
    ]);

    await this.appendToSheet(config, "Goals", [...headers, ...rows]);
  }

  private async writeMetadata(
    config: GoogleSheetsConfig,
    userEmail: string,
    syncedAt: string
  ): Promise<void> {
    const metadata = [
      ["Sync Information"],
      ["User Email", userEmail],
      ["Last Synced", syncedAt],
      ["App", "Savvy Budget Navigator"],
    ];

    await this.appendToSheet(config, "Metadata", metadata);
  }

  private async appendToSheet(
    config: GoogleSheetsConfig,
    sheetName: string,
    values: any[][]
  ): Promise<void> {
    const response = await fetch(
      `${this.apiUrl}/${config.spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to write to ${sheetName}`);
    }
  }

  async createSpreadsheet(
    accessToken: string,
    title: string = "Savvy Budget Navigator"
  ): Promise<string> {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: { title },
      }),
    });

    if (!response.ok) throw new Error("Failed to create spreadsheet");

    const data = await response.json();
    return data.spreadsheetId;
  }
}

export const googleSheetsService = new GoogleSheetsService();
