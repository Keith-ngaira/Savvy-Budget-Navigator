import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Users, DollarSign } from "lucide-react";

interface SplitMember {
  name: string;
  percentage: number;
}

interface SplitExpense {
  id: string;
  description: string;
  totalAmount: number;
  members: SplitMember[];
  date: string;
  settled: boolean;
}

export const ExpenseSplitting = ({ onSplitCreated }: { onSplitCreated?: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [splits, setSplits] = useState<SplitExpense[]>([]);
  const [formData, setFormData] = useState({
    description: "",
    totalAmount: "",
    members: [{ name: "", percentage: 0 }],
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const addMember = () => {
    setFormData({
      ...formData,
      members: [...formData.members, { name: "", percentage: 0 }],
    });
  };

  const removeMember = (index: number) => {
    const newMembers = formData.members.filter((_, i) => i !== index);
    setFormData({ ...formData, members: newMembers });
  };

  const updateMember = (index: number, field: keyof SplitMember, value: string | number) => {
    const newMembers = [...formData.members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setFormData({ ...formData, members: newMembers });
  };

  const calculateSplit = (amount: number, percentage: number) => {
    return (amount * percentage) / 100;
  };

  const handleCreateSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const totalPercentage = formData.members.reduce((sum, m) => sum + m.percentage, 0);
      if (totalPercentage !== 100) {
        toast({
          title: "Error",
          description: "Percentages must add up to 100%",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in",
          variant: "destructive",
        });
        return;
      }

      const amount = parseFloat(formData.totalAmount);
      const splitRecord: SplitExpense = {
        id: Date.now().toString(),
        description: formData.description,
        totalAmount: amount,
        members: formData.members.filter(m => m.name),
        date: new Date().toISOString().split('T')[0],
        settled: false,
      };

      setSplits([...splits, splitRecord]);

      toast({
        title: "Success",
        description: `Split expense created for ${formData.members.filter(m => m.name).length} people`,
      });

      setFormData({
        description: "",
        totalAmount: "",
        members: [{ name: "", percentage: 0 }],
      });
      setIsOpen(false);
      onSplitCreated?.();
    } catch (err) {
      console.error("Error creating split:", err);
      toast({
        title: "Error",
        description: "Failed to create split expense",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Expense Splitting
          </div>
          <Button onClick={() => setIsOpen(!isOpen)} variant="hero" size="sm">
            <Plus className="h-4 w-4" />
            New Split
          </Button>
        </CardTitle>
        <CardDescription>
          Track and split expenses with friends or family
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isOpen && (
          <form onSubmit={handleCreateSplit} className="space-y-4 mb-6 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label htmlFor="description">Expense Description</Label>
              <Input
                id="description"
                placeholder="e.g., Dinner at restaurant"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalAmount">Total Amount (KSh)</Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-3">
              <Label>Members & Percentages</Label>
              {formData.members.map((member, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <Input
                      placeholder="Name"
                      value={member.name}
                      onChange={(e) => updateMember(index, "name", e.target.value)}
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs text-muted-foreground">%</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={member.percentage || ""}
                      onChange={(e) => updateMember(index, "percentage", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  {member.name && (
                    <div className="text-sm font-medium text-muted-foreground">
                      KSh {calculateSplit(parseFloat(formData.totalAmount) || 0, member.percentage).toLocaleString()}
                    </div>
                  )}
                  {formData.members.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMember}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" variant="hero" disabled={isLoading} className="flex-1">
                {isLoading ? "Creating..." : "Create Split"}
              </Button>
            </div>
          </form>
        )}

        {splits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No expense splits yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {splits.map((split) => (
              <div key={split.id} className="border rounded-lg p-4 bg-card/50">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{split.description}</h4>
                    <p className="text-sm text-muted-foreground">{split.date}</p>
                  </div>
                  <Badge variant={split.settled ? "default" : "secondary"}>
                    {split.settled ? "Settled" : "Pending"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {split.members.map((member, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                      <span>{member.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{member.percentage}%</span>
                        <span className="font-medium">KSh {calculateSplit(split.totalAmount, member.percentage).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                  <span className="text-sm font-medium">Total</span>
                  <span className="font-semibold text-lg">KSh {split.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
