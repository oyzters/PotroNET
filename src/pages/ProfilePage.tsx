import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { ProfileSkeleton, PostSkeleton } from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PublicationCard } from '@/components/feed/PublicationCard';
import { WarnUserModal } from '@/components/moderation/WarnUserModal';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useRole } from '@/hooks/useRole';
import {
    UserIcon, GraduationCapIcon, CalendarIcon, StarIcon, MailIcon,
    XIcon, BookOpenIcon,
    ImageIcon,
    CameraIcon,
    CheckIcon,
    MapIcon,
    ShieldCheckIcon,
    MessageCircleIcon,
    AlertTriangleIcon,
    BanIcon,
    ShieldAlertIcon,
    ClockIcon,
} from 'lucide-react';
import { ScheduleView } from '@/components/profile/ScheduleView';
import { AvatarCropModal } from '@/components/profile/AvatarCropModal';
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
    followers_count: number; following_count: number; friends_count: number;
    schedule_visibility?: 'public' | 'followers' | 'private';
}
interface Publication {
    id: string; content: string; tags: string[]; likes_count: number;
    comments_count: number; created_at: string; user_liked?: boolean;
    author: { id: string; full_name: string; avatar_url: string; email: string };
}
interface Subject { id: string; name: string; semester: number; credits: number; career_id: string }
interface UserSubject { id: string; subject_id: string; status: string; subject: Subject }


type WallTab = 'grid' | 'info' | 'horario';

export function ProfilePage() {
    const { id } = useParams<{ id: string }>();
    const { session, user, refreshProfile } = useAuth();
    const toast = useToast();
    const { isModerator, isSudo } = useRole();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [careers, setCareers] = useState<Career[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [banning, setBanning] = useState(false);
    const [showBanModal, setShowBanModal] = useState(false);
    const [isWarnModalOpen, setIsWarnModalOpen] = useState(false);
    const [tab, setTab] = useState<WallTab>('grid');

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
    const [editScheduleVisibility, setEditScheduleVisibility] = useState<'public' | 'followers' | 'private'>('public');

    // Follow
    const isOwnProfile = user?.id === id;
    const [followStatus, setFollowStatus] = useState<'none' | 'following' | 'follows_you' | 'friends'>('none');
    const [followLoading, setFollowLoading] = useState(false);
    const [followCheckLoading, setFollowCheckLoading] = useState(true);

    // Roadmap
    const [roadmapSubjects, setRoadmapSubjects] = useState<Subject[]>([]);
    const [roadmapStatuses, setRoadmapStatuses] = useState<Record<string, string>>({});
    const [roadmapLoading, setRoadmapLoading] = useState(false);

    // Avatar preview
    const [avatarExpanded, setAvatarExpanded] = useState(false);
    useBodyScrollLock(avatarExpanded || showBanModal || isWarnModalOpen);

    // Image upload
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

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
                setEditScheduleVisibility(profileData.profile.schedule_visibility || 'public');
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

    useEffect(() => { if (tab === 'grid') fetchPosts(); }, [fetchPosts, tab]);

    // Fetch roadmap when info tab opens
    useEffect(() => {
        if (tab !== 'info' || !session?.access_token || !id || !profile?.career_id) return;
        if (roadmapSubjects.length > 0) return; // already fetched
        const fetchRoadmap = async () => {
            setRoadmapLoading(true);
            try {
                const [subjectsData, userSubjectsData] = await Promise.all([
                    api<{ subjects: Subject[] }>(`/subjects?career_id=${profile.career_id}`, { token: session.access_token }),
                    api<{ user_subjects: UserSubject[] }>(`/subjects/user?user_id=${id}`, { token: session.access_token }),
                ]);
                setRoadmapSubjects(subjectsData.subjects);
                const statusMap: Record<string, string> = {};
                userSubjectsData.user_subjects.forEach(us => { statusMap[us.subject_id] = us.status; });
                setRoadmapStatuses(statusMap);
            } catch { /* silent */ } finally { setRoadmapLoading(false); }
        };
        fetchRoadmap();
    }, [tab, session?.access_token, id, profile?.career_id]);

    // Follow status
    useEffect(() => {
        if (isOwnProfile || !session?.access_token || !id) {
            setFollowCheckLoading(false);
            return;
        }
        const check = async () => {
            setFollowCheckLoading(true);
            try {
                const data = await api<{ status: 'none' | 'following' | 'follows_you' | 'friends' }>(
                    `/follows/status/${id}`, { token: session.access_token }
                );
                setFollowStatus(data.status);
            } catch { /* silent */ } finally { setFollowCheckLoading(false); }
        };
        check();
    }, [isOwnProfile, id, session?.access_token]);

    const handleFollow = async () => {
        if (!session?.access_token || !id) return;
        setFollowLoading(true);
        try {
            const data = await api<{ follow: unknown; is_friends: boolean }>(
                '/follows', { method: 'POST', token: session.access_token, body: JSON.stringify({ following_id: id }) }
            );
            setFollowStatus(data.is_friends ? 'friends' : 'following');
            // Refresh profile to get updated counters
            const updated = await api<{ profile: Profile }>(`/profiles/${id}`, { token: session.access_token });
            setProfile(updated.profile);
        } catch { /* silent */ } finally { setFollowLoading(false); }
    };

    const handleUnfollow = async () => {
        if (!session?.access_token || !id) return;
        setFollowLoading(true);
        try {
            await api(`/follows/${id}`, { method: 'DELETE', token: session.access_token });
            // If we were friends, now we only follows_you. If we were following, now none.
            setFollowStatus(prev => prev === 'friends' ? 'follows_you' : 'none');
            const updated = await api<{ profile: Profile }>(`/profiles/${id}`, { token: session.access_token });
            setProfile(updated.profile);
        } catch { /* silent */ } finally { setFollowLoading(false); }
    };

    const handleSave = async () => {
        if (!session?.access_token || !id) return;
        setSaving(true);
        try {
            const interests = editInterests.split(',').map(s => s.trim()).filter(Boolean);
            const data = await api<{ profile: Profile }>(`/profiles/${id}`, {
                method: 'PATCH', token: session.access_token,
                body: JSON.stringify({ full_name: editName, bio: editBio, career_id: editCareer || null, semester: parseInt(editSemester), interests, schedule_visibility: editScheduleVisibility }),
            });
            setProfile(data.profile);
            setEditing(false);
            refreshProfile();
        } catch { /* silent */ } finally { setSaving(false); }
    };

    const handleToggleBan = async () => {
        if (!session?.access_token || !profile) return;
        setBanning(true);
        try {
            await api(`/admin/users`, {
                method: 'PATCH',
                body: JSON.stringify({ user_id: profile.id, is_banned: !profile.is_banned }),
                token: session.access_token
            });
            setProfile(prev => prev ? { ...prev, is_banned: !prev.is_banned } : prev);
            setShowBanModal(false);
        } catch { /* */ } finally { setBanning(false); }
    };

    // Like a publication
    const handleLike = async (publicationId: string) => {
        if (!session?.access_token) return;
        try {
            const data = await api<{ liked: boolean }>(`/publications/${publicationId}/likes`, {
                method: 'POST',
                token: session.access_token,
            });
            setPosts(prev =>
                prev.map(p =>
                    p.id === publicationId
                        ? { ...p, likes_count: p.likes_count + (data.liked ? 1 : -1), user_liked: data.liked }
                        : p
                )
            );
        } catch { /* silent */ }
    };

    const handleDelete = async (publicationId: string) => {
        if (!session?.access_token) return;
        try {
            await api(`/publications/${publicationId}`, {
                method: 'DELETE',
                token: session.access_token,
            });
            setPosts(prev => prev.filter(p => p.id !== publicationId));
            toast.success('Publicación eliminada');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'No se pudo eliminar la publicación');
        }
    };

    // Subir avatar ya recortado (blob directo del cropper)
    const handleAvatarUpload = async (blob: Blob) => {
        if (!session?.access_token || !profile) return;
        setUploadError('');
        setUploadingAvatar(true);
        setCropImageSrc(null);
        try {
            const path = `${profile.id}/avatar.webp`;
            const { error: storageError } = await supabase.storage
                .from('avatars')
                .upload(path, blob, { upsert: true, contentType: 'image/webp' });

            if (storageError) throw storageError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
            const freshUrl = `${publicUrl}?t=${Date.now()}`;

            const updated = await api<{ profile: Profile }>(`/profiles/${profile.id}`, {
                method: 'PATCH',
                token: session.access_token,
                body: JSON.stringify({ avatar_url: freshUrl }),
            });

            setProfile(updated.profile);
            refreshProfile();
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Error al subir la imagen');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        if (!file.type.startsWith('image/')) {
            setUploadError('Solo se permiten imágenes (JPG, PNG, WEBP)');
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            setUploadError('La imagen no puede pesar más de 8MB');
            return;
        }

        // Abrir el modal de recorte
        const objectUrl = URL.createObjectURL(file);
        setCropImageSrc(objectUrl);
    };

    const handleCropCancel = () => {
        if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
        setCropImageSrc(null);
    };

    if (loading) return <ProfileSkeleton />;
    if (!profile) return (
        <div className="py-20 text-center">
            <UserIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">Perfil no encontrado</p>
        </div>
    );

    const joinDate = new Date(profile.created_at).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-0">
            {/* Inputs de archivo ocultos */}
            <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => onFileSelected(e)}
            />

            {/* Avatar crop modal */}
            {cropImageSrc && (
                <AvatarCropModal
                    imageSrc={cropImageSrc}
                    onConfirm={handleAvatarUpload}
                    onCancel={handleCropCancel}
                />
            )}

            {/* Avatar expanded overlay */}
            {avatarExpanded && profile.avatar_url && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setAvatarExpanded(false)}
                >
                    <button
                        onClick={() => setAvatarExpanded(false)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                        <XIcon className="h-6 w-6" />
                    </button>
                    <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="max-h-[80vh] max-w-[90vw] rounded-2xl object-contain animate-in zoom-in-90 duration-200"
                    />
                </div>
            )}

            {/* ── INFO BOXES (INSTAGRAM STYLE) ── */}
            <div className="px-4 py-2 bg-background pt-3 pb-0">
                <div className="flex items-center justify-between mb-4">
                    {/* Avatar */}
                    <div className="relative h-20 w-20 shrink-0">
                        <button
                            type="button"
                            onClick={() => profile.avatar_url && !uploadingAvatar && setAvatarExpanded(true)}
                            className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20 p-0.5 overflow-hidden shadow-sm cursor-pointer active:scale-95 transition-transform"
                        >
                            <div className="h-full w-full rounded-full overflow-hidden bg-muted flex items-center justify-center">
                                {uploadingAvatar ? (
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                ) : profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
                                ) : (
                                    <UserIcon className="h-8 w-8 text-primary" />
                                )}
                            </div>
                        </button>
                        {isOwnProfile && !editing && (
                            <button
                                onClick={() => avatarInputRef.current?.click()}
                                disabled={uploadingAvatar}
                                className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-md transition hover:bg-primary/90 disabled:opacity-60"
                                title="Cambiar foto de perfil"
                            >
                                <CameraIcon className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                    
                    {/* Stats Row */}
                    <div className="flex-1 flex justify-around ml-4 items-center">
                        <button onClick={() => setTab('grid')} className="flex flex-col items-center hover:opacity-70 transition-opacity">
                            <span className="font-bold text-lg">{posts.length}</span>
                            <span className="text-[11px] text-muted-foreground">Posts</span>
                        </button>
                        <Link to={`/friends?user=${id}&tab=followers`} className="flex flex-col items-center hover:opacity-70 transition-opacity">
                            <span className="font-bold text-lg">{profile.followers_count || 0}</span>
                            <span className="text-[11px] text-muted-foreground">Seguidores</span>
                        </Link>
                        <Link to={`/friends?user=${id}&tab=following`} className="hidden sm:flex flex-col items-center hover:opacity-70 transition-opacity">
                            <span className="font-bold text-lg">{profile.following_count || 0}</span>
                            <span className="text-[11px] text-muted-foreground">Siguiendo</span>
                        </Link>
                        <Link to="/rankings" className="flex flex-col items-center hover:opacity-70 transition-opacity">
                            <span className="font-bold text-lg text-amber-500">{profile.reputation}</span>
                            <span className="text-[11px] text-muted-foreground">Reputación</span>
                        </Link>
                    </div>
                </div>

                {/* Bio Section */}
                <div className="px-1 mb-4">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <h1 className="font-bold text-[15px] leading-tight flex items-center gap-1.5">
                            {profile.full_name}
                            {profile.role === 'sudo' ? (
                                <span className="inline-flex items-center gap-0.5 rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                                    <ShieldCheckIcon className="h-3 w-3" />
                                    Sudo
                                </span>
                            ) : profile.role === 'admin' ? (
                                <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-bold text-blue-500">
                                    <ShieldCheckIcon className="h-3 w-3" />
                                    Admin
                                </span>
                            ) : (
                                <CheckIcon className="h-3.5 w-3.5 text-blue-500" />
                            )}
                            {profile.is_banned && (
                                <span className="inline-flex items-center gap-0.5 rounded-md bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                                    <BanIcon className="h-3 w-3" />
                                    Baneado
                                </span>
                            )}
                        </h1>
                    </div>
                    {profile.career && (
                        <p className="text-[13px] text-muted-foreground/90 font-medium mb-1 line-clamp-1 flex items-center gap-1">
                            <GraduationCapIcon className="h-3.5 w-3.5" />
                            {profile.career.name} · Sem. {profile.semester}
                        </p>
                    )}
                    <p className="text-[13px] leading-snug whitespace-pre-wrap">{profile.bio}</p>
                    {profile.interests?.length > 0 && (
                        <p className="text-[13px] text-primary mt-1 line-clamp-2">
                            {profile.interests.map(i => `#${i.replace(/\s+/g, '')}`).join(' ')}
                        </p>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mb-4">
                    {isOwnProfile ? (
                        <>
                            <Button variant="secondary" className="flex-1 h-8 text-xs font-semibold rounded-lg bg-muted/60" onClick={() => setEditing(!editing)}>
                                {editing ? 'Cancelar edición' : 'Editar perfil'}
                            </Button>
                            {profile.career && (
                                <Link to={`/roadmap/${profile.id || id}`} className="flex-1">
                                    <Button variant="secondary" className="w-full h-8 text-xs font-semibold rounded-lg bg-muted/60">
                                        Mapa Curricular
                                    </Button>
                                </Link>
                            )}
                        </>
                    ) : (
                        <div className="flex gap-2 flex-1">
                            {followStatus === 'none' || followStatus === 'follows_you' ? (
                                <Button
                                    className="flex-1 h-8 text-xs font-semibold rounded-lg"
                                    disabled={followLoading || followCheckLoading}
                                    onClick={handleFollow}
                                >
                                    {(followLoading || followCheckLoading) && <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                                    {followCheckLoading ? 'Cargando...' : followStatus === 'follows_you' ? 'Seguir de vuelta' : 'Seguir'}
                                </Button>
                            ) : (
                                <Button
                                    className="flex-1 h-8 text-xs font-semibold rounded-lg"
                                    variant={followStatus === 'friends' ? 'secondary' : 'outline'}
                                    disabled={followLoading || followCheckLoading}
                                    onClick={handleUnfollow}
                                >
                                    {followLoading && <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                                    {followStatus === 'friends' ? 'Amigos ✓' : 'Siguiendo'}
                                </Button>
                            )}
                            <Link to={`/messages/${id}`}>
                                <Button variant="outline" className="h-8 text-xs font-semibold rounded-lg" size="icon">
                                    <MessageCircleIcon className="h-4 w-4" />
                                </Button>
                            </Link>
                            {isModerator && !isOwnProfile && profile.role !== 'sudo' && (
                                <>
                                    <Button 
                                        variant="outline" 
                                        className="h-8 text-xs font-semibold rounded-lg text-amber-500 border-amber-500/50 hover:bg-amber-500/10" 
                                        size="icon"
                                        onClick={() => setIsWarnModalOpen(true)}
                                    >
                                        <AlertTriangleIcon className="h-4 w-4" />
                                    </Button>
                                    <WarnUserModal
                                        isOpen={isWarnModalOpen}
                                        onClose={() => setIsWarnModalOpen(false)}
                                        userName={profile.full_name}
                                        onConfirm={async (cat, msg) => {
                                            await api(`/moderation/users/${profile.id}/warn`, {
                                                method: 'POST',
                                                body: JSON.stringify({ category: cat, message: msg }),
                                                token: session?.access_token
                                            });
                                        }}
                                    />
                                </>
                            )}
                            {isSudo && !isOwnProfile && profile.role !== 'sudo' && (
                                <Button 
                                    variant="outline" 
                                    className={`h-8 text-xs font-semibold rounded-lg border-destructive/50 hover:bg-destructive/10 ${profile.is_banned ? 'text-emerald-500 border-emerald-500/50 hover:bg-emerald-500/10' : 'text-destructive'}`}
                                    size="icon"
                                    onClick={() => setShowBanModal(true)}
                                    disabled={banning}
                                >
                                    <BanIcon className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Upload Error */}
                {uploadError && (
                    <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        <span>{uploadError}</span>
                        <button onClick={() => setUploadError('')} className="ml-2 opacity-70 hover:opacity-100"><XIcon className="h-3.5 w-3.5" /></button>
                    </div>
                )}
                
                {/* Edit Form */}
                {editing && (
                    <div className="mb-6 space-y-4 rounded-xl border border-border bg-card p-4">
                        <FieldGroup>
                            <Field>
                                <FieldLabel>Nombre completo</FieldLabel>
                                <Input value={editName} onChange={e => setEditName(e.target.value)} />
                            </Field>
                            <Field>
                                <FieldLabel>Biografía</FieldLabel>
                                <Textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Cuéntanos sobre ti..." maxLength={150} className="resize-none text-sm" />
                            </Field>
                            <Field>
                                <FieldLabel>Intereses (separados por coma)</FieldLabel>
                                <Input value={editInterests} onChange={e => setEditInterests(e.target.value)} placeholder="ej: programación, robótica" className="text-sm" />
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
                            <Field>
                                <FieldLabel>Visibilidad del horario</FieldLabel>
                                <Select value={editScheduleVisibility} onValueChange={v => setEditScheduleVisibility(v as 'public' | 'followers' | 'private')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="public">Público — lo ve todo PotroNET</SelectItem>
                                            <SelectItem value="followers">Solo seguidores</SelectItem>
                                            <SelectItem value="private">Privado — solo yo</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Button onClick={handleSave} disabled={saving} className="w-full">
                                {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : 'Guardar Cambios'}
                            </Button>
                        </FieldGroup>
                    </div>
                )}
            </div>

            {/* ── TABS ── */}
            <div className="flex border-b border-border bg-background">
                {(['grid', 'info', 'horario'] as WallTab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`flex-1 py-3.5 text-[13px] font-semibold flex justify-center items-center gap-2 transition-colors relative ${tab === t ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}
                    >
                        {t === 'grid' ? <ImageIcon className="h-4 w-4" /> : t === 'info' ? <BookOpenIcon className="h-4 w-4" /> : <ClockIcon className="h-4 w-4" />}
                        <span className="uppercase tracking-wider">
                            {t === 'grid' ? 'Posts' : t === 'info' ? 'Info' : 'Horario'}
                        </span>
                        {tab === t && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground mx-[10%]" />}
                    </button>
                ))}
            </div>

            {/* ── TAB: LISTA DE PUBLICACIONES ── */}
            {tab === 'grid' && (
                <div className="bg-background min-h-[50vh]">
                    {postsLoading ? (
                        <><PostSkeleton /><PostSkeleton /><PostSkeleton /></>
                    ) : posts.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center">
                            <div className="h-16 w-16 mb-4 rounded-full border-2 border-muted-foreground flex items-center justify-center">
                                <CameraIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h2 className="text-xl font-bold mb-1">Aún no hay posts</h2>
                            <p className="text-sm text-muted-foreground">
                                {isOwnProfile ? 'Cuando publiques en el feed, aparecerán aquí.' : 'Este usuario no tiene publicaciones.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-0 md:space-y-4 pb-20">
                            {posts.map(post => (
                                <PublicationCard
                                    key={post.id}
                                    publication={post}
                                    currentUserId={user?.id}
                                    hideAuthor
                                    onLike={handleLike}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                    {postsTotalPages > 1 && (
                        <div className="flex justify-center gap-2 pt-6 pb-20">
                            <Button variant="outline" size="sm" disabled={postsPage === 1} onClick={() => setPostsPage(p => p - 1)}>Anterior</Button>
                            <Button variant="outline" size="sm" disabled={postsPage === postsTotalPages} onClick={() => setPostsPage(p => p + 1)}>Siguiente</Button>
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB: HORARIO ── */}
            {tab === 'horario' && session?.access_token && id && (
                <ScheduleView
                    userId={id}
                    isOwnProfile={isOwnProfile}
                    token={session.access_token}
                />
            )}

            {/* ── TAB: INFO ── */}
            {tab === 'info' && (() => {
                const total = roadmapSubjects.length;
                const approved = Object.values(roadmapStatuses).filter(s => s === 'APROBADA').length;
                const inProgress = Object.values(roadmapStatuses).filter(s => s === 'CURSANDO').length;
                const failed = Object.values(roadmapStatuses).filter(s => s === 'REPROBADA').length;
                const pct = total > 0 ? Math.round((approved / total) * 100) : 0;

                // Group subjects by semester
                const semesters: Record<number, Subject[]> = {};
                roadmapSubjects.forEach(s => {
                    if (!semesters[s.semester]) semesters[s.semester] = [];
                    semesters[s.semester].push(s);
                });
                const semNums = Object.keys(semesters).map(Number).sort((a, b) => a - b);

                const statusColor: Record<string, string> = {
                    APROBADA: 'bg-emerald-500',
                    CURSANDO: 'bg-amber-500',
                    REPROBADA: 'bg-red-500',
                    NO_CURSADA: 'bg-muted-foreground/20',
                };

                return (
                    <div className="bg-background p-4 min-h-[50vh] pb-24 space-y-6">
                        {/* Info cards */}
                        <div className="grid gap-3 sm:grid-cols-2">
                            {[
                                { label: 'Rol', value: profile.role.charAt(0).toUpperCase() + profile.role.slice(1), icon: UserIcon },
                                { label: 'Miembro desde', value: joinDate, icon: CalendarIcon },
                                { label: 'Email Institucional', value: profile.email.replace('@potros.itson.edu.mx', ''), icon: MailIcon },
                                { label: 'Reputación', value: `${profile.reputation} puntos`, icon: StarIcon },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                                        <item.icon className="h-5 w-5 text-foreground/70" />
                                    </div>
                                    <div className="flex-1 border-b border-border/50 pb-2">
                                        <p className="text-[11px] font-medium text-muted-foreground">{item.label}</p>
                                        <p className="mt-0.5 text-[14px] font-semibold">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Roadmap / Progreso académico */}
                        {profile.career_id && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <MapIcon className="h-5 w-5 text-primary" />
                                    <h3 className="text-base font-bold">Progreso Académico</h3>
                                </div>

                                {roadmapLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                                    </div>
                                ) : total === 0 ? (
                                    <p className="text-sm text-muted-foreground py-4">No hay materias registradas para esta carrera.</p>
                                ) : (
                                    <>
                                        {/* Summary bar */}
                                        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold">{pct}% completado</span>
                                                <span className="text-xs text-muted-foreground">{approved}/{total} materias</span>
                                            </div>
                                            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                                                <div className="flex h-full">
                                                    <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(approved / total) * 100}%` }} />
                                                    <div className="bg-amber-500 transition-all duration-500" style={{ width: `${(inProgress / total) * 100}%` }} />
                                                    <div className="bg-red-500 transition-all duration-500" style={{ width: `${(failed / total) * 100}%` }} />
                                                </div>
                                            </div>
                                            <div className="flex gap-4 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />{approved} aprobadas</span>
                                                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />{inProgress} cursando</span>
                                                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />{failed} reprobadas</span>
                                            </div>
                                        </div>

                                        {/* Semester dots grid */}
                                        <div className="space-y-3">
                                            {semNums.map(sem => {
                                                const subjects = semesters[sem];
                                                const semApproved = subjects.filter(s => roadmapStatuses[s.id] === 'APROBADA').length;
                                                return (
                                                    <div key={sem} className="rounded-xl border border-border bg-card p-3 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-semibold">Semestre {sem}</span>
                                                            <span className="text-[10px] text-muted-foreground">{semApproved}/{subjects.length}</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {subjects.map(subject => {
                                                                const status = roadmapStatuses[subject.id] || 'NO_CURSADA';
                                                                return (
                                                                    <div
                                                                        key={subject.id}
                                                                        title={`${subject.name} — ${status === 'NO_CURSADA' ? 'No cursada' : status === 'APROBADA' ? 'Aprobada' : status === 'CURSANDO' ? 'Cursando' : 'Reprobada'}`}
                                                                        className={`h-3 rounded-full transition-all duration-300 ${statusColor[status]}`}
                                                                        style={{ width: `${Math.max(100 / subjects.length - 1, 8)}%`, minWidth: '12px' }}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Ban Modal */}
            {showBanModal && profile && (
                <div className="fixed inset-0 z-[110] flex items-end justify-center" onClick={() => setShowBanModal(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative w-full shadow-2xl md:max-w-sm rounded-t-2xl bg-card border-x border-t border-border p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${profile.is_banned ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                <ShieldAlertIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">
                                    {profile.is_banned ? 'Desbanear' : 'Banear'} a {profile.full_name}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {profile.is_banned 
                                        ? 'El usuario recuperará acceso inmediato a PotroNET.'
                                        : 'El usuario perderá acceso inmediato a PotroNET.'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3">
                            <Button 
                                variant={profile.is_banned ? 'default' : 'destructive'}
                                className={`w-full h-12 text-base font-bold ${!profile.is_banned && 'shadow-lg shadow-red-500/20'}`} 
                                onClick={handleToggleBan}
                                disabled={banning}
                            >
                                {banning ? 'Procesando...' : (profile.is_banned ? 'Confirmar Desban' : 'Confirmar Ban')}
                            </Button>
                            <Button 
                                variant="outline" 
                                className="w-full h-12 text-base font-bold" 
                                onClick={() => setShowBanModal(false)}
                                disabled={banning}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
