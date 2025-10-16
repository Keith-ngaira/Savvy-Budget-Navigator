import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { X, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface IncomeFormProps {
  onClose: () => void;
  onSaved: () => void;
  mode?: "create" | "edit";
  income?: Tables<"income_sources">;
}

export const IncomeForm = ({ onClose, onSaved, mode = "create", income }: IncomeFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    source: income?.source ?? "",
    amount: income ? String(income.amount) : "",
    date: income ? new Date(income.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    notes: income?.notes ?? "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (income) {
      setFormData({
        source: income.source,
        amount: String(income.amount),
        date: new Date(income.date).toISOString().split("T")[0],
        notes: income.notes ?? "",
      });
    }
  }, [income]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      if (mode === "edit" && income?.id) {
        const { error } = await supabase
          .from("income_sources")
          .update({
            source: formData.source,
            amount: parseFloat(formData.amount),
            date: formData.date,
            notes: formData.notes || null,
          })
          .eq("id", income.id)
          .eq("user_id", user.id);

        if (error) throw error;
        toast({ title: "Updated", description: "Income updated successfully" });
      } else {
        const { error } = await supabase
          .from("income_sources")
          .insert({
            user_id: user.id,
            source: formData.source,
            amount: parseFloat(formData.amount),
            date: formData.date,
            notes: formData.notes || null,
          });
        if (error) throw error;
        toast({ title: "Added", description: "Income added successfully" });
      }
      onSaved();
      onClose();
    } catch (err) {
      toast({ title: "Error", description: "Failed to save income", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{mode === "edit" ? "Edit Income" : "Add Income"}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input id="source" value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" step="0.01" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Optional notes..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" variant="income" disabled={isLoading} className="flex-1">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "edit" ? "Save Changes" : "Add Income"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncomeForm;
