import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, Link2, Unlink2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { 
  linkReceiptsToTransaction, 
  getTransactionReceipts,
  unlinkReceiptFromTransaction,
  formatError 
} from "@/lib/receiptLinking";
import { formatError as utilFormatError } from "@/lib/errorUtils";

type Receipt = Tables<"receipts">;

interface ReceiptLinkerProps {
  transactionId: string;
  onClose: () => void;
  onLinked: () => void;
}

interface ReceiptWithLinked extends Receipt {
  isLinked: boolean;
}

export const ReceiptLinker = ({
  transactionId,
  onClose,
  onLinked,
}: ReceiptLinkerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [receipts, setReceipts] = useState<ReceiptWithLinked[]>([]);
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchReceiptsAndLinks();
  }, [transactionId]);

  const fetchReceiptsAndLinks = async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Fetch all user's receipts
      const { data: allReceipts, error: receiptsError } = await supabase
        .from("receipts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (receiptsError) throw receiptsError;

      // Fetch linked receipts for this transaction
      const { data: linkedData, error: linkedError } = await supabase
        .from("transaction_receipts")
        .select("receipt_id")
        .eq("transaction_id", transactionId);

      if (linkedError) throw linkedError;

      const linkedIds = (linkedData || []).map((item: any) => item.receipt_id);

      // Map receipts with linked status
      const receiptsWithStatus: ReceiptWithLinked[] = (allReceipts || []).map(
        (receipt) => ({
          ...receipt,
          isLinked: linkedIds.includes(receipt.id),
        })
      );

      setReceipts(receiptsWithStatus);
      setSelectedReceipts(linkedIds);
    } catch (err) {
      const message = utilFormatError(err);
      console.error("Error fetching receipts:", message);
      toast({
        title: "Error",
        description: `Failed to load receipts: ${message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleReceipt = (receiptId: string) => {
    setSelectedReceipts((prev) =>
      prev.includes(receiptId)
        ? prev.filter((id) => id !== receiptId)
        : [...prev, receiptId]
    );
  };

  const handleSaveLinks = async () => {
    setIsSaving(true);
    try {
      // Get current linked receipts
      const currentLinked = receipts
        .filter((r) => r.isLinked)
        .map((r) => r.id);

      // Find receipts to unlink (were linked, now unselected)
      const toUnlink = currentLinked.filter((id) => !selectedReceipts.includes(id));

      // Find receipts to link (newly selected)
      const toLink = selectedReceipts.filter(
        (id) => !currentLinked.includes(id)
      );

      // Unlink receipts
      for (const receiptId of toUnlink) {
        await unlinkReceiptFromTransaction(transactionId, receiptId);
      }

      // Link receipts
      if (toLink.length > 0) {
        await linkReceiptsToTransaction(transactionId, toLink);
      }

      toast({
        title: "Success",
        description: `Updated ${toLink.length + toUnlink.length} receipt links`,
      });

      onLinked();
      onClose();
    } catch (err) {
      const message = utilFormatError(err);
      console.error("Error saving receipt links:", message);
      toast({
        title: "Error",
        description: `Failed to save links: ${message}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "📄";
    if (fileType.includes("image")) return "🖼️";
    return "📎";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-lg max-h-[80vh] flex flex-col">
        <CardHeader className="flex items-center justify-between flex-row pb-3 border-b">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            <CardTitle>Link Receipts</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                No receipts available
              </p>
              <p className="text-xs text-muted-foreground">
                Upload receipts first to link them to transactions
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleToggleReceipt(receipt.id)}
                >
                  <Checkbox
                    checked={selectedReceipts.includes(receipt.id)}
                    onCheckedChange={() => handleToggleReceipt(receipt.id)}
                    disabled={isSaving}
                  />
                  <div className="text-lg flex-shrink-0">
                    {getFileIcon(receipt.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {receipt.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(Number(receipt.file_size))} •{" "}
                      {new Date(receipt.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {receipt.isLinked && (
                    <Badge variant="default" className="flex-shrink-0 text-xs">
                      Linked
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <div className="border-t p-4 bg-muted/30 space-y-3">
          <p className="text-xs text-muted-foreground">
            {selectedReceipts.length} receipt(s) selected
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveLinks}
              disabled={isSaving || isLoading}
              className="flex-1"
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Links
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ReceiptLinker;
