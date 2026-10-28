import { useTheme } from "../lib/theme";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className={`rounded-full p-2.5 text-ink-600 bg-white/80 backdrop-blur shadow-sm ring-1 ring-ink-200 transition hover:bg-white hover:shadow-md dark:text-ink-300 dark:bg-ink-800/80 dark:ring-ink-700 dark:hover:bg-ink-800 ${className}`}
      title="Toggle theme"
      aria-label="Toggle dark or light mode"
    >
      {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}
