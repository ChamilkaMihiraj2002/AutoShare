import React from 'react';

import type { OwnerEarningsOverview } from '../types';
import { getOwnerEarnings } from '../lib/api';

export function useOwnerEarnings() {
  const [earnings, setEarnings] = React.useState<OwnerEarningsOverview | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const loadEarnings = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const nextEarnings = await getOwnerEarnings();
        if (isMounted) {
          setEarnings(nextEarnings);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load earnings.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadEarnings();

    return () => {
      isMounted = false;
    };
  }, []);

  return { earnings, isLoading, error };
}
