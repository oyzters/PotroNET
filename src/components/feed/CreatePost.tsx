import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ImageIcon, SendIcon } from 'lucide-react';
import { useMediaUpload, type MediaItem } from '@/hooks/useMediaUpload';
import { MediaDropzone } from './MediaDropzone';

interface CreatePostProps {
    onPost: (content: string, tags: string[], media: MediaItem[]) => Promise<void>;
}

const MAX_MEDIA_FILES = 4;

export function CreatePost({ onPost }: CreatePostProps) {
    const [content, setContent] = useState('');
    const [showMedia, setShowMedia] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const {
        files,
        addFiles,
        removeFile,
        reset,
        uploadAll,
        isUploading,
        progress,
        error,
        limits,
    } = useMediaUpload({ maxFiles: MAX_MEDIA_FILES });

    const canSubmit = (content.trim().length > 0 || files.length > 0) && !submitting && !isUploading;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            const uploaded = await uploadAll();
            await onPost(content.trim(), [], uploaded);
            setContent('');
            reset();
            setShowMedia(false);
        } catch {
            // error is surfaced via the hook's `error` state
        } finally {
            setSubmitting(false);
        }
    };

    const busy = submitting || isUploading;

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            {showMedia && (
                <MediaDropzone
                    files={files}
                    onAdd={addFiles}
                    onRemove={removeFile}
                    maxFiles={limits.maxFiles}
                    maxImageMb={limits.maxImageMb}
                    maxVideoMb={limits.maxVideoMb}
                    acceptedMime={limits.acceptedMime}
                    isUploading={isUploading}
                    progress={progress}
                    error={error}
                />
            )}

            <Textarea
                placeholder="¿Qué quieres compartir?"
                value={content}
                onChange={e => setContent(e.target.value)}
                maxLength={500}
                className="min-h-[80px] resize-none rounded-xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/40 px-4 py-3 text-[15px]"
            />

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={`h-8 rounded-lg text-xs gap-1.5 ${showMedia ? 'text-primary' : 'text-muted-foreground'}`}
                        onClick={() => setShowMedia(v => !v)}
                        disabled={busy}
                    >
                        <ImageIcon className="h-4 w-4" />
                        Multimedia
                    </Button>
                    {files.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">{files.length}/{MAX_MEDIA_FILES}</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-[11px] ${content.length > 450 ? 'text-amber-500 font-medium' : 'text-muted-foreground/60'}`}>
                        {content.length}/500
                    </span>
                    <Button type="submit" disabled={!canSubmit} size="sm" className="rounded-full px-5 h-8">
                        {busy ? (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        ) : (
                            <><SendIcon className="h-3.5 w-3.5 mr-1.5" />Publicar</>
                        )}
                    </Button>
                </div>
            </div>
        </form>
    );
}
