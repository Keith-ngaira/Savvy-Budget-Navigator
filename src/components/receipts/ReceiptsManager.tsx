import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Download, FileText, AlertCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { ReceiptUpload } from "./ReceiptUpload";
import { formatError } from "@/lib/errorUtils";

export type Receipt = Tables<"receipts">;

interface ReceiptWithTransactions extends Receipt {
  transaction_receipts?: Array<{
    transaction_id: string;
  }>;
}

export const ReceiptsManager = () => {
  const [receipts, setReceipts] = useState<ReceiptWithTransactions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("receipts")
        .select(`
          *,
          transaction_receipts (
            transaction_id
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setReceipts(data || []);
    } catch (err) {
      const message = formatError(err);
      console.error("Error fetching receipts:", message);
      toast({ 
        title: "Error", 
        description: `Failed to fetch receipts: ${message}`, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteReceipt = async (id: string) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      const { error: deleteTransactionReceiptsError } = await supabase
        .from("transaction_receipts")
        .delete()
        .eq("receipt_id", id);

      if (deleteTransactionReceiptsError) throw deleteTransactionReceiptsError;

      const { error } = await supabase
        .from("receipts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      
      if (error) throw error;
      toast({ title: "Deleted", description: "Receipt removed" });
      fetchReceipts();
    } catch (err) {
      const message = formatError(err);
      console.error("Error deleting receipt:", message);
      toast({ 
        title: "Error", 
        description: `Failed to delete receipt: ${message}`, 
        variant: "destructive" 
      });
    }
  };

  const downloadReceipt = async (receipt: Receipt) => {
    try {
      const { data, error } = await supabase
        .storage
        .from("transaction-receipts")
        .download(receipt.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = receipt.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = formatError(err);
      console.error("Error downloading receipt:", message);
      toast({
        title: "Error",
        description: `Failed to download receipt: ${message}`,
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "📄";
    if (fileType.includes("image")) return "🖼️";
    return "📎";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader className="flex items-center justify-between flex-row">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Receipts & Documents</CardTitle>
          </div>
          <Button 
            variant="hero" 
            size="sm" 
            onClick={() => setShowUpload(true)}
          >
            <Plus className="h-4 w-4" />
            Upload Receipt
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading receipts...
            </div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No receipts yet</p>
              <p className="text-xs text-muted-foreground mb-4">
                Upload receipts to attach them to your transactions
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowUpload(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload Your First Receipt
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Total Receipts</p>
                  <p className="text-lg font-semibold">{receipts.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Linked to Transactions</p>
                  <p className="text-lg font-semibold">
                    {receipts.filter(r => r.transaction_receipts && r.transaction_receipts.length > 0).length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Total Size</p>
                  <p className="text-lg font-semibold">
                    {formatFileSize(
                      receipts.reduce((sum, r) => sum + Number(r.file_size), 0)
                    )}
                  </p>
                </div>
              </div>

              {/* Receipts List */}
              <div className="space-y-2">
                {receipts.map((receipt) => {
                  const linkedTransactions = receipt.transaction_receipts?.length || 0;
                  return (
                    <div 
                      key={receipt.id} 
                      className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-2xl">
                          {getFileIcon(receipt.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate text-sm">
                              {receipt.file_name}
                            </h4>
                            {linkedTransactions > 0 && (
                              <Badge variant="default" className="text-xs flex-shrink-0">
                                {linkedTransactions} linked
                              </Badge>
                            )}
                            {linkedTransactions === 0 && (
                              <Badge 
                                variant="outline" 
                                className="text-xs flex-shrink-0 text-warning"
                              >
                                Not linked
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(Number(receipt.file_size))} • {new Date(receipt.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => downloadReceipt(receipt)}
                          className="hover:bg-primary/10"
                          title="Download receipt"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteReceipt(receipt.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Info */}
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50 mt-4">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-900 dark:text-blue-200">
                    <strong>Tip:</strong> Link receipts to transactions to keep them organized. You can link multiple receipts to one transaction.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showUpload && (
        <ReceiptUpload
          onClose={() => setShowUpload(false)}
          onUploaded={fetchReceipts}
        />
      )}
    </div>
  );
};

export default ReceiptsManager;
