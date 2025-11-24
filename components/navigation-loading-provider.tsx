'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface NavigationLoadingContextType {
  setLoading: (loading: boolean) => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextType | undefined>(undefined);

export function useNavigationLoading() {
  const context = useContext(NavigationLoadingContext);
  if (!context) {
    throw new Error('useNavigationLoading must be used within NavigationLoadingProvider');
  }
  return context;
}

export function NavigationLoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const completionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle loading state changes
  useEffect(() => {
    if (isLoading) {
      // Reset progress and start animation
      setProgress(0);
      
      // Clear any existing intervals
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }

      // Simulate progress from 0% to 90%
      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
            }
            return 90;
          }
          // Increment by random amount to simulate real loading
          return prev + Math.random() * 15;
        });
      }, 100);
    } else {
      // Complete the progress to 100% when loading stops
      setProgress(100);
      completionTimerRef.current = setTimeout(() => {
        setProgress(0);
      }, 200);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
    };
  }, [isLoading]);

  // Reset loading when pathname changes (navigation completed)
  useEffect(() => {
    if (pathname === prevPathnameRef.current) {
      return;
    }

    prevPathnameRef.current = pathname;
    // Small delay to ensure smooth transition
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <NavigationLoadingContext.Provider value={{ setLoading: setIsLoading }}>
      {children}
      {(isLoading || progress > 0) && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-background/20">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
              transition: progress === 100 ? 'width 0.2s ease-out' : 'width 0.1s linear',
            }}
          />
        </div>
      )}
    </NavigationLoadingContext.Provider>
  );
}

