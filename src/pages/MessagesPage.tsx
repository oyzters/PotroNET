import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { ChatSkeleton } from '@/components/ui/Skeleton';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import {
    MessageCircleIcon, SendIcon, UserIcon, ArrowLeftIcon,
    CheckIcon, CheckCheckIcon, SmileIcon, XIcon, SearchIcon,
    PenSquareIcon, ChevronDownIcon, ChevronUpIcon, Trash2Icon, UserPlusIcon, LoaderIcon, ImageIcon
} from 'lucide-react';

// Hook para detectar tamaño de pantalla
function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => setMatches(media.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [matches, query]);

    return matches;
}

interface ConversationUser { id: string; full_name: string; avatar_url: string; email: string }
interface LastMessage { content: string; created_at: string; sender_id: string; is_read?: boolean }
interface Conversation { user: ConversationUser; lastMessage: LastMessage | null; unread: number; is_request?: boolean }
interface Message { id: string; sender_id: string; receiver_id: string; content: string; is_read: boolean; created_at: string; reply_to?: string }
interface Friend { id: string; full_name: string; avatar_url: string; email: string }

const MEDIA_PREVIEW_RE = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|mp4|webm)(\?.*)?$/i;
const VIDEO_PREVIEW_RE = /\.(mp4|webm)(\?.*)?$/i;
function formatMsgPreview(content: string | null | undefined): string {
    if (!content) return '';
    if (MEDIA_PREVIEW_RE.test(content)) return VIDEO_PREVIEW_RE.test(content) ? '🎥 Video' : '📷 Foto';
    return content;
}

export function MessagesPage() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { session, user } = useAuth();
    const { theme } = useTheme();
    const isDesktop = useMediaQuery('(min-width: 768px)'); // md breakpoint
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewMessage, setShowNewMessage] = useState(false);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [showRequests, setShowRequests] = useState(false);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    
    // Swipe to reply logic
    const [swipeStates, setSwipeStates] = useState<Record<string, number>>({});
    const swipeStartRef = useRef<{ id: string, x: number, y: number, locked: boolean } | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatUser, setChatUser] = useState<ConversationUser | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<any>(null);

    // Refs para evitar stale closures y race conditions
    const activeUserIdRef = useRef<string | null>(null);
    const conversationsRef = useRef<Conversation[]>([]);

    const activeUserId = userId ?? null;
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Lock body scroll on iOS while chat is open — prevents vv.offsetTop from drifting
    useBodyScrollLock(!!activeUserId && !isDesktop);

    // Mantener ref de conversaciones sincronizada sin recrear fetchMessages
    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    const fetchConversations = useCallback(async () => {
        if (!session?.access_token) return;
        setLoading(true);
        try {
            const data = await api<{ conversations: Conversation[] }>('/messages', { token: session.access_token });
            setConversations(data.conversations.map(c =>
                c.user.id === activeUserIdRef.current ? { ...c, unread: 0 } : c
            ));
        } catch { /* silent */ } finally { setLoading(false); }
    }, [session?.access_token]);

    const fetchMessages = useCallback(async (targetId: string) => {
        if (!session?.access_token) return;
        setMessagesLoading(true);
        try {
            const data = await api<{ messages: Message[] }>(`/messages/${targetId}`, { token: session.access_token });

            // Ignorar respuesta si el usuario ya cambió de chat (race condition)
            if (activeUserIdRef.current !== targetId) return;

            setMessages(data.messages);

            const conv = conversationsRef.current.find(c => c.user.id === targetId);
            if (conv) setChatUser(conv.user);
        } catch { /* silent */ } finally {
            if (activeUserIdRef.current === targetId) setMessagesLoading(false);
        }
    }, [session?.access_token]); // No depende de conversations — usa el ref

    useEffect(() => { fetchConversations(); }, [fetchConversations]);

    useEffect(() => {
        // Actualizar ref y limpiar estado ANTES del fetch para no mostrar mensajes del chat anterior
        activeUserIdRef.current = activeUserId;

        if (activeUserId) {
            setMessages([]);
            setChatUser(null);
            fetchMessages(activeUserId);
            // Clear unread badge for this conversation
            setConversations(prev => prev.map(c =>
                c.user.id === activeUserId ? { ...c, unread: 0 } : c
            ));
        }
    }, [activeUserId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Setear chatUser cuando las conversaciones se cargan (resuelve race condition)
    useEffect(() => {
        if (activeUserId && !chatUser) {
            const conv = conversations.find(c => c.user.id === activeUserId);
            if (conv) setChatUser(conv.user);
        }
    }, [conversations, activeUserId, chatUser]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Realtime: mensajes entrantes en el chat activo y typing
    useEffect(() => {
        if (!activeUserId || !user?.id) return;

        const channel = supabase
            .channel(`chat:${user.id}:${activeUserId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${user.id}`,
            }, (payload: any) => {
                const msg = payload.new as Message;
                if (msg.sender_id === activeUserId) {
                    setMessages(prev => [...prev, msg]);
                    setIsTyping(false); // Stop typing when msg arrives
                }
            })
            // Typing broadcast
            .on('broadcast', { event: 'typing' }, (payload: any) => {
                if (payload.userId === activeUserId) {
                    setIsTyping(true);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
                }
            })
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    channelRef.current = channel;
                }
            });

        return () => { 
            supabase.removeChannel(channel); 
            channelRef.current = null;
        };
    }, [activeUserId, user?.id]);

    // Realtime: actualizar lista de conversaciones cuando llega mensaje nuevo
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`conversations:${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${user.id}`,
            }, () => {
                fetchConversations();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.id, fetchConversations]);

    // Visual Viewport: resize container when keyboard opens on iOS (only track height, not top)
    useEffect(() => {
        if (!activeUserId || isDesktop) return;

        const vv = window.visualViewport;
        if (!vv) return;

        const updateLayout = () => {
            const el = chatContainerRef.current;
            if (!el) return;
            el.style.height = `${vv.height}px`;
        };

        vv.addEventListener('resize', updateLayout);
        updateLayout();

        return () => {
            vv.removeEventListener('resize', updateLayout);
            const el = chatContainerRef.current;
            if (el) el.style.height = '';
        };
    }, [activeUserId, isDesktop]);

    const handleSend = async () => {
        if (!session?.access_token || !activeUserId || !newMessage.trim() || !user?.id) return;
        const content = newMessage.trim();
        setNewMessage('');

        // Optimistic update
        const optimisticMsg: Message = {
            id: crypto.randomUUID(),
            sender_id: user.id,
            receiver_id: activeUserId,
            content,
            is_read: false,
            created_at: new Date().toISOString(),
            reply_to: replyingTo?.id
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setReplyingTo(null);

        setSending(true);
        try {
            await api('/messages', {
                method: 'POST', token: session.access_token,
                body: JSON.stringify({ receiver_id: activeUserId, content, reply_to: replyingTo?.id }),
            });
        } catch {
            // Revertir si falla
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
            setNewMessage(content);
        } finally { setSending(false); }
    };

    const handleTouchStart = (e: React.TouchEvent, msgId: string) => {
        swipeStartRef.current = { id: msgId, x: e.touches[0].clientX, y: e.touches[0].clientY, locked: false };
    };

    const handleTouchMove = (e: React.TouchEvent, msgId: string) => {
        if (!swipeStartRef.current || swipeStartRef.current.id !== msgId) return;
        const deltaX = e.touches[0].clientX - swipeStartRef.current.x;
        const deltaY = Math.abs(e.touches[0].clientY - swipeStartRef.current.y);
        // Si el movimiento vertical supera el horizontal, es scroll — cancelar
        if (!swipeStartRef.current.locked && deltaY > Math.abs(deltaX)) {
            swipeStartRef.current = null;
            return;
        }
        // Solo swipe a la derecha con dead zone de 12px
        if (deltaX > 12 && deltaX < 80) {
            swipeStartRef.current.locked = true;
            setSwipeStates(prev => ({ ...prev, [msgId]: deltaX - 12 }));
        }
    };

    const handleTouchEnd = (msgId: string, msg: Message) => {
        if (!swipeStartRef.current || swipeStartRef.current.id !== msgId) return;
        const deltaX = swipeStates[msgId] || 0;
        if (deltaX > 55) {
            setReplyingTo(msg);
        }
        setSwipeStates(prev => {
            const next = { ...prev };
            delete next[msgId];
            return next;
        });
        swipeStartRef.current = null;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        if (channelRef.current && user?.id) {
            // Typing throttle can be implemented here, simplified for now
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { userId: user.id }
            }).catch(() => {});
        }
    };

    const mediaUrlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|mp4|webm)(\?.*)?$/i;

    const handleMediaLoaded = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    };


    const MEDIA_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
    const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
    const API_BASE = import.meta.env.VITE_API_URL || '/api';

    const handlePickMedia = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Reset so picking the same file again re-fires change
        if (e.target) e.target.value = '';
        if (!file) return;
        if (!session?.access_token || !activeUserId || !user?.id) return;

        if (!MEDIA_MIME.includes(file.type)) {
            return;
        }
        const isVideo = file.type.startsWith('video/');
        const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        if (file.size > maxBytes) {
            return;
        }

        setUploadingMedia(true);
        try {
            // Compress images client-side (videos upload as-is)
            let payload: Blob = file;
            let contentType = file.type;
            let uploadSize = file.size;
            let uploadName = file.name;

            if (!isVideo) {
                try {
                    const mod = await import('browser-image-compression');
                    const compressed = await mod.default(file, {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 1920,
                        initialQuality: 0.8,
                        useWebWorker: true,
                    });
                    payload = compressed;
                    contentType = compressed.type || file.type;
                    uploadSize = compressed.size;
                    uploadName = compressed.name || file.name;
                } catch {
                    // fall back to original
                }
            }

            // 1) Get presigned URL from API
            const signedRes = await fetch(`${API_BASE}/uploads/signed-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ fileName: uploadName, fileType: contentType, fileSize: uploadSize }),
            });
            const signedData = await signedRes.json();
            if (!signedRes.ok) throw new Error(signedData.error || 'Signed URL failed');

            // 2) PUT directly to R2
            const putRes = await fetch(signedData.signedUrl, {
                method: 'PUT',
                headers: { 'Content-Type': contentType },
                body: payload,
            });
            if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

            // 3) Send message with public URL as content
            const url = signedData.publicUrl as string;
            const optimisticMsg: Message = {
                id: crypto.randomUUID(),
                sender_id: user.id,
                receiver_id: activeUserId,
                content: url,
                is_read: false,
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, optimisticMsg]);

            await api('/messages', {
                method: 'POST', token: session.access_token,
                body: JSON.stringify({ receiver_id: activeUserId, content: url }),
            });
        } catch {
            // Remove optimistic if it was added; otherwise noop.
            setMessages(prev => prev.filter(m => m.content !== '__upload_failed_placeholder__'));
        } finally {
            setUploadingMedia(false);
        }
    };

    const fetchFriends = useCallback(async () => {
        if (!session?.access_token) return;
        setFriendsLoading(true);
        try {
            const data = await api<{ users: Friend[] }>('/follows?type=friends', { token: session.access_token });
            setFriends(data.users);
        } catch { /* silent */ } finally { setFriendsLoading(false); }
    }, [session?.access_token]);

    const handleOpenNewMessage = () => {
        setShowNewMessage(true);
        fetchFriends();
    };

    const handleAcceptRequest = async (conv: Conversation) => {
        if (!session?.access_token) return;
        setAcceptingId(conv.user.id);
        try {
            await api('/follows', {
                method: 'POST',
                token: session.access_token,
                body: JSON.stringify({ following_id: conv.user.id }),
            });
            setConversations(prev => prev.map(c =>
                c.user.id === conv.user.id ? { ...c, is_request: false } : c
            ));
        } catch { /* silent */ } finally { setAcceptingId(null); }
    };

    const handleDeleteRequest = async (conv: Conversation) => {
        if (!session?.access_token) return;
        setDeletingId(conv.user.id);
        try {
            await api(`/messages/${conv.user.id}`, {
                method: 'DELETE',
                token: session.access_token,
            });
            setConversations(prev => prev.filter(c => c.user.id !== conv.user.id));
        } catch { /* silent */ } finally { setDeletingId(null); }
    };

    const filteredConversations = conversations.filter(c =>
        c.user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Mobile chat view - When specific user is selected
    if (activeUserId && !isDesktop) {
        return (
            <div
                ref={chatContainerRef}
                className="fixed inset-x-0 top-0 z-[100] flex flex-col bg-background"
                style={{ height: '100dvh' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between bg-white dark:bg-card px-3 pb-2 border-b border-border shadow-sm shrink-0" style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}>
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        <Link to="/messages" className="p-2 -ml-2 rounded-full hover:bg-muted text-primary transition-colors shrink-0">
                            <ArrowLeftIcon className="h-5 w-5" />
                        </Link>
                        <Link to={`/profile/${chatUser?.id}`} className="flex items-center gap-1.5 overflow-hidden group">
                            <div className="relative h-10 w-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                                {chatUser?.avatar_url
                                    ? <img src={chatUser.avatar_url} alt="" className="h-full w-full object-cover" />
                                    : <UserIcon className="h-5 w-5 text-primary" />}
                            </div>
                            <div className="leading-tight px-1 overflow-hidden group-hover:underline">
                                {chatUser ? (
                                    <>
                                        <p className="font-semibold text-sm line-clamp-1 truncate">{chatUser.full_name}</p>
                                        {isTyping ? (
                                            <p className="text-[12px] font-medium text-emerald-500 animate-pulse tracking-wide truncate">Escribiendo...</p>
                                        ) : (
                                            <p className="text-[12px] text-muted-foreground line-clamp-1 truncate">{chatUser.email}</p>
                                        )}
                                    </>
                                ) : (
                                    <div className="space-y-1.5 py-1">
                                        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                                        <div className="h-2 w-16 animate-pulse rounded bg-muted" />
                                    </div>
                                )}
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 relative z-0">
                    {messagesLoading ? (
                        <div className="space-y-4 px-1">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                                    <div className="h-10 animate-pulse rounded-2xl bg-muted/60" style={{ width: `${40 + (i * 13) % 35}%` }} />
                                </div>
                            ))}
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm text-center px-4 py-2 rounded-xl border border-border/50 text-xs text-muted-foreground shadow-sm">
                                Envía un mensaje para iniciar la conversación
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, msgIdx) => {
                                const repliedMsg = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null;
                                const isSender = msg.sender_id === user?.id;
                                const isMedia = mediaUrlPattern.test(msg.content);
                                const isVideo = /\.(mp4|webm)(\?.*)?$/i.test(msg.content);
                                const timeStr = new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                                const swipeStyle = { transform: swipeStates[msg.id] ? `translateX(${swipeStates[msg.id]}px)` : 'translateX(0)' };
                                const prevMsg = msgIdx > 0 ? messages[msgIdx - 1] : null;
                                const isConsecutive = !!(prevMsg && prevMsg.sender_id === msg.sender_id);
                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex group ${isConsecutive ? 'mt-[3px]' : 'mt-[9px]'} ${isSender ? 'justify-end' : 'justify-start'}`}
                                        onTouchStart={(e) => handleTouchStart(e, msg.id)}
                                        onTouchMove={(e) => handleTouchMove(e, msg.id)}
                                        onTouchEnd={() => handleTouchEnd(msg.id, msg)}
                                    >
                                        {isMedia ? (
                                            <div
                                                className={`max-w-[85%] rounded-xl shadow-sm relative overflow-hidden transition-transform duration-100 ${isSender ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                                                style={swipeStyle}
                                            >
                                                {isVideo
                                                    ? <video src={msg.content} controls playsInline preload="metadata" onLoadedMetadata={handleMediaLoaded} className="block max-w-full max-h-[300px]" />
                                                    : <img src={msg.content} alt="" onLoad={handleMediaLoaded} className="block max-w-full max-h-[300px] object-cover cursor-zoom-in" onClick={() => setLightboxSrc(msg.content)} />
                                                }
                                                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                                                <div className="absolute bottom-1.5 right-2 flex items-center gap-1 text-[11px] text-white drop-shadow-sm">
                                                    <span>{timeStr}</span>
                                                    {isSender && (msg.is_read ? <CheckCheckIcon className="h-3 w-3 text-sky-300" /> : <CheckIcon className="h-3 w-3" />)}
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className={`max-w-[85%] min-w-0 rounded-xl px-3 py-1.5 shadow-sm relative transition-transform duration-100 ${isSender ? 'bg-primary/95 text-white rounded-tr-sm' : 'bg-white dark:bg-card text-foreground rounded-tl-sm border border-border/50'}`}
                                                style={swipeStyle}
                                            >
                                                {repliedMsg && (
                                                    <div className="mb-1.5 rounded-xl bg-background/50 p-2 text-xs border-l-4 border-primary">
                                                        <span className="font-semibold text-primary">{repliedMsg.sender_id === user?.id ? 'Tú' : chatUser?.full_name}</span>
                                                        <p className="text-muted-foreground truncate">{formatMsgPreview(repliedMsg.content)}</p>
                                                    </div>
                                                )}
                                                <div className="flex flex-col pt-0.5">
                                                    <span className="text-[15px] leading-[1.45] [overflow-wrap:anywhere]">
                                                        {msg.content}
                                                        <span aria-hidden className="inline-block w-[76px]">&nbsp;</span>
                                                    </span>
                                                    <span className={`self-end -mt-[15px] flex items-center gap-1 text-[10px] whitespace-nowrap ${isSender ? 'text-white/75' : 'text-muted-foreground/60'}`}>
                                                        {timeStr}
                                                        {isSender && (msg.is_read ? <CheckCheckIcon className="h-3 w-3 text-sky-300" /> : <CheckIcon className="h-3 w-3" />)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-card border border-border/50 px-4 py-2.5 rounded-2xl rounded-tl-sm inline-block shadow-sm">
                                        <span className="flex gap-1 items-center h-4">
                                            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"></span>
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div ref={bottomRef} className="h-1 text-transparent">-</div>
                        </>
                    )}
                </div>

                {/* Input Area */}
                <div className="bg-white dark:bg-card pt-2 px-2 z-10 border-t border-border shadow-sm flex flex-col relative" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                    {showEmojiPicker && (
                        <div className="absolute bottom-full left-2 mb-2 z-50">
                            <EmojiPicker 
                                theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT} 
                                onEmojiClick={(emojiData) => setNewMessage(m => m + emojiData.emoji)} 
                            />
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                        className="hidden"
                        onChange={handleFileSelected}
                    />

                    {replyingTo && (
                        <div className="max-w-4xl mx-auto w-full mb-2 flex items-center justify-between rounded-xl bg-muted/50 p-2 text-[13px] border-l-4 border-primary">
                            <div className="flex-1 min-w-0 pr-2">
                                <span className="font-semibold text-primary block truncate">Respondiendo a {replyingTo?.sender_id === user?.id ? 'Ti' : chatUser?.full_name}</span>
                                <span className="text-muted-foreground truncate block">{formatMsgPreview(replyingTo?.content)}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setReplyingTo(null)}>
                                <XIcon className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
                        <div className="flex-1 flex items-center bg-muted/40 rounded-full overflow-hidden min-h-[50px]">
                            <button
                                className="p-3 pl-4 text-muted-foreground shrink-0"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            >
                                <SmileIcon className="h-[22px] w-[22px]" />
                            </button>
                            <Input
                                placeholder="Escribe un mensaje"
                                value={newMessage}
                                onChange={handleInputChange}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                onClick={() => setShowEmojiPicker(false)}
                                onFocus={() => {
                                    setTimeout(() => {
                                        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                                    }, 320);
                                }}
                                maxLength={1000}
                                className="border-0 !bg-transparent shadow-none px-2 focus-visible:ring-0 rounded-none flex-1 h-[50px] text-[15.5px]"
                            />
                            <button
                                className="p-3 pr-4 text-muted-foreground shrink-0 disabled:opacity-50"
                                onClick={handlePickMedia}
                                disabled={uploadingMedia}
                                type="button"
                            >
                                {uploadingMedia
                                    ? <LoaderIcon className="h-[22px] w-[22px] animate-spin" />
                                    : <ImageIcon className="h-[22px] w-[22px]" />}
                            </button>
                        </div>
                        <Button
                            onClick={handleSend}
                            disabled={sending || !newMessage.trim()}
                            className="h-12 w-12 shrink-0 rounded-full p-0 flex items-center justify-center bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
                        >
                            <SendIcon className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Lightbox */}
                {lightboxSrc && (
                    <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center" onClick={() => setLightboxSrc(null)}>
                        <button className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors" onClick={() => setLightboxSrc(null)}>
                            <XIcon className="h-6 w-6" />
                        </button>
                        <img src={lightboxSrc} alt="" className="max-w-full max-h-full object-cover select-none" onClick={e => e.stopPropagation()} />
                    </div>
                )}
            </div>
        );
    }

    // Mobile chat list - When no activeUserId
    if (!activeUserId && !isDesktop) {
        const primaryConvs = filteredConversations.filter(c => !c.is_request);
        const requestConvs = filteredConversations.filter(c => c.is_request);
        return (
        <div className="pb-20 h-svh flex flex-col bg-background relative z-10" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
                <div className="px-4 pb-2 flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="p-2 rounded-full hover:bg-muted text-primary transition-colors">
                            <ArrowLeftIcon className="h-5 w-5" />
                        </Link>
                        <h1 className="text-2xl font-bold">Chats</h1>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 text-foreground" onClick={handleOpenNewMessage}>
                        <PenSquareIcon className="h-5 w-5" />
                    </Button>
                </div>

                <div className="px-4 pb-2">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar conversación..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 rounded-xl bg-muted/50 border-transparent focus-visible:border-primary/30"
                        />
                    </div>
                </div>

                {/* New message modal */}
                {showNewMessage && (
                    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowNewMessage(false)}>
                        <div className="bg-background w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <h2 className="font-semibold text-lg">Nuevo mensaje</h2>
                                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowNewMessage(false)}>
                                    <XIcon className="h-5 w-5" />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {friendsLoading ? (
                                    <ChatSkeleton />
                                ) : friends.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground text-sm">No tienes amigos aún</div>
                                ) : friends.map(friend => (
                                    <button
                                        key={friend.id}
                                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/30 transition-colors"
                                        onClick={() => { setShowNewMessage(false); navigate(`/messages/${friend.id}`); }}
                                    >
                                        <div className="h-11 w-11 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                                            {friend.avatar_url
                                                ? <img src={friend.avatar_url} alt="" className="h-full w-full object-cover" />
                                                : <UserIcon className="h-5 w-5 text-primary" />}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-sm">{friend.full_name}</p>
                                            <p className="text-xs text-muted-foreground">{friend.email}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <ChatSkeleton />
                ) : filteredConversations.length === 0 ? (
                    <div className="m-4 rounded-2xl border border-dashed border-border py-16 text-center">
                        <MessageCircleIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
                        <p className="mt-4 text-muted-foreground font-medium">{searchQuery ? 'Sin resultados' : 'No tienes chats activos'}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{searchQuery ? 'Intenta con otro nombre' : 'Encuentra a alguien en Búsqueda para enviar un mensaje'}</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto bg-background">
                        {requestConvs.length > 0 && (
                            <div className="px-4 py-3 border-b border-border/50">
                                <button onClick={() => setShowRequests(!showRequests)} className="flex items-center justify-between w-full rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 transition-colors hover:bg-primary/10">
                                    <div className="text-left">
                                        <p className="text-sm font-semibold">Solicitudes de mensaje</p>
                                        <p className="text-xs text-muted-foreground">{requestConvs.length} {requestConvs.length === 1 ? 'solicitud' : 'solicitudes'} pendiente{requestConvs.length > 1 ? 's' : ''}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground px-1.5">
                                            {requestConvs.length}
                                        </span>
                                        {showRequests ? <ChevronUpIcon className="h-4 w-4 text-muted-foreground" /> : <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />}
                                    </div>
                                </button>
                                {showRequests && (
                                    <div className="mt-2 space-y-2">
                                        {requestConvs.map(conv => {
                                            const iReceived = conv.lastMessage?.sender_id !== user?.id;
                                            return (
                                            <div key={conv.user.id} className="flex items-center gap-3 rounded-xl bg-muted/30 border border-border/50 px-3 py-2.5">
                                                <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                                                    {conv.user.avatar_url
                                                        ? <img src={conv.user.avatar_url} alt="" className="h-full w-full object-cover" />
                                                        : <UserIcon className="h-5 w-5 text-primary" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm truncate">{conv.user.full_name}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{formatMsgPreview(conv.lastMessage?.content) || 'Nuevo mensaje'}</p>
                                                </div>
                                                {iReceived ? (
                                                    <div className="flex gap-1.5 shrink-0">
                                                        <Button
                                                            size="sm"
                                                            className="h-8 px-3 text-xs rounded-lg"
                                                            disabled={acceptingId === conv.user.id}
                                                            onClick={() => handleAcceptRequest(conv)}
                                                        >
                                                            {acceptingId === conv.user.id ? <LoaderIcon className="h-3 w-3 animate-spin" /> : <><UserPlusIcon className="h-3 w-3 mr-1" />Aceptar</>}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 px-2 text-xs rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            disabled={deletingId === conv.user.id}
                                                            onClick={() => handleDeleteRequest(conv)}
                                                        >
                                                            {deletingId === conv.user.id ? <LoaderIcon className="h-3 w-3 animate-spin" /> : <Trash2Icon className="h-3.5 w-3.5" />}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-muted-foreground shrink-0">Enviada</span>
                                                )}
                                            </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="divide-y divide-border/50">
                        {primaryConvs.map(conv => {
                            const dateObj = conv.lastMessage ? new Date(conv.lastMessage.created_at) : new Date();
                            const timeStr = dateObj.toLocaleDateString() === new Date().toLocaleDateString() 
                                ? dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                                : dateObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
                                
                            const isSentByMe = conv.lastMessage?.sender_id === user?.id;
                            
                            return (
                                <Link to={`/messages/${conv.user.id}`} key={conv.user.id} className="block w-full">
                                    <div className="flex items-center gap-3 py-3 px-4 transition-all hover:bg-muted/30 active:bg-muted/50 cursor-pointer">
                                        <div className="relative h-14 w-14 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                                            {conv.user.avatar_url
                                                ? <img src={conv.user.avatar_url} alt="" className="h-full w-full object-cover" />
                                                : <UserIcon className="h-6 w-6 text-primary" />}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center h-full pb-1">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <p className={`font-semibold text-[16px] truncate ${conv.unread > 0 ? 'text-foreground' : 'text-foreground/90'}`}>
                                                    {conv.user.full_name}
                                                </p>
                                                <span className={`text-[12px] whitespace-nowrap ml-2 ${conv.unread > 0 ? 'text-emerald-500 font-medium' : 'text-muted-foreground/80'}`}>
                                                    {conv.lastMessage ? timeStr : ''}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-[14px] truncate flex items-center gap-1 ${conv.unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                                    {isSentByMe && (
                                                        <span className="text-[10px] shrink-0">
                                                            {conv.lastMessage?.is_read ? <CheckCheckIcon className="h-4 w-4 text-blue-500" /> : <CheckIcon className="h-4 w-4" />}
                                                        </span>
                                                    )}
                                                    <span className="truncate">{formatMsgPreview(conv.lastMessage?.content) || <span className="italic opacity-70">Haz iniciado un chat</span>}</span>
                                                </p>
                                                {conv.unread > 0 && (
                                                    <div className="shrink-0 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[12px] font-bold text-white shadow-sm">
                                                        {conv.unread}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Desktop layout - Always show sidebar + chat area
    return (
        <>
        <div className="h-svh flex bg-background relative z-10">
            {/* Sidebar - User List */}
            <div className="w-80 border-r border-border flex flex-col bg-muted/20">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-background">
                    <div className="flex items-center gap-2">
                        <Link to="/" className="p-2 rounded-full hover:bg-muted text-primary transition-colors">
                            <ArrowLeftIcon className="h-5 w-5" />
                        </Link>
                        <img src="/pwa.png" alt="PotroNET" className="h-8 w-8 rounded-lg object-cover" />
                        <span className="text-lg font-bold">
                            Potro<span className="text-primary">NET</span>
                        </span>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={handleOpenNewMessage}>
                        <PenSquareIcon className="h-5 w-5" />
                    </Button>
                </div>

                {/* Search */}
                <div className="p-3 border-b border-border/50">
                    <div className="relative">
                        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-sm rounded-lg bg-muted/50 border-transparent focus-visible:border-primary/30"
                        />
                    </div>
                </div>

                {/* New message modal (desktop) */}
                {showNewMessage && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={() => setShowNewMessage(false)}>
                        <div className="bg-background w-full max-w-md rounded-2xl max-h-[70vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <h2 className="font-semibold text-lg">Nuevo mensaje</h2>
                                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowNewMessage(false)}>
                                    <XIcon className="h-5 w-5" />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {friendsLoading ? (
                                    <ChatSkeleton />
                                ) : friends.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground text-sm">No tienes amigos aún</div>
                                ) : friends.map(friend => (
                                    <button
                                        key={friend.id}
                                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/30 transition-colors"
                                        onClick={() => { setShowNewMessage(false); navigate(`/messages/${friend.id}`); }}
                                    >
                                        <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                                            {friend.avatar_url
                                                ? <img src={friend.avatar_url} alt="" className="h-full w-full object-cover" />
                                                : <UserIcon className="h-5 w-5 text-primary" />}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-sm">{friend.full_name}</p>
                                            <p className="text-xs text-muted-foreground">{friend.email}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* User List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <ChatSkeleton />
                    ) : filteredConversations.length === 0 ? (
                        <div className="m-4 rounded-2xl border border-dashed border-border py-16 text-center">
                            <MessageCircleIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
                            <p className="mt-4 text-muted-foreground font-medium">{searchQuery ? 'Sin resultados' : 'No tienes chats activos'}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{searchQuery ? 'Intenta con otro nombre' : 'Encuentra a alguien en Búsqueda para enviar un mensaje'}</p>
                        </div>
                    ) : (() => {
                        const primaryConvs = filteredConversations.filter(c => !c.is_request);
                        const requestConvs = filteredConversations.filter(c => c.is_request);
                        return (
                        <>
                        {requestConvs.length > 0 && (
                            <div className="p-3 border-b border-border/50">
                                <button onClick={() => setShowRequests(!showRequests)} className="flex items-center justify-between w-full rounded-lg bg-primary/5 border border-primary/15 px-3 py-2.5 hover:bg-primary/10 transition-colors">
                                    <div className="text-left">
                                        <p className="text-xs font-semibold">Solicitudes de mensaje</p>
                                        <p className="text-[10px] text-muted-foreground">{requestConvs.length} pendiente{requestConvs.length > 1 ? 's' : ''}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                                            {requestConvs.length}
                                        </span>
                                        {showRequests ? <ChevronUpIcon className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                                    </div>
                                </button>
                                {showRequests && (
                                    <div className="mt-2 space-y-1.5">
                                        {requestConvs.map(conv => {
                                            const iReceived = conv.lastMessage?.sender_id !== user?.id;
                                            return (
                                            <div key={conv.user.id} className="flex items-center gap-2 rounded-lg bg-muted/30 border border-border/50 px-2.5 py-2">
                                                <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                                                    {conv.user.avatar_url
                                                        ? <img src={conv.user.avatar_url} alt="" className="h-full w-full object-cover" />
                                                        : <UserIcon className="h-4 w-4 text-primary" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-xs truncate">{conv.user.full_name}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">{formatMsgPreview(conv.lastMessage?.content) || 'Nuevo mensaje'}</p>
                                                </div>
                                                {iReceived ? (
                                                    <div className="flex gap-1 shrink-0">
                                                        <Button
                                                            size="sm"
                                                            className="h-7 px-2 text-[10px] rounded-md"
                                                            disabled={acceptingId === conv.user.id}
                                                            onClick={() => handleAcceptRequest(conv)}
                                                        >
                                                            {acceptingId === conv.user.id ? <LoaderIcon className="h-3 w-3 animate-spin" /> : 'Aceptar'}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 px-1.5 text-[10px] rounded-md text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            disabled={deletingId === conv.user.id}
                                                            onClick={() => handleDeleteRequest(conv)}
                                                        >
                                                            {deletingId === conv.user.id ? <LoaderIcon className="h-3 w-3 animate-spin" /> : <Trash2Icon className="h-3 w-3" />}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground shrink-0">Enviada</span>
                                                )}
                                            </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                        {primaryConvs.map(conv => {
                            const dateObj = conv.lastMessage ? new Date(conv.lastMessage.created_at) : new Date();
                            const timeStr = dateObj.toLocaleDateString() === new Date().toLocaleDateString()
                                ? dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                                : dateObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

                            const isSentByMe = conv.lastMessage?.sender_id === user?.id;
                            const isActive = conv.user.id === activeUserId;

                            return (
                                <Link to={`/messages/${conv.user.id}`} key={conv.user.id} className="block">
                                    <div className={`flex items-center gap-3 py-3 px-4 transition-all cursor-pointer border-l-4 ${
                                        isActive
                                            ? 'bg-primary/5 border-primary'
                                            : 'hover:bg-muted/30 border-transparent'
                                    }`}>
                                        <div className="relative h-12 w-12 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                                            {conv.user.avatar_url
                                                ? <img src={conv.user.avatar_url} alt="" className="h-full w-full object-cover" />
                                                : <UserIcon className="h-5 w-5 text-primary" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <p className={`font-semibold text-sm truncate ${isActive ? 'text-foreground' : conv.unread > 0 ? 'text-foreground' : 'text-foreground/90'}`}>
                                                    {conv.user.full_name}
                                                </p>
                                                <span className={`text-xs whitespace-nowrap ml-2 ${conv.unread > 0 ? 'text-emerald-500 font-medium' : 'text-muted-foreground/80'}`}>
                                                    {conv.lastMessage ? timeStr : ''}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-xs truncate flex items-center gap-1 ${isActive ? 'text-foreground font-medium' : conv.unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                                    {isSentByMe && (
                                                        <span className="text-[10px] shrink-0">
                                                            {conv.lastMessage?.is_read ? <CheckCheckIcon className="h-3 w-3 text-blue-500" /> : <CheckIcon className="h-3 w-3" />}
                                                        </span>
                                                    )}
                                                    <span className="truncate">{formatMsgPreview(conv.lastMessage?.content) || <span className="italic opacity-70">Haz iniciado un chat</span>}</span>
                                                </p>
                                                {conv.unread > 0 && (
                                                    <div className="shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-xs font-bold text-white">
                                                        {conv.unread}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                        </>
                        );
                    })()}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-background">
                {activeUserId ? (
                    <>
                        {/* Chat Header */}
                        <div className="flex items-center justify-between bg-card px-4 py-3 border-b border-border">
                            <div className="flex items-center gap-3">
                                <Link to={`/profile/${chatUser?.id}`} className="flex items-center gap-3 overflow-hidden group">
                                    <div className="relative h-10 w-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                                        {chatUser?.avatar_url
                                            ? <img src={chatUser.avatar_url} alt="" className="h-full w-full object-cover" />
                                            : <UserIcon className="h-5 w-5 text-primary" />}
                                    </div>
                                    <div className="leading-tight overflow-hidden">
                                        {chatUser ? (
                                            <>
                                                <p className="font-semibold text-sm truncate">{chatUser.full_name}</p>
                                                {isTyping ? (
                                                    <p className="text-xs font-medium text-emerald-500 animate-pulse tracking-wide truncate">Escribiendo...</p>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground truncate">{chatUser.email}</p>
                                                )}
                                            </>
                                        ) : (
                                            <div className="space-y-1.5 py-1">
                                                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                                                <div className="h-2 w-16 animate-pulse rounded bg-muted" />
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {messagesLoading ? (
                                <div className="space-y-4 px-1">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                                            <div className="h-10 animate-pulse rounded-2xl bg-muted/60" style={{ width: `${40 + (i * 13) % 35}%` }} />
                                        </div>
                                    ))}
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex h-full items-center justify-center">
                                    <div className="bg-card/80 backdrop-blur-sm text-center px-4 py-2 rounded-xl border border-border/50 text-xs text-muted-foreground">
                                        Envía un mensaje para iniciar la conversación
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg, msgIdx) => {
                                        const repliedMsg = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null;
                                        const isSender = msg.sender_id === user?.id;
                                        const isMedia = mediaUrlPattern.test(msg.content);
                                        const isVideo = /\.(mp4|webm)(\?.*)?$/i.test(msg.content);
                                        const timeStr = new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                                        const swipeStyle = { transform: swipeStates[msg.id] ? `translateX(${swipeStates[msg.id]}px)` : 'translateX(0)' };
                                        const prevMsg = msgIdx > 0 ? messages[msgIdx - 1] : null;
                                        const isConsecutive = !!(prevMsg && prevMsg.sender_id === msg.sender_id);
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex group ${isConsecutive ? 'mt-[3px]' : 'mt-[9px]'} ${isSender ? 'justify-end' : 'justify-start'}`}
                                                onTouchStart={(e) => handleTouchStart(e, msg.id)}
                                                onTouchMove={(e) => handleTouchMove(e, msg.id)}
                                                onTouchEnd={() => handleTouchEnd(msg.id, msg)}
                                            >
                                                {isMedia ? (
                                                    <div
                                                        className={`max-w-[75%] rounded-xl shadow-sm relative overflow-hidden transition-transform duration-100 ${isSender ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                                                        style={swipeStyle}
                                                    >
                                                        {isVideo
                                                            ? <video src={msg.content} controls playsInline preload="metadata" onLoadedMetadata={handleMediaLoaded} className="block max-w-full max-h-[300px]" />
                                                            : <img src={msg.content} alt="" onLoad={handleMediaLoaded} className="block max-w-full max-h-[300px] object-cover cursor-zoom-in" onClick={() => setLightboxSrc(msg.content)} />
                                                        }
                                                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                                                        <div className="absolute bottom-1.5 right-2 flex items-center gap-1 text-[11px] text-white drop-shadow-sm">
                                                            <span>{timeStr}</span>
                                                            {isSender && (msg.is_read ? <CheckCheckIcon className="h-3 w-3 text-sky-300" /> : <CheckIcon className="h-3 w-3" />)}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={`max-w-[75%] min-w-0 rounded-xl px-3 py-1.5 shadow-sm relative transition-transform duration-100 ${isSender ? 'bg-primary text-white rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm border border-border/50'}`}
                                                        style={swipeStyle}
                                                    >
                                                        {repliedMsg && (
                                                            <div className="mb-1.5 rounded-xl bg-background/50 p-2 text-xs border-l-4 border-primary">
                                                                <span className="font-semibold text-primary">{repliedMsg.sender_id === user?.id ? 'Tú' : chatUser?.full_name}</span>
                                                                <p className="text-muted-foreground truncate">{formatMsgPreview(repliedMsg.content)}</p>
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col pt-0.5">
                                                            <span className="text-sm leading-[1.45] [overflow-wrap:anywhere]">
                                                                {msg.content}
                                                                <span aria-hidden className="inline-block w-[76px]">&nbsp;</span>
                                                            </span>
                                                            <span className={`self-end -mt-[15px] flex items-center gap-1 text-[10px] whitespace-nowrap ${isSender ? 'text-white/75' : 'text-muted-foreground/60'}`}>
                                                                {timeStr}
                                                                {isSender && (msg.is_read ? <CheckCheckIcon className="h-3 w-3 text-sky-300" /> : <CheckIcon className="h-3 w-3" />)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {isTyping && (
                                        <div className="flex justify-start">
                                            <div className="bg-muted border border-border/50 px-4 py-2.5 rounded-2xl rounded-tl-sm inline-block shadow-sm">
                                                <span className="flex gap-1 items-center h-4">
                                                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"></span>
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={bottomRef} className="h-1 text-transparent">-</div>
                                </>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="bg-card pt-2 pb-4 px-4 border-t border-border flex flex-col relative">
                            {showEmojiPicker && (
                                <div className="absolute bottom-full left-4 mb-2 z-50">
                                    <EmojiPicker 
                                        theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT} 
                                        onEmojiClick={(emojiData) => setNewMessage(m => m + emojiData.emoji)} 
                                    />
                                </div>
                            )}


                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                                className="hidden"
                                onChange={handleFileSelected}
                            />

                            {replyingTo && (
                                <div className="mb-2 flex items-center justify-between rounded-xl bg-muted/50 p-2 text-xs border-l-4 border-primary">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <span className="font-semibold text-primary block truncate">Respondiendo a {replyingTo?.sender_id === user?.id ? 'Ti' : chatUser?.full_name}</span>
                                        <span className="text-muted-foreground truncate block">{formatMsgPreview(replyingTo?.content)}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setReplyingTo(null)}>
                                        <XIcon className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <div className="flex-1 flex items-center bg-muted/40 rounded-full overflow-hidden min-h-[44px]">
                                    <button
                                        className="p-2 pl-3.5 text-muted-foreground shrink-0"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    >
                                        <SmileIcon className="h-5 w-5" />
                                    </button>
                                    <Input
                                        placeholder="Escribe un mensaje"
                                        value={newMessage}
                                        onChange={handleInputChange}
                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                        onClick={() => setShowEmojiPicker(false)}
                                        maxLength={1000}
                                        className="border-0 !bg-transparent shadow-none px-2 focus-visible:ring-0 rounded-none flex-1 h-10"
                                    />
                                    <button
                                        className="p-2 pr-3.5 text-muted-foreground shrink-0 disabled:opacity-50"
                                        onClick={handlePickMedia}
                                        disabled={uploadingMedia}
                                        type="button"
                                    >
                                        {uploadingMedia
                                            ? <LoaderIcon className="h-5 w-5 animate-spin" />
                                            : <ImageIcon className="h-5 w-5" />}
                                    </button>
                                </div>
                                <Button
                                    onClick={handleSend}
                                    disabled={sending || !newMessage.trim()}
                                    className="h-10 w-10 shrink-0 rounded-full p-0 flex items-center justify-center bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
                                >
                                    <SendIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Empty State when no chat selected */
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <MessageCircleIcon className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">Selecciona un chat</h3>
                            <p className="text-sm text-muted-foreground">Elige una conversación de la lista para empezar a chatear</p>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Lightbox */}
        {lightboxSrc && (
            <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center" onClick={() => setLightboxSrc(null)}>
                <button className="absolute top-4 right-4 z-10 p-2 text-white/70 hover:text-white" onClick={() => setLightboxSrc(null)}>
                    <XIcon className="h-6 w-6" />
                </button>
                <img src={lightboxSrc} alt="" className="max-w-full max-h-full object-cover select-none" onClick={e => e.stopPropagation()} />
            </div>
        )}
        </>
    );
}
