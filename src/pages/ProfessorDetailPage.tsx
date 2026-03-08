import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    StarIcon, GraduationCapIcon, ArrowLeftIcon, CheckIcon, XIcon,
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
        <div className="space-y-6">
            <Link to="/professors" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeftIcon className="h-4 w-4" /> Volver</Link>

            {/* Header */}
            <Card>
                <CardContent className="py-6">
                    <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10"><GraduationCapIcon className="h-8 w-8 text-primary" /></div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold">{professor.full_name}</h1>
                            {professor.department && <p className="text-muted-foreground">{professor.department}</p>}
                            {professor.career && <Badge variant="secondary" className="mt-1">{professor.career.name}</Badge>}
                            <div className="mt-3 flex items-center gap-3">
                                <div className="flex">{[1, 2, 3, 4, 5].map(i => <StarIcon key={i} className={`h-5 w-5 ${i <= Math.round(professor.avg_rating) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'}`} />)}</div>
                                <span className="text-xl font-bold">{Number(professor.avg_rating).toFixed(1)}</span>
                                <span className="text-sm text-muted-foreground">({professor.total_reviews} evaluaciones)</span>
                            </div>
                        </div>
                        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancelar' : 'Evaluar'}</Button>
                    </div>
                </CardContent>
            </Card>

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
            <Card>
                <CardHeader><CardTitle className="text-base">Evaluaciones ({reviews.length})</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {reviews.length === 0 ? (
                        <p className="py-8 text-center text-muted-foreground">Aún no hay evaluaciones. ¡Sé el primero!</p>
                    ) : reviews.map(r => (
                        <div key={r.id} className="rounded-lg border border-border p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map(i => <StarIcon key={i} className={`h-4 w-4 ${i <= Math.round(r.overall_rating) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'}`} />)}</div>
                                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('es-MX')}</span>
                            </div>
                            {r.subject_name && <p className="mt-1 text-xs text-primary">Materia: {r.subject_name}</p>}
                            {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                            <div className="mt-2 flex flex-wrap gap-1">
                                {r.qualities?.map(q => <Badge key={q} variant="secondary" className="text-emerald-500">{q}</Badge>)}
                                {r.weaknesses?.map(w => <Badge key={w} variant="secondary" className="text-red-400">{w}</Badge>)}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
