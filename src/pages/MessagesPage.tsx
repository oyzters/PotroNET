import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import {
    MessageCircleIcon, SendIcon, UserIcon, ArrowLeftIcon,
    CheckIcon, CheckCheckIcon, SmileIcon, XIcon
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
interface Conversation { user: ConversationUser; lastMessage: LastMessage | null; unread: number }
interface Message { id: string; sender_id: string; receiver_id: string; content: string; is_read: boolean; created_at: string; reply_to?: string }

export function MessagesPage() {
    const { userId } = useParams<{ userId: string }>();
    const { session, user } = useAuth();
    const { theme } = useTheme();
    const isDesktop = useMediaQuery('(min-width: 768px)'); // md breakpoint
    const [conversations, setConversations] = useState<Conversation[]>([]);
    
    // Swipe to reply logic
    const [swipeStates, setSwipeStates] = useState<Record<string, number>>({});
    const swipeStartRef = useRef<{ id: string, x: number } | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatUser, setChatUser] = useState<ConversationUser | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
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

    // Mantener ref de conversaciones sincronizada sin recrear fetchMessages
    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    const fetchConversations = useCallback(async () => {
        if (!session?.access_token) return;
        setLoading(true);
        try {
            const data = await api<{ conversations: Conversation[] }>('/messages', { token: session.access_token });
            setConversations(data.conversations);
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
        swipeStartRef.current = { id: msgId, x: e.touches[0].clientX };
    };

    const handleTouchMove = (e: React.TouchEvent, msgId: string) => {
        if (!swipeStartRef.current || swipeStartRef.current.id !== msgId) return;
        const deltaX = e.touches[0].clientX - swipeStartRef.current.x;
        // Solo swipe a la derecha
        if (deltaX > 0 && deltaX < 80) {
            setSwipeStates(prev => ({ ...prev, [msgId]: deltaX }));
        }
    };

    const handleTouchEnd = (msgId: string, msg: Message) => {
        if (!swipeStartRef.current || swipeStartRef.current.id !== msgId) return;
        const deltaX = swipeStates[msgId] || 0;
        if (deltaX > 40) {
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

    // Mobile chat view - When specific user is selected
    if (activeUserId && !isDesktop) {
        return (
            <div className="fixed inset-x-0 top-0 bottom-0 z-[100] flex flex-col bg-[#efeae2] dark:bg-background">
                {/* Header */}
                <div className="flex items-center justify-between bg-white dark:bg-card px-3 py-2 border-b border-border shadow-sm h-16 shrink-0 pt-4">
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
                <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-0">
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
                            {messages.map(msg => {
                                const repliedMsg = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null;
                                return (
                                    <div 
                                        key={msg.id} 
                                        className={`flex group ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                                        onTouchStart={(e) => handleTouchStart(e, msg.id)}
                                        onTouchMove={(e) => handleTouchMove(e, msg.id)}
                                        onTouchEnd={() => handleTouchEnd(msg.id, msg)}
                                    >
                                        <div 
                                            className={`max-w-[85%] rounded-2xl px-3 py-1.5 shadow-sm relative transition-transform duration-100 ${msg.sender_id === user?.id ? 'bg-primary/95 text-primary-foreground rounded-tr-md' : 'bg-white dark:bg-card text-foreground rounded-tl-md border border-border/50'}`}
                                            style={{ transform: swipeStates[msg.id] ? `translateX(${swipeStates[msg.id]}px)` : 'translateX(0)' }}
                                        >
                                            {repliedMsg && (
                                                <div className="mb-1.5 rounded-xl bg-background/50 p-2 text-xs border-l-4 border-primary">
                                                    <span className="font-semibold text-primary">{repliedMsg.sender_id === user?.id ? 'Tú' : chatUser?.full_name}</span>
                                                    <p className="text-muted-foreground truncate">{repliedMsg.content}</p>
                                                </div>
                                            )}

                                            <div className="flex flex-wrap items-end gap-x-2 gap-y-0.5 pt-0.5">
                                                <span className="text-[15px] leading-relaxed break-words">{msg.content}</span>
                                                <div className={`flex ml-auto pl-1 items-center gap-1 text-[10px] pb-0.5 ${msg.sender_id === user?.id ? 'text-primary-foreground/75' : 'text-muted-foreground/60'}`}>
                                                    <span>{new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {msg.sender_id === user?.id && (
                                                        msg.is_read ? <CheckCheckIcon className="h-3 w-3 text-sky-300" /> : <CheckIcon className="h-3 w-3" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
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
                <div className="bg-white dark:bg-card pt-2 pb-5 px-2 z-10 border-t border-border shadow-sm flex flex-col relative">
                    {showEmojiPicker && (
                        <div className="absolute bottom-full left-2 mb-2 z-50">
                            <EmojiPicker 
                                theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT} 
                                onEmojiClick={(emojiData) => setNewMessage(m => m + emojiData.emoji)} 
                            />
                        </div>
                    )}

                    {replyingTo && (
                        <div className="max-w-4xl mx-auto w-full mb-2 flex items-center justify-between rounded-xl bg-muted/50 p-2 text-[13px] border-l-4 border-primary">
                            <div className="flex-1 min-w-0 pr-2">
                                <span className="font-semibold text-primary block truncate">Respondiendo a {replyingTo?.sender_id === user?.id ? 'Ti' : chatUser?.full_name}</span>
                                <span className="text-muted-foreground truncate block">{replyingTo?.content}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setReplyingTo(null)}>
                                <XIcon className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    <div className="flex items-end gap-2 max-w-4xl mx-auto w-full">
                        <div className="flex-1 flex items-end bg-muted/50 rounded-3xl border border-transparent focus-within:border-primary/30 focus-within:bg-background transition-colors overflow-hidden">
                            <button 
                                className="p-3 pl-4 mb-0 text-muted-foreground hover:text-foreground transition-colors shrink-0 flex items-center justify-center"
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
                                maxLength={1000}
                                className="border-0 bg-transparent shadow-none px-2 ml-1 focus-visible:ring-0 rounded-none h-[50px] w-full text-[15.5px]"
                            />
                        </div>
                        <Button 
                            onClick={handleSend} 
                            disabled={sending || !newMessage.trim()} 
                            className="h-12 w-12 shrink-0 rounded-full p-0 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 shadow-neon-primary transition-all"
                        >
                            <SendIcon className="h-5 w-5 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Mobile chat list - When no activeUserId
    if (!activeUserId && !isDesktop) {
        return (
            <div className="space-y-0.5 pb-20 h-screen flex flex-col pt-4">
                <div className="px-4 pb-2 flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="p-2 rounded-full hover:bg-muted text-primary transition-colors">
                            <ArrowLeftIcon className="h-5 w-5" />
                        </Link>
                        <h1 className="text-2xl font-bold">Chats</h1>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 text-foreground">
                        <MessageCircleIcon className="h-5 w-5" />
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
                ) : conversations.length === 0 ? (
                    <div className="m-4 rounded-2xl border border-dashed border-border py-16 text-center">
                        <MessageCircleIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
                        <p className="mt-4 text-muted-foreground font-medium">No tienes chats activos</p>
                        <p className="mt-1 text-sm text-muted-foreground">Encuentra a alguien en Búsqueda para enviar un mensaje</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto divide-y divide-border/50 bg-background">
                        {conversations.map(conv => {
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
                                                    <span className="truncate">{conv.lastMessage?.content || <span className="italic opacity-70">Haz iniciado un chat</span>}</span>
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
                )}
            </div>
        );
    }

    // Desktop layout - Always show sidebar + chat area
    return (
        <div className="h-screen bg-background flex">
            {/* Sidebar - User List */}
            <div className="w-80 border-r border-border flex flex-col bg-muted/20">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-background">
                    <div className="flex items-center gap-2">
                        <Link to="/" className="p-2 rounded-full hover:bg-muted text-primary transition-colors">
                            <ArrowLeftIcon className="h-5 w-5" />
                        </Link>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                            <span className="text-sm font-bold text-primary-foreground">P</span>
                        </div>
                        <span className="text-lg font-bold">
                            Potro<span className="text-primary">NET</span>
                        </span>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <MessageCircleIcon className="h-5 w-5" />
                    </Button>
                </div>

                {/* User List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="m-4 rounded-2xl border border-dashed border-border py-16 text-center">
                            <MessageCircleIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
                            <p className="mt-4 text-muted-foreground font-medium">No tienes chats activos</p>
                            <p className="mt-1 text-sm text-muted-foreground">Encuentra a alguien en Búsqueda para enviar un mensaje</p>
                        </div>
                    ) : (
                        conversations.map(conv => {
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
                                                    <span className="truncate">{conv.lastMessage?.content || <span className="italic opacity-70">Haz iniciado un chat</span>}</span>
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
                        })
                    )}
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
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                                    {messages.map(msg => {
                                        const repliedMsg = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null;
                                        return (
                                            <div 
                                                key={msg.id} 
                                                className={`flex group ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                                                onTouchStart={(e) => handleTouchStart(e, msg.id)}
                                                onTouchMove={(e) => handleTouchMove(e, msg.id)}
                                                onTouchEnd={() => handleTouchEnd(msg.id, msg)}
                                            >
                                                <div className={`max-w-[75%] rounded-2xl px-3 py-1.5 shadow-sm relative transition-transform duration-100 ${
                                                    msg.sender_id === user?.id 
                                                        ? 'bg-primary text-primary-foreground rounded-tr-md' 
                                                        : 'bg-muted text-foreground rounded-tl-md border border-border/50'
                                                }`} style={{ transform: swipeStates[msg.id] ? `translateX(${swipeStates[msg.id]}px)` : 'translateX(0)' }}>
                                                    {repliedMsg && (
                                                        <div className="mb-1.5 rounded-xl bg-background/50 p-2 text-xs border-l-4 border-primary">
                                                            <span className="font-semibold text-primary">{repliedMsg.sender_id === user?.id ? 'Tú' : chatUser?.full_name}</span>
                                                            <p className="text-muted-foreground truncate">{repliedMsg.content}</p>
                                                        </div>
                                                    )}

                                                    <div className="flex flex-wrap items-end gap-x-2 gap-y-0.5 pt-0.5">
                                                        <span className="text-sm leading-relaxed break-words">{msg.content}</span>
                                                        <div className={`flex ml-auto pl-1 items-center gap-1 text-xs pb-0.5 ${msg.sender_id === user?.id ? 'text-primary-foreground/75' : 'text-muted-foreground/60'}`}>
                                                            <span>{new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                                                            {msg.sender_id === user?.id && (
                                                                msg.is_read ? <CheckCheckIcon className="h-3 w-3 text-sky-300" /> : <CheckIcon className="h-3 w-3" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
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

                            {replyingTo && (
                                <div className="mb-2 flex items-center justify-between rounded-xl bg-muted/50 p-2 text-xs border-l-4 border-primary">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <span className="font-semibold text-primary block truncate">Respondiendo a {replyingTo?.sender_id === user?.id ? 'Ti' : chatUser?.full_name}</span>
                                        <span className="text-muted-foreground truncate block">{replyingTo?.content}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setReplyingTo(null)}>
                                        <XIcon className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            
                            <div className="flex items-end gap-2">
                                <div className="flex-1 flex items-end bg-muted/50 rounded-2xl border border-transparent focus-within:border-primary/30 focus-within:bg-background transition-colors overflow-hidden">
                                    <button 
                                        className="p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
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
                                        className="border-0 bg-transparent shadow-none px-2 focus-visible:ring-0 rounded-none h-10 w-full"
                                    />
                                </div>
                                <Button 
                                    onClick={handleSend} 
                                    disabled={sending || !newMessage.trim()} 
                                    className="h-10 w-10 shrink-0 rounded-full p-0 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90"
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
    );
}
