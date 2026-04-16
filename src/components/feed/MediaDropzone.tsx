import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImageIcon, UploadCloudIcon, VideoIcon, XIcon } from 'lucide-react';
import type { PendingFile } from '@/hooks/useMediaUpload';

interface MediaDropzoneProps {
    files: PendingFile[];
    onAdd: (files: File[]) => void;
    onRemove: (id: string) => void;
    maxFiles: number;
    maxImageMb: number;
    maxVideoMb: number;
    acceptedMime: readonly string[];
    isUploading: boolean;
    progress: Record<string, number>;
    error?: string | null;
}

export function MediaDropzone({
    files,
    onAdd,
    onRemove,
    maxFiles,
    maxImageMb,
    maxVideoMb,
    acceptedMime,
    isUploading,
    progress,
    error,
}: MediaDropzoneProps) {
    const onDrop = useCallback((accepted: File[]) => {
        if (accepted.length > 0) onAdd(accepted);
    }, [onAdd]);

    const accept = acceptedMime.reduce<Record<string, string[]>>((acc, mime) => {
        acc[mime] = [];
        return acc;
    }, {});

    const remaining = Math.max(0, maxFiles - files.length);
    const canAddMore = remaining > 0 && !isUploading;

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept,
        maxFiles: remaining,
        multiple: true,
        noClick: true,
        noKeyboard: true,
        disabled: !canAddMore,
    });

    return (
        <div className="space-y-2">
            {files.length > 0 && (
                <div className={`grid gap-1.5 ${files.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {files.map((item) => {
                        const pct = progress[item.id];
                        return (
                            <div key={item.id} className="relative rounded-lg overflow-hidden bg-muted aspect-video">
                                {item.kind === 'image' ? (
                                    <img
                                        src={item.previewUrl}
                                        alt={item.file.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <video
                                        src={item.previewUrl}
                                        className="h-full w-full object-cover"
                                        muted
                                        playsInline
                                    />
                                )}

                                {typeof pct === 'number' && pct < 100 && (
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-black/30">
                                        <div
                                            className="h-full bg-primary transition-[width]"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                )}

                                <div className="absolute top-1 left-1 bg-black/60 text-white rounded-md px-1.5 py-0.5 text-[10px] flex items-center gap-1">
                                    {item.kind === 'image'
                                        ? <ImageIcon className="h-3 w-3" />
                                        : <VideoIcon className="h-3 w-3" />}
                                    <span className="truncate max-w-[120px]">{item.file.name}</span>
                                </div>

                                {!isUploading && (
                                    <button
                                        type="button"
                                        onClick={() => onRemove(item.id)}
                                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                                        aria-label="Remove file"
                                    >
                                        <XIcon className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {canAddMore && (
                <div
                    {...getRootProps()}
                    className={`rounded-lg border border-dashed px-3 py-4 text-center transition-colors ${
                        isDragActive
                            ? 'border-primary bg-primary/5'
                            : 'border-border/60 bg-muted/20 hover:bg-muted/30'
                    }`}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-1">
                        <UploadCloudIcon className="h-5 w-5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                            Drag & drop or{' '}
                            <button
                                type="button"
                                onClick={open}
                                className="text-primary hover:underline font-medium"
                            >
                                browse
                            </button>
                        </p>
                        <p className="text-[10px] text-muted-foreground/80">
                            Up to {maxFiles} files · images ≤ {maxImageMb} MB · videos ≤ {maxVideoMb} MB
                        </p>
                    </div>
                </div>
            )}

            {error && (
                <p className="text-[11px] text-destructive">{error}</p>
            )}
        </div>
    );
}
