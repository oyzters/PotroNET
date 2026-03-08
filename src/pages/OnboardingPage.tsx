import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    GraduationCapIcon, UserIcon, SparklesIcon, CheckIcon, ArrowRightIcon, SearchIcon, LoaderIcon,
} from 'lucide-react';

interface Career { id: string; name: string }

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function OnboardingPage() {
    const { session, profile, refreshProfile } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(0);
    const [careers, setCareers] = useState<Career[]>([]);
    const [careerId, setCareerId] = useState('');
    const [careerSearch, setCareerSearch] = useState('');
    const [semester, setSemester] = useState(1);
    const [bio, setBio] = useState('');
    const [interestsText, setInterestsText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // If profile already has career, redirect to feed
    useEffect(() => {
        if (profile?.career_id) navigate('/feed', { replace: true });
    }, [profile?.career_id, navigate]);

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

    const handleSubmit = async () => {
        if (!session?.access_token || !profile?.id || !careerId) return;
        setSubmitting(true);
        try {
            const interests = interestsText.split(',').map(i => i.trim()).filter(Boolean);
            await api(`/profiles/${profile.id}`, {
                method: 'PATCH',
                token: session.access_token,
                body: JSON.stringify({
                    career_id: careerId,
                    semester,
                    bio: bio.trim(),
                    interests,
                }),
            });
            await refreshProfile();
            navigate('/feed', { replace: true });
        } catch { /* silent */ } finally { setSubmitting(false); }
    };

    const selectedCareer = careers.find(c => c.id === careerId);

    // Debounced search with loading state
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (!careerSearch.trim()) {
            setDebouncedSearch('');
            setSearching(false);
            return;
        }
        setSearching(true);
        const timer = setTimeout(() => {
            setDebouncedSearch(careerSearch);
            setSearching(false);
        }, 400);
        return () => clearTimeout(timer);
    }, [careerSearch]);

    const filteredCareers = debouncedSearch.trim()
        ? careers.filter(c => c.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
        : [];

    const steps = [
        {
            icon: GraduationCapIcon,
            title: '¿Qué carrera estudias?',
            subtitle: 'Busca y selecciona tu carrera',
            content: (
                <div className="space-y-4">
                    {/* Selected career badge */}
                    {selectedCareer && (
                        <div className="flex items-center gap-2 rounded-xl border border-primary bg-primary/10 p-3">
                            <GraduationCapIcon className="h-5 w-5 text-primary" />
                            <span className="flex-1 text-sm font-medium text-primary">{selectedCareer.name}</span>
                            <button onClick={() => { setCareerId(''); setCareerSearch(''); }}
                                className="rounded-md p-1 text-primary hover:bg-primary/20">
                                <CheckIcon className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Search input */}
                    {!careerId && (
                        <>
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Escribe el nombre de tu carrera..."
                                    value={careerSearch}
                                    onChange={e => setCareerSearch(e.target.value)}
                                    className="pl-10"
                                    autoFocus
                                />
                            </div>

                            {/* Loading spinner */}
                            {searching && (
                                <div className="flex items-center justify-center py-6">
                                    <LoaderIcon className="h-5 w-5 animate-spin text-primary" />
                                    <span className="ml-2 text-sm text-muted-foreground">Buscando carreras...</span>
                                </div>
                            )}

                            {/* Filtered results */}
                            {!searching && filteredCareers.length > 0 && (
                                <div className="grid gap-2 max-h-60 overflow-y-auto animate-in fade-in-0 slide-in-from-top-2 duration-300">
                                    {filteredCareers.map((c, i) => (
                                        <button key={c.id} onClick={() => { setCareerId(c.id); setCareerSearch(''); }}
                                            className="rounded-xl border border-border p-4 text-left text-sm font-medium transition-all hover:border-primary/30 hover:bg-accent animate-in fade-in-0 slide-in-from-bottom-1"
                                            style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <GraduationCapIcon className="h-5 w-5 text-muted-foreground" />
                                                {c.name}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* No results */}
                            {!searching && debouncedSearch.trim() && filteredCareers.length === 0 && (
                                <p className="text-center text-sm text-muted-foreground py-4 animate-in fade-in-0 duration-300">
                                    No se encontraron carreras con "{debouncedSearch}"
                                </p>
                            )}

                            {/* Hint */}
                            {!careerSearch.trim() && (
                                <p className="text-center text-xs text-muted-foreground py-2">
                                    Empieza a escribir para ver las carreras disponibles
                                </p>
                            )}
                        </>
                    )}

                    {/* Semester selector */}
                    {careerId && (
                        <div className="pt-2">
                            <label className="mb-2 block text-sm font-medium">Semestre actual</label>
                            <div className="flex flex-wrap gap-2">
                                {SEMESTERS.map(s => (
                                    <button key={s} onClick={() => setSemester(s)}
                                        className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-all ${semester === s
                                            ? 'bg-primary text-primary-foreground shadow-md'
                                            : 'border border-border hover:border-primary/30'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ),
            canNext: !!careerId,
        },
        {
            icon: UserIcon,
            title: 'Cuéntanos de ti',
            subtitle: 'Escribe una breve descripción sobre ti',
            content: (
                <div className="space-y-4">
                    <Textarea
                        placeholder="Ej: Soy estudiante de ISW, me gusta el desarrollo web y los videojuegos..."
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        maxLength={300}
                        className="min-h-[120px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
                </div>
            ),
            canNext: true, // bio is optional
        },
        {
            icon: SparklesIcon,
            title: '¿Cuáles son tus intereses?',
            subtitle: 'Sepáralos con comas (opcional)',
            content: (
                <div className="space-y-4">
                    <Input
                        placeholder="Ej: Programación, IA, Diseño, Música, Deportes"
                        value={interestsText}
                        onChange={e => setInterestsText(e.target.value)}
                    />
                    {interestsText && (
                        <div className="flex flex-wrap gap-2">
                            {interestsText.split(',').map((i, idx) => i.trim() && (
                                <span key={idx} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{i.trim()}</span>
                            ))}
                        </div>
                    )}
                </div>
            ),
            canNext: true,
        },
    ];

    const currentStep = steps[step];
    const Icon = currentStep.icon;
    const isLast = step === steps.length - 1;

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-lg">
                {/* Progress */}
                <div className="mb-8 flex justify-center gap-2">
                    {steps.map((_, i) => (
                        <div key={i} className={`h-1.5 w-12 rounded-full transition-all ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
                    ))}
                </div>

                <Card className="border-border/50 shadow-xl shadow-primary/5">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                            <Icon className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-xl">{currentStep.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {currentStep.content}

                        <div className="flex gap-3 pt-2">
                            {step > 0 && (
                                <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
                                    Anterior
                                </Button>
                            )}
                            <Button
                                className="flex-1"
                                disabled={!currentStep.canNext || (isLast && submitting)}
                                onClick={isLast ? handleSubmit : () => setStep(step + 1)}
                            >
                                {submitting ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                ) : isLast ? (
                                    <>
                                        <CheckIcon className="mr-1 h-4 w-4" /> Completar Perfil
                                    </>
                                ) : (
                                    <>
                                        Siguiente <ArrowRightIcon className="ml-1 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                    Puedes cambiar esto después en tu perfil
                </p>
            </div>
        </div>
    );
}
