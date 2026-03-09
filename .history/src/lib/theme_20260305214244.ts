export type ThemeMode = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "theme";
const prefersDarkQuery = "(prefers-color-scheme: dark)";

let mediaListenerCleanup: (() => void) | null = null;

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === "system" || value === "light" || value === "dark";

const setDarkClass = (enabled: boolean): void => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", enabled);
};

const clearSystemListener = (): void => {
  if (!mediaListenerCleanup) return;
  mediaListenerCleanup();
  mediaListenerCleanup = null;
};

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeMode(raw) ? raw : "system";
}

export function setStoredTheme(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof window === "undefined") return;

  clearSystemListener();

  if (mode === "light") {
    setDarkClass(false);
    return;
  }

  if (mode === "dark") {
    setDarkClass(true);
    return;
  }

  const mediaQuery = window.matchMedia(prefersDarkQuery);
  const applySystemTheme = (): void => {
    setDarkClass(mediaQuery.matches);
  };

  applySystemTheme();

  const handleChange = (): void => {
    applySystemTheme();
  };

  mediaQuery.addEventListener("change", handleChange);
  mediaListenerCleanup = () => {
    mediaQuery.removeEventListener("change", handleChange);
  };
}