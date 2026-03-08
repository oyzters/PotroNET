import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import {
    UsersIcon, UserPlusIcon, UserMinusIcon, CheckIcon, XIcon, SearchIcon,
} from 'lucide-react';

interface Career { id: string; name: string }
interface Friend { id: string; friendshipId: string; full_name: string; avatar_url: string; email: string; bio: string; career: Career | null }
interface FriendRequest {
    id: string;
    requester: { id: string; full_name: string; avatar_url: string; email: string } | null;
    addressee: { id: string; full_name: string; avatar_url: string; email: string } | null;
    created_at: string;
}
interface SearchUser { id: string; full_name: string; avatar_url: string; email: string; career: Career | null }

type Tab = 'friends' | 'pending' | 'sent' | 'search';

export function FriendsPage() {
    const { session, user } = useAuth();
    const [tab, setTab] = useState<Tab>('friends');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [pending, setPending] = useState<FriendRequest[]>([]);
    const [sent, setSent] = useState<FriendRequest[]>([]);
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchFriends = useCallback(async () => {
        if (!session?.access_token) return;
        setLoading(true);
        try {
            const [friendsData, pendingData, sentData] = await Promise.all([
                api<{ friends: Friend[] }>('/friends', { token: session.access_token }),
                api<{ requests: FriendRequest[] }>('/friends?type=pending', { token: session.access_token }),
                api<{ requests: FriendRequest[] }>('/friends?type=sent', { token: session.access_token }),
            ]);
            setFriends(friendsData.friends);
            setPending(pendingData.requests);
            setSent(sentData.requests);
        } catch { /* silent */ } finally { setLoading(false); }
    }, [session?.access_token]);

    useEffect(() => { fetchFriends(); }, [fetchFriends]);

    const handleSearch = async () => {
        if (!session?.access_token || search.trim().length < 2) return;
        try {
            const data = await api<{ users: SearchUser[]; professors: []; resources: []; tutoring: [] }>(`/search?q=${encodeURIComponent(search)}`, { token: session.access_token });
            setSearchResults(data.users.filter(u => u.id !== user?.id));
        } catch { /* silent */ }
    };

    const sendRequest = async (addresseeId: string) => {
        if (!session?.access_token) return;
        try {
            await api('/friends', { method: 'POST', token: session.access_token, body: JSON.stringify({ addressee_id: addresseeId }) });
            fetchFriends();
        } catch { /* silent */ }
    };

    const respondRequest = async (friendshipId: string, status: 'accepted' | 'rejected') => {
        if (!session?.access_token) return;
        try {
            await api(`/friends/${friendshipId}`, { method: 'PATCH', token: session.access_token, body: JSON.stringify({ status }) });
            fetchFriends();
        } catch { /* silent */ }
    };

    const removeFriend = async (friendshipId: string) => {
        if (!session?.access_token) return;
        try {
            await api(`/friends/${friendshipId}`, { method: 'DELETE', token: session.access_token });
            fetchFriends();
        } catch { /* silent */ }
    };

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: 'friends', label: 'Amigos', count: friends.length },
        { key: 'pending', label: 'Recibidas', count: pending.length },
        { key: 'sent', label: 'Enviadas', count: sent.length },
        { key: 'search', label: 'Buscar' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Amigos</h1>
                <p className="text-sm text-muted-foreground">Conecta con otros estudiantes</p>
            </div>

            <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                        {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
                    </button>
                ))}
            </div>

            {tab === 'search' && (
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Buscar usuarios..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="pl-10" />
                    </div>
                    <Button onClick={handleSearch}>Buscar</Button>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
            ) : (
                <div className="space-y-3">
                    {tab === 'friends' && (friends.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                            <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
                            <p className="mt-4 text-muted-foreground">Aún no tienes amigos. ¡Busca y envía solicitudes!</p>
                        </div>
                    ) : friends.map(f => (
                        <Card key={f.friendshipId} className="transition-all hover:border-primary/30">
                            <CardContent className="flex items-center gap-4 py-4">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    {f.avatar_url ? <img src={f.avatar_url} alt="" className="h-full w-full rounded-xl object-cover" /> : <UsersIcon className="h-5 w-5 text-primary" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Link to={`/profile/${f.id}`} className="font-medium hover:text-primary">{f.full_name}</Link>
                                    {f.career && <p className="text-xs text-muted-foreground">{f.career.name}</p>}
                                </div>
                                <div className="flex gap-2">
                                    <Link to={`/messages/${f.id}`}><Button variant="outline" size="sm">Mensaje</Button></Link>
                                    <Button variant="ghost" size="sm" onClick={() => removeFriend(f.friendshipId)}><UserMinusIcon className="h-4 w-4 text-red-400" /></Button>
                                </div>
                            </CardContent>
                        </Card>
                    )))}

                    {tab === 'pending' && (pending.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">No hay solicitudes pendientes</div>
                    ) : pending.map(r => (
                        <Card key={r.id} className="transition-all hover:border-primary/30">
                            <CardContent className="flex items-center gap-4 py-4">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><UsersIcon className="h-5 w-5 text-primary" /></div>
                                <div className="flex-1">
                                    <p className="font-medium">{r.requester?.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{r.requester?.email}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => respondRequest(r.id, 'accepted')}><CheckIcon className="mr-1 h-4 w-4" /> Aceptar</Button>
                                    <Button variant="ghost" size="sm" onClick={() => respondRequest(r.id, 'rejected')}><XIcon className="h-4 w-4 text-red-400" /></Button>
                                </div>
                            </CardContent>
                        </Card>
                    )))}

                    {tab === 'sent' && (sent.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">No has enviado solicitudes</div>
                    ) : sent.map(r => (
                        <Card key={r.id}>
                            <CardContent className="flex items-center gap-4 py-4">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><UsersIcon className="h-5 w-5 text-primary" /></div>
                                <div className="flex-1">
                                    <p className="font-medium">{r.addressee?.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{r.addressee?.email}</p>
                                </div>
                                <Badge variant="secondary">Pendiente</Badge>
                            </CardContent>
                        </Card>
                    )))}

                    {tab === 'search' && searchResults.map(u => (
                        <Card key={u.id} className="transition-all hover:border-primary/30">
                            <CardContent className="flex items-center gap-4 py-4">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><UsersIcon className="h-5 w-5 text-primary" /></div>
                                <div className="flex-1">
                                    <p className="font-medium">{u.full_name}</p>
                                    {u.career && <p className="text-xs text-muted-foreground">{u.career.name}</p>}
                                </div>
                                <Button size="sm" onClick={() => sendRequest(u.id)}><UserPlusIcon className="mr-1 h-4 w-4" /> Agregar</Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
