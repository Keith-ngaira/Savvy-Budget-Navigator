import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Search, Filter, Pencil, FileIcon, Image, ExternalLink } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { TransactionForm } from "./TransactionForm";
import { formatError } from "@/lib/errorUtils";

type Transaction = Tables<"transactions">;

interface TransactionListProps {
  transactions: Transaction[];
  onRefresh: () => void;
  isLoading: boolean;
}

export const TransactionList = ({ transactions, onRefresh, isLoading }: TransactionListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { toast } = useToast();
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const deleteTransaction = async (id: string) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete transaction",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Transaction deleted successfully",
        });
        onRefresh();
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || transaction.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

  const categories = [...new Set(transactions.map(t => t.category))];

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading transactions...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Transaction History
          <Badge variant="secondary">{filteredTransactions.length} transactions</Badge>
        </CardTitle>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {transactions.length === 0 ? "No transactions yet" : "No transactions match your filters"}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-medium">{transaction.description}</h4>
                    <Badge
                      variant={transaction.type === "income" ? "default" : "secondary"}
                      className={
                        transaction.type === "income"
                          ? "bg-income text-white"
                          : "bg-expense text-white"
                      }
                    >
                      {transaction.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(transaction.date).toLocaleDateString()}
                  </p>
                  {transaction.tags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {transaction.tags.split(",").map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {transaction.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{transaction.notes}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`font-semibold text-lg ${
                      transaction.type === "income" ? "text-income" : "text-expense"
                    }`}>
                      {transaction.type === "income" ? "+" : "-"}KSh {Number(transaction.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {transaction.type}
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditingTransaction(transaction); setShowEditForm(true); }}
                    className="hover:bg-primary/10"
                    aria-label="Edit transaction"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTransaction(transaction.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {showEditForm && editingTransaction && (
        <TransactionForm
          mode="edit"
          transaction={editingTransaction}
          onTransactionUpdated={() => { setShowEditForm(false); setEditingTransaction(null); onRefresh(); }}
          onClose={() => { setShowEditForm(false); setEditingTransaction(null); }}
        />
      )}
    </Card>
  );
};
