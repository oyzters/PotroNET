import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import {
    UsersIcon, UserIcon, ArrowLeftIcon,
} from 'lucide-react';

interface Career { id: string; name: string }
interface FollowUser {
    id: string; full_name: string; avatar_url: string; email: string; bio?: string;
    career?: Career | null;
}

type Tab = 'friends' | 'followers' | 'following';

export function FriendsPage() {
    const { session, user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryTab = searchParams.get('tab') as Tab | null;
    const queryUser = searchParams.get('user');
    const targetUserId = queryUser || user?.id;
    const isOwnPage = targetUserId === user?.id;

    const [tab, setTab] = useState<Tab>(queryTab && ['friends', 'followers', 'following'].includes(queryTab) ? queryTab : 'friends');
    const [friends, setFriends] = useState<FollowUser[]>([]);
    const [followers, setFollowers] = useState<FollowUser[]>([]);
    const [following, setFollowing] = useState<FollowUser[]>([]);
    const [targetName, setTargetName] = useState('');
    const [loading, setLoading] = useState(true);
    const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

    const fetchData = useCallback(async () => {
        if (!session?.access_token || !targetUserId) return;
        setLoading(true);
        try {
            const [friendsData, followersData, followingData] = await Promise.all([
                api<{ users: FollowUser[] }>(`/follows?type=friends&user_id=${targetUserId}`, { token: session.access_token }),
                api<{ users: FollowUser[] }>(`/follows?type=followers&user_id=${targetUserId}`, { token: session.access_token }),
                api<{ users: FollowUser[] }>(`/follows?type=following&user_id=${targetUserId}`, { token: session.access_token }),
            ]);
            setFriends(friendsData.users);
            setFollowers(followersData.users);
            setFollowing(followingData.users);

            // Fetch target user name if viewing someone else's network
            if (!isOwnPage) {
                const profileData = await api<{ profile: { full_name: string } }>(`/profiles/${targetUserId}`, { token: session.access_token });
                setTargetName(profileData.profile.full_name);
            }

            // Build set of who the current user follows
            if (isOwnPage) {
                setFollowingSet(new Set(followingData.users.map(u => u.id)));
            } else if (user?.id) {
                const myFollowing = await api<{ users: FollowUser[] }>(`/follows?type=following&user_id=${user.id}`, { token: session.access_token });
                setFollowingSet(new Set(myFollowing.users.map(u => u.id)));
            }
        } catch { /* silent */ } finally { setLoading(false); }
    }, [session?.access_token, targetUserId, isOwnPage, user?.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleFollow = async (targetId: string) => {
        if (!session?.access_token) return;
        try {
            await api('/follows', { method: 'POST', token: session.access_token, body: JSON.stringify({ following_id: targetId }) });
            setFollowingSet(prev => new Set(prev).add(targetId));
            fetchData();
        } catch { /* silent */ }
    };

    const handleUnfollow = async (targetId: string) => {
        if (!session?.access_token) return;
        try {
            await api(`/follows/${targetId}`, { method: 'DELETE', token: session.access_token });
            setFollowingSet(prev => { const s = new Set(prev); s.delete(targetId); return s; });
            fetchData();
        } catch { /* silent */ }
    };

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: 'friends', label: 'Amigos', count: friends.length },
        { key: 'followers', label: 'Seguidores', count: followers.length },
        { key: 'following', label: 'Siguiendo', count: following.length },
    ];

    const renderUserCard = (u: FollowUser) => {
        const isMe = u.id === user?.id;
        const iFollow = followingSet.has(u.id);

        return (
            <div key={u.id} className="flex items-center gap-3 py-2.5 px-1">
                <Link to={`/profile/${u.id}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" /> : <UserIcon className="h-5 w-5 text-primary" />}
                </Link>
                <div className="flex-1 min-w-0">
                    <Link to={`/profile/${u.id}`} className="text-[13px] font-semibold hover:text-primary truncate block">{u.full_name}</Link>
                    {u.career && <p className="text-[11px] text-muted-foreground truncate">{u.career.name}</p>}
                </div>
                {!isMe && (
                    <div className="shrink-0">
                        {iFollow ? (
                            <Button variant="outline" size="sm" className="text-[11px] h-7 px-3 rounded-lg" onClick={() => handleUnfollow(u.id)}>
                                Siguiendo
                            </Button>
                        ) : (
                            <Button size="sm" className="text-[11px] h-7 px-3 rounded-lg" onClick={() => handleFollow(u.id)}>
                                Seguir
                            </Button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const emptyState = (message: string) => (
        <div className="py-16 text-center">
            <UsersIcon className="mx-auto h-10 w-10 text-muted-foreground/20" />
            <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        </div>
    );

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                {!isOwnPage && (
                    <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                )}
                <div>
                    <h1 className="text-lg font-bold leading-tight">
                        {isOwnPage ? 'Mi Red' : targetName || 'Red Social'}
                    </h1>
                    {!isOwnPage && <p className="text-[11px] text-muted-foreground">Conexiones de {targetName}</p>}
                </div>
            </div>

            {/* Tabs — compact, no counters inline, just short labels */}
            <div className="flex gap-0.5 rounded-xl border border-border bg-card p-0.5 mb-4">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex-1 flex flex-col items-center rounded-lg py-2 transition-colors ${
                            tab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {t.count !== undefined && (
                            <span className="text-sm font-bold leading-none">{t.count}</span>
                        )}
                        <span className="text-[10px] font-medium leading-tight mt-0.5">{t.label}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <ListSkeleton count={6} />
            ) : (
                <div className="divide-y divide-border/50">
                    {tab === 'friends' && (friends.length === 0
                        ? emptyState(isOwnPage ? 'Sigue a alguien y cuando te sigan de vuelta, serán amigos.' : 'No tiene amigos aún.')
                        : friends.map(f => renderUserCard(f))
                    )}

                    {tab === 'followers' && (followers.length === 0
                        ? emptyState(isOwnPage ? 'Nadie te sigue aún.' : 'No tiene seguidores.')
                        : followers.map(f => renderUserCard(f))
                    )}

                    {tab === 'following' && (following.length === 0
                        ? emptyState(isOwnPage ? 'No sigues a nadie aún.' : 'No sigue a nadie.')
                        : following.map(f => renderUserCard(f))
                    )}
                </div>
            )}
        </div>
    );
}
