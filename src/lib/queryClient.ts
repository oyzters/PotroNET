import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 2 * 60 * 1000,      // 2 min — data considered fresh
            gcTime: 10 * 60 * 1000,         // 10 min — cached after unmount
            retry: 2,
            refetchOnWindowFocus: false,     // no refetch on tab switch (feed stays stable)
        },
    },
});
