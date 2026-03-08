import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    BookOpenIcon, SearchIcon, PlusIcon, FileTextIcon, DownloadIcon, UserIcon,
} from 'lucide-react';

interface Career { id: string; name: string }
interface Uploader { id: string; full_name: string; avatar_url: string; email: string }
interface Resource {
    id: string; title: string; description: string; resource_type: string;
    file_url: string; subject_name: string; professor_name: string;
    download_count: number; created_at: string; uploader: Uploader; career: Career | null;
}
interface ResourcesResponse {
    resources: Resource[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}

const TYPE_LABELS: Record<string, string> = { pdf: '📄 PDF', resumen: '📝 Resumen', presentacion: '📊 Presentación', guia: '📖 Guía', examen: '📋 Examen', otro: '📁 Otro' };
const TYPES = ['pdf', 'resumen', 'presentacion', 'guia', 'examen', 'otro'];

export function ResourcesPage() {
    const { session } = useAuth();
    const [resources, setResources] = useState<Resource[]>([]);
    const [careers, setCareers] = useState<Career[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [careerId, setCareerId] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newType, setNewType] = useState('pdf');
    const [newUrl, setNewUrl] = useState('');
    const [newCareer, setNewCareer] = useState('');
    const [newSubject, setNewSubject] = useState('');
    const [newProfessor, setNewProfessor] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchResources = useCallback(async () => {
        if (!session?.access_token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '12' });
            if (search) params.set('subject', search);
            if (careerId) params.set('career_id', careerId);
            if (typeFilter) params.set('type', typeFilter);
            const data = await api<ResourcesResponse>(`/resources?${params}`, { token: session.access_token });
            setResources(data.resources);
            setTotalPages(data.pagination.totalPages);
        } catch { /* silent */ } finally { setLoading(false); }
    }, [session?.access_token, page, search, careerId, typeFilter]);

    useEffect(() => {
        const fetchCareers = async () => {
            if (!session?.access_token) return;
            try {
                const data = await api<{ careers: Career[] }>('/careers', { token: session.access_token });
                setCareers(data.careers);
            } catch { /* silent */ }
        };
        fetchCareers();
    }, [session?.access_token]);

    useEffect(() => { fetchResources(); }, [fetchResources]);

    const handleCreate = async () => {
        if (!session?.access_token || !newTitle.trim()) return;
        setSubmitting(true);
        try {
            await api('/resources', {
                method: 'POST', token: session.access_token,
                body: JSON.stringify({ title: newTitle, description: newDesc, resource_type: newType, file_url: newUrl, career_id: newCareer || null, subject_name: newSubject, professor_name: newProfessor }),
            });
            setShowCreate(false); setNewTitle(''); setNewDesc(''); setNewUrl(''); setNewSubject(''); setNewProfessor('');
            fetchResources();
        } catch { /* silent */ } finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Recursos Académicos</h1>
                    <p className="text-sm text-muted-foreground">Comparte y descarga material de estudio</p>
                </div>
                <Button onClick={() => setShowCreate(!showCreate)}><PlusIcon className="mr-1 h-4 w-4" /> Compartir Recurso</Button>
            </div>

            {showCreate && (
                <Card className="border-primary/30">
                    <CardHeader><CardTitle className="text-base">Compartir recurso</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <Input placeholder="Título del recurso" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                        <Textarea placeholder="Descripción (opcional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} maxLength={300} />
                        <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                            {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                        </select>
                        <Input placeholder="URL del archivo (Google Drive, Dropbox, etc.)" value={newUrl} onChange={e => setNewUrl(e.target.value)} />
                        <div className="grid gap-3 sm:grid-cols-3">
                            <select value={newCareer} onChange={e => setNewCareer(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                                <option value="">Carrera (opcional)</option>
                                {careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <Input placeholder="Materia" value={newSubject} onChange={e => setNewSubject(e.target.value)} />
                            <Input placeholder="Profesor" value={newProfessor} onChange={e => setNewProfessor(e.target.value)} />
                        </div>
                        <Button onClick={handleCreate} disabled={submitting || !newTitle.trim()}>
                            {submitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : 'Publicar Recurso'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar por materia..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
                </div>
                <select value={careerId} onChange={e => { setCareerId(e.target.value); setPage(1); }} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <option value="">Todas las carreras</option>
                    {careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <option value="">Todos los tipos</option>
                    {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
            </div>

            {/* Resources */}
            {loading ? (
                <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
            ) : resources.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                    <BookOpenIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
                    <p className="mt-4 text-muted-foreground">No hay recursos disponibles</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {resources.map(r => (
                        <Card key={r.id} className="transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                            <CardContent className="py-5 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                        <FileTextIcon className="h-5 w-5 text-primary" />
                                    </div>
                                    <Badge variant="secondary">{TYPE_LABELS[r.resource_type] || r.resource_type}</Badge>
                                </div>
                                <h3 className="font-semibold line-clamp-1">{r.title}</h3>
                                {r.description && <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>}
                                <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                                    {r.subject_name && <Badge variant="secondary">{r.subject_name}</Badge>}
                                    {r.professor_name && <Badge variant="secondary">{r.professor_name}</Badge>}
                                    {r.career && <Badge variant="secondary">{r.career.name}</Badge>}
                                </div>
                                <div className="flex items-center justify-between border-t border-border pt-3">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <UserIcon className="h-3 w-3" /> {r.uploader?.full_name}
                                    </div>
                                    {r.file_url && (
                                        <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                                            <Button variant="ghost" size="sm"><DownloadIcon className="mr-1 h-3 w-3" /> Abrir</Button>
                                        </a>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                    <span className="flex items-center text-sm text-muted-foreground">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
                </div>
            )}
        </div>
    );
}
