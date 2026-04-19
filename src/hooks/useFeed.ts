import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { FeedPage, Publication } from '@/types/feed';

export const FEED_QUERY_KEY = ['feed'] as const;

export function useFeed(filters?: { tag?: string; userId?: string }) {
    const { session } = useAuth();
    const key = [...FEED_QUERY_KEY, filters?.tag ?? '', filters?.userId ?? ''];

    const query = useInfiniteQuery({
        queryKey: key,
        queryFn: ({ pageParam }) => {
            const params = new URLSearchParams({ limit: '10' });
            if (pageParam) params.set('cursor', pageParam as string);
            if (filters?.tag) params.set('tag', filters.tag);
            if (filters?.userId) params.set('user_id', filters.userId);
            return api<FeedPage>(`/publications?${params}`, { token: session!.access_token });
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        initialPageParam: undefined as string | undefined,
        enabled: !!session?.access_token,
        staleTime: 2 * 60 * 1000,
    });

    // Flatten all pages into a single publications array
    const publications = query.data?.pages.flatMap((p) => p.publications) ?? [];

    return { ...query, publications };
}

// Optimistic like toggle — instant UI, async API
export function useOptimisticLike(filters?: { tag?: string; userId?: string }) {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const key = [...FEED_QUERY_KEY, filters?.tag ?? '', filters?.userId ?? ''];

    return async (publicationId: string) => {
        if (!session?.access_token) return;

        // Snapshot for rollback
        const previous = queryClient.getQueryData<InfiniteData<FeedPage>>(key);

        // Optimistic update
        queryClient.setQueryData<InfiniteData<FeedPage>>(key, (old) => {
            if (!old) return old;
            return {
                ...old,
                pages: old.pages.map((page) => ({
                    ...page,
                    publications: page.publications.map((pub) =>
                        pub.id === publicationId
                            ? {
                                  ...pub,
                                  user_liked: !pub.user_liked,
                                  likes_count: pub.likes_count + (pub.user_liked ? -1 : 1),
                              }
                            : pub
                    ),
                })),
            };
        });

        try {
            await api(`/publications/${publicationId}/likes`, {
                method: 'POST',
                token: session.access_token,
            });
        } catch {
            // Rollback on error
            queryClient.setQueryData(key, previous);
        }
    };
}

// Optimistic delete
export function useOptimisticDelete(filters?: { tag?: string; userId?: string }) {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const key = [...FEED_QUERY_KEY, filters?.tag ?? '', filters?.userId ?? ''];

    return async (publicationId: string) => {
        if (!session?.access_token) return;

        const previous = queryClient.getQueryData<InfiniteData<FeedPage>>(key);

        queryClient.setQueryData<InfiniteData<FeedPage>>(key, (old) => {
            if (!old) return old;
            return {
                ...old,
                pages: old.pages.map((page) => ({
                    ...page,
                    publications: page.publications.filter((pub) => pub.id !== publicationId),
                })),
            };
        });

        try {
            await api(`/publications/${publicationId}`, {
                method: 'DELETE',
                token: session.access_token,
            });
        } catch {
            queryClient.setQueryData(key, previous);
        }
    };
}

// Prepend newly created post to cache (no refetch)
export function usePrependPost(filters?: { tag?: string; userId?: string }) {
    const queryClient = useQueryClient();
    const key = [...FEED_QUERY_KEY, filters?.tag ?? '', filters?.userId ?? ''];

    return (publication: Publication) => {
        queryClient.setQueryData<InfiniteData<FeedPage>>(key, (old) => {
            if (!old || !old.pages.length) return old;
            return {
                ...old,
                pages: [
                    {
                        ...old.pages[0],
                        publications: [{ ...publication, user_liked: false }, ...old.pages[0].publications],
                    },
                    ...old.pages.slice(1),
                ],
            };
        });
    };
}
