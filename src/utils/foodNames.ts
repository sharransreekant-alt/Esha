// Foods are stored lower-case so "Pear" and "pear " are the same food.
export function normFood(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function showFood(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
