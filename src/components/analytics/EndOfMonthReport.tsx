import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// Types
type Transaction = Tables<"transactions">;
type Income = Tables<"income_sources">;

function startOfPrevMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() - 1, 1); }
function endOfPrevMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59, 999); }
function inRange(date: string, from: Date, to: Date) {
  const t = new Date(date).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export const EndOfMonthReport = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [txRes, incRes] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", user.id),
        supabase.from("income_sources").select("*").eq("user_id", user.id),
      ]);
      setTransactions(txRes.data || []);
      setIncomes(incRes.data || []);
    };
    load();
  }, []);

  const lastMonth = useMemo(() => {
    const now = new Date();
    const from = startOfPrevMonth(now);
    const to = endOfPrevMonth(now);

    const tx = transactions.filter(t => inRange(t.date, from, to));
    const inc = incomes.filter(i => inRange(i.date, from, to));

    const expenseTotal = tx.filter(t => t.type === "expense").reduce((a, b) => a + Number(b.amount), 0);
    const incomeTxTotal = tx.filter(t => t.type === "income").reduce((a, b) => a + Number(b.amount), 0);
    const incomeSrcTotal = inc.reduce((a, b) => a + Number(b.amount), 0);
    const incomeTotal = incomeTxTotal + incomeSrcTotal;
    const balance = incomeTotal - expenseTotal;

    const byCategory = tx
      .filter(t => t.type === "expense")
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    return { from, to, tx, inc, incomeTotal, expenseTotal, balance, byCategory };
  }, [transactions, incomes]);

  const generatePdf = () => {
    const doc = new jsPDF();
    const title = `End-of-Month Report: ${lastMonth.from.toLocaleDateString()} - ${lastMonth.to.toLocaleDateString()}`;

    doc.setFontSize(14);
    doc.text("Savvy Budget Navigator", 14, 16);
    doc.setFontSize(12);
    doc.text(title, 14, 24);

    autoTable(doc, {
      startY: 30,
      head: [["Metric", "Amount (KSh)"]],
      body: [
        ["Total Income", lastMonth.incomeTotal.toLocaleString()],
        ["Total Expenses", lastMonth.expenseTotal.toLocaleString()],
        ["Net Balance", lastMonth.balance.toLocaleString()],
      ],
      styles: { fontSize: 10 },
    });

    const afterSummaryY = (doc as any).lastAutoTable.finalY + 6;
    autoTable(doc, {
      startY: afterSummaryY,
      head: [["Category", "Amount (KSh)"]],
      body: Object.entries(lastMonth.byCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => [cat, amt.toLocaleString()]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [230, 230, 230] },
    });

    const afterCatY = (doc as any).lastAutoTable.finalY + 6;
    autoTable(doc, {
      startY: afterCatY,
      head: [["Date", "Type", "Category", "Description", "Amount (KSh)"]],
      body: lastMonth.tx
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 50)
        .map(t => [
          new Date(t.date).toLocaleDateString(),
          t.type,
          t.category,
          t.description || "",
          Number(t.amount).toLocaleString(),
        ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [245, 245, 245] },
      didDrawPage: (data) => {
        // Footer
        const totalPages = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 1;
        const str = `Page ${totalPages}`;
        doc.setFontSize(8);
        const pageHeight = (doc as any).internal?.pageSize?.height || doc.internal.pageSize.height;
        doc.text(str, (data as any).settings.margin.left, pageHeight - 10);
      }
    });

    doc.save(`EOM_Report_${lastMonth.from.getFullYear()}-${(lastMonth.from.getMonth()+1).toString().padStart(2,'0')}.pdf`);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg">End-of-Month Report</CardTitle>
        <CardDescription>Generate last month's PDF report (summary, category breakdown, transactions)</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={generatePdf} variant="hero" size="sm">
          <Download className="h-4 w-4" /> Generate PDF (Last Month)
        </Button>
      </CardContent>
    </Card>
  );
}
