import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { secureGet, secureSet } from "@/lib/secureStorage";

interface Item { id: string; name: string; value: number; group: "asset" | "liability"; type: string }

const ASSET_TYPES = ["Cash", "Bank", "Investments", "Property", "Vehicle", "Other"];
const LIABILITY_TYPES = ["Credit Card", "Loan", "Mortgage", "Student Loan", "Other"];

function uuid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export const NetWorthManager = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ group: "asset" as "asset" | "liability", name: "", value: "", type: "Cash" });

  // Load and persist per-user in localStorage
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id || "anonymous";
      setUserId(uid);
      const raw = await secureGet(`networth:${uid}`);
      setItems(Array.isArray(raw) ? raw : []);
    };
    load();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      await secureSet(`networth:${userId}`, items);
    })();
  }, [items, userId]);

  const totals = useMemo(() => {
    const assets = items.filter(i => i.group === "asset").reduce((a, b) => a + (b.value || 0), 0);
    const liabilities = items.filter(i => i.group === "liability").reduce((a, b) => a + (b.value || 0), 0);
    return { assets, liabilities, net: assets - liabilities };
  }, [items]);

  const addItem = () => {
    if (!form.name.trim() || !form.value) return;
    const value = Number(form.value);
    if (isNaN(value)) return;
    setItems(prev => [...prev, { id: uuid(), name: form.name.trim(), value, group: form.group, type: form.type }]);
    setForm({ group: "asset", name: "", value: "", type: "Cash" });
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Net Worth</CardTitle>
        <CardDescription>Track assets and liabilities. Stored locally per user.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1 md:col-span-1">
                <Label>Group</Label>
                <Select value={form.group} onValueChange={(v: any) => setForm(f => ({ ...f, group: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v: any) => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(form.group === "asset" ? ASSET_TYPES : LIABILITY_TYPES).map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-1">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Savings Account" />
              </div>
              <div className="space-y-1 md:col-span-1">
                <Label>Value (KSh)</Label>
                <Input type="number" inputMode="decimal" value={form.value} onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div>
              <Button onClick={addItem} variant="hero" size="sm"><Plus className="h-4 w-4" /> Add</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Assets</h4>
                <div className="space-y-2">
                  {items.filter(i => i.group === "asset").map(i => (
                    <div key={i.id} className="p-2 rounded border flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{i.name}</div>
                        <div className="text-xs text-muted-foreground">{i.type}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-income">KSh {i.value.toLocaleString()}</div>
                        <Button size="icon" variant="ghost" onClick={() => removeItem(i.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Liabilities</h4>
                <div className="space-y-2">
                  {items.filter(i => i.group === "liability").map(i => (
                    <div key={i.id} className="p-2 rounded border flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{i.name}</div>
                        <div className="text-xs text-muted-foreground">{i.type}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-expense">KSh {i.value.toLocaleString()}</div>
                        <Button size="icon" variant="ghost" onClick={() => removeItem(i.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm text-muted-foreground">Total Assets</div>
                <TrendingUp className="h-4 w-4 text-income" />
              </div>
              <div className="text-2xl font-semibold text-income">KSh {totals.assets.toLocaleString()}</div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm text-muted-foreground">Total Liabilities</div>
                <TrendingDown className="h-4 w-4 text-expense" />
              </div>
              <div className="text-2xl font-semibold text-expense">KSh {totals.liabilities.toLocaleString()}</div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm text-muted-foreground">Net Worth</div>
                <Badge variant={totals.net >= 0 ? "default" : "destructive"}>{totals.net >= 0 ? "Positive" : "Negative"}</Badge>
              </div>
              <div className={`text-3xl font-bold ${totals.net >= 0 ? 'text-income' : 'text-expense'}`}>KSh {totals.net.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
