export function percent(correct: number, total: number) {
  if (!total) return 0;
  return Number(((correct / total) * 100).toFixed(1));
}
