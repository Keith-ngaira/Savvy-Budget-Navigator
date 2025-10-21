import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { BillForm } from "./BillForm";
import { formatError } from "@/lib/errorUtils";

export type Bill = Tables<"bills">;

export const BillsManager = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true });
      
      if (error) throw error;
      setBills(data || []);
    } catch (err) {
      const message = formatError(err);
      console.error("Error fetching bills:", message);
      toast({ 
        title: "Error", 
        description: `Failed to fetch bills: ${message}`, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBill = async (id: string) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("bills")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      
      if (error) throw error;
      toast({ title: "Deleted", description: "Bill removed" });
      fetchBills();
    } catch (err) {
      console.error("Error deleting bill:", err);
      toast({ 
        title: "Error", 
        description: "Failed to delete bill", 
        variant: "destructive" 
      });
    }
  };

  const toggleBillPaid = async (bill: Bill) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("bills")
        .update({ is_paid: !bill.is_paid })
        .eq("id", bill.id)
        .eq("user_id", user.id);
      
      if (error) throw error;
      toast({ 
        title: "Updated", 
        description: bill.is_paid ? "Bill marked as unpaid" : "Bill marked as paid" 
      });
      fetchBills();
    } catch (err) {
      console.error("Error updating bill:", err);
      toast({ 
        title: "Error", 
        description: "Failed to update bill", 
        variant: "destructive" 
      });
    }
  };

  const getStatusIcon = (bill: Bill) => {
    if (bill.is_paid) {
      return <CheckCircle2 className="h-5 w-5 text-income" />;
    }
    
    const today = new Date();
    const dueDate = new Date(bill.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) {
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    }
    return <Clock className="h-5 w-5 text-warning" />;
  };

  const upcomingBills = bills.filter(b => !b.is_paid);
  const paidBills = bills.filter(b => b.is_paid);
  const totalUnpaid = upcomingBills.reduce((sum, b) => sum + Number(b.amount), 0);

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader className="flex items-center justify-between flex-row">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            <CardTitle>Bills & Due Dates</CardTitle>
          </div>
          <Button 
            variant="hero" 
            size="sm" 
            onClick={() => { setEditing(null); setShowForm(true); }}
          >
            <Plus className="h-4 w-4" />
            Add Bill
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading bills...
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No bills yet. Add your first bill to track due dates!
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Total Bills</p>
                  <p className="text-lg font-semibold">{bills.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-warning/10">
                  <p className="text-xs text-muted-foreground">Unpaid</p>
                  <p className="text-lg font-semibold text-warning">{upcomingBills.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-income/10">
                  <p className="text-xs text-muted-foreground">Total Due</p>
                  <p className="text-lg font-semibold text-income">KSh {totalUnpaid.toLocaleString()}</p>
                </div>
              </div>

              {/* Unpaid Bills */}
              {upcomingBills.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                    Upcoming Bills ({upcomingBills.length})
                  </h3>
                  {upcomingBills.map((bill) => (
                    <div 
                      key={bill.id} 
                      className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="mt-0.5">
                          {getStatusIcon(bill)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{bill.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {bill.category}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {bill.frequency}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(bill.due_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold text-lg">KSh {Number(bill.amount).toLocaleString()}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleBillPaid(bill)}
                          className="hover:bg-income/10"
                          title="Mark as paid"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setEditing(bill); setShowForm(true); }}
                          className="hover:bg-primary/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteBill(bill.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Paid Bills */}
              {paidBills.length > 0 && (
                <div className="space-y-2 mt-6 pt-6 border-t">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                    Paid Bills ({paidBills.length})
                  </h3>
                  {paidBills.map((bill) => (
                    <div 
                      key={bill.id} 
                      className="flex items-center justify-between p-3 rounded-lg border bg-card/30 opacity-75 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <CheckCircle2 className="h-5 w-5 text-income" />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm line-through">{bill.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(bill.due_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-income">
                          KSh {Number(bill.amount).toLocaleString()}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleBillPaid(bill)}
                          className="hover:bg-destructive/10"
                          title="Mark as unpaid"
                        >
                          <AlertCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteBill(bill.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <BillForm
          mode={editing ? "edit" : "create"}
          bill={editing || undefined}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={fetchBills}
        />
      )}
    </div>
  );
};

export default BillsManager;
