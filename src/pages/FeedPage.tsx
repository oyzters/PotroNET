import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import {
  RefreshCwIcon,
  UsersIcon,
  UserIcon,
  ThumbsUpIcon,
  MessageCircleIcon,
  SendIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import { CreatePost } from "@/components/feed/CreatePost";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

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

const PAGE_SIZE = 10;

export function FeedPage() {
  const { session, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPublications = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!session?.access_token) return;

      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(PAGE_SIZE),
        });

        if (selectedTag) params.set("tag", selectedTag);

        const data = await api<PublicationsResponse>(
          `/publications?${params.toString()}`,
          { token: session.access_token }
        );

        if (append) {
          setPublications((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newPubs = data.publications.filter(
              (p) => !existingIds.has(p.id)
            );
            return [...prev, ...newPubs];
          });
        } else {
          setPublications(data.publications);
        }

        setHasMore(pageNum < data.pagination.totalPages);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [session?.access_token, selectedTag]
  );

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchPublications(1, false);
  }, [fetchPublications]);

  useEffect(() => {
    if (page > 1) {
      fetchPublications(page, true);
    }
  }, [page]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setPage((prev) => prev + 1);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading]);

  const handleLike = async (publicationId: string) => {
    if (!session?.access_token) return;

    try {
      const data = await api<{ liked: boolean }>("/publications/like", {
        method: "POST",
        body: JSON.stringify({ publication_id: publicationId }),
        token: session.access_token,
      });

      setPublications((prev) =>
        prev.map((p) =>
          p.id === publicationId
            ? { ...p, likes_count: p.likes_count + (data.liked ? 1 : -1) }
            : p
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (publicationId: string) => {
    if (!session?.access_token) return;

    try {
      await api(`/publications/${publicationId}`, {
        method: "DELETE",
        token: session.access_token,
      });

      setPublications((prev) => prev.filter((p) => p.id !== publicationId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setHasMore(true);
    fetchPublications(1, false);
  };

  return (
    <div className="w-full">
      <div className="px-4 md:px-8 pt-8 md:pt-12 pb-6">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Feed de la Comunidad
          </h1>

          <p className="text-muted-foreground text-sm md:text-base mb-8 max-w-2xl mx-auto">
            Descubre lo que está compartiendo la comunidad. Conecta y entérate de todo.
          </p>

          <Button onClick={handleRefresh} disabled={loading}>
            <RefreshCwIcon
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="px-2 md:px-8 pb-8">
        <div className="w-full md:max-w-4xl md:mx-auto">
          <PullToRefresh onRefresh={async () => handleRefresh()}>
            {loading ? (
              <div className="text-center py-20">Cargando...</div>
            ) : publications.length === 0 ? (
              <div className="text-center py-16">
                <UsersIcon className="h-10 w-10 mx-auto mb-4 opacity-50" />
                <p>No hay publicaciones aún</p>
              </div>
            ) : (
              <>
                {/* Desktop Create Post Section */}
                <div className="hidden md:block">
                  <CreatePost 
                    onPost={async (content, tags) => {
                      if (!session?.access_token) return;
                      await api('/publications', {
                        method: 'POST',
                        body: JSON.stringify({ content, tags }),
                        token: session.access_token,
                      });
                      // Refresh feed to show new post
                      setPage(1);
                      setHasMore(true);
                      fetchPublications(1, false);
                    }}
                  />
                </div>

                {/* Mobile Create Post Modal */}
                {createPortal(
                  <AnimatePresence>
                    {location.hash === '#create' && (
                      <>
                        {/* Backdrop */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => navigate(-1)}
                          className="md:hidden fixed inset-0 z-[150] bg-background/80 backdrop-blur-sm"
                        />
                        
                        {/* Bottom Sheet Modal */}
                        <motion.div 
                          initial={{ y: "100%" }}
                          animate={{ y: 0 }}
                          exit={{ y: "100%" }}
                          transition={{ type: "spring", damping: 25, stiffness: 200 }}
                          className="md:hidden fixed inset-x-0 bottom-0 z-[200] bg-background border-t border-border/50 rounded-t-3xl shadow-2xl overflow-hidden pb-safe max-h-[90vh] flex flex-col"
                        >
                          {/* Drag Handle Area */}
                          <div className="w-full flex justify-center pt-3 pb-2" onClick={() => navigate(-1)}>
                            <div className="w-12 h-1.5 bg-muted rounded-full" />
                          </div>

                          <div className="flex items-center justify-between px-4 pb-2 border-b border-border/20 shrink-0">
                            <h2 className="text-lg font-bold">Nueva publicación</h2>
                            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full h-8 w-8">
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="p-4 overflow-y-auto overscroll-contain flex-1">
                            <CreatePost 
                              onPost={async (content, tags) => {
                                if (!session?.access_token) return;
                                await api('/publications', {
                                  method: 'POST',
                                  body: JSON.stringify({ content, tags }),
                                  token: session.access_token,
                                });
                                // Refresh feed and close modal
                                setPage(1);
                                setHasMore(true);
                                fetchPublications(1, false);
                                navigate(-1);
                              }}
                            />
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>,
                  document.body
                )}

                <div className="space-y-4 pb-20">
                  {publications.map((publication) => (
                    <div
                      key={publication.id}
                      className="border border-border/30 rounded-2xl p-4 md:p-6 bg-card/40 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out pointer-events-none"></div>
                      <div className="relative">
                        <div className="flex justify-between mb-3 md:mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 md:h-12 md:w-12 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-inner p-0.5">
                              {publication.author.avatar_url ? (
                                <img
                                  src={publication.author.avatar_url}
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                <UserIcon className="h-5 w-5 md:h-6 md:w-6 m-auto text-primary" />
                              )}
                            </div>

                            <div>
                              <p className="font-semibold">
                                {publication.author.full_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(
                                  publication.created_at
                                ).toLocaleDateString("es-MX")}
                              </p>
                            </div>
                          </div>

                          {publication.author.id === user?.id && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(publication.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <p className="mb-3">{publication.content}</p>

                        {publication.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {publication.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Interaction Buttons at the bottom */}
                        <div className="flex items-center gap-1 pt-3 border-t border-border/50">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleLike(publication.id)}
                              className="flex-1 text-xs md:text-sm text-muted-foreground hover:text-primary px-2"
                            >
                              <ThumbsUpIcon className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
                              {publication.likes_count} <span className="hidden sm:inline">Me gusta</span>
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 text-xs md:text-sm text-muted-foreground hover:text-primary px-2"
                            >
                              <MessageCircleIcon className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
                              <span className="hidden sm:inline">Comentar</span><span className="sm:hidden">Comentar</span>
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 text-xs md:text-sm text-muted-foreground hover:text-primary px-2"
                            >
                              <SendIcon className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
                              <span className="hidden sm:inline">Enviar</span><span className="sm:hidden">Enviar</span>
                            </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div ref={sentinelRef} className="text-center py-8">
                    {loadingMore && (
                      <RefreshCwIcon className="h-6 w-6 animate-spin mx-auto" />
                    )}

                    {!hasMore && (
                      <p className="text-sm text-muted-foreground">
                        Has llegado al final del feed
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </PullToRefresh>
        </div>
      </div>
    </div>
  );
}