import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { FEED_QUERY_KEY } from './useFeed';

const POLL_INTERVAL = 30_000; // 30s

export function useNewPosts(since: string | null) {
    const { session } = useAuth();
    const queryClient = useQueryClient();

    const { data: newCount = 0 } = useQuery({
        queryKey: ['feed-new-count', since],
        queryFn: () =>
            api<{ count: number }>(
                `/publications?count_since=${encodeURIComponent(since!)}`,
                { token: session!.access_token }
            ).then((d) => d.count),
        enabled: !!since && !!session?.access_token,
        refetchInterval: POLL_INTERVAL,
        staleTime: POLL_INTERVAL,
    });

    const refresh = (scrollEl: HTMLElement | null) => {
        queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
        scrollEl?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return { newCount, refresh };
}
