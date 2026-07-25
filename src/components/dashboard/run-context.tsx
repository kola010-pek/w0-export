'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface RunContextType {
  currentRunId: string | null;
  setCurrentRunId: (runId: string | null) => void;
  clearRunId: () => void;
}

const RunContext = createContext<RunContextType>({
  currentRunId: null,
  setCurrentRunId: () => {},
  clearRunId: () => {},
});

export function RunProvider({ children }: { children: ReactNode }) {
  const [currentRunId, setCurrentRunIdState] = useState<string | null>(null);

  const setCurrentRunId = useCallback((runId: string | null) => {
    setCurrentRunIdState(runId);
  }, []);

  const clearRunId = useCallback(() => {
    setCurrentRunIdState(null);
  }, []);

  return (
    <RunContext.Provider value={{ currentRunId, setCurrentRunId, clearRunId }}>
      {children}
    </RunContext.Provider>
  );
}

export function useRunContext() {
  return useContext(RunContext);
}
