import { Link } from 'react-router-dom';
import { UserPlusIcon, UserIcon } from 'lucide-react';
import { FeedWidgetCard } from './FeedWidgetCard';

interface NewUser {
    id: string;
    full_name: string;
    avatar_url: string;
}

export function NewUsersCard({ users }: { users: NewUser[] }) {
    if (users.length === 0) return null;

    return (
        <FeedWidgetCard
            accentColor=""
            bgTint="bg-muted/30"
            icon={<UserPlusIcon className="h-4 w-4 text-muted-foreground" />}
            title="Sugerencias para ti"
        >
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
                {users.map(u => (
                    <Link key={u.id} to={`/profile/${u.id}`} className="flex flex-col items-center gap-1.5 shrink-0 group">
                        <div className="h-14 w-14 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                            {u.avatar_url
                                ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                                : <UserIcon className="h-6 w-6 text-muted-foreground" />}
                        </div>
                        <p className="text-[11px] font-medium truncate max-w-[60px] text-center">{u.full_name.split(' ')[0]}</p>
                    </Link>
                ))}
            </div>
        </FeedWidgetCard>
    );
}
