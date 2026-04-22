import { useState, useRef, useEffect, memo } from 'react';
import { useInView } from '@/hooks/useInView';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useSettings } from '@/contexts/SettingsContext';
import { api } from '@/lib/api';
import { ModerationModal } from '@/components/moderation/ModerationModal';
import { WarnUserModal } from '@/components/moderation/WarnUserModal';
import type { ModerationCategory } from '@/components/moderation/ModerationModal';
import {
    HeartIcon, TrashIcon, UserIcon, MessageCircleIcon, SendIcon,
    MoreHorizontalIcon, XIcon, ClipboardIcon, FlagIcon, ChevronLeftIcon, ChevronRightIcon,
    ShieldIcon, ShieldAlertIcon, AlertTriangleIcon, UsersIcon, PencilIcon,
} from 'lucide-react';
import { FeedVideo } from './FeedVideo';

interface Author {
    id: string;
    full_name: string;
    avatar_url: string;
    email: string;
}

interface Comment {
    id: string;
    content: string;
    created_at: string;
    author: { id: string; full_name: string; avatar_url: string };
}

interface MediaItem {
    type: 'image' | 'video';
    url: string;
}

interface Publication {
    id: string;
    content: string;
    tags: string[];
    likes_count: number;
    comments_count?: number;
    created_at: string;
    updated_at?: string;
    is_edited?: boolean;
    author: Author;
    user_liked?: boolean;
    image_url?: string;
    media?: MediaItem[];
}

interface PublicationCardProps {
    publication: Publication;
    currentUserId?: string;
    hideAuthor?: boolean;
    onLike?: (id: string) => void;
    onDelete?: (id: string) => void;
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function PublicationCardInner({
    publication,
    currentUserId,
    hideAuthor,
    onLike,
    onDelete,
}: PublicationCardProps) {
    const { session } = useAuth();
    const { isModerator, canBan } = useRole();
    const { settings } = useSettings();
    const { author } = publication;
    const isOwner = currentUserId === author.id;
    const canViewLikers = isOwner && settings?.show_likes_to_owner !== false;

    // Moderation modals
    const [showOptions, setShowOptions] = useState(false);
    const [showModerationModal, setShowModerationModal] = useState(false);
    const [showWarnModal, setShowWarnModal] = useState(false);
    const [showBanModal, setShowBanModal] = useState(false);
    const [isBanning, setIsBanning] = useState(false);

    const handleModeratorDelete = async (category: ModerationCategory, reason: string) => {
        if (!session?.access_token) return;
        await api(`/moderation/publications/${publication.id}/remove`, {
            method: 'POST',
            token: session.access_token,
            body: JSON.stringify({ category, reason }),
        });
        onDelete?.(publication.id);
    };

    const handleWarnAuthor = async (category: ModerationCategory, message: string) => {
        if (!session?.access_token) return;
        await api(`/moderation/users/${author.id}/warn`, {
            method: 'POST',
            token: session.access_token,
            body: JSON.stringify({ category, message }),
        });
    };

    const handleBanAuthor = async () => {
        if (!session?.access_token || !canBan) return;
        setIsBanning(true);
        try {
            await api(`/admin/users`, {
                method: 'PATCH',
                token: session.access_token,
                body: JSON.stringify({ user_id: author.id, is_banned: true }),
            });
            setShowBanModal(false);
            alert('Usuario baneado exitosamente.');
        } catch (e: any) {
            alert(e.message || 'Error al banear');
        } finally {
            setIsBanning(false);
        }
    };

    // Likes (local optimistic state)
    const [liked, setLiked] = useState(!!publication.user_liked);
    const [likesCount, setLikesCount] = useState(publication.likes_count);
    const [liking, setLiking] = useState(false);

    // Edit modal
    const [showEdit, setShowEdit] = useState(false);
    const [editContent, setEditContent] = useState(publication.content);
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');
    const [localContent, setLocalContent] = useState(publication.content);
    const [isEdited, setIsEdited] = useState(!!publication.is_edited);
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const isEditable = isOwner && (Date.now() - new Date(publication.created_at).getTime()) < ONE_HOUR_MS;

    // Likers modal
    const [showLikers, setShowLikers] = useState(false);
    const [likers, setLikers] = useState<{ id: string; full_name: string; avatar_url: string }[]>([]);
    const [likersLoading, setLikersLoading] = useState(false);
    const [likersTotal, setLikersTotal] = useState(0);

    const handleToggleLike = async () => {
        if (liking) return;
        setLiking(true);
        const wasLiked = liked;
        // Optimistic update
        setLiked(!wasLiked);
        setLikesCount(prev => prev + (wasLiked ? -1 : 1));
        try {
            onLike?.(publication.id);
        } catch {
            // Rollback on error
            setLiked(wasLiked);
            setLikesCount(prev => prev + (wasLiked ? 1 : -1));
        } finally {
            setLiking(false);
        }
    };

    const handleOpenLikers = async () => {
        if (!session?.access_token || !canViewLikers || likesCount === 0) return;
        setShowLikers(true);
        if (likers.length > 0) return;
        setLikersLoading(true);
        try {
            const data = await api<{ likers: { id: string; full_name: string; avatar_url: string }[]; pagination: { total: number } }>(
                `/publications/${publication.id}/likes`,
                { token: session.access_token }
            );
            setLikers(data.likers);
            setLikersTotal(data.pagination.total);
        } catch { /* silent */ } finally { setLikersLoading(false); }
    };

    const handleSaveEdit = async () => {
        if (!session?.access_token || !editContent.trim()) return;
        setEditSaving(true);
        setEditError('');
        try {
            const data = await api<{ publication: Publication }>(
                `/publications/${publication.id}`,
                { method: 'PATCH', token: session.access_token, body: JSON.stringify({ content: editContent.trim() }) }
            );
            setLocalContent(data.publication.content);
            setIsEdited(true);
            setShowEdit(false);
        } catch (e: any) {
            setEditError(e.message || 'Error al guardar');
        } finally {
            setEditSaving(false);
        }
    };

    // Report
    const handleReport = async () => {
        if (!session?.access_token) return;
        try {
            await api('/reports', {
                method: 'POST',
                token: session.access_token,
                body: JSON.stringify({ type: 'publication', reference_id: publication.id, reason: 'Contenido inapropiado' }),
            });
        } catch { /* silent */ }
    };

    // Comments
    const [showComments, setShowComments] = useState(false);
    useBodyScrollLock(showComments || showOptions || showLikers || showEdit);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [commentSending, setCommentSending] = useState(false);
    const [localCommentsCount, setLocalCommentsCount] = useState(publication.comments_count || 0);

    // Media carousel
    const [mediaIndex, setMediaIndex] = useState(0);
    const [mediaExpanded, setMediaExpanded] = useState(false);
    const mediaItems: MediaItem[] = publication.media && publication.media.length > 0
        ? publication.media
        : publication.image_url ? [{ type: 'image' as const, url: publication.image_url }] : [];
    const touchStartX = useRef(0);

    const loadComments = async () => {
        if (!session?.access_token) return;
        setCommentsLoading(true);
        try {
            const data = await api<{ comments: Comment[] }>(
                `/publications/${publication.id}/comments`, { token: session.access_token }
            );
            setComments(data.comments);
        } catch { /* silent */ } finally { setCommentsLoading(false); }
    };

    // Lazy-load comments for preview: only fire when the card is actually
    // scrolled into (or near) the viewport. Avoids N simultaneous requests
    // on long feeds. Trigger once — don't re-fetch if user scrolls back.
    const [cardRef, cardInView] = useInView<HTMLElement>({ rootMargin: '200px', once: true });
    useEffect(() => {
        if (cardInView && localCommentsCount > 0 && comments.length === 0 && !commentsLoading) {
            loadComments();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cardInView, localCommentsCount]);

    const handleOpenComments = () => {
        if (comments.length === 0) loadComments();
        setShowComments(true);
    };

    const handleSubmitComment = async () => {
        if (!session?.access_token || !commentText.trim()) return;
        setCommentSending(true);
        try {
            const data = await api<{ comment: Comment }>(
                `/publications/${publication.id}/comments`,
                { method: 'POST', token: session.access_token, body: JSON.stringify({ content: commentText.trim() }) }
            );
            setComments(prev => [...prev, data.comment]);
            setCommentText('');
            setLocalCommentsCount(prev => prev + 1);
        } catch { /* silent */ } finally { setCommentSending(false); }
    };

    return (
        <article ref={cardRef} className="border-b border-border/40 bg-background pt-4 pb-3 flex flex-col gap-2 md:rounded-xl md:border md:p-4 md:shadow-sm md:mb-4">
            {/* Header */}
            {hideAuthor ? (
                <div className="flex items-center justify-between px-4 md:px-0">
                    <span className="text-xs text-muted-foreground">
                        {timeAgo(publication.created_at)}
                    </span>
                    <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8 active:scale-95 z-10" onClick={() => setShowOptions(true)}>
                        <MoreHorizontalIcon className="h-5 w-5" />
                    </Button>
                </div>
            ) : (
                <div className="flex items-center justify-between px-4 md:px-0">
                    <div className="flex items-center gap-2.5">
                        <Link
                            to={`/profile/${author.id}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted transition-transform active:scale-95"
                        >
                            {author.avatar_url ? (
                                <img src={author.avatar_url} alt={author.full_name} className="h-9 w-9 rounded-full object-cover" />
                            ) : (
                                <UserIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                        </Link>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <Link to={`/profile/${author.id}`} className="text-[13px] font-semibold hover:underline leading-tight block">
                                    {author.full_name}
                                </Link>
                                {(author as any).role === 'admin' && (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-500">
                                        <ShieldIcon className="h-2.5 w-2.5" />Admin
                                    </span>
                                )}
                                {(author as any).role === 'sudo' && (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
                                        <ShieldAlertIcon className="h-2.5 w-2.5" />Sudo
                                    </span>
                                )}
                            </div>
                            <span className="text-[11px] text-muted-foreground leading-none">
                                {timeAgo(publication.created_at)}
                            </span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8 active:scale-95 z-10" onClick={() => setShowOptions(true)}>
                        <MoreHorizontalIcon className="h-5 w-5" />
                    </Button>
                </div>
            )}

            {/* Media carousel */}
            {mediaItems.length > 0 && (
                <div className="relative">
                    <div
                        className="relative overflow-hidden bg-muted/30"
                        onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
                        onTouchEnd={e => {
                            const dx = e.changedTouches[0].clientX - touchStartX.current;
                            if (dx < -50 && mediaIndex < mediaItems.length - 1) setMediaIndex(i => i + 1);
                            if (dx > 50 && mediaIndex > 0) setMediaIndex(i => i - 1);
                        }}
                    >
                        <div
                            className="flex transition-transform duration-300 ease-out"
                            style={{ transform: `translateX(-${mediaIndex * 100}%)` }}
                        >
                            {mediaItems.map((item, idx) => (
                                <div key={idx} className="w-full shrink-0">
                                    {item.type === 'image' ? (
                                        <img
                                            src={item.url}
                                            alt=""
                                            className="w-full object-cover max-h-[450px] cursor-pointer"
                                            loading="lazy"
                                            onClick={() => { setMediaIndex(idx); setMediaExpanded(true); }}
                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ) : (
                                        <FeedVideo
                                            src={item.url}
                                            className="w-full"
                                            onError={e => { (e.target as HTMLVideoElement).style.display = 'none'; }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Arrows (desktop, multiple items) */}
                        {mediaItems.length > 1 && (
                            <>
                                {mediaIndex > 0 && (
                                    <button
                                        onClick={() => setMediaIndex(i => i - 1)}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                    >
                                        <ChevronLeftIcon className="h-5 w-5" />
                                    </button>
                                )}
                                {mediaIndex < mediaItems.length - 1 && (
                                    <button
                                        onClick={() => setMediaIndex(i => i + 1)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                    >
                                        <ChevronRightIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </>
                        )}

                        {/* Counter badge */}
                        {mediaItems.length > 1 && (
                            <span className="absolute top-3 right-3 bg-black/60 text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
                                {mediaIndex + 1}/{mediaItems.length}
                            </span>
                        )}
                    </div>

                    {/* Dots (multiple items) */}
                    {mediaItems.length > 1 && (
                        <div className="flex justify-center gap-1.5 py-2">
                            {mediaItems.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setMediaIndex(idx)}
                                    className={`rounded-full transition-all ${idx === mediaIndex ? 'h-2 w-2 bg-primary' : 'h-1.5 w-1.5 bg-muted-foreground/30'}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="px-4 md:px-0">
                <p className="whitespace-pre-wrap text-[14px] leading-[1.5] text-foreground">
                    {localContent}
                </p>
                {isEdited && (
                    <span className="text-[11px] text-muted-foreground/60 mt-0.5 block">editado</span>
                )}
                {publication.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {publication.tags.map((tag) => (
                            <Link key={tag} to={`/search?q=${tag}`}>
                                <Badge variant="secondary" className="text-[11px] font-medium text-primary bg-primary/10 hover:bg-primary/20 border-transparent px-2 py-0">
                                    #{tag}
                                </Badge>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions + counts */}
            <div className="px-4 md:px-0">
                <div className="flex items-center gap-0.5 -ml-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 rounded-full active:scale-95 transition-all" onClick={handleToggleLike} disabled={liking}>
                        <HeartIcon className={`h-5 w-5 transition-all ${liked ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95 text-muted-foreground hover:text-foreground" onClick={handleOpenComments}>
                        <MessageCircleIcon className="h-5 w-5" />
                    </Button>
                </div>
                {(likesCount > 0 || localCommentsCount > 0) && (
                    <div className="flex items-center gap-3 text-[13px] mt-0.5">
                        {likesCount > 0 && (
                            canViewLikers ? (
                                <button
                                    onClick={handleOpenLikers}
                                    className="font-semibold hover:underline transition-colors"
                                >
                                    {likesCount} {likesCount === 1 ? 'like' : 'likes'}
                                </button>
                            ) : (
                                <span className="font-semibold">{likesCount} {likesCount === 1 ? 'like' : 'likes'}</span>
                            )
                        )}
                        {localCommentsCount > 0 && (
                            <button
                                onClick={handleOpenComments}
                                className="font-semibold text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {localCommentsCount} {localCommentsCount === 1 ? 'comentario' : 'comentarios'}
                            </button>
                        )}
                    </div>
                )}
                {localCommentsCount > 0 && comments.length > 0 && (
                    <div className="mt-2 space-y-2">
                        {comments.slice(-2).map(c => (
                            <div key={c.id} className="flex gap-2 items-start">
                                <Link
                                    to={`/profile/${c.author.id}`}
                                    className="shrink-0 mt-0.5"
                                >
                                    <div className="h-6 w-6 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center">
                                        {c.author.avatar_url
                                            ? <img src={c.author.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                                            : <UserIcon className="h-3 w-3 text-primary" />}
                                    </div>
                                </Link>
                                <div className="min-w-0 flex-1">
                                    <Link
                                        to={`/profile/${c.author.id}`}
                                        className="text-[12px] font-semibold text-foreground hover:underline"
                                    >
                                        {c.author.full_name}
                                    </Link>
                                    <p className="text-[13px] leading-snug text-muted-foreground break-words">
                                        {c.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {localCommentsCount > 2 && (
                            <button
                                onClick={handleOpenComments}
                                className="text-[12px] font-medium text-primary hover:underline ml-8"
                            >
                                Ver los {localCommentsCount} comentarios
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Edit modal */}
            {showEdit && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center" onClick={() => !editSaving && setShowEdit(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative w-full md:max-w-lg md:rounded-2xl rounded-t-2xl bg-background border border-border overflow-hidden animate-in slide-in-from-bottom duration-200 flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-center pt-3 pb-1 md:hidden">
                            <div className="w-10 h-1 rounded-full bg-border" />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                            <h3 className="text-sm font-bold">Editar publicación</h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowEdit(false)} disabled={editSaving}>
                                <XIcon className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="px-4 py-3 space-y-3">
                            <textarea
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                maxLength={500}
                                rows={4}
                                disabled={editSaving}
                                className="w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                                autoFocus
                            />
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">{editContent.length}/500</span>
                                {editError && <span className="text-xs text-destructive">{editError}</span>}
                            </div>
                        </div>
                        <div className="px-4 pb-4 flex gap-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowEdit(false)} disabled={editSaving}>
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1 rounded-xl"
                                onClick={handleSaveEdit}
                                disabled={editSaving || !editContent.trim() || editContent.trim() === localContent.trim()}
                            >
                                {editSaving
                                    ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    : 'Guardar'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Likers modal */}
            {showLikers && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center" onClick={() => setShowLikers(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative w-full md:max-w-lg md:rounded-2xl rounded-t-2xl bg-background border border-border overflow-hidden animate-in slide-in-from-bottom duration-200 flex flex-col"
                        style={{ maxHeight: '75vh' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-center pt-3 pb-1 md:hidden">
                            <div className="w-10 h-1 rounded-full bg-border" />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                            <h3 className="text-sm font-bold">
                                {likersTotal > 0 ? `${likersTotal} ${likersTotal === 1 ? 'like' : 'likes'}` : 'Les gustó'}
                            </h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowLikers(false)}>
                                <XIcon className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                            {likersLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                </div>
                            ) : likers.length > 0 ? (
                                likers.map(liker => (
                                    <Link
                                        key={liker.id}
                                        to={`/profile/${liker.id}`}
                                        className="flex items-center gap-3 hover:bg-muted/40 -mx-2 px-2 py-1.5 rounded-xl transition-colors"
                                        onClick={() => setShowLikers(false)}
                                    >
                                        <div className="h-9 w-9 rounded-full bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center">
                                            {liker.avatar_url
                                                ? <img src={liker.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                                                : <UserIcon className="h-4 w-4 text-primary" />}
                                        </div>
                                        <span className="text-[14px] font-medium">{liker.full_name}</span>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <UsersIcon className="mx-auto h-10 w-10 text-muted-foreground/20 mb-2" />
                                    <p className="text-sm text-muted-foreground">Nadie ha dado like aún.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Comments modal */}
            {showComments && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center" onClick={() => setShowComments(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative w-full md:max-w-lg md:rounded-2xl rounded-t-2xl bg-background border border-border overflow-hidden animate-in slide-in-from-bottom duration-200 flex flex-col"
                        style={{ maxHeight: '85vh' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1 md:hidden">
                            <div className="w-10 h-1 rounded-full bg-border" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                            <h3 className="text-sm font-bold">Comentarios</h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowComments(false)}>
                                <XIcon className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Comments list */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                            {commentsLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                </div>
                            ) : comments.length > 0 ? (
                                comments.map(c => (
                                    <div key={c.id} className="flex gap-3">
                                        <Link to={`/profile/${c.author.id}`} className="shrink-0" onClick={() => setShowComments(false)}>
                                            <div className="h-9 w-9 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center">
                                                {c.author.avatar_url
                                                    ? <img src={c.author.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                                                    : <UserIcon className="h-4 w-4 text-primary" />}
                                            </div>
                                        </Link>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] leading-snug">
                                                <Link to={`/profile/${c.author.id}`} className="font-bold hover:underline" onClick={() => setShowComments(false)}>{c.author.full_name}</Link>
                                                {' '}<span className="font-normal">{c.content}</span>
                                            </p>
                                            <span className="text-[10px] text-muted-foreground mt-0.5 block">{timeAgo(c.created_at)}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <MessageCircleIcon className="mx-auto h-10 w-10 text-muted-foreground/20 mb-2" />
                                    <p className="text-sm text-muted-foreground">No hay comentarios aún.</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Sé el primero en comentar.</p>
                                </div>
                            )}
                        </div>

                        {/* Comment input — fixed at bottom */}
                        <div className="shrink-0 border-t border-border px-4 py-3 flex gap-2 items-center bg-background" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                            <Input
                                placeholder="Agregar comentario..."
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmitComment()}
                                className="h-10 text-sm flex-1 rounded-xl"
                                maxLength={500}
                                disabled={commentSending}
                                autoFocus
                            />
                            <Button
                                size="icon"
                                className="h-10 w-10 shrink-0 rounded-full"
                                onClick={handleSubmitComment}
                                disabled={!commentText.trim() || commentSending}
                            >
                                {commentSending
                                    ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    : <SendIcon className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Media expanded overlay */}
            {mediaExpanded && mediaItems.length > 0 && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90" onClick={() => setMediaExpanded(false)}>
                    <button
                        className="absolute top-4 right-4 bg-white/10 text-white rounded-full p-2 hover:bg-white/20 transition-colors z-10"
                        onClick={() => setMediaExpanded(false)}
                    >
                        <XIcon className="h-5 w-5" />
                    </button>

                    {/* Counter */}
                    {mediaItems.length > 1 && (
                        <span className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/10 text-white text-sm font-medium px-3 py-1 rounded-full z-10">
                            {mediaIndex + 1} / {mediaItems.length}
                        </span>
                    )}

                    {/* Content */}
                    <div className="max-h-[90vh] max-w-[95vw] flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        {mediaItems[mediaIndex].type === 'image' ? (
                            <img
                                src={mediaItems[mediaIndex].url}
                                alt=""
                                className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg"
                            />
                        ) : (
                            <video
                                src={mediaItems[mediaIndex].url}
                                controls
                                autoPlay
                                playsInline
                                className="max-h-[90vh] max-w-[95vw] rounded-lg"
                            />
                        )}
                    </div>

                    {/* Nav arrows */}
                    {mediaItems.length > 1 && mediaIndex > 0 && (
                        <button
                            onClick={e => { e.stopPropagation(); setMediaIndex(i => i - 1); }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 text-white rounded-full p-2 hover:bg-white/20 transition-colors"
                        >
                            <ChevronLeftIcon className="h-6 w-6" />
                        </button>
                    )}
                    {mediaItems.length > 1 && mediaIndex < mediaItems.length - 1 && (
                        <button
                            onClick={e => { e.stopPropagation(); setMediaIndex(i => i + 1); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 text-white rounded-full p-2 hover:bg-white/20 transition-colors"
                        >
                            <ChevronRightIcon className="h-6 w-6" />
                        </button>
                    )}
                </div>
            )}

            {/* Options Action Sheet */}
            {showOptions && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setShowOptions(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative w-full shadow-2xl md:max-w-sm rounded-t-2xl bg-card border-x border-t border-border pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1.5 rounded-full bg-border" /></div>
                        
                        <div className="flex flex-col p-3 space-y-1.5 max-h-[70vh] overflow-y-auto">
                            <button onClick={() => { setShowOptions(false); navigator.clipboard.writeText(publication.content); }} className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-muted font-semibold text-[15px] transition-colors text-left text-foreground active:scale-[0.98]">
                                <ClipboardIcon className="h-5 w-5 text-muted-foreground" /> Copiar texto
                            </button>
                            {!isOwner && (
                                <button onClick={() => { setShowOptions(false); handleReport(); }} className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-muted font-semibold text-[15px] transition-colors text-left text-foreground active:scale-[0.98]">
                                    <FlagIcon className="h-5 w-5 text-muted-foreground" /> Reportar publicación
                                </button>
                            )}
                            {isOwner && isEditable && (
                                <button onClick={() => { setShowOptions(false); setEditContent(localContent); setEditError(''); setShowEdit(true); }} className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-muted font-semibold text-[15px] transition-colors text-left text-foreground active:scale-[0.98]">
                                    <PencilIcon className="h-5 w-5 text-muted-foreground" /> Editar publicación
                                </button>
                            )}
                            {isOwner && (
                                <button onClick={() => { setShowOptions(false); onDelete?.(publication.id); }} className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-red-500/10 font-bold text-[15px] transition-colors text-left text-red-500 active:scale-[0.98]">
                                    <TrashIcon className="h-5 w-5" /> Eliminar publicación
                                </button>
                            )}
                            
                            {!isOwner && isModerator && (
                                <>
                                    <div className="h-px bg-border my-2" />
                                    <span className="px-3 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest py-1">Moderación</span>
                                    <button onClick={() => { setShowOptions(false); setShowModerationModal(true); }} className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-destructive/10 font-bold text-[15px] transition-colors text-left text-destructive active:scale-[0.98]">
                                        <TrashIcon className="h-5 w-5" /> Eliminar contenido
                                    </button>
                                    <button onClick={() => { setShowOptions(false); setShowWarnModal(true); }} className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-amber-500/10 font-bold text-[15px] transition-colors text-left text-amber-500 active:scale-[0.98]">
                                        <AlertTriangleIcon className="h-5 w-5" /> Emitir advertencia
                                    </button>
                                    {canBan && (
                                        <button onClick={() => { setShowOptions(false); setShowBanModal(true); }} className="flex items-center gap-3 p-3.5 rounded-xl bg-red-500/5 hover:bg-red-500/15 border border-red-500/20 font-bold text-[15px] transition-colors text-left text-red-600 active:scale-[0.98]">
                                            <ShieldAlertIcon className="h-5 w-5" /> Banear usuario
                                        </button>
                                    )}
                                </>
                            )}
                            <div className="pt-2">
                                <Button variant="secondary" className="w-full rounded-xl h-12 text-base font-bold" onClick={() => setShowOptions(false)}>
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Ban Modal */}
            {showBanModal && (
                <div className="fixed inset-0 z-[110] flex items-end justify-center" onClick={() => setShowBanModal(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative w-full shadow-2xl md:max-w-sm rounded-t-2xl bg-card border-x border-t border-border p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                <ShieldAlertIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">Banear a {author.full_name}</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    El usuario perderá acceso inmediato a PotroNET.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3">
                            <Button 
                                variant="destructive" 
                                className="w-full h-12 text-base font-bold shadow-lg shadow-red-500/20" 
                                onClick={handleBanAuthor}
                                disabled={isBanning}
                            >
                                {isBanning ? 'Procesando...' : 'Confirmar Ban'}
                            </Button>
                            <Button 
                                variant="outline" 
                                className="w-full h-12 text-base font-bold" 
                                onClick={() => setShowBanModal(false)}
                                disabled={isBanning}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Moderation Modals */}
            <ModerationModal
                isOpen={showModerationModal}
                onClose={() => setShowModerationModal(false)}
                onConfirm={handleModeratorDelete}
                contentPreview={publication.content}
                authorName={author.full_name}
            />
            <WarnUserModal
                isOpen={showWarnModal}
                onClose={() => setShowWarnModal(false)}
                onConfirm={handleWarnAuthor}
                userName={author.full_name}
            />
        </article>
    );
}

// Memoize so that unrelated feed re-renders (e.g. another card's state) don't
// re-render every card. Fine-grained comparator: id + counters + user_liked.
export const PublicationCard = memo(PublicationCardInner, (prev, next) => {
    const a = prev.publication;
    const b = next.publication;
    return (
        a.id === b.id &&
        a.likes_count === b.likes_count &&
        a.comments_count === b.comments_count &&
        a.user_liked === b.user_liked &&
        prev.currentUserId === next.currentUserId &&
        prev.hideAuthor === next.hideAuthor &&
        prev.onLike === next.onLike &&
        prev.onDelete === next.onDelete
    );
});
