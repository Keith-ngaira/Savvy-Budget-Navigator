import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { formatError } from "@/lib/errorUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Bill = Tables<"bills">;

interface BillFormProps {
  mode: "create" | "edit";
  bill?: Bill;
  onClose: () => void;
  onSaved: () => void;
}

const BILL_CATEGORIES = [
  "Utilities",
  "Insurance",
  "Subscription",
  "Rent",
  "Phone",
  "Internet",
  "Water",
  "Electricity",
  "Gas",
  "Transport",
  "Healthcare",
  "Other",
];

const FREQUENCIES = ["Daily", "Weekly", "Monthly", "Yearly"];

export const BillForm = ({ mode, bill, onClose, onSaved }: BillFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: bill?.name || "",
    amount: bill?.amount || 0,
    category: bill?.category || "Utilities",
    due_date: bill?.due_date || "",
    frequency: bill?.frequency || "Monthly",
    reminder_days: bill?.reminder_days || 3,
  });
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" || name === "reminder_days" ? Number(value) : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      if (!formData.name || !formData.due_date) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (mode === "create") {
        const { error } = await supabase.from("bills").insert({
          user_id: user.id,
          name: formData.name,
          amount: formData.amount,
          category: formData.category,
          due_date: formData.due_date,
          frequency: formData.frequency,
          reminder_days: formData.reminder_days,
          is_paid: false,
        });

        if (error) throw error;
        toast({
          title: "Success",
          description: "Bill created successfully",
        });
      } else if (bill) {
        const { error } = await supabase
          .from("bills")
          .update({
            name: formData.name,
            amount: formData.amount,
            category: formData.category,
            due_date: formData.due_date,
            frequency: formData.frequency,
            reminder_days: formData.reminder_days,
          })
          .eq("id", bill.id)
          .eq("user_id", user.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Bill updated successfully",
        });
      }

      onSaved();
      onClose();
    } catch (err) {
      const message = formatError(err);
      console.error("Error saving bill:", message);
      toast({
        title: "Error",
        description: `Failed to save bill: ${message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex items-center justify-between flex-row pb-3">
          <CardTitle>
            {mode === "create" ? "Add New Bill" : "Edit Bill"}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Bill Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Monthly Rent"
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (KSh) *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                placeholder="0"
                value={formData.amount}
                onChange={handleChange}
                disabled={isLoading}
                required
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  handleSelectChange("category", value)
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date *</Label>
              <Input
                id="due_date"
                name="due_date"
                type="date"
                value={formData.due_date}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) =>
                  handleSelectChange("frequency", value)
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((freq) => (
                    <SelectItem key={freq} value={freq}>
                      {freq}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder_days">Remind me (days before)</Label>
              <Input
                id="reminder_days"
                name="reminder_days"
                type="number"
                placeholder="3"
                value={formData.reminder_days}
                onChange={handleChange}
                disabled={isLoading}
                min="0"
                max="30"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {mode === "create" ? "Add Bill" : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillForm;
