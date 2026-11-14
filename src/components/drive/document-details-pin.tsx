"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const DocumentDetailsPinContext = createContext<{
  pinnedId: string | null;
  toggle: (id: string) => void;
} | null>(null);

/** Shared pin state so only one document card shows details at a time on mobile. */
export function DocumentDetailsPinProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const toggle = useCallback((id: string) => {
    setPinnedId((current) => (current === id ? null : id));
  }, []);
  const value = useMemo(() => ({ pinnedId, toggle }), [pinnedId, toggle]);
  return (
    <DocumentDetailsPinContext.Provider value={value}>
      {children}
    </DocumentDetailsPinContext.Provider>
  );
}

export function useDocumentDetailsPin() {
  return useContext(DocumentDetailsPinContext);
}
