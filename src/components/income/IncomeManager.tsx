import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Wallet } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { IncomeForm } from "./IncomeForm";
import { formatError } from "@/lib/errorUtils";

export type IncomeSource = Tables<"income_sources">;

export const IncomeManager = () => {
  const [incomes, setIncomes] = useState<IncomeSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<IncomeSource | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchIncomes();
  }, []);

  const fetchIncomes = async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("income_sources")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      if (error) throw error;
      setIncomes(data || []);
    } catch (err) {
      const message = formatError(err);
      console.error("Error fetching incomes:", message);
      toast({ title: "Error", description: `Failed to fetch income sources: ${message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteIncome = async (id: string) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("income_sources")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Income removed" });
      fetchIncomes();
    } catch (err) {
      console.error("Error deleting income:", err);
      toast({ title: "Error", description: "Failed to delete income", variant: "destructive" });
    }
  };

  const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader className="flex items-center justify-between flex-row">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-income" />
            <CardTitle>Income Sources</CardTitle>
          </div>
          <Button variant="hero" size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Add Income
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">Loading incomes...</div>
          ) : incomes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No income sources yet</div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                <span className="text-sm">Total</span>
                <Badge className="bg-income text-white">KSh {totalIncome.toLocaleString()}</Badge>
              </div>
              {incomes.map((i) => (
                <div key={i.id} className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-medium">{i.source}</h4>
                      <Badge variant="default" className="bg-income text-white">Income</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{new Date(i.date).toLocaleDateString()}</p>
                    {i.notes && <p className="text-xs text-muted-foreground mt-1">{i.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-lg text-income">+KSh {Number(i.amount).toLocaleString()}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(i); setShowForm(true); }} className="hover:bg-primary/10" aria-label="Edit income">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteIncome(i.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <IncomeForm
          mode={editing ? "edit" : "create"}
          income={editing || undefined}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={fetchIncomes}
        />
      )}
    </div>
  );
};

export default IncomeManager;
