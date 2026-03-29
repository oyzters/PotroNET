import { Link } from 'react-router-dom';
import { StarIcon } from 'lucide-react';
import { FeedWidgetCard } from './FeedWidgetCard';

interface Professor {
    id: string;
    full_name: string;
    avg_rating: number;
    total_reviews: number;
    career?: { id: string; name: string } | null;
}

export function ProfessorSuggestionCard({ professors }: { professors: Professor[] }) {
    if (professors.length === 0) return null;

    return (
        <FeedWidgetCard
            accentColor=""
            bgTint="bg-muted/30"
            icon={<StarIcon className="h-4 w-4 text-emerald-500" />}
            title="¿Ya calificaste a tus profes?"
            ctaLabel="Calificar profesores"
            ctaTo="/professors"
        >
            <div className="space-y-2">
                {professors.slice(0, 3).map(p => (
                    <Link key={p.id} to={`/professors/${p.id}`} className="flex items-center gap-3 rounded-lg p-2 -mx-1 hover:bg-emerald-500/5 transition-colors">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-sm">
                            {p.avg_rating > 0 ? p.avg_rating.toFixed(1) : '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold truncate">{p.full_name}</p>
                            <p className="text-[10px] text-muted-foreground mb-1.5">
                                {p.total_reviews > 0 ? `${p.total_reviews} reseñas` : 'Sin reseñas aún'}
                                {p.career && ` · ${p.career.name}`}
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-emerald-500/10 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                                        style={{ width: `${(p.avg_rating / 5) * 100}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-semibold text-emerald-600 shrink-0">{p.avg_rating > 0 ? p.avg_rating.toFixed(1) : '—'}</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </FeedWidgetCard>
    );
}
