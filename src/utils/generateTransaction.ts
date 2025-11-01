export const generateTransaction = (
  transaction: any,
  locale: string,
  dateStr: any,
  codesFormatted: any,
  instructions: any,
) => {
  return `
==============================
  Purchase Confirmation
==============================

Transaction ID:   ${transaction.orderId}
Buyer Email:      ${transaction.email}
Date:             ${dateStr}
Cheat:            ${transaction.cheat[`title${locale === 'ru' ? 'Ru' : 'En'}`]},
Quantity:         ${transaction.count}
Total Price:      ${transaction.checkoutedPrice.toFixed(2)}

------------------------------
🧾 Your Code(s)
------------------------------
${codesFormatted || 'No codes found'}

------------------------------
📘 Instructions
------------------------------
${instructions}
  `.trim();
};
