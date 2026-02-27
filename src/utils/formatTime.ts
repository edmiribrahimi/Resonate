/** Strip seconds from a time string: "22:00:00" → "22:00" */
export function formatTime(time: string): string {
  const parts = time.split(":");
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
}
