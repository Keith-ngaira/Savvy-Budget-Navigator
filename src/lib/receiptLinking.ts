import { supabase } from "@/integrations/supabase/client";
import { formatError } from "./errorUtils";

export interface TransactionReceipt {
  transaction_id: string;
  receipt_id: string;
}

/**
 * Link a receipt to a transaction
 */
export async function linkReceiptToTransaction(
  transactionId: string,
  receiptId: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from("transaction_receipts").insert({
      transaction_id: transactionId,
      receipt_id: receiptId,
    });

    if (error) throw error;
    return true;
  } catch (err) {
    const message = formatError(err);
    console.error("Error linking receipt to transaction:", message);
    throw err;
  }
}

/**
 * Unlink a receipt from a transaction
 */
export async function unlinkReceiptFromTransaction(
  transactionId: string,
  receiptId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("transaction_receipts")
      .delete()
      .eq("transaction_id", transactionId)
      .eq("receipt_id", receiptId);

    if (error) throw error;
    return true;
  } catch (err) {
    const message = formatError(err);
    console.error("Error unlinking receipt from transaction:", message);
    throw err;
  }
}

/**
 * Get all receipts linked to a transaction
 */
export async function getTransactionReceipts(transactionId: string) {
  try {
    const { data, error } = await supabase
      .from("transaction_receipts")
      .select(
        `
        receipt_id,
        receipts (
          id,
          user_id,
          file_name,
          file_path,
          file_size,
          file_type,
          created_at,
          updated_at
        )
      `
      )
      .eq("transaction_id", transactionId);

    if (error) throw error;
    return data;
  } catch (err) {
    const message = formatError(err);
    console.error("Error fetching transaction receipts:", message);
    throw err;
  }
}

/**
 * Get all transactions linked to a receipt
 */
export async function getReceiptTransactions(receiptId: string) {
  try {
    const { data, error } = await supabase
      .from("transaction_receipts")
      .select(
        `
        transaction_id,
        transactions (
          id,
          user_id,
          amount,
          description,
          category,
          type,
          date,
          created_at,
          updated_at
        )
      `
      )
      .eq("receipt_id", receiptId);

    if (error) throw error;
    return data;
  } catch (err) {
    const message = formatError(err);
    console.error("Error fetching receipt transactions:", message);
    throw err;
  }
}

/**
 * Batch link receipts to a transaction
 */
export async function linkReceiptsToTransaction(
  transactionId: string,
  receiptIds: string[]
): Promise<boolean> {
  try {
    const records = receiptIds.map((receiptId) => ({
      transaction_id: transactionId,
      receipt_id: receiptId,
    }));

    const { error } = await supabase
      .from("transaction_receipts")
      .insert(records);

    if (error) throw error;
    return true;
  } catch (err) {
    const message = formatError(err);
    console.error("Error batch linking receipts:", message);
    throw err;
  }
}

/**
 * Delete all receipt links for a transaction
 */
export async function deleteTransactionReceiptLinks(
  transactionId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("transaction_receipts")
      .delete()
      .eq("transaction_id", transactionId);

    if (error) throw error;
    return true;
  } catch (err) {
    const message = formatError(err);
    console.error("Error deleting transaction receipt links:", message);
    throw err;
  }
}
