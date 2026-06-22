import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, DollarSign, Percent, Plus, Trash2, CalendarDays, AlertTriangle } from "lucide-react";
import { secureGet, secureSet } from "@/lib/secureStorage";

interface Debt {
  id: string;
  name: string;
  principal: number;
  apr: number; // annual percentage rate (e.g., 16 for 16%)
  termMonths: number;
  startDate: string; // ISO date
  frequency: 'Monthly' | 'Weekly';
  paymentType: 'Amortizing' | 'InterestOnly' | 'Bullet';
}

interface ScheduleRow {
  month: number;
  date: string;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

interface PaymentRecord { id: string; debtId: string; date: string; amount: number; late?: boolean }

function uuid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function periodicPayment(principal: number, apr: number, n: number, frequency: Debt['frequency']) {
  const periodsPerYear = frequency === 'Weekly' ? 52 : 12;
  const r = apr / 100 / periodsPerYear;
  
  console.log('=== periodicPayment ===');
  console.log('Principal:', principal);
  console.log('APR:', apr);
  console.log('Number of periods (n):', n);
  console.log('Frequency:', frequency);
  console.log('Periods per year:', periodsPerYear);
  console.log('Monthly rate (r):', r);

  if (r === 0) {
    const result = n > 0 ? principal / n : 0;
    console.log('Zero interest payment:', result);
    return result;
  }

  const numerator = r * Math.pow(1 + r, n);
  const denominator = Math.pow(1 + r, n) - 1;
  const payment = principal * (numerator / denominator);
  
  console.log('Numerator (r*(1+r)^n):', numerator);
  console.log('Denominator ((1+r)^n - 1):', denominator);
  console.log('Calculated payment:', payment);
  console.log('Rounded payment (2 decimals):', Number(payment.toFixed(2)));
  console.log('======================');
  
  return payment;
}

function addPeriods(date: Date, freq: Debt['frequency'], k: number) {
  const d = new Date(date);
  if (freq === 'Weekly') d.setDate(d.getDate() + 7 * k);
  else d.setMonth(d.getMonth() + k);
  return d;
}

function periodsCount(debt: Debt) {
  // For weekly payments, convert months to weeks (approximate)
  if (debt.frequency === 'Weekly') {
    return Math.round(debt.termMonths * (52 / 12));
  }
  // For monthly payments, use the term as-is (in months)
  return debt.termMonths;
}

function buildSchedule(debt: Debt): ScheduleRow[] {
  console.log('\n=== buildSchedule ===');
  console.log('Debt object:', JSON.parse(JSON.stringify(debt)));
  
  const rows: ScheduleRow[] = [];
  let balance = debt.principal;
  const n = Math.round(periodsCount(debt));
  
  console.log('Calculating payment for:');
  console.log('- Principal:', debt.principal);
  console.log('- APR:', debt.apr);
  console.log('- Term (months from periodsCount):', n);
  console.log('- Frequency:', debt.frequency);
  
  const payAm = Number(periodicPayment(debt.principal, debt.apr, n, debt.frequency).toFixed(2));
  console.log('Final calculated payment amount:', payAm);
  
  const start = new Date(debt.startDate);
  console.log('Start date:', start);
  console.log('=====================\n');
  for (let p = 1; p <= n; p++) {
    const periodsPerYear = debt.frequency === 'Weekly' ? 52 : 12;
    const r = debt.apr / 100 / periodsPerYear;
    let payment = 0, interest = 0, principalPaid = 0;
    if (debt.paymentType === 'Amortizing') {
      payment = payAm;
      interest = Number((balance * r).toFixed(2));
      principalPaid = Number((payment - interest).toFixed(2));
      if (p === n) principalPaid = balance; // clear rounding
    } else if (debt.paymentType === 'InterestOnly') {
      interest = Number((balance * r).toFixed(2));
      principalPaid = (p === n) ? balance : 0;
      payment = interest + principalPaid;
    } else { // Bullet
      interest = Number((balance * r).toFixed(2));
      principalPaid = (p === n) ? balance : 0;
      payment = interest + principalPaid;
    }
    balance = Number((balance - principalPaid).toFixed(2));
    const due = addPeriods(start, debt.frequency, p);
    rows.push({
      month: p,
      date: due.toISOString().split('T')[0],
      payment,
      interest,
      principal: principalPaid,
      balance: Math.max(0, balance),
    });
  }
  return rows;
}

export const DebtManager = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", principal: "", apr: "", termMonths: "", startDate: new Date().toISOString().split('T')[0], frequency: 'Monthly' as Debt['frequency'], paymentType: 'Amortizing' as Debt['paymentType'] });
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [extraInputs, setExtraInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id || "anonymous";
      setUserId(uid);
      const raw = await secureGet(`debts:${uid}`);
      setDebts(Array.isArray(raw) ? raw : []);
      const rawP = await secureGet(`debt-payments:${uid}`);
      setPayments(Array.isArray(rawP) ? rawP : []);
    };
    load();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      await secureSet(`debts:${userId}`, debts);
      await secureSet(`debt-payments:${userId}`, payments);
    })();
  }, [debts, payments, userId]);

  const summaries = useMemo(() => {
    const debtsArray = Array.isArray(debts) ? debts : [];
    const paymentsArray = Array.isArray(payments) ? payments : [];
    return debtsArray.map(d => {
      const schedule = buildSchedule(d);
      const paid = paymentsArray.filter(p => p.debtId === d.id).reduce((a,b)=>a+b.amount,0);
      const totalInterest = schedule.reduce((a, r) => a + r.interest, 0);
      const remainingBalance = schedule.at(-1)?.balance ?? Math.max(0, d.principal - (schedule.reduce((a,r)=>a+r.principal,0)));
      const next = schedule.find(r => new Date(r.date) >= new Date());
      const yearsLeft = next ? Math.max(0, Math.ceil((new Date(schedule.at(-1)!.date).getTime() - new Date().getTime()) / (1000*60*60*24*365))) : 0;
      return { id: d.id, originalPrincipal: d.principal, remainingBalance, totalInterest, nextDue: next?.date || schedule.at(-1)?.date, scheduledPayment: schedule[0]?.payment || 0, totalPaidToDate: paid, yearsLeft };
    });
  }, [debts]);

  // Payoff priority suggestions (debt avalanche by APR)
  const payoffSuggestions = useMemo(() => {
    const byApr = [...debts].sort((a,b)=> b.apr - a.apr).map(d=>({ id: d.id, name: d.name, apr: d.apr }));
    const byBalance = [...debts].sort((a,b)=> a.principal - b.principal).map(d=>({ id: d.id, name: d.name, balance: d.principal }));
    return { byApr, byBalance };
  }, [debts]);

  const addDebt = () => {
    if (!form.name.trim()) return;
    const principal = Number(form.principal);
    const apr = Number(form.apr);
    let termMonths = Number(form.termMonths);
    
    // Ensure term is at least 1 month
    if (termMonths < 1) {
      alert('Term must be at least 1 month');
      return;
    }
    
    if ([principal, apr, termMonths].some(x => isNaN(x) || x <= 0)) {
      alert('Please enter valid numbers for all fields');
      return;
    }
    
    const startDate = form.startDate;
    setDebts(prev => [...prev, { id: uuid(), name: form.name.trim(), principal, apr, termMonths, startDate, frequency: form.frequency, paymentType: form.paymentType }]);
    setForm({ name: "", principal: "", apr: "", termMonths: "", startDate: new Date().toISOString().split('T')[0], frequency: 'Monthly', paymentType: 'Amortizing' });
  };

  const removeDebt = (id: string) => setDebts(prev => prev.filter(d => d.id !== id));

  const addPayment = (debtId: string) => {
    const amount = Number(window.prompt('Payment amount:', '0') || 0);
    if (!amount || amount <= 0) return;
    const date = (window.prompt('Payment date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]) || '').trim();
    if (!date) return;
    // Mark late if paid after scheduled due date
    const debt = debts.find(d => d.id === debtId);
    const schedule = debt ? buildSchedule(debt) : [];
    const nextDue = schedule.find(r => new Date(r.date) >= new Date(date)) || schedule.at(-1);
    const late = !!(nextDue && new Date(date) > new Date(nextDue.date));
    setPayments(prev => [...prev, { id: uuid(), debtId, date, amount, late }]);
  };

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg">Debt & Loan Tracker</CardTitle>
        <CardDescription>Payment schedules and totals (stored locally per user)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Payoff priority suggestions */}
          {debts.length > 1 && (
            <div className="p-3 rounded-lg border bg-card/50">
              <div className="text-sm font-medium mb-1">Payoff Priority Suggestions</div>
              <div className="text-xs text-muted-foreground">Avalanche (by APR): {payoffSuggestions.byApr.map(d=>`${d.name} (${d.apr}%)`).join(' → ')}</div>
              <div className="text-xs text-muted-foreground">Snowball (by Balance): {payoffSuggestions.byBalance.map(d=>`${d.name} (KSh ${d.balance?.toLocaleString?.() ?? d.balance})`).join(' → ')}</div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input placeholder="e.g., Student Loan" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> Principal</Label>
              <Input type="number" inputMode="decimal" placeholder="0.00" value={form.principal} onChange={e => setForm(f => ({ ...f, principal: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1"><Percent className="h-4 w-4" /> APR (%)</Label>
              <Input type="number" inputMode="decimal" placeholder="0" value={form.apr} onChange={e => setForm(f => ({ ...f, apr: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Term (months)</Label>
              <Input type="number" placeholder="12" value={form.termMonths} onChange={e => setForm(f => ({ ...f, termMonths: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Start Date</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Frequency</Label>
              <select className="border rounded h-9 px-2 bg-card w-full" value={form.frequency} onChange={(e)=>setForm(f=>({...f, frequency: e.target.value as Debt['frequency']}))}>
                <option>Monthly</option>
                <option>Weekly</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Payment Type</Label>
              <select className="border rounded h-9 px-2 bg-card w-full" value={form.paymentType} onChange={(e)=>setForm(f=>({...f, paymentType: e.target.value as Debt['paymentType']}))}>
                <option>Amortizing</option>
                <option>InterestOnly</option>
                <option>Bullet</option>
              </select>
            </div>
          </div>
          <div>
            <Button onClick={addDebt} variant="hero" size="sm"><Plus className="h-4 w-4" /> Add Debt</Button>
          </div>

          {debts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No debts added yet.</div>
          ) : (
            <div className="space-y-4">
              {debts.map(d => {
                const s = summaries.find(x => x.id === d.id)!;
                const schedule = buildSchedule(d);
                const extra = Number(extraInputs[d.id] || 0);
                const periodsPerYear = d.frequency === 'Weekly' ? 52 : 12;
                const withExtraSchedule = extra > 0 && d.paymentType === 'Amortizing'
                  ? (()=>{
                      let rows: ScheduleRow[] = [];
                      let balance = d.principal;
                      const n = Math.round(periodsCount(d));
                      const basePay = periodicPayment(d.principal, d.apr, n, d.frequency);
                      for (let p=1; p<=n && balance>0; p++){
                        const r = d.apr/100/periodsPerYear;
                        const interest = Number((balance*r).toFixed(2));
                        let principalPaid = Number((basePay + extra - interest).toFixed(2));
                        if (principalPaid > balance) principalPaid = balance;
                        balance = Number((balance - principalPaid).toFixed(2));
                        const due = addPeriods(new Date(d.startDate), d.frequency, p);
                        rows.push({ month: p, date: due.toISOString().split('T')[0], payment: principalPaid+interest, interest, principal: principalPaid, balance: Math.max(0, balance) });
                        if (balance <= 0) break;
                      }
                      return rows;
                    })()
                  : undefined;
                const extraImpact = withExtraSchedule ? {
                  periodsSaved: Math.max(0, schedule.length - withExtraSchedule.length),
                  interestSaved: Math.max(0, schedule.reduce((a,r)=>a+r.interest,0) - withExtraSchedule.reduce((a,r)=>a+r.interest,0))
                } : undefined;
                return (
                  <div key={d.id} className="p-4 rounded-lg border bg-card/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{d.name}</div>
                        <div className="text-xs text-muted-foreground flex gap-4 mt-1">
                          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Principal: KSh {d.principal.toLocaleString()}</span>
                          <span className="flex items-center gap-1"><Percent className="h-3 w-3" /> APR: {d.apr}%</span>
                          <span>Term: {d.termMonths} mo</span>
                          <span>Freq: {d.frequency}</span>
                          <span>Type: {d.paymentType}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Next: {s.nextDue}</Badge>
                        <Button size="icon" variant="ghost" onClick={() => removeDebt(d.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-3">
                      <div className="p-3 rounded border bg-card">
                        <div className="text-xs text-muted-foreground">Scheduled Payment</div>
                        <div className="text-lg font-semibold">KSh {(s.scheduledPayment || 0).toLocaleString()}</div>
                      </div>
                      <div className="p-3 rounded border bg-card">
                        <div className="text-xs text-muted-foreground">Total Interest (Schedule)</div>
                        <div className="text-lg font-semibold">KSh {(s.totalInterest || 0).toLocaleString()}</div>
                      </div>
                      <div className="p-3 rounded border bg-card">
                        <div className="text-xs text-muted-foreground">Total Paid To Date</div>
                        <div className="text-lg font-semibold">KSh {(s.totalPaidToDate || 0).toLocaleString()}</div>
                      </div>
                      <div className="p-3 rounded border bg-card">
                        <div className="text-xs text-muted-foreground">Remaining Balance</div>
                        <div className="text-lg font-semibold">KSh {(s.remainingBalance || 0).toLocaleString()}</div>
                      </div>
                      <div className="p-3 rounded border bg-card">
                        <div className="text-xs text-muted-foreground">Years Left</div>
                        <div className="text-lg font-semibold">{s.yearsLeft}</div>
                      </div>
                    </div>

                    {/* Extra payment what-if */}
                    <div className="mt-3 p-3 rounded border bg-card">
                      <div className="text-sm font-medium mb-2">What-if: Extra Payment per {d.frequency === 'Weekly' ? 'Week' : 'Month'}</div>
                      <div className="flex items-center gap-2">
                        <Input className="max-w-[200px]" placeholder="0" type="number" inputMode="decimal" value={extraInputs[d.id] || ''} onChange={(e)=> setExtraInputs(prev=>({...prev, [d.id]: e.target.value}))} />
                        {extraImpact && (
                          <div className="text-xs text-muted-foreground">
                            Save {extraImpact.periodsSaved} periods and KSh {extraImpact.interestSaved.toLocaleString()} interest
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Due alerts */}
                    {s.nextDue && new Date(s.nextDue) <= new Date(new Date().getTime() + 1000*60*60*24*7) && (
                      <div className="mt-3 p-2 bg-warning/10 border border-warning/20 rounded text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        Upcoming payment due by {s.nextDue}
                      </div>
                    )}

                    {/* Payments section */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">Payments</div>
                        <Button size="sm" variant="outline" onClick={() => addPayment(d.id)}>Add Payment</Button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-muted-foreground">
                              <th className="py-1 pr-4">Date</th>
                              <th className="py-1 pr-4">Amount</th>
                              <th className="py-1 pr-4">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payments.filter(p=>p.debtId===d.id).map(p => (
                              <tr key={p.id} className="border-t">
                                <td className="py-1 pr-4">{p.date}</td>
                                <td className="py-1 pr-4">KSh {p.amount.toLocaleString()}</td>
                                <td className="py-1 pr-4">{p.late ? <Badge variant="destructive">Late</Badge> : <Badge variant="secondary">On time</Badge>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="overflow-x-auto mt-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="py-1 pr-4">#</th>
                            <th className="py-1 pr-4">Date</th>
                            <th className="py-1 pr-4">Payment</th>
                            <th className="py-1 pr-4">Interest</th>
                            <th className="py-1 pr-4">Principal</th>
                            <th className="py-1 pr-4">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schedule.slice(0, 12).map(r => (
                            <tr key={r.month} className="border-t">
                              <td className="py-1 pr-4">{r.month}</td>
                              <td className="py-1 pr-4">{r.date}</td>
                              <td className="py-1 pr-4">KSh {r.payment.toLocaleString()}</td>
                              <td className="py-1 pr-4">KSh {r.interest.toLocaleString()}</td>
                              <td className="py-1 pr-4">KSh {r.principal.toLocaleString()}</td>
                              <td className="py-1 pr-4">KSh {r.balance.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {schedule.length > 12 && (
                        <div className="text-xs text-muted-foreground mt-1">Showing first 12 periods of schedule.</div>
                      )}
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
};
