import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { X, Loader2, Plus, Tag, Repeat2, Upload, File } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { formatError } from "@/lib/errorUtils";

interface TransactionFormProps {
  onClose: () => void;
  onTransactionAdded?: () => void; // for create mode (existing usage)
  onTransactionUpdated?: () => void; // for edit mode
  mode?: "create" | "edit";
  transaction?: Tables<"transactions">;
}

const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Healthcare",
  "Education",
  "Travel",
  "Other"
];

const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Business",
  "Investment",
  "Gift",
  "Other"
];

export const TransactionForm = ({ onClose, onTransactionAdded, onTransactionUpdated, mode = "create", transaction }: TransactionFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: (transaction?.type ?? "expense") as "income" | "expense",
    amount: transaction ? String(transaction.amount) : "",
    category: transaction?.category ?? "",
    description: transaction?.description ?? "",
    date: transaction ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    tags: "",
    notes: "",
    isRecurring: false,
    recurringFrequency: "monthly" as "daily" | "weekly" | "monthly" | "yearly"
  });
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [receipts, setReceipts] = useState<File[]>([]);
  const [uploadingReceipts, setUploadingReceipts] = useState(false);
  const { toast } = useToast();

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

  const handleReceiptSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files || []);
    const validFiles = files.filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not supported. Use JPG, PNG, WebP, or PDF.`,
          variant: "destructive",
        });
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setReceipts(prev => [...prev, ...validFiles]);
    event.currentTarget.value = '';
  };

  const removeReceipt = (index: number) => {
    setReceipts(prev => prev.filter((_, i) => i !== index));
  };

  const uploadReceipts = async (transactionId: string, userId: string): Promise<string[]> => {
    if (receipts.length === 0) return [];

    setUploadingReceipts(true);
    const uploadedReceiptIds: string[] = [];

    try {
      for (const file of receipts) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${transactionId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('transaction-receipts')
          .upload(fileName, file);

        if (uploadError) {
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }

        // Create receipt record
        const { data: receiptData, error: receiptError } = await supabase
          .from('receipts')
          .insert({
            user_id: userId,
            file_name: file.name,
            file_path: uploadData.path,
            file_size: file.size,
            file_type: file.type,
          })
          .select('id')
          .single();

        if (receiptError) {
          throw new Error(`Failed to create receipt record: ${receiptError.message}`);
        }

        // Link receipt to transaction
        const { error: linkError } = await supabase
          .from('transaction_receipts')
          .insert({
            transaction_id: transactionId,
            receipt_id: receiptData.id,
          });

        if (linkError) {
          throw new Error(`Failed to link receipt to transaction: ${linkError.message}`);
        }

        uploadedReceiptIds.push(receiptData.id);
      }
    } catch (error) {
      const message = formatError(error);
      toast({
        title: "Receipt upload failed",
        description: message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploadingReceipts(false);
    }

    return uploadedReceiptIds;
  };

  // Keep form in sync if transaction prop changes
  useEffect(() => {
    if (transaction) {
      setFormData({
        type: transaction.type as "income" | "expense",
        amount: String(transaction.amount),
        category: transaction.category,
        description: transaction.description ?? "",
        date: new Date(transaction.date).toISOString().split('T')[0],
        tags: "",
        notes: "",
        isRecurring: false,
        recurringFrequency: "monthly"
      });
      setTags([]);
    }
  }, [transaction]);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add transactions",
          variant: "destructive",
        });
        return;
      }
      if (mode === "edit" && transaction?.id) {
        const { error } = await supabase
          .from("transactions")
          .update({
            type: formData.type,
            amount: parseFloat(formData.amount),
            category: formData.category,
            description: formData.description,
            date: formData.date,
            tags: tags.length > 0 ? tags.join(",") : null,
            notes: formData.notes || null,
          })
          .eq("id", transaction.id)
          .eq("user_id", user.id);

        if (error) {
          toast({
            title: "Error",
            description: "Failed to update transaction",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Transaction updated successfully",
          });
          onTransactionUpdated && onTransactionUpdated();
          onClose();
        }
      } else {
        const { error } = await supabase
          .from("transactions")
          .insert({
            user_id: user.id,
            type: formData.type,
            amount: parseFloat(formData.amount),
            category: formData.category,
            description: formData.description,
            date: formData.date,
            tags: tags.length > 0 ? tags.join(",") : null,
            notes: formData.notes || null,
          });

        if (error) {
          toast({
            title: "Error",
            description: "Failed to add transaction",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Transaction added successfully",
          });
          onTransactionAdded && onTransactionAdded();
          onClose();
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const categories = formData.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{mode === "edit" ? "Edit Transaction" : "Add Transaction"}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "income" | "expense") => 
                    setFormData({ ...formData, type: value, category: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add notes or memo..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Add a tag (press Add)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addTag}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Repeat2 className="h-4 w-4" />
                  Recurring Transaction
                </Label>
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>
              {formData.isRecurring && (
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={formData.recurringFrequency}
                    onValueChange={(value: "daily" | "weekly" | "monthly" | "yearly") =>
                      setFormData({ ...formData, recurringFrequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant={formData.type === "income" ? "income" : "expense"}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "edit" ? "Save Changes" : `Add ${formData.type === "income" ? "Income" : "Expense"}`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
