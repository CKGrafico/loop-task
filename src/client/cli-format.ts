export function formatCmd(command: string, args: string[]): string {
  const full = `${command} ${args.join(" ")}`.trim();
  return full.length > 30 ? full.slice(0, 27) + "..." : full;
}

export function pad(str: string, width: number): string {
  return str.length >= width ? str + " " : str + " ".repeat(width - str.length);
}
