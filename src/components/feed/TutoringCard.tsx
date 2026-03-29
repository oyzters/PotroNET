import { Link } from 'react-router-dom';
import { BookOpenIcon, UserIcon } from 'lucide-react';
import { FeedWidgetCard } from './FeedWidgetCard';

interface TutoringOffer {
    id: string;
    subject_name: string;
    description: string;
    tutor: {
        id: string;
        full_name: string;
        avatar_url: string;
    };
}

export function TutoringCard({ offers }: { offers: TutoringOffer[] }) {
    if (offers.length === 0) return null;

    return (
        <FeedWidgetCard
            accentColor=""
            bgTint="bg-muted/30"
            icon={<BookOpenIcon className="h-4 w-4 text-blue-500" />}
            title="Tutorías disponibles"
            ctaLabel="Ver todas las tutorías"
            ctaTo="/tutoring"
        >
            <div className="space-y-2">
                {offers.slice(0, 3).map(o => (
                    <Link key={o.id} to="/tutoring" className="flex items-center gap-3 rounded-lg p-2 -mx-1 hover:bg-blue-500/5 transition-colors">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 overflow-hidden">
                            {o.tutor.avatar_url
                                ? <img src={o.tutor.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                                : <UserIcon className="h-4 w-4 text-blue-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold truncate">{o.subject_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">por {o.tutor.full_name}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </FeedWidgetCard>
    );
}
