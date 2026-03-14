import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PublicationCard } from '@/components/feed/PublicationCard';
import {
    UserIcon, GraduationCapIcon, CalendarIcon, StarIcon, MailIcon,
    XIcon, BookOpenIcon,
    ImageIcon,
    CameraIcon,
    CheckIcon,
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
    author: { id: string; full_name: string; avatar_url: string; email: string };
}

// Comprime una imagen usando Canvas API (sin dependencias externas)
async function compressImage(file: File, maxWidth: number, maxHeight: number, quality = 0.85): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            let { width, height } = img;
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            if (ratio < 1) { width = Math.round(width * ratio); height = Math.round(height * ratio); }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('Error al comprimir imagen'));
            }, 'image/webp', quality);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
        img.src = url;
    });
}

type WallTab = 'grid' | 'info';

export function ProfilePage() {
    const { id } = useParams<{ id: string }>();
    const { session, user, refreshProfile } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [careers, setCareers] = useState<Career[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
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

    // Follow
    const isOwnProfile = user?.id === id;
    const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'friends'>('none');
    const [followLoading, setFollowLoading] = useState(false);
    const [followCheckLoading, setFollowCheckLoading] = useState(true);

    // Image upload
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const avatarInputRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => { if (tab === 'grid') fetchPosts(); }, [fetchPosts, tab]);

    // Friend status
    useEffect(() => {
        if (isOwnProfile || !session?.access_token || !id) {
            setFollowCheckLoading(false);
            return;
        }
        const check = async () => {
            setFollowCheckLoading(true);
            try {
                const data = await api<{ friends: Array<{ status: string; receiver_id: string; requester_id: string }> }>(
                    '/friends', { token: session.access_token }
                );
                const rel = (data.friends || []).find(f => f.receiver_id === id || f.requester_id === id);
                if (!rel) setFollowStatus('none');
                else if (rel.status === 'accepted') setFollowStatus('friends');
                else setFollowStatus('pending');
            } catch { /* silent */ } finally { setFollowCheckLoading(false); }
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

    // Subir imagen de avatar
    const handleImageUpload = async (file: File) => {
        if (!session?.access_token || !profile) return;

        setUploadError('');

        if (!file.type.startsWith('image/')) {
            setUploadError('Solo se permiten imágenes (JPG, PNG, WEBP)');
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            setUploadError('La imagen no puede pesar más de 8MB');
            return;
        }

        setUploadingAvatar(true);

        try {
            // Comprimir: avatar 400×400
            const compressed = await compressImage(file, 400, 400, 0.85);

            // Subir al bucket de Supabase Storage
            const path = `${profile.id}/avatar.webp`;
            const { error: storageError } = await supabase.storage
                .from('avatars')
                .upload(path, compressed, { upsert: true, contentType: 'image/webp' });

            if (storageError) throw storageError;

            // Obtener URL pública con cache-bust para forzar recarga
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
            const freshUrl = `${publicUrl}?t=${Date.now()}`;

            // Guardar URL en el perfil
            const updated = await api<{ profile: Profile }>(`/profiles/${profile.id}`, {
                method: 'PATCH',
                token: session.access_token,
                body: JSON.stringify({ avatar_url: freshUrl }),
            });

            setProfile(updated.profile);
            refreshProfile(); // actualiza avatar en Navbar
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Error al subir la imagen');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleImageUpload(file);
        // Limpiar el input para permitir subir el mismo archivo de nuevo
        e.target.value = '';
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
            {/* Inputs de archivo ocultos */}
            <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => onFileSelected(e)}
            />

            {/* ── INFO BOXES (INSTAGRAM STYLE) ── */}
            <div className="px-4 py-2 bg-background pt-3 pb-0">
                <div className="flex items-center justify-between mb-4">
                    {/* Avatar */}
                    <div className="relative h-20 w-20 shrink-0">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20 p-0.5 overflow-hidden shadow-sm">
                            <div className="h-full w-full rounded-full overflow-hidden bg-muted flex items-center justify-center">
                                {uploadingAvatar ? (
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                ) : profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
                                ) : (
                                    <UserIcon className="h-8 w-8 text-primary" />
                                )}
                            </div>
                        </div>
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
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-lg">{posts.length}</span>
                            <span className="text-[11px] text-muted-foreground">Posts</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-lg">0</span> {/* Placeholder for friends count */}
                            <span className="text-[11px] text-muted-foreground">Amigos</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-lg text-amber-500">{profile.reputation}</span>
                            <span className="text-[11px] text-muted-foreground">Reputación</span>
                        </div>
                    </div>
                </div>

                {/* Bio Section */}
                <div className="px-1 mb-4">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <h1 className="font-bold text-[15px] leading-tight flex items-center gap-1">
                            {profile.full_name}
                            {profile.role === 'sudo' && <CheckIcon className="h-3.5 w-3.5 text-blue-500" />}
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
                        <Button
                            className="flex-1 h-8 text-xs font-semibold rounded-lg shadow-neon-primary"
                            variant={followStatus === 'friends' ? 'secondary' : followStatus === 'pending' ? 'outline' : 'default'}
                            disabled={followLoading || followCheckLoading || followStatus !== 'none'}
                            onClick={handleFollow}
                        >
                            {(followLoading || followCheckLoading) && <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                            {followCheckLoading ? 'Cargando...' : followStatus === 'friends' ? 'Amigos' : followStatus === 'pending' ? 'Pendiente' : 'Añadir Amigo'}
                        </Button>
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
                            <Button onClick={handleSave} disabled={saving} className="w-full">
                                {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : 'Guardar Cambios'}
                            </Button>
                        </FieldGroup>
                    </div>
                )}
            </div>

            {/* ── TABS ── */}
            <div className="flex border-b border-border bg-background">
                {(['grid', 'info'] as WallTab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`flex-1 py-3.5 text-[13px] font-semibold flex justify-center items-center gap-2 transition-colors relative ${tab === t ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}
                    >
                        {t === 'grid' ? <ImageIcon className="h-4 w-4" /> : <BookOpenIcon className="h-4 w-4" />}
                        <span className="uppercase tracking-wider">
                            {t === 'grid' ? 'Posts' : 'Info'}
                        </span>
                        {tab === t && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground mx-[10%]" />}
                    </button>
                ))}
            </div>

            {/* ── TAB: LISTA DE PUBLICACIONES ── */}
            {tab === 'grid' && (
                <div className="bg-background min-h-[50vh]">
                    {postsLoading ? (
                        <div className="flex justify-center py-10"><div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
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

            {/* ── TAB: INFO ── */}
            {tab === 'info' && (
                <div className="bg-background p-4 min-h-[50vh] pb-24">
                    <div className="grid gap-3 sm:grid-cols-2">
                        {[
                            { label: 'Rol', value: profile.role.charAt(0).toUpperCase() + profile.role.slice(1), icon: UserIcon },
                            { label: 'Miembro desde', value: joinDate, icon: CalendarIcon },
                            { label: 'Email Institucional', value: profile.email, icon: MailIcon },
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
                </div>
            )}

        </div>
    );
}
