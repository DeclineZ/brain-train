"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Theme = "default" | "pastel" | "neon";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
    children,
    initialTheme = "default",
}: {
    children: React.ReactNode;
    initialTheme?: Theme;
}) {
    const [theme, setThemeState] = useState<Theme>(initialTheme);
    const router = useRouter();

    useEffect(() => {
        // Apply theme class to body
        const body = document.body;
        body.classList.remove("theme-default", "theme-pastel", "theme-neon");

        if (theme !== "default") {
            body.classList.add(`theme-${theme}`);
        }

        // Set cookie for server-side awareness (optional but good for persistence)
        document.cookie = `theme=${theme}; path=/; max-age=31536000`;
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
