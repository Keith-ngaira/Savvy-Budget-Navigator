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
import { X, Loader2, Plus, Tag, Repeat2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

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
  const { toast } = useToast();

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
