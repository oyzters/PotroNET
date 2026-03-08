import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HeartIcon, TrashIcon, UserIcon } from 'lucide-react';

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
        <Card className="transition-all duration-200 hover:shadow-md">
            <CardContent className="pt-6">
                <div className="flex gap-3">
                    {/* Avatar */}
                    <Link
                        to={`/profile/${author.id}`}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-transform hover:scale-105"
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

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <Link
                                to={`/profile/${author.id}`}
                                className="truncate text-sm font-semibold hover:underline"
                            >
                                {author.full_name}
                            </Link>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">
                                {timeAgo(publication.created_at)}
                            </span>
                        </div>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                            {publication.content}
                        </p>

                        {/* Tags */}
                        {publication.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                                {publication.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                        #{tag}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="mt-3 flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 text-muted-foreground hover:text-primary"
                                onClick={() => onLike?.(publication.id)}
                            >
                                <HeartIcon className="h-4 w-4" />
                                <span className="text-xs">{publication.likes_count}</span>
                            </Button>

                            {isOwner && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-auto h-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => onDelete?.(publication.id)}
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
