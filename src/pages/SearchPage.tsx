import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchIcon, UserIcon, GraduationCapIcon, BookOpenIcon, StarIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SearchResults {
    users: Array<{ id: string; full_name: string; avatar_url: string; email: string; career: { id: string; name: string } | null }>;
    professors: Array<{ id: string; full_name: string; department: string; avg_rating: number; total_reviews: number; career: { id: string; name: string } | null }>;
    resources: Array<{ id: string; title: string; resource_type: string; subject_name: string; career: { id: string; name: string } | null }>;
    tutoring: Array<{ id: string; subject_name: string; description: string; tutor: { id: string; full_name: string } }>;
}

type TabKey = 'users' | 'professors' | 'resources' | 'tutoring';

export function SearchPage() {
    const { session } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('users');

    const handleSearch = async () => {
        if (!session?.access_token || query.trim().length < 2) return;
        setLoading(true);
        try {
            const data = await api<SearchResults>(`/search?q=${encodeURIComponent(query.trim())}`, {
                token: session.access_token,
            });
            setResults(data);
        } catch {
            // Silent error
        } finally {
            setLoading(false);
        }
    };

    const tabs: { key: TabKey; label: string; count: number }[] = [
        { key: 'users', label: 'Usuarios', count: results?.users.length || 0 },
        { key: 'professors', label: 'Profesores', count: results?.professors.length || 0 },
        { key: 'resources', label: 'Recursos', count: results?.resources.length || 0 },
        { key: 'tutoring', label: 'Tutorías', count: results?.tutoring.length || 0 },
    ];

    const typeLabels: Record<string, string> = { pdf: 'PDF', resumen: 'Resumen', presentacion: 'Presentación', guia: 'Guía', examen: 'Examen', otro: 'Otro' };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Buscar</h1>
                <p className="text-sm text-muted-foreground">Encuentra usuarios, profesores, recursos y tutorías</p>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="¿Qué estás buscando?"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="pl-10"
                    />
                </div>
                <Button onClick={handleSearch} disabled={loading || query.trim().length < 2}>
                    {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : 'Buscar'}
                </Button>
            </div>

            {results && (
                <>
                    <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {activeTab === 'users' && results.users.map((u) => (
                            <Link to={`/profile/${u.id}`} key={u.id}>
                                <Card className="transition-all hover:border-primary/30">
                                    <CardContent className="flex items-center gap-4 py-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                                            {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full rounded-xl object-cover" /> : <UserIcon className="h-6 w-6 text-primary" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{u.full_name}</p>
                                            <p className="text-xs text-muted-foreground">{u.email}</p>
                                        </div>
                                        {u.career && <Badge variant="secondary">{u.career.name}</Badge>}
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}

                        {activeTab === 'professors' && results.professors.map((p) => (
                            <Link to={`/professors/${p.id}`} key={p.id}>
                                <Card className="transition-all hover:border-primary/30">
                                    <CardContent className="flex items-center gap-4 py-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                                            <GraduationCapIcon className="h-6 w-6 text-amber-500" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{p.full_name}</p>
                                            <p className="text-xs text-muted-foreground">{p.department}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-1">
                                                <StarIcon className="h-4 w-4 fill-amber-500 text-amber-500" />
                                                <span className="font-semibold">{Number(p.avg_rating).toFixed(1)}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{p.total_reviews} evaluaciones</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}

                        {activeTab === 'resources' && results.resources.map((r) => (
                            <Card key={r.id} className="transition-all hover:border-primary/30">
                                <CardContent className="flex items-center gap-4 py-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                                        <BookOpenIcon className="h-6 w-6 text-emerald-500" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">{r.title}</p>
                                        <p className="text-xs text-muted-foreground">{r.subject_name}</p>
                                    </div>
                                    <Badge variant="secondary">{typeLabels[r.resource_type] || r.resource_type}</Badge>
                                </CardContent>
                            </Card>
                        ))}

                        {activeTab === 'tutoring' && results.tutoring.map((t) => (
                            <Card key={t.id} className="transition-all hover:border-primary/30">
                                <CardContent className="flex items-center gap-4 py-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
                                        <GraduationCapIcon className="h-6 w-6 text-violet-500" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">{t.subject_name}</p>
                                        <p className="text-xs text-muted-foreground">Tutor: {t.tutor?.full_name}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {results[activeTab].length === 0 && (
                            <div className="py-12 text-center">
                                <p className="text-muted-foreground">No se encontraron resultados en esta categoría</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
