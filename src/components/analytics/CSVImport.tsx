import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Check, AlertTriangle, Loader2 } from "lucide-react";

interface ParsedTransaction {
  date: string;
  description: string;
  category: string;
  amount: string;
  type: "income" | "expense";
}

export const CSVImport = ({ onImportComplete }: { onImportComplete?: () => void }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseCSV = (content: string): ParsedTransaction[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      throw new Error("CSV file must have a header row and at least one data row");
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const dateIdx = headers.findIndex(h => h.includes('date'));
    const descIdx = headers.findIndex(h => h.includes('description') || h.includes('desc'));
    const catIdx = headers.findIndex(h => h.includes('category') || h.includes('cat'));
    const amtIdx = headers.findIndex(h => h.includes('amount') || h.includes('amt'));
    const typeIdx = headers.findIndex(h => h.includes('type'));

    if (dateIdx === -1 || descIdx === -1 || catIdx === -1 || amtIdx === -1) {
      throw new Error("CSV must have columns: date, description, category, amount");
    }

    const transactions: ParsedTransaction[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.every(p => p === '')) continue; // Skip empty lines

      transactions.push({
        date: parts[dateIdx] || new Date().toISOString().split('T')[0],
        description: parts[descIdx] || 'Import',
        category: parts[catIdx] || 'Other',
        amount: parts[amtIdx] || '0',
        type: (parts[typeIdx]?.toLowerCase() === 'income' ? 'income' : 'expense') as const,
      });
    }

    return transactions;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const content = await file.text();
      const transactions = parseCSV(content);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to import transactions",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("transactions")
        .insert(
          transactions.map(txn => ({
            user_id: user.id,
            date: txn.date,
            description: txn.description,
            category: txn.category,
            amount: parseFloat(txn.amount),
            type: txn.type,
          }))
        );

      if (error) throw error;

      setImportedCount(transactions.length);
      toast({
        title: "Success",
        description: `Imported ${transactions.length} transactions successfully`,
      });

      onImportComplete?.();
    } catch (err) {
      console.error("Error importing CSV:", err);
      toast({
        title: "Import Error",
        description: err instanceof Error ? err.message : "Failed to import transactions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Import Transactions
        </CardTitle>
        <CardDescription>
          Import transactions from CSV file (Bank statement or export)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-2 mb-2">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">CSV Format Required:</p>
                <p>Columns: date, description, category, amount, [type (optional)]</p>
                <p className="text-xs mt-1">Example: 2024-01-15,Grocery,Food & Dining,2500,expense</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Select CSV File</Label>
            <Input
              ref={fileInputRef}
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isLoading}
              className="cursor-pointer"
            />
          </div>

          {importedCount > 0 && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div className="text-sm text-green-900 dark:text-green-100">
                Successfully imported {importedCount} transactions
              </div>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-100">
              Make sure your CSV file is properly formatted. Invalid rows will be skipped.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
