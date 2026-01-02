/**
[IDENTITY]: Global Accessibility State Provider
Manages User Preferences for A11y(Contrast, Motion, Theme).

[INPUT]:
    - Children(App Tree).
- LocalStorage(Persistence).

[LINK]:
- Context -> React Context API

[OUTPUT]: Context Values(highContrast, reduceMotion).
[POS]: /frontend/src / components / providers / AccessibilityProvider.tsx

[PROTOCOL]:
1. ** Persistence **: Sync all states to LocalStorage immediately.
2. ** DOM Injection **: Apply classes(`high-contrast`, `usage-data`) to`<html>`.
 */
'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'high-contrast';

interface AccessibilityContextType {
    highContrast: boolean;
    toggleHighContrast: () => void;
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    reduceMotion: boolean;
    toggleReduceMotion: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const STORAGE_KEYS = {
    HIGH_CONTRAST: 'e-business-high-contrast',
    THEME: 'e-business-theme',
    REDUCE_MOTION: 'e-business-reduce-motion',
} as const;

interface AccessibilityProviderProps {
    children: ReactNode;
}

/**
 * AccessibilityProvider
 * 提供可访问性设置的全局状态管理，包括高对比度模式、主题和减少动画
 */
export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
    const [highContrast, setHighContrast] = useState(false);
    const [theme, setThemeState] = useState<ThemeMode>('dark');
    const [reduceMotion, setReduceMotion] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Load settings from localStorage on mount
    useEffect(() => {
        setMounted(true);

        // Load high contrast setting
        const savedHighContrast = localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST);
        if (savedHighContrast === 'true') {
            setHighContrast(true);
        }

        // Load theme
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as ThemeMode | null;
        if (savedTheme && ['light', 'dark', 'high-contrast'].includes(savedTheme)) {
            setThemeState(savedTheme);
        }

        // Load reduce motion preference (also check system preference)
        const savedReduceMotion = localStorage.getItem(STORAGE_KEYS.REDUCE_MOTION);
        const systemReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setReduceMotion(savedReduceMotion === 'true' || systemReduceMotion);
    }, []);

    // Apply high contrast mode to document
    useEffect(() => {
        if (!mounted) return;

        if (highContrast) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
        localStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST, String(highContrast));
    }, [highContrast, mounted]);

    // Apply theme to document
    useEffect(() => {
        if (!mounted) return;

        document.documentElement.classList.remove('light', 'dark', 'high-contrast');
        document.documentElement.classList.add(theme);
        localStorage.setItem(STORAGE_KEYS.THEME, theme);
    }, [theme, mounted]);

    // Apply reduce motion
    useEffect(() => {
        if (!mounted) return;

        if (reduceMotion) {
            document.documentElement.classList.add('reduce-motion');
        } else {
            document.documentElement.classList.remove('reduce-motion');
        }
        localStorage.setItem(STORAGE_KEYS.REDUCE_MOTION, String(reduceMotion));
    }, [reduceMotion, mounted]);

    const toggleHighContrast = () => {
        setHighContrast(prev => !prev);
    };

    const setTheme = (newTheme: ThemeMode) => {
        setThemeState(newTheme);
        if (newTheme === 'high-contrast') {
            setHighContrast(true);
        }
    };

    const toggleReduceMotion = () => {
        setReduceMotion(prev => !prev);
    };

    return (
        <AccessibilityContext.Provider
            value={{
                highContrast,
                toggleHighContrast,
                theme,
                setTheme,
                reduceMotion,
                toggleReduceMotion,
            }}
        >
            {children}
        </AccessibilityContext.Provider>
    );
}

/**
 * useAccessibility hook
 * 获取和控制可访问性设置
 */
export function useAccessibility() {
    const context = useContext(AccessibilityContext);
    if (context === undefined) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider');
    }
    return context;
}

export default AccessibilityProvider;
