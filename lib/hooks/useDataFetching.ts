import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../app/_layout';

interface CacheItem<T> {
    data: T;
    timestamp: number;
    error?: Error;
}

const cache: { [key: string]: CacheItem<any> } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export function useDataFetching<T>(
    key: string,
    fetchFn: () => Promise<T>,
    dependencies: any[] = []
) {
    const { user } = useAuth();
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const fetchData = useCallback(async (isRetry = false) => {
        if (!user) {
            setData(null);
            setLoading(false);
            return;
        }

        const cacheKey = `${key}_${user.uid}`;
        const cachedItem = cache[cacheKey];

        // Check if we have valid cached data
        if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_DURATION) {
            setData(cachedItem.data);
            setError(cachedItem.error || null);
            setLoading(false);
            return;
        }

        try {
            if (!isRetry) {
                setLoading(true);
            }
            const result = await fetchFn();
            
            // Cache the result
            cache[cacheKey] = {
                data: result,
                timestamp: Date.now()
            };
            
            setData(result);
            setError(null);
            setRetryCount(0);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('An error occurred');
            console.error('[useDataFetching]', error);

            // Cache the error
            cache[cacheKey] = {
                data: null,
                timestamp: Date.now(),
                error
            };

            setError(error);

            // Implement retry logic
            if (retryCount < MAX_RETRIES) {
                setTimeout(() => {
                    setRetryCount(prev => prev + 1);
                    fetchData(true);
                }, RETRY_DELAY * (retryCount + 1));
            }
        } finally {
            if (!isRetry) {
                setLoading(false);
            }
        }
    }, [key, user, fetchFn, retryCount]);

    useEffect(() => {
        fetchData();
    }, [fetchData, ...dependencies]);

    const refetch = useCallback(async () => {
        if (!user) return;
        
        const cacheKey = `${key}_${user.uid}`;
        // Clear the cache for this key
        delete cache[cacheKey];
        setRetryCount(0);
        await fetchData();
    }, [user, key, fetchData]);

    return { data, loading, error, refetch };
} 