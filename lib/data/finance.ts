import type { FinanceTransactionRow } from '@/lib/data/types';

export function summarizeTransactions(rows: FinanceTransactionRow[]) {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.type === 'income') income += r.amount;
    else if (r.type === 'expense') expense += r.amount;
  }
  return {
    incomeTotal: income,
    expenseTotal: expense,
    net: income - expense,
    count: rows.length,
  };
}
