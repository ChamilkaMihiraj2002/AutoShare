export const formatLkr = (amount: number): string => {
  const normalized = Number.isFinite(amount) ? amount : 0;
  return `Rs ${new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(normalized)}`;
};
