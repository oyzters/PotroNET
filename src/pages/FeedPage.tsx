import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import { FeedSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { UsersIcon, XIcon } from "lucide-react";
import { CreatePost } from "@/components/feed/CreatePost";
import { PublicationCard } from "@/components/feed/PublicationCard";
import { RankingCard } from "@/components/feed/RankingCard";
import { ProfessorSuggestionCard } from "@/components/feed/ProfessorSuggestionCard";
import { TutoringCard } from "@/components/feed/TutoringCard";
import { StreakCard } from "@/components/feed/StreakCard";
import { NewUsersCard } from "@/components/feed/NewUsersCard";
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
  comments_count?: number;
  created_at: string;
  author: Author;
  user_liked?: boolean;
  image_url?: string;
  media?: Array<{ type: 'image' | 'video'; url: string }>;
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

function WidgetSkeleton({ height }: { height: string }) {
  return (
    <div className={`bg-muted/30 overflow-hidden rounded-none md:rounded-xl border-y md:border border-border/30 my-0 md:my-2`}>
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-4 rounded bg-muted animate-pulse" />
          <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className={`${height} rounded-lg bg-muted/50 animate-pulse`} />
      </div>
    </div>
  );
}

type FeedStatus = 'loading' | 'idle' | 'fetching-more' | 'error' | 'exhausted';

export function FeedPage() {
  const { session, user, profile } = useAuth();
  const toast = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [status, setStatus] = useState<FeedStatus>('loading');

  // Widget data
  const [rankingUsers, setRankingUsers] = useState<any[]>([]);
  const [professors, setProfessors] = useState<any[]>([]);
  const [tutoringOffers, setTutoringOffers] = useState<any[]>([]);
  const [newUsers, setNewUsers] = useState<any[]>([]);
  const [widgetsLoading, setWidgetsLoading] = useState(true);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextPageRef = useRef(1);
  const inFlightRef = useRef(false);
  const widgetsFetched = useRef(false);

  // Fetch one page. Manages the state machine and dedupes concurrent calls.
  const fetchPage = useCallback(
    async (pageNum: number, { append }: { append: boolean }) => {
      if (!session?.access_token || inFlightRef.current) return;
      inFlightRef.current = true;
      setStatus(append ? 'fetching-more' : 'loading');

      try {
        const data = await api<PublicationsResponse>(
          `/publications?page=${pageNum}&limit=${PAGE_SIZE}`,
          { token: session.access_token }
        );

        setPublications((prev) => {
          if (!append) return data.publications;
          const seen = new Set(prev.map((p) => p.id));
          const merged = [...prev];
          for (const p of data.publications) if (!seen.has(p.id)) merged.push(p);
          return merged;
        });

        const hasMore = pageNum < data.pagination.totalPages;
        nextPageRef.current = pageNum + 1;
        setStatus(hasMore ? 'idle' : 'exhausted');
      } catch (e) {
        setStatus('error');
        if (!append) {
          toast.error(e instanceof Error ? e.message : 'No se pudieron cargar las publicaciones');
        }
      } finally {
        inFlightRef.current = false;
      }
    },
    [session?.access_token, toast]
  );

  const loadNext = useCallback(() => {
    fetchPage(nextPageRef.current, { append: nextPageRef.current > 1 });
  }, [fetchPage]);

  // Initial load
  useEffect(() => {
    if (!session?.access_token) return;
    nextPageRef.current = 1;
    fetchPage(1, { append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  // Listen for the custom event fired by BottomNavigation to open the create-post modal
  useEffect(() => {
    const handler = () => setShowCreateModal(true);
    window.addEventListener('open-create-post', handler);
    return () => window.removeEventListener('open-create-post', handler);
  }, []);

  // Fetch widget data once
  useEffect(() => {
    if (!session?.access_token || widgetsFetched.current) return;
    widgetsFetched.current = true;

    Promise.allSettled([
      api<{ rankings: any[] }>('/rankings?limit=3', { token: session.access_token }),
      api<{ professors: any[] }>('/professors?sort=rating&limit=3', { token: session.access_token }),
      api<{ offers: any[] }>('/tutoring?limit=3', { token: session.access_token }),
      api<{ profiles: any[] }>('/profiles?limit=10', { token: session.access_token }),
    ]).then(([rankRes, profRes, tutRes, profilesRes]) => {
      if (rankRes.status === 'fulfilled') setRankingUsers(rankRes.value.rankings);
      if (profRes.status === 'fulfilled') setProfessors(profRes.value.professors);
      if (tutRes.status === 'fulfilled') setTutoringOffers(tutRes.value.offers);
      if (profilesRes.status === 'fulfilled') setNewUsers(profilesRes.value.profiles.slice(0, 10));
    }).finally(() => setWidgetsLoading(false));
  }, [session?.access_token]);

  // Infinite scroll observer. Re-attached each time status becomes 'idle'
  // so that a fresh intersection check fires after every successful fetch —
  // otherwise the observer wouldn't re-notify when the sentinel is still in
  // view from the previous page (IntersectionObserver only fires on CHANGE).
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    if (typeof IntersectionObserver === 'undefined') return;
    if (status !== 'idle') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !inFlightRef.current) loadNext();
      },
      { rootMargin: '400px' } // pre-fetch ~1 viewport before hitting bottom
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [status, loadNext]);

  const handleLike = useCallback(async (publicationId: string) => {
    if (!session?.access_token) return;
    try {
      const data = await api<{ liked: boolean }>(`/publications/${publicationId}/likes`, {
        method: "POST",
        token: session.access_token,
      });
      setPublications((prev) =>
        prev.map((p) =>
          p.id === publicationId
            ? { ...p, likes_count: p.likes_count + (data.liked ? 1 : -1), user_liked: data.liked }
            : p
        )
      );
    } catch (e) {
      console.error(e);
    }
  }, [session?.access_token]);

  const handleDelete = useCallback(async (publicationId: string) => {
    if (!session?.access_token) return;
    try {
      await api(`/publications/${publicationId}`, {
        method: "DELETE",
        token: session.access_token,
      });
      setPublications((prev) => prev.filter((p) => p.id !== publicationId));
      toast.success('Publicación eliminada');
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar la publicación');
    }
  }, [session?.access_token, toast]);

  const handleNewPost = async (content: string, tags: string[], media?: Array<{ type: string; url: string; key?: string }>) => {
    if (!session?.access_token) return;
    await api('/publications', {
      method: 'POST',
      body: JSON.stringify({ content, tags, media: media || [] }),
      token: session.access_token,
    });
    nextPageRef.current = 1;
    fetchPage(1, { append: false });
  };

  return (
    <div className="w-full">
      {/* Welcome header */}
      <div className="relative overflow-hidden px-4 pt-6 pb-5">
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <h1 className="text-[22px] font-black leading-tight">
              Hola, <span className="bg-gradient-to-r from-primary to-[oklch(0.75_0.14_233)] bg-clip-text text-transparent">{profile?.full_name?.split(' ')[0] || 'Potro'}</span>
            </h1>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-medium text-primary shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Tu comunidad al día
            </div>
          </div>
          <p className="text-[13px] text-muted-foreground mt-1.5 leading-snug">Descubre publicaciones, rankings y novedades</p>
        </div>
      </div>

      {/* Desktop Create Post */}
      <div className="hidden md:block px-2 md:px-8 pb-2">
        <div className="w-full md:max-w-4xl md:mx-auto">
          <CreatePost onPost={handleNewPost} />
        </div>
      </div>

      {/* Mobile Create Post Modal */}
      {createPortal(
        <AnimatePresence>
          {showCreateModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCreateModal(false)}
                className="md:hidden fixed inset-0 z-[150] bg-background/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="md:hidden fixed inset-x-0 bottom-0 z-[200] bg-background border-t border-border/50 rounded-t-3xl shadow-2xl overflow-hidden pb-safe max-h-[90vh] flex flex-col"
              >
                <div className="w-full flex justify-center pt-3 pb-2" onClick={() => setShowCreateModal(false)}>
                  <div className="w-12 h-1.5 bg-muted rounded-full" />
                </div>
                <div className="flex items-center justify-between px-4 pb-2 border-b border-border/20 shrink-0">
                  <h2 className="text-lg font-bold">Nueva publicación</h2>
                  <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)} className="rounded-full h-8 w-8">
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 overflow-y-auto overscroll-contain flex-1">
                  <CreatePost
                    onPost={async (content, tags, media) => {
                      await handleNewPost(content, tags, media);
                      setShowCreateModal(false);
                    }}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Publications */}
      <div className="pb-20">
        {status === 'loading' && publications.length === 0 ? (
          <FeedSkeleton />
        ) : publications.length === 0 ? (
          <div className="text-center py-16">
            <UsersIcon className="h-10 w-10 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">No hay publicaciones aún</p>
          </div>
        ) : (
          <>
            {publications.map((publication, idx) => (
              <div key={publication.id}>
                <PublicationCard
                  publication={publication}
                  currentUserId={user?.id}
                  onLike={handleLike}
                  onDelete={handleDelete}
                />
                {/* Insert widget cards at specific positions */}
                {idx === 1 && (widgetsLoading ? (
                  <WidgetSkeleton height="h-28" />
                ) : newUsers.length > 0 ? (
                  <NewUsersCard users={newUsers} />
                ) : null)}
                {idx === 2 && (widgetsLoading ? (
                  <WidgetSkeleton height="h-40" />
                ) : rankingUsers.length > 0 ? (
                  <RankingCard users={rankingUsers} />
                ) : null)}
                {idx === 5 && (widgetsLoading ? (
                  <WidgetSkeleton height="h-44" />
                ) : professors.length > 0 ? (
                  <ProfessorSuggestionCard professors={professors} />
                ) : null)}
                {idx === 9 && (widgetsLoading ? (
                  <WidgetSkeleton height="h-40" />
                ) : tutoringOffers.length > 0 ? (
                  <TutoringCard offers={tutoringOffers} />
                ) : null)}
                {idx === 13 && profile && (
                  <StreakCard reputation={profile.reputation || 0} fullName={profile.full_name || ''} />
                )}
              </div>
            ))}

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="py-6 text-center min-h-[1px]">
              {status === 'fetching-more' && (
                <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-primary border-t-transparent mx-auto" />
              )}
              {status === 'error' && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-muted-foreground">No se pudieron cargar más publicaciones</p>
                  <Button variant="outline" size="sm" onClick={loadNext}>
                    Reintentar
                  </Button>
                </div>
              )}
              {status === 'exhausted' && publications.length > 0 && (
                <p className="text-xs text-muted-foreground">Has visto todas las publicaciones</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
