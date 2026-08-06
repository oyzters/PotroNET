import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
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
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useScrollReveal } from "@/hooks/useScrollReveal";

gsap.registerPlugin(ScrollTrigger);

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } }
};

// Widget data types — matching the props expected by each widget component
interface RankingUser { id: string; full_name: string; avatar_url: string; popularity_score: number; followers_count: number }
interface FeedProfessor { id: string; full_name: string; avg_rating: number; total_reviews: number; career?: { id: string; name: string } | null }
interface FeedTutoringOffer { id: string; subject_name: string; description: string; tutor: { id: string; full_name: string; avatar_url: string } }
interface FeedNewUser { id: string; full_name: string; avatar_url: string; email: string }

interface Author { id: string; full_name: string; avatar_url: string; email: string }

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
    <div className={`max-md:bg-muted/30 overflow-hidden max-md:rounded-none max-md:border-y max-md:border-border/30 my-0 md:my-2 md:liquid-glass`}>
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

// Wraps the interleaved widget cards so they share the same 3D scroll
// entrance as the publications.
function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollReveal(ref);
  return <div ref={ref}>{children}</div>;
}

type FeedStatus = 'loading' | 'idle' | 'fetching-more' | 'error' | 'exhausted';

export function FeedPage() {
  const { session, user, profile } = useAuth();
  const toast = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [status, setStatus] = useState<FeedStatus>('loading');

  // GSAP 3D Scroll Scrollytelling refs
  const heroRef = useRef<HTMLDivElement>(null);
  const card3DRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Time-aware greeting (Tendencia 2026: UX personalizada)
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 6 && h < 12)  return 'Buenos días';
    if (h >= 12 && h < 18) return 'Buenas tardes';
    if (h >= 18 && h < 24) return 'Buenas noches';
    return 'Hola';
  };
  const greeting = getGreeting();

  // Widget data
  const [rankingUsers, setRankingUsers] = useState<RankingUser[]>([]);
  const [professors, setProfessors] = useState<FeedProfessor[]>([]);
  const [tutoringOffers, setTutoringOffers] = useState<FeedTutoringOffer[]>([]);
  const [newUsers, setNewUsers] = useState<FeedNewUser[]>([]);
  const [widgetsLoading, setWidgetsLoading] = useState(true);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextPageRef = useRef(1);
  const inFlightRef = useRef(false);
  const widgetsFetched = useRef(false);
  const refreshLockRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Mobile keeps only transform/opacity: animating `filter` (re-raster)
    // or `font-variation-settings` (reflow) on every scroll frame is too
    // costly on phone GPUs.
    const mm = gsap.matchMedia();
    mm.add(
      {
        desktop: '(min-width: 768px)',
        mobile: '(max-width: 767.98px)',
        noMotion: '(prefers-reduced-motion: reduce)',
      },
      (ctx) => {
        if (ctx.conditions?.noMotion) return;
        const desktop = !!ctx.conditions?.desktop;

        // 3D card fold on scroll
        gsap.fromTo(card3DRef.current,
          {
            transformOrigin: "top center",
            rotateX: 0,
            z: 0,
            opacity: 1,
          },
          {
            rotateX: -12,
            z: -65,
            opacity: 0.15,
            ...(desktop ? { filter: "blur(2px)" } : {}),
            ease: "none",
            scrollTrigger: {
              trigger: heroRef.current,
              start: desktop ? "top 80px" : "top top",
              end: desktop ? "bottom 120px" : "bottom top",
              scrub: true,
            }
          }
        );

        // Variable font weight animation (Tendencia 2026: tipograf\u00eda viva)
        if (desktop && titleRef.current) {
          gsap.fromTo(titleRef.current,
            { fontVariationSettings: '"wght" 400' },
            {
              fontVariationSettings: '"wght" 900',
              ease: "power2.out",
              scrollTrigger: {
                trigger: heroRef.current,
                start: "top 90%",
                end: "top 20%",
                scrub: 0.6,
              }
            }
          );
        }
      }
    );

    return () => mm.revert();
  }, []);
  const [refreshing, setRefreshing] = useState(false);

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

  // Initial load — depends on user?.id, not access_token.
  // Token refreshes every ~50 min (Supabase TOKEN_REFRESHED) which would change
  // access_token and retrigger this effect, resetting the entire feed scroll position.
  useEffect(() => {
    if (!session?.access_token) return;
    nextPageRef.current = 1;
    fetchPage(1, { append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Listen for the custom event fired by BottomNavigation to open the create-post modal
  useEffect(() => {
    const handler = () => setShowCreateModal(true);
    window.addEventListener('open-create-post', handler);
    return () => window.removeEventListener('open-create-post', handler);
  }, []);

  const refreshFeed = useCallback(async () => {
    if (refreshLockRef.current || inFlightRef.current) return;
    refreshLockRef.current = true;
    const start = window.scrollY;
    const duration = 600;
    const startTime = performance.now();
    const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, start * (1 - easeInOutCubic(progress)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setRefreshing(true);
    nextPageRef.current = 1;
    await fetchPage(1, { append: false });
    setRefreshing(false);
    setTimeout(() => { refreshLockRef.current = false; }, 2000);
  }, [fetchPage]);

  useEffect(() => {
    window.addEventListener('feed-tab-press', refreshFeed);
    return () => window.removeEventListener('feed-tab-press', refreshFeed);
  }, [refreshFeed]);

  // Fetch widget data once
  useEffect(() => {
    if (!session?.access_token || widgetsFetched.current) return;
    widgetsFetched.current = true;

    Promise.allSettled([
      api<{ rankings: any[] }>('/rankings?limit=3', { token: session.access_token }),
      api<{ professors: any[] }>('/professors?sort=rating&limit=3', { token: session.access_token }),
      api<{ offers: any[] }>('/tutoring?limit=3', { token: session.access_token }),
      api<{ profiles: any[] }>('/profiles?limit=20', { token: session.access_token }),
      api<{ friends: any[] }>('/friends', { token: session.access_token }),
    ]).then(([rankRes, profRes, tutRes, profilesRes, friendsRes]) => {
      if (rankRes.status === 'fulfilled') setRankingUsers(rankRes.value.rankings);
      if (profRes.status === 'fulfilled') setProfessors(profRes.value.professors);
      if (tutRes.status === 'fulfilled') setTutoringOffers(tutRes.value.offers);
      if (profilesRes.status === 'fulfilled') {
        const friendIds = new Set(
          friendsRes.status === 'fulfilled'
            ? (friendsRes.value.friends || []).map((f: any) => f.id)
            : []
        );
        const filtered = profilesRes.value.profiles.filter(
          p => p.id !== user?.id && !friendIds.has(p.id)
        );
        setNewUsers(filtered.slice(0, 10));
      }
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
      if (import.meta.env.DEV) console.error(e);
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
      if (import.meta.env.DEV) console.error(e);
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
      {/* 3D Scrollytelling Hero Container */}
      <div ref={heroRef} className="perspective-1000 w-full mb-6">
        <div ref={card3DRef} className="preserve-3d space-y-4 will-change-transform">
          {/* Welcome & Create Post Unified Header Card */}
          <div className="relative overflow-hidden p-5 rounded-3xl bg-card/75 dark:bg-card/45 backdrop-blur-xl border border-border/60 dark:border-white/10 shadow-sm shadow-black/5 mx-1 md:mx-0 md:p-6 space-y-4">
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/3 blur-xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <h1 ref={titleRef} className="text-[22px] leading-tight" style={{ fontVariationSettings: '"wght" 400' }}>
                  {greeting},{' '}
                  <span className="bg-gradient-to-r from-primary to-[oklch(0.75_0.14_233)] bg-clip-text text-transparent">{profile?.full_name?.split(' ')[0] || 'Potro'}</span>
                </h1>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-medium text-primary shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Tu comunidad al día
                </div>
              </div>
              <p className="text-[13px] text-muted-foreground mt-1.5 leading-snug">Descubre publicaciones, rankings y novedades</p>
            </div>

            {/* Mobile-only: tap to create post CTA — compact, glass-style */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="md:hidden w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left bg-muted/30 hover:bg-muted/50 border border-border/40 transition-all active:scale-[0.98]"
            >
              <div className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-border/40 shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">{profile?.full_name?.[0] ?? '?'}</span>
                  </div>
                )}
              </div>
              <span className="flex-1 text-sm text-muted-foreground">¿Qué quieres compartir?</span>
              <span className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold text-primary-foreground" style={{ background: 'oklch(0.68 0.15 237)', boxShadow: '0 4px 12px oklch(0.68 0.15 237 / 0.35)' }}>Publicar</span>
            </button>

            {/* Desktop Create Post embedded seamlessly in the same hero card */}
            <div className="hidden md:block pt-3 border-t border-border/40">
              <CreatePost onPost={handleNewPost} />
            </div>
          </div>
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
                initial={{ y: "100%", rotateX: 8 }}
                animate={{ y: 0, rotateX: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 22, stiffness: 260, mass: 0.9 }}
                className="md:hidden fixed inset-x-0 bottom-0 z-[200] border-t rounded-t-3xl shadow-2xl overflow-hidden pb-safe max-h-[90vh] flex flex-col"
                style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(32px) saturate(1.5)',
                  WebkitBackdropFilter: 'blur(32px) saturate(1.5)',
                  borderColor: 'var(--glass-border)',
                  transformPerspective: 1200,
                  transformOrigin: 'bottom center',
                }}
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

      {/* Refresh pill */}
      <AnimatePresence>
        {refreshing && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="flex justify-center mb-1 px-4"
          >
            <div className="flex items-center justify-center rounded-full bg-foreground/90 p-2 shadow-xl">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {publications.map((publication, idx) => (
              <motion.div key={publication.id} variants={itemVariants} className="space-y-4">
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
                  <Reveal><NewUsersCard users={newUsers} /></Reveal>
                ) : null)}
                {idx === 2 && (widgetsLoading ? (
                  <WidgetSkeleton height="h-40" />
                ) : rankingUsers.length > 0 ? (
                  <Reveal><RankingCard users={rankingUsers} /></Reveal>
                ) : null)}
                {idx === 5 && (widgetsLoading ? (
                  <WidgetSkeleton height="h-44" />
                ) : professors.length > 0 ? (
                  <Reveal><ProfessorSuggestionCard professors={professors} /></Reveal>
                ) : null)}
                {idx === 9 && (widgetsLoading ? (
                  <WidgetSkeleton height="h-40" />
                ) : tutoringOffers.length > 0 ? (
                  <Reveal><TutoringCard offers={tutoringOffers} /></Reveal>
                ) : null)}
                {idx === 13 && profile && (
                  <Reveal><StreakCard reputation={profile.reputation || 0} fullName={profile.full_name || ''} /></Reveal>
                )}
              </motion.div>
            ))}
            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="py-6 text-center min-h-[1px]">
              {status === 'fetching-more' && (
                <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-primary border-t-transparent mx-auto" />
              )}
            </div>

            {status === 'error' && (
              <div className="flex flex-col items-center gap-2 py-4">
                <p className="text-xs text-muted-foreground">No se pudieron cargar más publicaciones</p>
                <Button variant="outline" size="sm" onClick={loadNext}>
                  Reintentar
                </Button>
              </div>
            )}
            {status === 'exhausted' && publications.length > 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">Has visto todas las publicaciones</p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
