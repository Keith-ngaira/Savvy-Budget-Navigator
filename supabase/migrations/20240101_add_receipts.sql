-- Create receipts table to store receipt metadata
CREATE TABLE receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create junction table for transaction-receipt relationship (one-to-many)
CREATE TABLE transaction_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES transactions ON DELETE CASCADE,
  receipt_id UUID NOT NULL REFERENCES receipts ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(transaction_id, receipt_id)
);

-- Add indexes for better query performance
CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_receipt_transactions_transaction_id ON transaction_receipts(transaction_id);
CREATE INDEX idx_receipt_transactions_receipt_id ON transaction_receipts(receipt_id);

-- Enable RLS (Row-Level Security) for receipts table
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies for receipts
CREATE POLICY "Users can view their own receipts" ON receipts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert receipts" ON receipts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their receipts" ON receipts
  FOR DELETE USING (user_id = auth.uid());

-- RLS policies for transaction_receipts
CREATE POLICY "Users can view transaction receipts" ON transaction_receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transactions WHERE transactions.id = transaction_receipts.transaction_id AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert transaction receipts" ON transaction_receipts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions WHERE transactions.id = transaction_receipts.transaction_id AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete transaction receipts" ON transaction_receipts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM transactions WHERE transactions.id = transaction_receipts.transaction_id AND transactions.user_id = auth.uid()
    )
  );
