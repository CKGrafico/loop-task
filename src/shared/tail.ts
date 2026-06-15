export function tail(content: string, count: number): string[] {
  const lines = content.split("\n");
  return count > 0 ? lines.slice(-count) : lines;
}
