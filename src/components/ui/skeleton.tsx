export function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse rounded-lg bg-muted/60 ${className}`} />;
}

export function PostSkeleton() {
    return (
        <div className="border-b border-border/40 pt-4 pb-3 px-4 space-y-3">
            <div className="flex items-center gap-2.5">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2.5 w-16" />
                </div>
            </div>
            <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
            </div>
            <div className="flex gap-1.5 pt-1">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-5 rounded-full" />
            </div>
        </div>
    );
}

export function PostWithImageSkeleton() {
    return (
        <div className="border-b border-border/40 pt-4 pb-3 space-y-3">
            <div className="flex items-center gap-2.5 px-4">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2.5 w-16" />
                </div>
            </div>
            <Skeleton className="h-48 w-full rounded-none" />
            <div className="space-y-2 px-4">
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
            </div>
        </div>
    );
}

export function FeedSkeleton() {
    return (
        <>
            <PostSkeleton />
            <PostWithImageSkeleton />
            <PostSkeleton />
            <PostWithImageSkeleton />
            <PostSkeleton />
        </>
    );
}

export function ProfileSkeleton() {
    return (
        <div className="px-4 py-3 space-y-4">
            <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full shrink-0" />
                <div className="flex-1 flex justify-around">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <Skeleton className="h-5 w-8" />
                            <Skeleton className="h-2.5 w-12" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-8 flex-1 rounded-lg" />
                <Skeleton className="h-8 flex-1 rounded-lg" />
            </div>
        </div>
    );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3 px-1 border-b border-border/30">
                    <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2.5 w-20" />
                    </div>
                    <Skeleton className="h-7 w-16 rounded-lg" />
                </div>
            ))}
        </>
    );
}

export function ChatSkeleton() {
    return (
        <>
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3 px-4 border-b border-border/30">
                    <Skeleton className="h-14 w-14 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-44" />
                    </div>
                    <Skeleton className="h-3 w-10" />
                </div>
            ))}
        </>
    );
}
