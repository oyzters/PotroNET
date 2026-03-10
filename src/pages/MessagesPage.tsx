import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import {
    MessageCircleIcon, SendIcon, UserIcon, ArrowLeftIcon,
} from 'lucide-react';

interface ConversationUser { id: string; full_name: string; avatar_url: string; email: string }
interface LastMessage { content: string; created_at: string; sender_id: string }
interface Conversation { user: ConversationUser; lastMessage: LastMessage | null; unread: number }
interface Message { id: string; sender_id: string; receiver_id: string; content: string; is_read: boolean; created_at: string }

export function MessagesPage() {
    const { userId } = useParams<{ userId: string }>();
    const { session, user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatUser, setChatUser] = useState<ConversationUser | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Refs para evitar stale closures y race conditions
    const activeUserIdRef = useRef<string | null>(null);
    const conversationsRef = useRef<Conversation[]>([]);

    const activeUserId = userId ?? null;

    // Bloquear scroll del body en móvil cuando el chat está activo
    useEffect(() => {
        if (!activeUserId) return;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [activeUserId]);

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

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Realtime: mensajes entrantes en el chat activo
    useEffect(() => {
        if (!activeUserId || !user?.id) return;

        const channel = supabase
            .channel(`chat:${user.id}:${activeUserId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${user.id}`,
            }, (payload) => {
                const msg = payload.new as Message;
                if (msg.sender_id === activeUserId) {
                    setMessages(prev => [...prev, msg]);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
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
        };
        setMessages(prev => [...prev, optimisticMsg]);

        setSending(true);
        try {
            await api('/messages', {
                method: 'POST', token: session.access_token,
                body: JSON.stringify({ receiver_id: activeUserId, content }),
            });
        } catch {
            // Revertir si falla
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
            setNewMessage(content);
        } finally { setSending(false); }
    };

    // Chat view
    if (activeUserId) {
        return (
            <div className="flex h-[calc(100dvh-13rem)] md:h-[calc(100dvh-11rem)] flex-col">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border pb-4">
                    <Link to="/messages"><ArrowLeftIcon className="h-5 w-5 text-muted-foreground hover:text-foreground" /></Link>
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                        {chatUser?.avatar_url
                            ? <img src={chatUser.avatar_url} alt="" className="h-full w-full rounded-xl object-cover" />
                            : <UserIcon className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                        {chatUser ? (
                            <>
                                <p className="font-semibold">{chatUser.full_name}</p>
                                <p className="text-xs text-muted-foreground">{chatUser.email}</p>
                            </>
                        ) : (
                            <>
                                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                                <div className="mt-1 h-3 w-44 animate-pulse rounded bg-muted" />
                            </>
                        )}
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3">
                    {messagesLoading ? (
                        // Skeleton de mensajes mientras carga
                        <div className="space-y-3 px-1">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                                    <div
                                        className="h-9 animate-pulse rounded-2xl bg-muted"
                                        style={{ width: `${40 + (i * 13) % 35}%` }}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                            <p className="text-muted-foreground">Envía el primer mensaje</p>
                        </div>
                    ) : messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${msg.sender_id === user?.id ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                <p className={`mt-1 text-xs ${msg.sender_id === user?.id ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                    {new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="flex gap-2 border-t border-border pt-4">
                    <Input
                        placeholder="Escribe un mensaje..."
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        maxLength={1000}
                    />
                    <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
                        <SendIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    }

    // Conversations list
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Mensajes</h1>
                <p className="text-sm text-muted-foreground">Conversaciones con tus amigos</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
            ) : conversations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                    <MessageCircleIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
                    <p className="mt-4 text-muted-foreground">No tienes conversaciones aún</p>
                    <p className="mt-1 text-sm text-muted-foreground">Envía un mensaje desde tu lista de amigos</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {conversations.map(conv => (
                        <Link to={`/messages/${conv.user.id}`} key={conv.user.id}>
                            <Card className="transition-all hover:border-primary/30">
                                <CardContent className="flex items-center gap-4 py-4">
                                    <div className="relative h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                                        {conv.user.avatar_url
                                            ? <img src={conv.user.avatar_url} alt="" className="h-full w-full rounded-xl object-cover" />
                                            : <UserIcon className="h-6 w-6 text-primary" />}
                                        {conv.unread > 0 && (
                                            <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{conv.unread}</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-medium ${conv.unread > 0 ? 'text-foreground' : ''}`}>{conv.user.full_name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{conv.lastMessage?.content || 'Sin mensajes'}</p>
                                    </div>
                                    {conv.lastMessage && (
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {new Date(conv.lastMessage.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                        </span>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
