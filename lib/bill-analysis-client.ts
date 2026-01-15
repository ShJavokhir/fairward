/**
 * Bill Buster - Client-safe utility functions
 * These can be imported in both client and server components
 */

import type { BillAnalysis } from "./types/bill-analysis";

/**
 * Build initial chat message summarizing the analysis
 */
export function buildInitialChatMessage(analysis: BillAnalysis): string {
  const issueCount = analysis.issues.length;
  const savingsMax = analysis.totals.potentialSavings.max;

  if (issueCount === 0) {
    return `I've reviewed your bill and didn't find any obvious errors or overcharges. Your total bill is $${analysis.totals.billed.toLocaleString()}.

That said, there are still ways you might be able to reduce your costs:

1. **Request an itemized bill** if this is a summary - you have a right to see every charge
2. **Ask about self-pay discounts** - many hospitals offer 20-40% off
3. **Inquire about financial assistance** - most hospitals have charity care programs
4. **Request a payment plan** - usually interest-free

Would you like help with any of these, or do you have questions about specific charges?`;
  }

  const biggestIssue = analysis.issues.reduce((max, issue) =>
    issue.estimatedSavings > max.estimatedSavings ? issue : max
  );

  return `I found **${issueCount} potential issue${issueCount > 1 ? "s" : ""}** with your bill totaling up to **$${savingsMax.toLocaleString()}** in possible savings.

The biggest issue is a **${biggestIssue.title.toLowerCase()}** that could save you $${biggestIssue.estimatedSavings.toLocaleString()}: ${biggestIssue.shortDescription}

Click any issue in the panel above to learn more, or ask me a question about your bill.`;
}
