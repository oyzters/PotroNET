import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { SearchIcon, UserIcon, GraduationCapIcon, BookOpenIcon, StarIcon, ClockIcon, XIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const RECENT_SEARCHES_KEY = 'potronet-recent-searches';
const MAX_RECENT = 8;

function loadRecentSearches(): string[] {
    try {
        return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
    } catch { return []; }
}

function saveRecentSearches(searches: string[]) {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
}

interface SearchResults {
    users?: Array<{ id: string; full_name: string; avatar_url: string; email: string; career: { id: string; name: string } | null }>;
    professors?: Array<{ id: string; full_name: string; department: string; avg_rating: number; total_reviews: number; career: { id: string; name: string } | null }>;
    resources?: Array<{ id: string; title: string; resource_type: string; subject_name: string; career: { id: string; name: string } | null }>;
    tutoring?: Array<{ id: string; subject_name: string; description: string; tutor: { id: string; full_name: string; avatar_url?: string } }>;
}

type TabKey = 'students' | 'professors' | 'tutoring';

export function SearchPage() {
    const { session } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('students');
    const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const addRecentSearch = useCallback((q: string) => {
        const trimmed = q.trim();
        if (!trimmed || trimmed.length < 2) return;
        setRecentSearches(prev => {
            const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
            const updated = [trimmed, ...filtered].slice(0, MAX_RECENT);
            saveRecentSearches(updated);
            return updated;
        });
    }, []);

    const removeRecentSearch = useCallback((q: string) => {
        setRecentSearches(prev => {
            const updated = prev.filter(s => s !== q);
            saveRecentSearches(updated);
            return updated;
        });
    }, []);

    const clearRecentSearches = useCallback(() => {
        setRecentSearches([]);
        saveRecentSearches([]);
    }, []);

    const performSearch = useCallback(async (q: string) => {
        if (!session?.access_token || q.trim().length < 2) return;
        setLoading(true);
        addRecentSearch(q);
        try {
            const data = await api<SearchResults>(`/search?q=${encodeURIComponent(q.trim())}`, {
                token: session.access_token,
            });
            setResults(data);
            // Auto-select first tab with results
            if (data.users && data.users.length > 0) setActiveTab('students');
            else if (data.professors && data.professors.length > 0) setActiveTab('professors');
            else if (data.tutoring && data.tutoring.length > 0) setActiveTab('tutoring');
        } catch {
            // Silent error
        } finally {
            setLoading(false);
        }
    }, [session?.access_token, addRecentSearch]);

    const handleInputChange = (value: string) => {
        setQuery(value);
        if (value.trim().length === 0) {
            setResults(null);
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => performSearch(value), 300);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            performSearch(query);
        }
    };

    const tabs: { key: TabKey; label: string; count: number }[] = [
        { key: 'students', label: 'Estudiantes', count: results?.users?.length || 0 },
        { key: 'professors', label: 'Profesores', count: results?.professors?.length || 0 },
        { key: 'tutoring', label: 'Tutorías', count: results?.tutoring?.length || 0 },
    ];

    const visibleTabs = tabs.filter(t => t.count > 0);
    const showExplore = !results && query.trim().length === 0;

    const noResults = results && (results.users?.length || 0) === 0 && (results.professors?.length || 0) === 0 && (results.tutoring?.length || 0) === 0;

    return (
        <div className="min-h-dvh pb-4">
            {/* Search Bar */}
            <div className="px-4 pt-4 pb-2">
                <div className="relative flex items-center bg-muted/50 rounded-xl">
                    <SearchIcon className="absolute left-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Buscar en PotroNET..."
                        value={query}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm pl-10 pr-10 py-3 w-full rounded-xl"
                    />
                    {loading && (
                        <div className="absolute right-3">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Searches */}
            {showExplore && recentSearches.length > 0 && (
                <div className="pt-3 pb-1">
                    <div className="flex items-center justify-between px-4 mb-1">
                        <h3 className="text-base font-semibold">Búsquedas recientes</h3>
                        <button
                            onClick={clearRecentSearches}
                            className="text-sm text-primary font-medium"
                        >
                            Borrar todo
                        </button>
                    </div>
                    <div className="px-2">
                        {recentSearches.map((s) => (
                            <div key={s} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                                <ClockIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                <button
                                    className="flex-1 text-left text-sm font-medium truncate"
                                    onClick={() => {
                                        setQuery(s);
                                        performSearch(s);
                                    }}
                                >
                                    {s}
                                </button>
                                <button
                                    onClick={() => removeRecentSearch(s)}
                                    className="p-1 rounded-full hover:bg-muted text-muted-foreground shrink-0"
                                >
                                    <XIcon className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Results Mode */}
            {results && !noResults && (
                <div className="pt-2">
                    {/* Tab bar */}
                    {visibleTabs.length > 1 && (
                        <div className="flex gap-1 px-4 pb-3">
                            {visibleTabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                        activeTab === tab.key
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Flat result list */}
                    <div className="px-4">
                        {activeTab === 'students' && results.users?.map((u) => (
                            <Link to={`/profile/${u.id}`} key={u.id} className="flex items-center gap-3 py-3 border-b border-border/50">
                                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserIcon className="h-5 w-5 text-primary" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{u.full_name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{u.career?.name || u.email}</p>
                                </div>
                            </Link>
                        ))}

                        {activeTab === 'professors' && results.professors?.map((p) => (
                            <Link to={`/professors/${p.id}`} key={p.id} className="flex items-center gap-3 py-3 border-b border-border/50">
                                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0">
                                    <GraduationCapIcon className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{p.full_name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{p.department}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <StarIcon className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                    <span className="text-sm font-medium">{Number(p.avg_rating).toFixed(1)}</span>
                                </div>
                            </Link>
                        ))}

                        {activeTab === 'tutoring' && results.tutoring?.map((t) => (
                            <Link to={`/profile/${t.tutor.id}`} key={t.id} className="flex items-center gap-3 py-3 border-b border-border/50">
                                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
                                    <BookOpenIcon className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{t.subject_name}</p>
                                    <p className="text-xs text-muted-foreground truncate">Tutor: {t.tutor.full_name}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* No results */}
            {noResults && (
                <div className="text-center py-16 px-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-muted/20 rounded-full mb-3">
                        <SearchIcon className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">No se encontraron resultados</h3>
                    <p className="text-sm text-muted-foreground">Intenta con otros términos de búsqueda.</p>
                </div>
            )}

            {/* Typing but not enough chars */}
            {!results && !showExplore && !loading && (
                <div className="text-center py-16 px-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-muted/20 rounded-full mb-3">
                        <SearchIcon className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">Busca en PotroNET</h3>
                    <p className="text-sm text-muted-foreground">Escribe al menos 2 caracteres para buscar.</p>
                </div>
            )}
        </div>
    );
}

