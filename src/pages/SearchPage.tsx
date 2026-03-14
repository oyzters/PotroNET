import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SearchIcon, UserIcon, GraduationCapIcon, BookOpenIcon, StarIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SearchResults {
    users?: Array<{ id: string; full_name: string; avatar_url: string; email: string; career: { id: string; name: string } | null }>;
    professors?: Array<{ id: string; full_name: string; department: string; avg_rating: number; total_reviews: number; career: { id: string; name: string } | null }>;
    resources?: Array<{ id: string; title: string; resource_type: string; subject_name: string; career: { id: string; name: string } | null }>;
    tutoring?: Array<{ id: string; subject_name: string; description: string; tutor: { id: string; full_name: string } }>;
    posts?: Array<any>;
    hashtags?: Array<any>;
}

type TabKey = 'students' | 'professors' | 'posts' | 'subjects' | 'hashtags';

export function SearchPage() {
    const { session } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('students');

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
        { key: 'students', label: 'Estudiantes', count: results?.users?.length || 0 },
        { key: 'professors', label: 'Profesores', count: results?.professors?.length || 0 },
        { key: 'posts', label: 'Publicaciones', count: results?.posts?.length || 0 },
        { key: 'subjects', label: 'Materias', count: results?.resources?.length || 0 },
        { key: 'hashtags', label: 'Hashtags', count: results?.hashtags?.length || 0 },
    ];

    const typeLabels: Record<string, string> = { pdf: 'PDF', resumen: 'Resumen', presentacion: 'Presentación', guia: 'Guía', examen: 'Examen', otro: 'Otro' };

    const isEmpty = () => {
        if (!results) return false;
        if (activeTab === 'posts' && (!results.posts || results.posts.length === 0)) return true;
        if (activeTab === 'hashtags' && (!results.hashtags || results.hashtags.length === 0)) return true;
        if (activeTab === 'students' && (!results.users || results.users.length === 0)) return true;
        if (activeTab === 'professors' && (!results.professors || results.professors.length === 0)) return true;
        if (activeTab === 'subjects' && (!results.resources || results.resources.length === 0)) return true;
        return false;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 dark:bg-none dark:bg-background">
            {/* Mobile Quick Access - Only visible on mobile */}
            <div className="md:hidden px-4 pt-4 pb-0">
                <div className="grid grid-cols-2 gap-3">
                    <Link to="/professors" className="bg-card/40 backdrop-blur-sm border border-border/30 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-all group">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <GraduationCapIcon className="h-5 w-5 text-amber-500" />
                        </div>
                        <span className="font-semibold text-sm text-foreground">Profesores</span>
                        <span className="text-[11px] text-muted-foreground mt-1 text-center">Explora docentes</span>
                    </Link>
                    <Link to="/tutoring" className="bg-card/40 backdrop-blur-sm border border-border/30 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-all group">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <BookOpenIcon className="h-5 w-5 text-emerald-500" />
                        </div>
                        <span className="font-semibold text-sm text-foreground">Tutorías</span>
                        <span className="text-[11px] text-muted-foreground mt-1 text-center">Ayuda académica</span>
                    </Link>
                </div>
            </div>

            {/* Hero Section */}
            <div className="px-4 md:px-8 pt-8 md:pt-12 pb-6">
                <div className="text-center max-w-4xl mx-auto">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                        Descubre en PotroNET
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base mb-8 max-w-2xl mx-auto">
                        Busca estudiantes, profesores, recursos y mucho más. Encuentra exactamente lo que necesitas para tu vida académica.
                    </p>
                    
                    {/* Modern Search Bar */}
                    <div className="relative max-w-2xl mx-auto">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
                            <div className="relative bg-background border border-border/50 rounded-2xl shadow-lg hover:shadow-xl transition-all">
                                <div className="flex items-center">
                                    <div className="pl-4 pr-3">
                                        <SearchIcon className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <Input
                                        placeholder="Busca estudiantes, profesores, materias..."
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base py-3 pl-2 pr-0 w-full"
                                    />
                                    {loading && (
                                        <div className="pr-4">
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Search Suggestions */}
                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                            {['Ingeniería', 'Matemáticas', 'Física', 'Programación'].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => setQuery(suggestion)}
                                    className="px-3 py-1 text-xs bg-muted/60 hover:bg-muted rounded-full transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Pills */}
            {results && (
                <div className="px-4 md:px-8 pb-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-wrap gap-2 justify-center">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                        activeTab === tab.key 
                                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                                            : 'bg-muted/60 hover:bg-muted text-foreground'
                                    }`}
                                >
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span className="ml-2 bg-background/20 px-2 py-0.5 rounded-full text-xs">
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Results Section */}
            {results && (
                <div className="px-4 md:px-8 pb-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="space-y-4">
                            {activeTab === 'students' && results.users?.map((u) => (
                                <Link to={`/profile/${u.id}`} key={u.id}>
                                    <div className="bg-card/40 backdrop-blur-sm border border-border/30 rounded-2xl p-6 hover:bg-card/60 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20 group-hover:border-primary/40 transition-colors">
                                                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserIcon className="h-7 w-7 text-primary" />}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background"></div>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-lg">{u.full_name}</p>
                                                <p className="text-muted-foreground text-sm">{u.career?.name || u.email}</p>
                                            </div>
                                            <Button className="rounded-full px-6">
                                                Ver perfil
                                            </Button>
                                        </div>
                                    </div>
                                </Link>
                            ))}

                            {activeTab === 'professors' && results.professors?.map((p) => (
                                <Link to={`/professors/${p.id}`} key={p.id}>
                                    <div className="bg-card/40 backdrop-blur-sm border border-border/30 rounded-2xl p-6 hover:bg-card/60 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                                                <GraduationCapIcon className="h-7 w-7 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-lg">{p.full_name}</p>
                                                <p className="text-muted-foreground text-sm">{p.department}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-1 justify-end">
                                                    <StarIcon className="h-4 w-4 fill-amber-500 text-amber-500" />
                                                    <span className="font-semibold">{Number(p.avg_rating).toFixed(1)}</span>
                                                    <span className="text-muted-foreground text-sm">({p.total_reviews})</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}

                            {activeTab === 'subjects' && results.resources?.map((r) => (
                                <div key={r.id} className="bg-card/40 backdrop-blur-sm border border-border/30 rounded-2xl p-6 hover:bg-card/60 transition-all cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                            <BookOpenIcon className="h-7 w-7 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-lg">{r.title}</p>
                                            <p className="text-muted-foreground text-sm">{r.subject_name}</p>
                                        </div>
                                        <Badge className="rounded-full px-3">{typeLabels[r.resource_type] || r.resource_type}</Badge>
                                    </div>
                                </div>
                            ))}

                            {isEmpty() && (
                                <div className="text-center py-16">
                                    <div className="inline-flex items-center justify-center w-20 h-20 bg-muted/20 rounded-full mb-4">
                                        <SearchIcon className="h-10 w-10 text-muted-foreground/50" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">No se encontraron resultados</h3>
                                    <p className="text-muted-foreground">Intenta con otros términos o explora diferentes categorías.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State - Before Search */}
            {!results && (
                <div className="px-4 md:px-8 pb-8">
                    <div className="max-w-4xl mx-auto text-center py-12">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-muted/20 rounded-full mb-6">
                            <SearchIcon className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3">Comienza tu búsqueda</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            Encuentra estudiantes, profesores, recursos académicos y mucho más. Todo lo que necesitas está aquí.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
