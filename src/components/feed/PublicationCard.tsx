import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { api } from '@/lib/api';
import { ModerationModal } from '@/components/moderation/ModerationModal';
import { WarnUserModal } from '@/components/moderation/WarnUserModal';
import type { ModerationCategory } from '@/components/moderation/ModerationModal';
import {
    HeartIcon, TrashIcon, UserIcon, MessageCircleIcon, SendIcon,
    MoreHorizontalIcon, XIcon, ClipboardIcon, FlagIcon, ChevronLeftIcon, ChevronRightIcon,
    ShieldIcon, ShieldAlertIcon, AlertTriangleIcon,
} from 'lucide-react';

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

export function PublicationCard({
    publication,
    currentUserId,
    hideAuthor,
    onLike,
    onDelete,
}: PublicationCardProps) {
    const { session } = useAuth();
    const { isModerator, canBan } = useRole();
    const { author } = publication;
    const isOwner = currentUserId === author.id;

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

    // Share modal
    const [showShare, setShowShare] = useState(false);
    const [shareSearch, setShareSearch] = useState('');
    const [allFriends, setAllFriends] = useState<{ id: string; full_name: string; avatar_url: string }[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [shareSent, setShareSent] = useState<Set<string>>(new Set());

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

    const handleOpenComments = () => {
        if (comments.length === 0) loadComments();
        setShowComments(true);
        setShowShare(false);
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

    const loadFriends = async () => {
        if (!session?.access_token || allFriends.length > 0) return;
        setFriendsLoading(true);
        try {
            const data = await api<{ users: { id: string; full_name: string; avatar_url: string }[] }>(
                '/follows?type=friends', { token: session.access_token }
            );
            setAllFriends(data.users);
        } catch { /* silent */ } finally { setFriendsLoading(false); }
    };

    const handleShareTo = async (userId: string) => {
        if (!session?.access_token) return;
        try {
            const firstMedia = mediaItems.length > 0 ? `\n${mediaItems[0].url}` : '';
            const shareContent = `📣 Publicación de ${author.full_name}:\n\n"${publication.content.slice(0, 200)}..."${firstMedia}`;
            await api('/messages', {
                method: 'POST', token: session.access_token,
                body: JSON.stringify({ receiver_id: userId, content: shareContent }),
            });
            setShareSent(prev => new Set(prev).add(userId));
        } catch { /* silent */ }
    };

    const handleOpenShare = () => {
        setShowShare(true);
        setShowComments(false);
        setShareSearch('');
        setShareSent(new Set());
        loadFriends();
    };

    const filteredFriends = shareSearch.trim()
        ? allFriends.filter(u => u.full_name.toLowerCase().includes(shareSearch.toLowerCase()))
        : allFriends;

    return (
        <article className="border-b border-border/40 bg-background pt-4 pb-3 flex flex-col gap-2 md:rounded-xl md:border md:p-4 md:shadow-sm md:mb-4">
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
                                        <video
                                            src={item.url}
                                            controls
                                            preload="metadata"
                                            playsInline
                                            className="w-full max-h-[450px] bg-black"
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
                    {publication.content}
                </p>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95 text-muted-foreground hover:text-foreground" onClick={handleOpenShare}>
                        <SendIcon className="h-5 w-5" />
                    </Button>
                </div>
                {likesCount > 0 && (
                    <p className="text-[13px] font-semibold mt-0.5">{likesCount} {likesCount === 1 ? 'like' : 'likes'}</p>
                )}
                {localCommentsCount > 0 && (
                    <button onClick={handleOpenComments} className="text-[12px] text-muted-foreground hover:underline">
                        Ver {localCommentsCount} {localCommentsCount === 1 ? 'comentario' : 'comentarios'}
                    </button>
                )}
            </div>

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

            {/* Share modal */}
            {showShare && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center" onClick={() => setShowShare(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative w-full md:max-w-sm md:rounded-2xl rounded-t-2xl bg-background border border-border overflow-hidden animate-in slide-in-from-bottom duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1 md:hidden">
                            <div className="w-10 h-1 rounded-full bg-border" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                            <h3 className="text-sm font-bold">Enviar a</h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowShare(false)}>
                                <XIcon className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Search */}
                        <div className="px-4 py-2">
                            <Input
                                placeholder="Buscar amigo..."
                                value={shareSearch}
                                onChange={e => setShareSearch(e.target.value)}
                                className="h-9 text-sm rounded-xl bg-muted/50"
                                autoFocus
                            />
                        </div>

                        {/* Friends list */}
                        <div className="max-h-[50vh] overflow-y-auto px-2 pb-4">
                            {friendsLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                </div>
                            ) : filteredFriends.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-8">
                                    {allFriends.length === 0 ? 'No tienes amigos aún.' : 'No se encontraron resultados.'}
                                </p>
                            ) : (
                                <div className="grid grid-cols-4 gap-1 pt-1">
                                    {filteredFriends.map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => !shareSent.has(u.id) && handleShareTo(u.id)}
                                            disabled={shareSent.has(u.id)}
                                            className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all active:scale-95 hover:bg-muted/50"
                                        >
                                            <div className={`h-14 w-14 rounded-full overflow-hidden flex items-center justify-center ${shareSent.has(u.id) ? 'ring-2 ring-emerald-500' : 'bg-primary/10'}`}>
                                                {u.avatar_url
                                                    ? <img src={u.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
                                                    : <UserIcon className="h-6 w-6 text-primary" />}
                                            </div>
                                            <span className="text-[11px] font-medium text-center leading-tight line-clamp-2 max-w-[70px]">
                                                {shareSent.has(u.id) ? 'Enviado' : u.full_name.split(' ')[0]}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
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
