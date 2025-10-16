export type TxType = "income" | "expense";

const expenseRules: Record<string, string[]> = {
  "Food & Dining": [
    "restaurant","cafe","food","dining","kfc","pizza","burger","coffee","lunch","dinner","breakfast","groceries","supermarket","naivas","quickmart","carrefour"
  ],
  "Transportation": [
    "uber","taxi","matatu","bus","fuel","gas","parking","fare","bolt","little"
  ],
  "Shopping": [
    "shop","shopping","mall","clothes","fashion","electronics","jumia","amazon","jumbo"
  ],
  "Entertainment": [
    "movie","netflix","spotify","showmax","cinema","concert","entertainment","game"
  ],
  "Bills & Utilities": [
    "bill","electricity","kplc","water","internet","wifi","zuku","safaricom home","rent","subscription","airtime"
  ],
  "Healthcare": [
    "hospital","clinic","pharmacy","chemist","nhif","doctor","dentist","health"
  ],
  "Education": [
    "school","tuition","books","stationery","exam","course","university","college"
  ],
  "Travel": [
    "flight","airline","hotel","airbnb","travel","tour","visa","booking"
  ],
  "Other": []
};

const incomeRules: Record<string, string[]> = {
  "Salary": ["salary","payroll","wage","paycheck","stipend"],
  "Freelance": ["freelance","contract","gig","invoice","project"],
  "Business": ["business","sales","sale","revenue","payout"],
  "Investment": ["dividend","interest","returns","investment"],
  "Gift": ["gift","present","donation"],
  "Other": []
};

function findByKeywords(text: string, rules: Record<string, string[]>): string | undefined {
  const lowered = text.toLowerCase();
  for (const [category, keywords] of Object.entries(rules)) {
    for (const kw of keywords) {
      if (kw && lowered.includes(kw)) return category;
    }
  }
  return undefined;
}

export function getSuggestedCategory(
  type: TxType,
  description: string,
  tags: string[]
): string | undefined {
  const text = [description, ...(tags || [])].filter(Boolean).join(" ");
  if (!text.trim()) return undefined;
  if (type === "income") return findByKeywords(text, incomeRules) || "Salary";
  return findByKeywords(text, expenseRules) || "Other";
}
