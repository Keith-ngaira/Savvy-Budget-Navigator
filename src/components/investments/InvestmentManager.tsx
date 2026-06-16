import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LineChart as LineChartIcon, Plus, Trash2, DollarSign, Percent, Upload, RefreshCw, Download, PieChart as PieIcon, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { secureGet, secureSet } from "@/lib/secureStorage";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface Holding { id: string; name: string; type: string; units: number; buyPrice: number; currentPrice: number; purchaseDate?: string; recurring?: boolean; recurringAmount?: number; frequency?: string }

const TYPES = ["Stocks", "ETF", "Mutual Fund", "Crypto", "Bonds", "SACCO", "Savings", "Other"];

function uuid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export const InvestmentManager = () => {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "Stocks", units: "", buyPrice: "", currentPrice: "", purchaseDate: new Date().toISOString().split('T')[0], recurring: false, recurringAmount: "", frequency: "Monthly" });
  const [csvText, setCsvText] = useState<string>("");
  const [snapshots, setSnapshots] = useState<Array<{ date: string; value: number }>>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id || "anonymous";
      setUserId(uid);
      const raw = await secureGet(`investments:${uid}`);
      setHoldings(Array.isArray(raw) ? raw : []);
      const rawSnaps = await secureGet(`investment-snapshots:${uid}`);
      setSnapshots(Array.isArray(rawSnaps) ? rawSnaps : []);
    };
    load();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      await secureSet(`investments:${userId}`, holdings);
      await secureSet(`investment-snapshots:${userId}`, snapshots);
    })();
  }, [holdings, snapshots, userId]);

  const summary = useMemo(() => {
    const invested = holdings.reduce((a, h) => a + h.units * h.buyPrice, 0);
    const value = holdings.reduce((a, h) => a + h.units * h.currentPrice, 0);
    const pnl = value - invested;
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
    return { invested, value, pnl, pnlPct };
  }, [holdings]);

  const allocationData = useMemo(() => {
    const byType: Record<string, number> = {};
    holdings.forEach(h => { byType[h.type] = (byType[h.type] || 0) + h.units * h.currentPrice; });
    return Object.entries(byType).map(([name, value]) => ({ name, value }));
  }, [holdings]);

  const addHolding = () => {
    const units = Number(form.units);
    const buyPrice = Number(form.buyPrice);
    const currentPrice = Number(form.currentPrice || buyPrice);
    if (!form.name.trim() || isNaN(units) || isNaN(buyPrice) || units <= 0 || buyPrice < 0 || currentPrice < 0) return;
    setHoldings(prev => [...prev, { id: uuid(), name: form.name.trim(), type: form.type, units, buyPrice, currentPrice, purchaseDate: form.purchaseDate, recurring: form.recurring, recurringAmount: form.recurring ? Number(form.recurringAmount || 0) : undefined, frequency: form.recurring ? form.frequency : undefined }]);
    setForm({ name: "", type: "Stocks", units: "", buyPrice: "", currentPrice: "", purchaseDate: new Date().toISOString().split('T')[0], recurring: false, recurringAmount: "", frequency: "Monthly" });
  };

  const removeHolding = (id: string) => setHoldings(prev => prev.filter(h => h.id !== id));

  const editHolding = (id: string) => {
    const h = holdings.find(x => x.id === id);
    if (!h) return;
    const name = window.prompt("Name:", h.name) ?? h.name;
    const type = window.prompt("Type:", h.type) ?? h.type;
    const units = Number(window.prompt("Units:", String(h.units)) ?? h.units);
    const buyPrice = Number(window.prompt("Buy Price:", String(h.buyPrice)) ?? h.buyPrice);
    const currentPrice = Number(window.prompt("Current Price:", String(h.currentPrice)) ?? h.currentPrice);
    const purchaseDate = window.prompt("Purchase Date (YYYY-MM-DD):", h.purchaseDate || "") || h.purchaseDate;
    setHoldings(prev => prev.map(x => x.id === id ? { ...x, name, type, units, buyPrice, currentPrice, purchaseDate } : x));
  };

  const importCsv = () => {
    // Expected columns: name,type,units,buyPrice,currentPrice,purchaseDate,recurring,recurringAmount,frequency
    const lines = csvText.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return;
    const header = lines[0].split(',').map(s => s.trim().toLowerCase());
    const out: Holding[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const row: any = {};
      header.forEach((h, idx) => row[h] = (cols[idx] ?? '').trim());
      const units = Number(row.units || 0);
      const buyPrice = Number(row.buyprice || row.buy_price || 0);
      const currentPrice = Number(row.currentprice || row.current_price || buyPrice);
      if (!row.name || !row.type || !units) continue;
      out.push({
        id: uuid(),
        name: row.name,
        type: row.type,
        units,
        buyPrice,
        currentPrice,
        purchaseDate: row.purchasedate || row.purchase_date || undefined,
        recurring: row.recurring?.toLowerCase() === 'true',
        recurringAmount: row.recurringamount ? Number(row.recurringamount) : undefined,
        frequency: row.frequency || undefined,
      });
    }
    setHoldings(prev => [...prev, ...out]);
    setCsvText("");
  };

  // Add a snapshot of current portfolio value for history chart
  const takeSnapshot = () => {
    const val = summary.value;
    const date = new Date().toISOString().split('T')[0];
    setSnapshots(prev => [...prev, { date, value: val }]);
  };

  // Export holdings to CSV
  const exportHoldingsCsv = () => {
    const header = ['name','type','units','buyPrice','currentPrice','purchaseDate','recurring','recurringAmount','frequency'];
    const rows = holdings.map(h => [
      h.name,
      h.type,
      String(h.units),
      String(h.buyPrice),
      String(h.currentPrice),
      h.purchaseDate || '',
      String(!!h.recurring),
      h.recurringAmount != null ? String(h.recurringAmount) : '',
      h.frequency || ''
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'portfolio.csv';
    a.click();
  };

  // Export holdings summary to PDF
  const exportHoldingsPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Portfolio Summary', 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [["Metric","Amount (KSh)"]],
      body: [
        ["Invested", summary.invested.toLocaleString()],
        ["Current Value", summary.value.toLocaleString()],
        ["P&L", `${summary.pnl.toLocaleString()} (${summary.pnlPct.toFixed(1)}%)`],
      ]
    });
    const y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : 30;
    autoTable(doc, {
      startY: y,
      head: [["Name","Type","Units","Buy","Current","Value"]],
      body: holdings.map(h => [
        h.name,
        h.type,
        String(h.units),
        String(h.buyPrice),
        String(h.currentPrice),
        String((h.units*h.currentPrice).toFixed(2))
      ])
    });
    doc.save('portfolio.pdf');
  };

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><LineChartIcon className="h-5 w-5" /> Investment Tracker</CardTitle>
        <CardDescription>Track holdings and P&L (stored locally per user)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v: any) => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., ABC PLC" />
            </div>
            <div className="space-y-1">
              <Label>Units</Label>
              <Input type="number" inputMode="decimal" value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> Buy Price</Label>
              <Input type="number" inputMode="decimal" value={form.buyPrice} onChange={e => setForm(f => ({ ...f, buyPrice: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> Current Price</Label>
              <Input type="number" inputMode="decimal" value={form.currentPrice} onChange={e => setForm(f => ({ ...f, currentPrice: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label>Purchase Date</Label>
              <Input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Recurring Investment (optional)</Label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={String(form.recurring)} onValueChange={(v: any) => setForm(f => ({ ...f, recurring: v === 'true' }))}>
                  <SelectTrigger><SelectValue placeholder="Recurring?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Amount" type="number" inputMode="decimal" value={form.recurringAmount} onChange={e => setForm(f => ({ ...f, recurringAmount: e.target.value }))} />
                <Select value={form.frequency} onValueChange={(v: any) => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={addHolding} variant="hero" size="sm"><Plus className="h-4 w-4" /> Add Holding</Button>
            <div className="flex-1" />
            <Input placeholder="Paste CSV here (name,type,units,buyPrice,currentPrice,purchaseDate,recurring,recurringAmount,frequency)" value={csvText} onChange={e => setCsvText(e.target.value)} />
            <Button onClick={importCsv} variant="outline" size="sm"><Upload className="h-4 w-4" /> Import CSV</Button>
            <Button onClick={exportHoldingsCsv} variant="outline" size="sm"><Download className="h-4 w-4" /> CSV</Button>
            <Button onClick={exportHoldingsPdf} variant="outline" size="sm"><Download className="h-4 w-4" /> PDF</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded border bg-card">
              <div className="text-xs text-muted-foreground">Invested</div>
              <div className="text-xl font-semibold">KSh {summary.invested.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded border bg-card">
              <div className="text-xs text-muted-foreground">Current Value</div>
              <div className="text-xl font-semibold">KSh {summary.value.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded border bg-card">
              <div className="text-xs text-muted-foreground">P&L</div>
              <div className={`text-xl font-semibold ${summary.pnl >= 0 ? 'text-income' : 'text-expense'}`}>KSh {summary.pnl.toLocaleString()} <span className="text-sm text-muted-foreground">({summary.pnlPct.toFixed(1)}%)</span></div>
            </div>
          </div>

          {holdings.length === 0 ? (
            <div className="text-sm text-muted-foreground">No holdings yet.</div>
          ) : (
            <div className="space-y-3">
              {/* Allocation by type */}
              <Card className="shadow-none border">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2"><PieIcon className="h-4 w-4" /> Allocation by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  {allocationData.length ? (
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={allocationData} dataKey="value" nameKey="name" outerRadius={80}>
                            {allocationData.map((_, idx) => (
                              <Cell key={idx} fill={["#8884d8","#82ca9d","#ffc658","#ff7300","hsl(var(--primary))","hsl(var(--accent))"][idx % 6]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v)=>`KSh ${Number(v).toLocaleString()}`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div className="text-sm text-muted-foreground">No allocation data.</div>}
                </CardContent>
              </Card>

              {/* Portfolio history */}
              <Card className="shadow-none border">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2"><LineChartIcon className="h-4 w-4" /> Portfolio Value Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <Button size="sm" variant="outline" onClick={takeSnapshot}><Camera className="h-4 w-4" /> Snapshot Today</Button>
                  </div>
                  {snapshots.length ? (
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={snapshots}>
                          <XAxis dataKey="date" />
                          <YAxis tickFormatter={(v)=>`KSh ${Number(v).toLocaleString()}`} />
                          <Tooltip formatter={(v)=>`KSh ${Number(v).toLocaleString()}`} />
                          <Legend />
                          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div className="text-sm text-muted-foreground">No snapshots yet.</div>}
                </CardContent>
              </Card>

              {holdings.map(h => {
                const invested = h.units * h.buyPrice;
                const value = h.units * h.currentPrice;
                const pnl = value - invested;
                const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                return (
                  <div key={h.id} className="p-3 rounded border bg-card/50 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{h.name} <span className="text-xs text-muted-foreground">({h.type})</span></div>
                      <div className="text-xs text-muted-foreground flex gap-4 mt-1">
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Buy: {h.buyPrice}</span>
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Current: {h.currentPrice}</span>
                        <span>Units: {h.units}</span>
                        {h.purchaseDate && <span>Purchased: {h.purchaseDate}</span>}
                        {h.recurring && <Badge variant="secondary">Recurring {h.frequency} {h.recurringAmount ? `KSh ${h.recurringAmount}` : ''}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={pnl >= 0 ? 'default' : 'destructive'} className="flex items-center gap-1">
                        <Percent className="h-3 w-3" /> {pnlPct.toFixed(1)}%
                      </Badge>
                      <div className={`text-sm ${pnl >= 0 ? 'text-income' : 'text-expense'}`}>KSh {pnl.toLocaleString()}</div>
                      <Button size="icon" variant="ghost" onClick={() => editHolding(h.id)} title="Edit"><RefreshCw className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => removeHolding(h.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
