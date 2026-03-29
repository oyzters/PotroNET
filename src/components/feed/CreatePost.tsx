import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { SendIcon, XIcon, ImageIcon, VideoIcon, PlusIcon, LinkIcon } from 'lucide-react';

interface MediaItem {
    type: 'image' | 'video';
    url: string;
}

interface CreatePostProps {
    onPost: (content: string, tags: string[], media: MediaItem[]) => Promise<void>;
}

export function CreatePost({ onPost }: CreatePostProps) {
    const [content, setContent] = useState('');
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [showMediaInput, setShowMediaInput] = useState(false);
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [loading, setLoading] = useState(false);

    const addMedia = () => {
        const url = mediaUrl.trim();
        if (!url || media.length >= 10) return;
        try { new URL(url); } catch { return; }
        setMedia([...media, { type: mediaType, url }]);
        setMediaUrl('');
    };

    const removeMedia = (idx: number) => setMedia(media.filter((_, i) => i !== idx));

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!content.trim() || loading) return;
        setLoading(true);
        try {
            await onPost(content.trim(), [], media);
            setContent('');
            setMedia([]);
            setShowMediaInput(false);
        } catch { /* */ } finally { setLoading(false); }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            {/* Add media URL — above textarea when multimedia is active */}
            {showMediaInput && (
                <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                    <div className="flex gap-1">
                        <button type="button" onClick={() => setMediaType('image')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mediaType === 'image' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                            <ImageIcon className="h-3.5 w-3.5" /> Foto
                        </button>
                        <button type="button" onClick={() => setMediaType('video')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mediaType === 'video' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                            <VideoIcon className="h-3.5 w-3.5" /> Video
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Pega el enlace aquí..."
                                value={mediaUrl}
                                onChange={e => setMediaUrl(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMedia(); } }}
                                className="h-8 text-xs pl-8 border-0 bg-background"
                            />
                        </div>
                        <Button type="button" size="sm" className="h-8 px-2" onClick={addMedia} disabled={!mediaUrl.trim()}>
                            <PlusIcon className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Media previews */}
            {media.length > 0 && (
                <div className={`grid gap-1.5 ${media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {media.map((item, idx) => (
                        <div key={idx} className="relative rounded-lg overflow-hidden bg-muted aspect-video">
                            {item.type === 'image' ? (
                                <img src={item.url} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground">
                                    <VideoIcon className="h-6 w-6" />
                                </div>
                            )}
                            <button type="button" onClick={() => removeMedia(idx)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5">
                                <XIcon className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <Textarea
                placeholder="¿Qué quieres compartir?"
                value={content}
                onChange={e => setContent(e.target.value)}
                maxLength={500}
                className="min-h-[80px] resize-none rounded-xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/40 px-4 py-3 text-[15px]"
            />

            {/* Bottom bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        type="button" variant="ghost" size="sm"
                        className={`h-8 rounded-lg text-xs gap-1.5 ${showMediaInput ? 'text-primary' : 'text-muted-foreground'}`}
                        onClick={() => setShowMediaInput(!showMediaInput)}
                        disabled={media.length >= 10}
                    >
                        <ImageIcon className="h-4 w-4" />
                        Multimedia
                    </Button>
                    {media.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">{media.length}/10</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-[11px] ${content.length > 450 ? 'text-amber-500 font-medium' : 'text-muted-foreground/60'}`}>
                        {content.length}/500
                    </span>
                    <Button type="submit" disabled={!content.trim() || loading} size="sm" className="rounded-full px-5 h-8">
                        {loading ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                            : <><SendIcon className="h-3.5 w-3.5 mr-1.5" />Publicar</>}
                    </Button>
                </div>
            </div>
        </form>
    );
}
