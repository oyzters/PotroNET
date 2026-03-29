import { Link } from 'react-router-dom';
import { TrophyIcon, UserIcon } from 'lucide-react';
import { FeedWidgetCard } from './FeedWidgetCard';

interface RankingUser {
    id: string;
    full_name: string;
    avatar_url: string;
    popularity_score: number;
    followers_count: number;
}

function Avatar({ url, size, className = '' }: { url: string; size: string; className?: string }) {
    return (
        <div className={`rounded-full overflow-hidden bg-primary/10 flex items-center justify-center ${size} ${className}`}>
            {url
                ? <img src={url} alt="" className="h-full w-full object-cover" />
                : <UserIcon className="h-5 w-5 text-primary" />}
        </div>
    );
}

export function RankingCard({ users }: { users: RankingUser[] }) {
    if (users.length === 0) return null;

    const top3 = users.slice(0, 3);
    const first = top3[0];
    const second = top3[1];
    const third = top3[2];

    return (
        <FeedWidgetCard
            accentColor=""
            bgTint="bg-muted/30"
            icon={<TrophyIcon className="h-4 w-4 text-amber-500" />}
            title="Ranking de la comunidad"
            ctaLabel="Ver ranking completo"
            ctaTo="/rankings"
        >
            <div className="flex items-end justify-center gap-3">
                {/* #2 — left */}
                {second && (
                    <Link to={`/profile/${second.id}`} className="flex flex-col items-center gap-1 group">
                        <div className="relative">
                            <Avatar url={second.avatar_url} size="h-11 w-11" className="border-2 border-gray-300" />
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold">2</span>
                        </div>
                        <p className="text-[11px] font-semibold truncate max-w-[70px] group-hover:text-primary transition-colors">{second.full_name.split(' ')[0]}</p>
                        <p className="text-[10px] text-muted-foreground">{second.followers_count} seg.</p>
                    </Link>
                )}

                {/* #1 — center, elevated */}
                {first && (
                    <Link to={`/profile/${first.id}`} className="flex flex-col items-center gap-1 group -mt-2">
                        <span className="text-lg leading-none mb-0.5">👑</span>
                        <div className="relative rounded-full p-[2px] bg-gradient-to-br from-amber-300 to-amber-600">
                            <Avatar url={first.avatar_url} size="h-16 w-16" className="border-2 border-background" />
                        </div>
                        <p className="text-[12px] font-bold truncate max-w-[80px] group-hover:text-primary transition-colors">{first.full_name.split(' ')[0]}</p>
                        <p className="text-[10px] text-muted-foreground">{first.followers_count} seg.</p>
                    </Link>
                )}

                {/* #3 — right */}
                {third && (
                    <Link to={`/profile/${third.id}`} className="flex flex-col items-center gap-1 group">
                        <div className="relative">
                            <Avatar url={third.avatar_url} size="h-11 w-11" className="border-2 border-amber-700/40" />
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-800/20 text-amber-700 text-[10px] font-bold">3</span>
                        </div>
                        <p className="text-[11px] font-semibold truncate max-w-[70px] group-hover:text-primary transition-colors">{third.full_name.split(' ')[0]}</p>
                        <p className="text-[10px] text-muted-foreground">{third.followers_count} seg.</p>
                    </Link>
                )}
            </div>
        </FeedWidgetCard>
    );
}
