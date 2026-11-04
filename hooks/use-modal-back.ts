import { useEffect, useRef } from 'react';

export function useModalBack(isOpen: boolean, onClose: () => void) {
  // 1. Keep a stable reference to onClose so the useEffect doesn't constantly re-run
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // 2. Push a silent state
    window.history.pushState({ modalOpen: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      // 3. User pressed hardware back button
      e.preventDefault();
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // 4. Safely clean up the state ONLY if it's still our dummy state, 
      // using replaceState instead of back() to avoid navigation loops
      if (window.history.state?.modalOpen) {
        // Silently override the dummy state instead of jumping backward
        window.history.replaceState(null, ''); 
      }
    };
  }, [isOpen]); // Only re-run if isOpen literally changes
}
