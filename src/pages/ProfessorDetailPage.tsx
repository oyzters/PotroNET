import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    StarIcon, ArrowLeftIcon, CheckIcon, XIcon,
} from 'lucide-react';

interface Career { id: string; name: string }
interface Professor {
    id: string; full_name: string; department: string; avg_rating: number;
    total_reviews: number; career: Career | null;
}
interface Review {
    id: string; teaching_quality: number; clarity: number; student_treatment: number;
    exam_difficulty: number; overall_rating: number; qualities: string[];
    weaknesses: string[]; comment: string; subject_name: string; created_at: string;
}

const QUALITIES = ['explica claramente', 'domina la materia', 'accesible para dudas', 'clases dinámicas', 'puntual', 'justo al evaluar', 'motiva al estudiante', 'material de apoyo'];
const WEAKNESSES_LIST = ['evalúa muy difícil', 'poca disponibilidad', 'mala organización', 'clases aburridas', 'impuntual', 'injusto al calificar', 'no responde dudas', 'material insuficiente'];

// Function to generate Dicebear avatar
function getAvatarUrl(name: string) {
    return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=f8fafc`;
}

export function ProfessorDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { session } = useAuth();
    const [professor, setProfessor] = useState<Professor | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [topQualities, setTopQualities] = useState<[string, number][]>([]);
    const [topWeaknesses, setTopWeaknesses] = useState<[string, number][]>([]);
    const [loading, setLoading] = useState(true);

    // Review form
    const [showForm, setShowForm] = useState(false);
    const [ratings, setRatings] = useState({ teaching_quality: 0, clarity: 0, student_treatment: 0, exam_difficulty: 0 });
    const [selectedQualities, setSelectedQualities] = useState<string[]>([]);
    const [selectedWeaknesses, setSelectedWeaknesses] = useState<string[]>([]);
    const [comment, setComment] = useState('');
    const [subjectName, setSubjectName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!session?.access_token || !id) return;
            setLoading(true);
            try {
                const data = await api<{ professor: Professor; reviews: Review[]; aggregated: { topQualities: [string, number][]; topWeaknesses: [string, number][] } }>(`/professors/${id}`, { token: session.access_token });
                setProfessor(data.professor);
                setReviews(data.reviews);
                setTopQualities(data.aggregated.topQualities);
                setTopWeaknesses(data.aggregated.topWeaknesses);
            } catch { /* silent */ } finally { setLoading(false); }
        };
        fetchData();
    }, [id, session?.access_token]);

    const handleSubmit = async () => {
        if (!session?.access_token) return;
        setSubmitting(true);
        try {
            await api('/professors/reviews', {
                method: 'POST', token: session.access_token,
                body: JSON.stringify({ professor_id: id, ...ratings, qualities: selectedQualities, weaknesses: selectedWeaknesses, comment, subject_name: subjectName }),
            });
            // Refresh data
            const data = await api<{ professor: Professor; reviews: Review[]; aggregated: { topQualities: [string, number][]; topWeaknesses: [string, number][] } }>(`/professors/${id}`, { token: session.access_token });
            setProfessor(data.professor);
            setReviews(data.reviews);
            setTopQualities(data.aggregated.topQualities);
            setTopWeaknesses(data.aggregated.topWeaknesses);
            setShowForm(false);
        } catch { /* silent */ } finally { setSubmitting(false); }
    };

    const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
        <div className="flex items-center justify-between">
            <span className="text-sm">{label}</span>
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                    <button key={i} type="button" onClick={() => onChange(i)} className="transition-transform hover:scale-110">
                        <StarIcon className={`h-6 w-6 ${i <= value ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'}`} />
                    </button>
                ))}
            </div>
        </div>
    );

    const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
        setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
    };

    if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
    if (!professor) return <div className="py-20 text-center"><p className="text-muted-foreground">Profesor no encontrado</p></div>;

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md pt-4 pb-2 px-4 md:px-0 border-b border-border/50">
                <Link to="/professors" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeftIcon className="h-4 w-4" /> Volver a Profesores
                </Link>
            </div>

            {/* Profile Header */}
            <div className="flex flex-col items-center text-center px-4 md:px-0 mt-4 md:mt-8">
                <div className="flex h-24 w-24 shrink-0 overflow-hidden items-center justify-center rounded-full bg-primary/10 border border-primary/20 shadow-xl mb-4">
                    <img src={getAvatarUrl(professor.full_name)} alt={professor.full_name} className="h-full w-full object-cover mix-blend-multiply" />
                </div>
                
                <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                    {professor.full_name}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">{professor.department || 'Sin departamento'}</p>
                {professor.career && <Badge variant="secondary" className="mt-2 bg-secondary/60">{professor.career.name}</Badge>}

                {/* Unified Stats */}
                <div className="flex gap-8 mt-6 w-full justify-center">
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-black text-amber-600 dark:text-amber-500">
                            {Number(professor.avg_rating).toFixed(1)}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">
                            Calificación
                        </span>
                    </div>
                    <div className="w-px bg-border"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-black">
                            {professor.total_reviews}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">
                            Reseñas
                        </span>
                    </div>
                </div>

                <Button 
                    onClick={() => setShowForm(!showForm)} 
                    variant={showForm ? 'outline' : 'default'}
                    className={`mt-8 w-full md:w-auto min-w-[200px] rounded-full h-11 font-semibold text-md transition-all ${
                        !showForm ? 'shadow-neon-primary' : ''
                    }`}
                >
                    {showForm ? 'Cerrar Formulario' : 'Evaluar Profesor'}
                </Button>
            </div>

            {/* Review form */}
            {showForm && (
                <Card className="border-primary/30">
                    <CardHeader><CardTitle className="text-base">Tu evaluación (anónima)</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <input placeholder="Materia (opcional)" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                        <div className="space-y-3 rounded-lg border border-border p-4">
                            <StarRating label="Calidad de enseñanza" value={ratings.teaching_quality} onChange={v => setRatings(r => ({ ...r, teaching_quality: v }))} />
                            <StarRating label="Claridad al explicar" value={ratings.clarity} onChange={v => setRatings(r => ({ ...r, clarity: v }))} />
                            <StarRating label="Trato con estudiantes" value={ratings.student_treatment} onChange={v => setRatings(r => ({ ...r, student_treatment: v }))} />
                            <StarRating label="Dificultad de evaluaciones" value={ratings.exam_difficulty} onChange={v => setRatings(r => ({ ...r, exam_difficulty: v }))} />
                        </div>
                        <div>
                            <p className="mb-2 text-sm font-medium text-emerald-500">Cualidades</p>
                            <div className="flex flex-wrap gap-2">{QUALITIES.map(q => (
                                <Badge key={q} variant={selectedQualities.includes(q) ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => toggleItem(selectedQualities, setSelectedQualities, q)}>
                                    {selectedQualities.includes(q) && <CheckIcon className="mr-1 h-3 w-3" />}{q}
                                </Badge>
                            ))}</div>
                        </div>
                        <div>
                            <p className="mb-2 text-sm font-medium text-red-400">Debilidades</p>
                            <div className="flex flex-wrap gap-2">{WEAKNESSES_LIST.map(w => (
                                <Badge key={w} variant={selectedWeaknesses.includes(w) ? 'destructive' : 'secondary'} className="cursor-pointer" onClick={() => toggleItem(selectedWeaknesses, setSelectedWeaknesses, w)}>
                                    {selectedWeaknesses.includes(w) && <XIcon className="mr-1 h-3 w-3" />}{w}
                                </Badge>
                            ))}</div>
                        </div>
                        <Textarea placeholder="Comentario (opcional)" value={comment} onChange={e => setComment(e.target.value)} maxLength={500} />
                        <Button onClick={handleSubmit} disabled={submitting || Object.values(ratings).some(v => v === 0)}>
                            {submitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : 'Enviar Evaluación'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Aggregated info */}
            <div className="grid gap-4 md:grid-cols-2">
                {topQualities.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckIcon className="h-5 w-5 text-emerald-500" /> Cualidades destacadas</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2">{topQualities.map(([q, count]) => (
                                <div key={q} className="flex items-center justify-between"><span className="text-sm">{q}</span><Badge variant="secondary">{count}</Badge></div>
                            ))}</div>
                        </CardContent>
                    </Card>
                )}
                {topWeaknesses.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><XIcon className="h-5 w-5 text-red-400" /> Debilidades mencionadas</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2">{topWeaknesses.map(([w, count]) => (
                                <div key={w} className="flex items-center justify-between"><span className="text-sm">{w}</span><Badge variant="secondary">{count}</Badge></div>
                            ))}</div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Reviews */}
            <div className="px-4 md:px-0">
                <h3 className="text-lg font-bold mb-4">Evaluaciones ({reviews.length})</h3>
                <div className="space-y-4">
                    {reviews.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border py-12 text-center">
                            <p className="text-muted-foreground text-sm">Aún no hay evaluaciones. ¡Sé el primero!</p>
                        </div>
                    ) : reviews.map(r => (
                        <div key={r.id} className="rounded-xl bg-card p-5 border border-border shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                        <span className="text-xs font-bold text-amber-600 dark:text-amber-500">
                                            {Number(r.overall_rating).toFixed(1)}
                                        </span>
                                    </div>
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {new Date(r.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                            {r.subject_name && <p className="text-xs font-semibold text-primary/80 mb-2 uppercase tracking-wide">{r.subject_name}</p>}
                            {r.comment && <p className="text-sm leading-relaxed mb-4">{r.comment}</p>}
                            
                            {(r.qualities?.length > 0 || r.weaknesses?.length > 0) && (
                                <div className="flex flex-wrap gap-1.5 mt-2 pt-3 border-t border-border/50">
                                    {r.qualities?.map(q => <Badge key={q} variant="secondary" className="text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 text-[10px] px-2 h-5 border-0">{q}</Badge>)}
                                    {r.weaknesses?.map(w => <Badge key={w} variant="secondary" className="text-red-400 bg-red-400/10 hover:bg-red-400/20 text-[10px] px-2 h-5 border-0">{w}</Badge>)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
