import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThumbsUpIcon, TrashIcon, UserIcon, MessageCircleIcon, ShareIcon, MoreHorizontalIcon } from 'lucide-react';

interface Author {
    id: string;
    full_name: string;
    avatar_url: string;
    email: string;
}

interface Publication {
    id: string;
    content: string;
    tags: string[];
    likes_count: number;
    created_at: string;
    author: Author;
}

interface PublicationCardProps {
    publication: Publication;
    currentUserId?: string;
    onLike?: (id: string) => void;
    onDelete?: (id: string) => void;
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export function PublicationCard({
    publication,
    currentUserId,
    onLike,
    onDelete,
}: PublicationCardProps) {
    const { author } = publication;
    const isOwner = currentUserId === author.id;

    return (
        <article className="border-b border-border/50 bg-background py-4 flex flex-col gap-3 md:rounded-xl md:border md:p-5 md:shadow-sm md:mb-4">
            {/* Header */}
            <div className="flex items-center justify-between px-4 md:px-0">
                <div className="flex items-center gap-3">
                    <Link
                        to={`/profile/${author.id}`}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-transform active:scale-95"
                    >
                        {author.avatar_url ? (
                            <img
                                src={author.avatar_url}
                                alt={author.full_name}
                                className="h-10 w-10 rounded-full object-cover"
                            />
                        ) : (
                            <UserIcon className="h-5 w-5 text-primary" />
                        )}
                    </Link>
                    <div className="flex flex-col">
                        <Link
                            to={`/profile/${author.id}`}
                            className="text-sm font-bold hover:underline"
                        >
                            {author.full_name}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                            {timeAgo(publication.created_at)} {publication.id.startsWith('edited-') && '· Editado'}
                        </span>
                    </div>
                </div>

                <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8">
                    <MoreHorizontalIcon className="h-5 w-5" />
                </Button>
            </div>

            {/* Content */}
            <div className="px-4 md:px-0">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {publication.content}
                </p>

                {/* Tags */}
                {publication.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {publication.tags.map((tag) => (
                            <Link key={tag} to={`/search?q=${tag}`}>
                                <Badge variant="secondary" className="text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer border-transparent">
                                    #{tag}
                                </Badge>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="mt-1 flex items-center justify-between px-2 md:px-0">
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-blue-500 rounded-full active:scale-95 transition-transform"
                        onClick={() => onLike?.(publication.id)}
                    >
                        <ThumbsUpIcon className={`h-6 w-6 ${publication.likes_count > 0 ? 'fill-blue-500 text-blue-500' : ''}`} />
                    </Button>
                    <Link to={`/post/${publication.id}`}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-muted-foreground hover:text-foreground rounded-full active:scale-95 transition-transform"
                        >
                            <MessageCircleIcon className="h-6 w-6" />
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-foreground rounded-full active:scale-95 transition-transform"
                    >
                        <ShareIcon className="h-6 w-6" />
                    </Button>
                </div>

                {/* Right side actions, like delete */}
                <div>
                    {isOwner && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-muted-foreground hover:text-destructive rounded-full"
                            onClick={() => onDelete?.(publication.id)}
                        >
                            <TrashIcon className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Likes count */}
            <div className="px-4 md:px-0">
                <span className="text-sm font-bold">
                    {publication.likes_count} {publication.likes_count === 1 ? 'Like' : 'Likes'}
                </span>
                <p className="text-sm text-muted-foreground mt-1 cursor-pointer hover:underline">
                    Ver comentarios
                </p>
            </div>
        </article>
    );
}
