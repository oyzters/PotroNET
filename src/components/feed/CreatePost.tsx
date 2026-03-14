import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SendIcon, HashIcon, XIcon } from 'lucide-react';

interface CreatePostProps {
    onPost: (content: string, tags: string[]) => Promise<void>;
}

export function CreatePost({ onPost }: CreatePostProps) {
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
        <div className="bg-card/40 backdrop-blur-sm border border-border/30 rounded-2xl p-4 md:p-6 shadow-sm mb-6 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
                <form onSubmit={handleSubmit}>
                    <div className="flex gap-3 md:gap-4">
                        <div className="flex-1 space-y-3 md:space-y-4">
                            <Textarea
                                placeholder="¿Qué está pasando en tu vida académica?"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                maxLength={500}
                                className="min-h-[100px] resize-none border-0 bg-background/50 focus-visible:ring-1 focus-visible:ring-primary/50 rounded-xl px-4 py-3 text-base shadow-inner"
                            />
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
                                {/* Tags */}
                                <div className="flex flex-wrap items-center gap-2 flex-1">
                                    {tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="gap-1 pl-2.5 pr-1.5 py-1 bg-primary/10 text-primary hover:bg-primary/20 border-0 rounded-full transition-colors">
                                            #{tag}
                                            <button 
                                                type="button" 
                                                onClick={() => removeTag(tag)}
                                                className="ml-1 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                                            >
                                                <XIcon className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                    {tags.length < 5 && (
                                        <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-full border border-border/50 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                                            <HashIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                            <input
                                                placeholder="Agregar etiqueta..."
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addTag();
                                                    }
                                                }}
                                                className="bg-transparent border-0 p-0 text-sm focus:outline-none focus:ring-0 w-28 placeholder:text-muted-foreground/70"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 shrink-0 justify-end sm:justify-start">
                                    <span className="text-xs font-medium text-muted-foreground/70">
                                        <span className={content.length > 450 ? 'text-amber-500' : ''}>
                                            {content.length}
                                        </span>
                                        /500
                                    </span>
                                    <Button
                                        type="submit"
                                        disabled={!content.trim() || loading}
                                        className="rounded-full px-6 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all h-10"
                                    >
                                        {loading ? (
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                        ) : (
                                            <>
                                                <SendIcon className="mr-1 md:mr-2 h-4 w-4" />
                                                <span className="hidden sm:inline">Publicar</span>
                                                <span className="sm:hidden">Enviar</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
