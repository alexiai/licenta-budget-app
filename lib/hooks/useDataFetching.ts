import { useState, useEffect } from 'react';
import { useAuth } from '../../app/_layout';

interface CacheItem<T> {
    data: T;
    timestamp: number;
}

const cache: { [key: string]: CacheItem<any> } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useDataFetching<T>(
    key: string,
    fetchFn: () => Promise<T>,
    dependencies: any[] = []
) {
    const { user } = useAuth();
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchData = async () => {
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
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const result = await fetchFn();
                
                // Cache the result
                cache[cacheKey] = {
                    data: result,
                    timestamp: Date.now()
                };
                
                setData(result);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('An error occurred'));
                console.error('[useDataFetching]', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [key, user, ...dependencies]);

    const refetch = async () => {
        if (!user) return;
        
        const cacheKey = `${key}_${user.uid}`;
        // Clear the cache for this key
        delete cache[cacheKey];
        
        try {
            setLoading(true);
            const result = await fetchFn();
            
            // Update cache
            cache[cacheKey] = {
                data: result,
                timestamp: Date.now()
            };
            
            setData(result);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('An error occurred'));
            console.error('[useDataFetching]', err);
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, error, refetch };
} 