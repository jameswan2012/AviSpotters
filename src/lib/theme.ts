export const THEME_COOKIE = "fb_theme";
export type Theme = "dark" | "light";
export const DEFAULT_THEME: Theme = "dark";

export function resolveTheme(input: string | null | undefined): Theme {
  if (input === "light") return "light";
  return "dark";
}

