import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    UserIcon, GraduationCapIcon, CalendarIcon, StarIcon, MailIcon,
    PencilIcon, SaveIcon, XIcon, MapPinIcon, BookOpenIcon,
    ThumbsUpIcon, MessageSquareIcon, ClockIcon, HashIcon, ImageIcon,
} from 'lucide-react';
import {
    Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';

interface Career { id: string; name: string }
interface Profile {
    id: string; email: string; full_name: string; avatar_url: string;
    cover_url?: string; bio: string; career_id: string | null;
    semester: number; role: string; reputation: number; is_banned: boolean;
    interests: string[]; career: Career | null; created_at: string;
}
interface Publication {
    id: string; content: string; tags: string[]; likes_count: number;
    comments_count: number; created_at: string;
    author: { id: string; full_name: string; avatar_url: string };
}

function timeAgo(dateStr: string) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'ahora';
    if (diffMin < 60) return `hace ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `hace ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `hace ${diffD}d`;
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function PostCard({ post, currentUserId, token }: { post: Publication; currentUserId?: string; token?: string }) {
    const [liked, setLiked] = useState(false);
    const [likes, setLikes] = useState(post.likes_count || 0);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Array<{ id: string; content: string; created_at: string; author: { full_name: string; avatar_url: string } }>>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [submittingComment, setSubmittingComment] = useState(false);

    const handleLike = async () => {
        if (!token) return;
        try {
            await api(`/publications/${post.id}/likes`, { method: liked ? 'DELETE' : 'POST', token });
            setLiked(l => !l);
            setLikes(n => liked ? n - 1 : n + 1);
        } catch { /* silent */ }
    };

    const loadComments = useCallback(async () => {
        if (!token) return;
        setLoadingComments(true);
        try {
            const data = await api<{ comments: typeof comments }>(`/publications/${post.id}/comments`, { token });
            setComments(data.comments || []);
        } catch { /* silent */ } finally { setLoadingComments(false); }
    }, [post.id, token]);

    const handleToggleComments = () => {
        const next = !showComments;
        setShowComments(next);
        if (next && comments.length === 0) loadComments();
    };

    const handleComment = async () => {
        if (!token || !newComment.trim()) return;
        setSubmittingComment(true);
        try {
            const data = await api<{ comment: typeof comments[0] }>(`/publications/${post.id}/comments`, {
                method: 'POST', token, body: JSON.stringify({ content: newComment.trim() }),
            });
            if (data.comment) setComments(c => [data.comment, ...c]);
            setNewComment('');
        } catch { /* silent */ } finally { setSubmittingComment(false); }
    };

    return (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            {/* Content */}
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

            {/* Tags */}
            {post.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {post.tags.map(tag => (
                        <Link key={tag} to={`/feed?tag=${tag}`}
                            className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                            <HashIcon className="h-3 w-3" />{tag}
                        </Link>
                    ))}
                </div>
            )}

            {/* Timestamp + actions */}
            <div className="flex items-center justify-between border-t border-border/50 pt-3">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ClockIcon className="h-3 w-3" /> {timeAgo(post.created_at)}
                </span>
                <div className="flex items-center gap-1">
                    <button onClick={handleLike}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${liked ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
                        <ThumbsUpIcon className={`h-4 w-4 ${liked ? 'fill-primary' : ''}`} />
                        <span>{likes}</span>
                    </button>
                    <button onClick={handleToggleComments}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                        <MessageSquareIcon className="h-4 w-4" />
                        <span>{post.comments_count || 0}</span>
                    </button>
                </div>
            </div>

            {/* Comments section */}
            {showComments && (
                <div className="space-y-3 pt-1">
                    {/* Comment input */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Escribe un comentario..."
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
                            className="flex-1 text-sm"
                        />
                        <Button size="sm" onClick={handleComment} disabled={submittingComment || !newComment.trim()}>
                            {submittingComment ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : 'Enviar'}
                        </Button>
                    </div>
                    {/* Comments list */}
                    {loadingComments ? (
                        <div className="flex justify-center py-2"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
                    ) : comments.map(c => (
                        <div key={c.id} className="flex gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary overflow-hidden">
                                {c.author.avatar_url ? <img src={c.author.avatar_url} alt="" className="h-full w-full object-cover" /> : c.author.full_name.charAt(0)}
                            </div>
                            <div className="flex-1 rounded-xl bg-muted/40 px-3 py-2">
                                <p className="text-xs font-semibold">{c.author.full_name}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{c.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

type WallTab = 'publicaciones' | 'info';

export function ProfilePage() {
    const { id } = useParams<{ id: string }>();
    const { session, user, refreshProfile } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [careers, setCareers] = useState<Career[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<WallTab>('publicaciones');

    // Publications
    const [posts, setPosts] = useState<Publication[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [postsPage, setPostsPage] = useState(1);
    const [postsTotalPages, setPostsTotalPages] = useState(1);

    // Edit form
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editCareer, setEditCareer] = useState('');
    const [editSemester, setEditSemester] = useState('1');
    const [editInterests, setEditInterests] = useState('');

    // Follow
    const isOwnProfile = user?.id === id;
    const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'friends'>('none');
    const [followLoading, setFollowLoading] = useState(false);

    // Fetch profile
    useEffect(() => {
        const fetchData = async () => {
            if (!session?.access_token || !id) return;
            setLoading(true);
            try {
                const [profileData, careersData] = await Promise.all([
                    api<{ profile: Profile }>(`/profiles/${id}`, { token: session.access_token }),
                    api<{ careers: Career[] }>('/careers', { token: session.access_token }),
                ]);
                setProfile(profileData.profile);
                setCareers(careersData.careers);
                setEditName(profileData.profile.full_name);
                setEditBio(profileData.profile.bio || '');
                setEditCareer(profileData.profile.career_id || '');
                setEditSemester(String(profileData.profile.semester || 1));
                setEditInterests((profileData.profile.interests || []).join(', '));
            } catch { /* silent */ } finally { setLoading(false); }
        };
        fetchData();
    }, [id, session?.access_token]);

    // Fetch publications
    const fetchPosts = useCallback(async () => {
        if (!session?.access_token || !id) return;
        setPostsLoading(true);
        try {
            const data = await api<{ publications: Publication[]; pagination: { totalPages: number } }>(
                `/publications?user_id=${id}&page=${postsPage}&limit=10`,
                { token: session.access_token }
            );
            setPosts(data.publications || []);
            setPostsTotalPages(data.pagination?.totalPages || 1);
        } catch { /* silent */ } finally { setPostsLoading(false); }
    }, [session?.access_token, id, postsPage]);

    useEffect(() => { if (tab === 'publicaciones') fetchPosts(); }, [fetchPosts, tab]);

    // Friend status
    useEffect(() => {
        if (isOwnProfile || !session?.access_token || !id) return;
        const check = async () => {
            try {
                const data = await api<{ friends: Array<{ status: string; receiver_id: string; requester_id: string }> }>(
                    '/friends', { token: session.access_token }
                );
                const rel = (data.friends || []).find(f => f.receiver_id === id || f.requester_id === id);
                if (!rel) setFollowStatus('none');
                else if (rel.status === 'accepted') setFollowStatus('friends');
                else setFollowStatus('pending');
            } catch { /* silent */ }
        };
        check();
    }, [isOwnProfile, id, session?.access_token]);

    const handleFollow = async () => {
        if (!session?.access_token || !id) return;
        setFollowLoading(true);
        try {
            await api('/friends', { method: 'POST', token: session.access_token, body: JSON.stringify({ receiver_id: id }) });
            setFollowStatus('pending');
        } catch { /* silent */ } finally { setFollowLoading(false); }
    };

    const handleSave = async () => {
        if (!session?.access_token || !id) return;
        setSaving(true);
        try {
            const interests = editInterests.split(',').map(s => s.trim()).filter(Boolean);
            const data = await api<{ profile: Profile }>(`/profiles/${id}`, {
                method: 'PATCH', token: session.access_token,
                body: JSON.stringify({ full_name: editName, bio: editBio, career_id: editCareer || null, semester: parseInt(editSemester), interests }),
            });
            setProfile(data.profile);
            setEditing(false);
            refreshProfile();
        } catch { /* silent */ } finally { setSaving(false); }
    };

    if (loading) return (
        <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );
    if (!profile) return (
        <div className="py-20 text-center">
            <UserIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">Perfil no encontrado</p>
        </div>
    );

    const joinDate = new Date(profile.created_at).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-0">
            {/* ── COVER PHOTO ── */}
            <div className="relative h-40 sm:h-56 overflow-hidden rounded-t-xl">
                {profile.cover_url ? (
                    <img src={profile.cover_url} alt="Portada" className="h-full w-full object-cover" />
                ) : (
                    <div className="h-full w-full bg-gradient-to-br from-primary/30 via-primary/15 to-violet-500/20" />
                )}
                {isOwnProfile && !editing && (
                    <button className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/60">
                        <ImageIcon className="h-3.5 w-3.5" /> Cambiar portada
                    </button>
                )}
            </div>

            {/* ── AVATAR + NAME + ACTIONS ── */}
            <div className="relative border-x border-border bg-card px-5 pb-4">
                <div className="flex items-end justify-between">
                    {/* Avatar */}
                    <div className="-mt-12 flex h-24 w-24 items-center justify-center rounded-full border-4 border-background bg-primary/10 shadow-xl overflow-hidden">
                        {profile.avatar_url
                            ? <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
                            : <UserIcon className="h-10 w-10 text-primary" />
                        }
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3 flex gap-2">
                        {isOwnProfile && !editing && (
                            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                                <PencilIcon className="mr-1 h-4 w-4" /> Editar perfil
                            </Button>
                        )}
                        {!isOwnProfile && (
                            <Button size="sm"
                                variant={followStatus === 'friends' ? 'secondary' : followStatus === 'pending' ? 'outline' : 'default'}
                                disabled={followLoading || followStatus !== 'none'}
                                onClick={handleFollow}>
                                {followLoading && <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                                {followStatus === 'friends' ? '✓ Amigos' : followStatus === 'pending' ? 'Solicitud enviada' : '+ Seguir'}
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── EDIT MODE ── */}
                {editing ? (
                    <div className="mt-4 space-y-4">
                        <FieldGroup>
                            <Field>
                                <FieldLabel>Nombre completo</FieldLabel>
                                <Input value={editName} onChange={e => setEditName(e.target.value)} />
                            </Field>
                            <Field>
                                <FieldLabel>Biografía</FieldLabel>
                                <Textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Cuéntanos sobre ti..." maxLength={200} className="resize-none" />
                            </Field>
                            <Field>
                                <FieldLabel>Intereses (separados por coma)</FieldLabel>
                                <Input value={editInterests} onChange={e => setEditInterests(e.target.value)} placeholder="ej: programación, inteligencia artificial, robótica" />
                            </Field>
                            <Field>
                                <FieldLabel>Carrera</FieldLabel>
                                <Select value={editCareer} onValueChange={setEditCareer}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona tu carrera" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>{careers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field>
                                <FieldLabel>Semestre</FieldLabel>
                                <Select value={editSemester} onValueChange={setEditSemester}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>Semestre {i + 1}</SelectItem>)}</SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <div className="flex gap-2">
                                <Button onClick={handleSave} disabled={saving}>
                                    {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <><SaveIcon className="mr-1 h-4 w-4" /> Guardar</>}
                                </Button>
                                <Button variant="outline" onClick={() => setEditing(false)}>
                                    <XIcon className="mr-1 h-4 w-4" /> Cancelar
                                </Button>
                            </div>
                        </FieldGroup>
                    </div>
                ) : (
                    /* ── VIEW MODE – name + bio + meta ── */
                    <div className="mt-3 space-y-3">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl font-bold">{profile.full_name}</h1>
                                {profile.role === 'sudo' && <Badge className="text-xs">Admin</Badge>}
                                {profile.role === 'tutor' && <Badge variant="secondary" className="text-xs">Tutor</Badge>}
                            </div>
                            {profile.bio && <p className="mt-1 text-sm text-muted-foreground">{profile.bio}</p>}
                        </div>

                        {/* Meta info */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                            {profile.career && (
                                <span className="flex items-center gap-1.5">
                                    <GraduationCapIcon className="h-4 w-4 shrink-0" />
                                    {profile.career.name} · Sem. {profile.semester}
                                </span>
                            )}
                            <span className="flex items-center gap-1.5">
                                <MailIcon className="h-4 w-4 shrink-0" />
                                {profile.email}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <CalendarIcon className="h-4 w-4 shrink-0" />
                                Se unió en {joinDate}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <StarIcon className="h-4 w-4 shrink-0 text-amber-500" />
                                {profile.reputation} de reputación
                            </span>
                        </div>

                        {/* Interests */}
                        {profile.interests?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {profile.interests.map(interest => (
                                    <span key={interest} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                                        {interest}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── TABS ── */}
            <div className="flex border-x border-b border-border bg-card">
                {(['publicaciones', 'info'] as WallTab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${tab === t
                            ? 'border-b-2 border-primary text-primary'
                            : 'text-muted-foreground hover:bg-accent'
                            }`}
                    >
                        {t === 'publicaciones' ? 'Publicaciones' : 'Información'}
                    </button>
                ))}
            </div>

            {/* ── TAB: PUBLICACIONES ── */}
            {tab === 'publicaciones' && (
                <div className="rounded-b-xl border-x border-b border-border bg-background/50 p-4 space-y-4">
                    {postsLoading ? (
                        <div className="flex justify-center py-10">
                            <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="py-14 text-center">
                            <BookOpenIcon className="mx-auto h-10 w-10 text-muted-foreground/30" />
                            <p className="mt-3 text-sm font-medium text-muted-foreground">
                                {isOwnProfile ? 'Aún no has publicado nada.' : 'Este usuario no tiene publicaciones.'}
                            </p>
                            {isOwnProfile && (
                                <Link to="/feed">
                                    <Button className="mt-4" size="sm">Ir al Feed para publicar</Button>
                                </Link>
                            )}
                        </div>
                    ) : (
                        <>
                            {posts.map(post => (
                                <PostCard key={post.id} post={post} currentUserId={user?.id} token={session?.access_token} />
                            ))}
                            {postsTotalPages > 1 && (
                                <div className="flex justify-center gap-2 pt-2">
                                    <Button variant="outline" size="sm" disabled={postsPage === 1} onClick={() => setPostsPage(p => p - 1)}>Anterior</Button>
                                    <span className="flex items-center text-sm text-muted-foreground">{postsPage} / {postsTotalPages}</span>
                                    <Button variant="outline" size="sm" disabled={postsPage === postsTotalPages} onClick={() => setPostsPage(p => p + 1)}>Siguiente</Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ── TAB: INFO ── */}
            {tab === 'info' && (
                <div className="rounded-b-xl border-x border-b border-border bg-background/50 p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {[
                            { label: 'Carrera', value: profile.career?.name || 'No especificada', icon: GraduationCapIcon },
                            { label: 'Semestre', value: `${profile.semester}º Semestre`, icon: BookOpenIcon },
                            { label: 'Reputación', value: `${profile.reputation} puntos`, icon: StarIcon },
                            { label: 'Miembro desde', value: joinDate, icon: CalendarIcon },
                            { label: 'Email', value: profile.email, icon: MailIcon },
                            { label: 'Rol', value: profile.role.charAt(0).toUpperCase() + profile.role.slice(1), icon: MapPinIcon },
                        ].map(item => (
                            <div key={item.label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <item.icon className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                                    <p className="mt-0.5 text-sm font-semibold">{item.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Interests */}
                    {profile.interests?.length > 0 && (
                        <div className="mt-4 rounded-xl border border-border bg-card p-4">
                            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                <HashIcon className="h-4 w-4 text-primary" /> Intereses
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {profile.interests.map(interest => (
                                    <span key={interest} className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">{interest}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
