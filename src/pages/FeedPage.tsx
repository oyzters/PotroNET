import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { CreatePost } from '@/components/feed/CreatePost';
import { PublicationCard } from '@/components/feed/PublicationCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCwIcon } from 'lucide-react';

interface Author {
    id: string;
    full_name: string;
    avatar_url: string;
    email: string;
}

interface Publication {
    id: string;
    content: string;
    tags: string[];
    likes_count: number;
    created_at: string;
    author: Author;
}

interface PublicationsResponse {
    publications: Publication[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

const POPULAR_TAGS = ['ayuda', 'programacion', 'calculo', 'examen', 'tutoria', 'proyectos', 'empleo'];
const PAGE_SIZE = 10;

export function FeedPage() {
    const { session, user } = useAuth();
    const [publications, setPublications] = useState<Publication[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const fetchPublications = useCallback(async (pageNum: number, append: boolean) => {
        if (!session?.access_token) return;
        if (append) setLoadingMore(true); else setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(pageNum), limit: String(PAGE_SIZE) });
            if (selectedTag) params.set('tag', selectedTag);

            const data = await api<PublicationsResponse>(
                `/publications?${params.toString()}`,
                { token: session.access_token }
            );

            if (append) {
                setPublications(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newPubs = data.publications.filter(p => !existingIds.has(p.id));
                    return [...prev, ...newPubs];
                });
            } else {
                setPublications(data.publications);
            }
            setHasMore(pageNum < data.pagination.totalPages);
        } catch {
            // Error handled silently
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [session?.access_token, selectedTag]);

    // Initial load & tag change
    useEffect(() => {
        setPage(1);
        setHasMore(true);
        fetchPublications(1, false);
    }, [fetchPublications]);

    // Load more when page increments
    useEffect(() => {
        if (page > 1) fetchPublications(page, true);
    }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                    setPage(prev => prev + 1);
                }
            },
            { rootMargin: '200px' }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, loading]);

    const handlePost = async (content: string, tags: string[]) => {
        if (!session?.access_token) return;
        const data = await api<{ publication: Publication }>('/publications', {
            method: 'POST',
            body: JSON.stringify({ content, tags }),
            token: session.access_token,
        });
        setPublications([data.publication, ...publications]);
    };

    const handleLike = async (publicationId: string) => {
        if (!session?.access_token) return;
        try {
            const data = await api<{ liked: boolean }>('/publications/like', {
                method: 'POST',
                body: JSON.stringify({ publication_id: publicationId }),
                token: session.access_token,
            });
            setPublications(
                publications.map((p) =>
                    p.id === publicationId
                        ? { ...p, likes_count: p.likes_count + (data.liked ? 1 : -1) }
                        : p
                )
            );
        } catch {
            // Silent error
        }
    };

    const handleDelete = async (publicationId: string) => {
        if (!session?.access_token) return;
        try {
            await api(`/publications/${publicationId}`, {
                method: 'DELETE',
                token: session.access_token,
            });
            setPublications(publications.filter((p) => p.id !== publicationId));
        } catch {
            // Silent error
        }
    };

    const handleRefresh = () => {
        setPage(1);
        setHasMore(true);
        fetchPublications(1, false);
    };

    const handleTagFilter = (tag: string) => {
        setSelectedTag(selectedTag === tag ? null : tag);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Feed</h1>
                    <p className="text-sm text-muted-foreground">
                        Lo último de la comunidad Potro
                    </p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleRefresh}>
                    <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Create Post */}
            <CreatePost onPost={handlePost} />

            {/* Tag filters */}
            <div className="flex flex-wrap gap-2">
                {POPULAR_TAGS.map((tag) => (
                    <Badge
                        key={tag}
                        variant={selectedTag === tag ? 'default' : 'secondary'}
                        className="cursor-pointer transition-all hover:scale-105"
                        onClick={() => handleTagFilter(tag)}
                    >
                        #{tag}
                    </Badge>
                ))}
            </div>

            {/* Publications */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : publications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                    <p className="text-lg font-medium text-muted-foreground">
                        No hay publicaciones aún
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        ¡Sé el primero en publicar algo! 🎉
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {publications.map((publication) => (
                        <PublicationCard
                            key={publication.id}
                            publication={publication}
                            currentUserId={user?.id}
                            onLike={handleLike}
                            onDelete={handleDelete}
                        />
                    ))}

                    {/* Infinite scroll sentinel */}
                    <div ref={sentinelRef} className="py-4 text-center">
                        {loadingMore && (
                            <div className="flex justify-center">
                                <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                            </div>
                        )}
                        {!hasMore && publications.length > PAGE_SIZE && (
                            <p className="text-sm text-muted-foreground">No hay más publicaciones</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
