import { createContext, useContext, type ReactNode } from "react";

interface MonthlyPackCustomizationContextValue {
  disabled?: boolean;
  onAddItem: () => void;
}

const MonthlyPackCustomizationContext = createContext<MonthlyPackCustomizationContextValue | null>(null);

/**
 * Keeps client-specific pack editing separate from the checklist's core upload/review logic.
 * The checklist can show an Add button when this provider is present, while other checklist
 * consumers remain unchanged and do not need client-profile dependencies.
 */
export function MonthlyPackCustomizationProvider({
  children,
  disabled = false,
  onAddItem,
}: MonthlyPackCustomizationContextValue & { children: ReactNode }) {
  return (
    <MonthlyPackCustomizationContext.Provider value={{ disabled, onAddItem }}>
      {children}
    </MonthlyPackCustomizationContext.Provider>
  );
}

export function useMonthlyPackCustomization() {
  return useContext(MonthlyPackCustomizationContext);
}
