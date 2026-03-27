export function getColorFromEmail(email: string): string {
  const colors = [
    "#007AFF", "#34C759", "#FF9500", "#AF52DE",
    "#FF2D55", "#5AC8FA", "#FF3B30", "#FFCC00",
  ];
  let hash = 0;
  for (const char of email) hash = char.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}
