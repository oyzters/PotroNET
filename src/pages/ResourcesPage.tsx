import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ListSkeleton } from '@/components/ui/Skeleton';
import {
    BookOpenIcon,
    SearchIcon,
    PlusIcon,
    XIcon,
    DownloadIcon,
    ExternalLinkIcon,
    UserIcon,
    CalendarIcon,
} from 'lucide-react';

interface Career {
    id: string;
    name: string;
}

interface Resource {
    id: string;
    title: string;
    description: string;
    resource_type: string;
    file_url: string;
    subject_name: string;
    professor_name: string;
    download_count: number;
    created_at: string;
    uploader: { id: string; full_name: string; avatar_url: string; email: string };
    career: { id: string; name: string } | null;
}

interface ResourcesResponse {
    resources: Resource[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface CareersResponse {
    careers: Career[];
}

const RESOURCE_TYPES = [
    { value: 'pdf', label: 'PDF', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
    { value: 'resumen', label: 'Resumen', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    { value: 'presentacion', label: 'Presentacion', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
    { value: 'guia', label: 'Guia', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
    { value: 'examen', label: 'Examen', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    { value: 'otro', label: 'Otro', color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
];

function getTypeBadge(type: string) {
    const t = RESOURCE_TYPES.find((rt) => rt.value === type) || RESOURCE_TYPES[5];
    return (
        <Badge variant="outline" className={`${t.color} text-xs font-medium px-2 py-0.5 border`}>
            {t.label}
        </Badge>
    );
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ResourcesPage() {
    const { session } = useAuth();
    const [resources, setResources] = useState<Resource[]>([]);
    const [careers, setCareers] = useState<Career[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Filters
    const [filterType, setFilterType] = useState('');
    const [filterCareer, setFilterCareer] = useState('');
    const [search, setSearch] = useState('');

    // Create form
    const [showCreate, setShowCreate] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newType, setNewType] = useState('');
    const [newCareer, setNewCareer] = useState('');
    const [newSubject, setNewSubject] = useState('');
    const [newFileUrl, setNewFileUrl] = useState('');

    const fetchCareers = useCallback(async () => {
        if (!session?.access_token) return;
        try {
            const data = await api<CareersResponse>('/careers', { token: session.access_token });
            setCareers(data.careers);
        } catch { /* silent */ }
    }, [session?.access_token]);

    const fetchResources = useCallback(async () => {
        if (!session?.access_token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '12' });
            if (filterType) params.set('type', filterType);
            if (filterCareer) params.set('career_id', filterCareer);
            const data = await api<ResourcesResponse>(`/resources?${params}`, { token: session.access_token });
            setResources(data.resources);
            setTotalPages(data.pagination.totalPages);
        } catch { /* silent */ } finally { setLoading(false); }
    }, [session?.access_token, page, filterType, filterCareer]);

    useEffect(() => { fetchCareers(); }, [fetchCareers]);
    useEffect(() => { fetchResources(); }, [fetchResources]);

    const handleCreate = async () => {
        if (!session?.access_token || !newTitle.trim() || !newType) return;
        setSubmitting(true);
        try {
            await api('/resources', {
                method: 'POST',
                token: session.access_token,
                body: JSON.stringify({
                    title: newTitle,
                    description: newDescription,
                    resource_type: newType,
                    career_id: newCareer || null,
                    subject_name: newSubject,
                    file_url: newFileUrl,
                }),
            });
            setShowCreate(false);
            setNewTitle(''); setNewDescription(''); setNewType('');
            setNewCareer(''); setNewSubject(''); setNewFileUrl('');
            fetchResources();
        } catch { /* silent */ } finally { setSubmitting(false); }
    };

    // Client-side title search filter
    const filtered = search
        ? resources.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()))
        : resources;

    return (
        <div className="min-h-dvh">
            {/* Header */}
            <SectionHeader
                title="Recursos"
                subtitle="Material de estudio compartido por la comunidad."
            >
                <Button
                    onClick={() => setShowCreate(!showCreate)}
                    variant={showCreate ? 'outline' : 'default'}
                    size="sm"
                    className="rounded-full px-3 text-xs h-8"
                >
                    {showCreate ? <XIcon className="mr-1 h-3.5 w-3.5" /> : <PlusIcon className="mr-1 h-3.5 w-3.5" />}
                    {showCreate ? 'Cancelar' : 'Subir'}
                </Button>
            </SectionHeader>

            {/* Upload Form */}
            {showCreate && (
                <div className="px-4 md:px-8 pb-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-card border border-border shadow-sm rounded-2xl p-6">
                            <h3 className="font-semibold text-lg mb-6">Nuevo recurso</h3>
                            <div className="space-y-4">
                                <Input
                                    placeholder="Titulo del recurso *"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="rounded-xl bg-background border-border/50 h-12"
                                />
                                <Textarea
                                    placeholder="Descripcion del recurso (opcional)"
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    maxLength={500}
                                    className="resize-none rounded-xl bg-background border-border/50 min-h-[100px]"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Select value={newType} onValueChange={setNewType}>
                                        <SelectTrigger className="rounded-xl bg-background border-border/50 h-12">
                                            <SelectValue placeholder="Tipo de recurso *" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {RESOURCE_TYPES.map((t) => (
                                                <SelectItem key={t.value} value={t.value}>
                                                    {t.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={newCareer} onValueChange={setNewCareer}>
                                        <SelectTrigger className="rounded-xl bg-background border-border/50 h-12">
                                            <SelectValue placeholder="Carrera (opcional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {careers.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Input
                                    placeholder="Nombre de materia (opcional)"
                                    value={newSubject}
                                    onChange={(e) => setNewSubject(e.target.value)}
                                    className="rounded-xl bg-background border-border/50 h-12"
                                />
                                <Input
                                    placeholder="URL del archivo"
                                    value={newFileUrl}
                                    onChange={(e) => setNewFileUrl(e.target.value)}
                                    className="rounded-xl bg-background border-border/50 h-12"
                                />
                                <Button
                                    className="w-full rounded-xl h-12 text-base"
                                    onClick={handleCreate}
                                    disabled={submitting || !newTitle.trim() || !newType}
                                >
                                    {submitting ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                    ) : (
                                        'Publicar Recurso'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="px-4 md:px-8 pb-4">
                <div className="max-w-4xl mx-auto space-y-2">
                    <div className="flex gap-2">
                        <Select value={filterType} onValueChange={(v) => { setFilterType(v === 'todos' ? '' : v); setPage(1); }}>
                            <SelectTrigger className="rounded-lg bg-muted/50 border-0 h-9 text-xs flex-1">
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos los tipos</SelectItem>
                                {RESOURCE_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterCareer} onValueChange={(v) => { setFilterCareer(v === 'todas' ? '' : v); setPage(1); }}>
                            <SelectTrigger className="rounded-lg bg-muted/50 border-0 h-9 text-xs flex-1">
                                <SelectValue placeholder="Carrera" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todas">Todas las carreras</SelectItem>
                                {careers.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por titulo..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 rounded-lg bg-muted/50 border-0 h-9 text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Resource Cards */}
            <div className="px-4 md:px-8 pb-8">
                <div className="max-w-4xl mx-auto">
                    {loading ? (
                        <ListSkeleton count={6} />
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-muted/20 rounded-full mb-6">
                                <BookOpenIcon className="h-10 w-10 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No hay recursos disponibles</h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Se el primero en compartir material de estudio con la comunidad.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {filtered.map((resource) => (
                                <div
                                    key={resource.id}
                                    className="bg-card border border-border shadow-sm rounded-2xl p-5 hover:shadow-md hover:border-primary/30 transition-all duration-300 flex flex-col"
                                >
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        {getTypeBadge(resource.resource_type)}
                                        {resource.download_count > 0 && (
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                                <DownloadIcon className="h-3 w-3" />
                                                {resource.download_count}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{resource.title}</h3>
                                    {resource.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                                            {resource.description}
                                        </p>
                                    )}
                                    {resource.subject_name && (
                                        <p className="text-xs text-muted-foreground mb-2">
                                            Materia: {resource.subject_name}
                                        </p>
                                    )}
                                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/50">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                                                {resource.uploader?.avatar_url ? (
                                                    <img
                                                        src={resource.uploader.avatar_url}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <UserIcon className="h-3 w-3 text-primary" />
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground truncate">
                                                {resource.uploader?.full_name || 'Anonimo'}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                                <CalendarIcon className="h-3 w-3" />
                                                {formatDate(resource.created_at)}
                                            </span>
                                        </div>
                                        {resource.file_url && (
                                            <a
                                                href={resource.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Button variant="outline" size="sm" className="rounded-full h-8 px-3 text-xs gap-1">
                                                    <ExternalLinkIcon className="h-3 w-3" />
                                                    Ver
                                                </Button>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 pt-8">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="rounded-full border-border/50"
                            >
                                Anterior
                            </Button>
                            <span className="flex items-center text-sm text-muted-foreground px-3">
                                {page} / {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="rounded-full border-border/50"
                            >
                                Siguiente
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
