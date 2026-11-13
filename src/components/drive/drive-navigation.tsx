"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

type DriveNavigationContextValue = {
  isPending: boolean;
  setSearchPending: (pending: boolean) => void;
  navigate: (href: string, options?: { replace?: boolean }) => void;
};

const DriveNavigationContext =
  createContext<DriveNavigationContextValue | null>(null);

export function DriveNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const [searchPending, setSearchPending] = useState(false);
  const wasNavigatingRef = useRef(false);

  const navigate = useCallback(
    (href: string, options?: { replace?: boolean }) => {
      startTransition(() => {
        if (options?.replace) {
          router.replace(href);
        } else {
          router.push(href);
        }
      });
    },
    [router]
  );

  // When a route transition finishes, always drop the search pending flag.
  useEffect(() => {
    if (wasNavigatingRef.current && !isNavigating) {
      setSearchPending(false);
    }
    wasNavigatingRef.current = isNavigating;
  }, [isNavigating]);

  const value = useMemo(
    () => ({
      isPending: isNavigating || searchPending,
      setSearchPending,
      navigate,
    }),
    [isNavigating, searchPending, navigate]
  );

  return (
    <DriveNavigationContext.Provider value={value}>
      {children}
    </DriveNavigationContext.Provider>
  );
}

export function useDriveNavigation(): DriveNavigationContextValue {
  const context = useContext(DriveNavigationContext);
  if (!context) {
    throw new Error(
      "useDriveNavigation must be used within DriveNavigationProvider"
    );
  }
  return context;
}
