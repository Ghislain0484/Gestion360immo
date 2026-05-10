/**
 * Formats a number with dot as thousands separator for West African standards.
 * Example: 1000000 -> 1.000.000
 */
export const formatAmount = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '0';
  
  // Use a regex-based replacement for thousands separator to ensure it's a dot
  // toLocaleString with 'de-DE' also uses dots, but regex is more explicit
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const formatCurrency = (amount: number | null | undefined): string => {
  return `${formatAmount(amount)} FCFA`;
};
