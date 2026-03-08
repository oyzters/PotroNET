import { useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SendIcon, HashIcon, XIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CreatePostProps {
    onPost: (content: string, tags: string[]) => Promise<void>;
}

export function CreatePost({ onPost }: CreatePostProps) {
    const { profile } = useAuth();
    const [content, setContent] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const addTag = () => {
        const tag = tagInput.trim().toLowerCase().replace(/[^a-záéíóúñ0-9]/g, '');
        if (tag && !tags.includes(tag) && tags.length < 5) {
            setTags([...tags, tag]);
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setTags(tags.filter((t) => t !== tag));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!content.trim() || loading) return;

        setLoading(true);
        try {
            await onPost(content.trim(), tags);
            setContent('');
            setTags([]);
        } catch {
            // Error handled by parent
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit}>
                    <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <span className="text-sm font-bold text-primary">
                                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                        </div>
                        <div className="flex-1 space-y-3">
                            <Textarea
                                placeholder="¿Qué está pasando en tu vida académica?"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                maxLength={500}
                                className="min-h-[80px] resize-none"
                            />
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    {content.length}/500
                                </p>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap items-center gap-2">
                                {tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="gap-1">
                                        #{tag}
                                        <button type="button" onClick={() => removeTag(tag)}>
                                            <XIcon className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                                {tags.length < 5 && (
                                    <div className="flex items-center gap-1">
                                        <HashIcon className="h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Etiqueta"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addTag();
                                                }
                                            }}
                                            className="h-7 w-28 text-xs"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={!content.trim() || loading}
                                    size="sm"
                                >
                                    {loading ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                    ) : (
                                        <>
                                            <SendIcon className="mr-1 h-4 w-4" />
                                            Publicar
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
