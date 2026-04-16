import { useCallback, useMemo, useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const ALLOWED_MIME = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
] as const;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

export interface MediaItem {
    type: 'image' | 'video';
    url: string;
    key: string;
}

export interface PendingFile {
    id: string;
    file: File;
    previewUrl: string;
    kind: 'image' | 'video';
}

interface SignedUrlResponse {
    signedUrl: string;
    key: string;
    publicUrl: string;
    expiresIn: number;
}

interface UseMediaUploadOptions {
    maxFiles?: number;
}

function classifyMime(type: string): 'image' | 'video' | null {
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    return null;
}

function validateFile(file: File): string | null {
    if (!ALLOWED_MIME.includes(file.type as typeof ALLOWED_MIME[number])) {
        return `Unsupported file type: ${file.name}`;
    }
    const kind = classifyMime(file.type);
    if (!kind) return `Unsupported file type: ${file.name}`;
    const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > max) {
        const maxMb = Math.round(max / (1024 * 1024));
        return `${file.name} is too large (max ${maxMb} MB for ${kind === 'image' ? 'images' : 'videos'})`;
    }
    return null;
}

function uploadWithProgress(
    url: string,
    file: Blob,
    contentType: string,
    onProgress: (pct: number) => void,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', contentType);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
    });
}

export function useMediaUpload({ maxFiles = 4 }: UseMediaUploadOptions = {}) {
    const { session } = useAuth();
    const [files, setFiles] = useState<PendingFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState<Record<string, number>>({});
    const [error, setError] = useState<string | null>(null);
    const idCounter = useRef(0);

    const addFiles = useCallback((incoming: File[]) => {
        setError(null);
        setFiles((prev) => {
            const remainingSlots = Math.max(0, maxFiles - prev.length);
            if (remainingSlots === 0) {
                setError(`You can only attach up to ${maxFiles} files`);
                return prev;
            }
            const accepted: PendingFile[] = [];
            for (const file of incoming.slice(0, remainingSlots)) {
                const problem = validateFile(file);
                if (problem) {
                    setError(problem);
                    continue;
                }
                const kind = classifyMime(file.type)!;
                idCounter.current += 1;
                accepted.push({
                    id: `f-${Date.now()}-${idCounter.current}`,
                    file,
                    previewUrl: URL.createObjectURL(file),
                    kind,
                });
            }
            if (incoming.length > remainingSlots) {
                setError(`Only ${remainingSlots} more file(s) allowed (max ${maxFiles})`);
            }
            return [...prev, ...accepted];
        });
    }, [maxFiles]);

    const removeFile = useCallback((id: string) => {
        setFiles((prev) => {
            const target = prev.find((f) => f.id === id);
            if (target) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((f) => f.id !== id);
        });
        setProgress((p) => {
            const next = { ...p };
            delete next[id];
            return next;
        });
    }, []);

    const reset = useCallback(() => {
        setFiles((prev) => {
            prev.forEach((f) => URL.revokeObjectURL(f.previewUrl));
            return [];
        });
        setProgress({});
        setError(null);
    }, []);

    const uploadAll = useCallback(async (): Promise<MediaItem[]> => {
        if (files.length === 0) return [];
        if (!session?.access_token) {
            const msg = 'You must be signed in to upload media';
            setError(msg);
            throw new Error(msg);
        }

        setIsUploading(true);
        setError(null);
        setProgress({});

        try {
            const uploaded: MediaItem[] = [];

            for (const item of files) {
                let payload: Blob = item.file;
                let contentType = item.file.type;
                let uploadSize = item.file.size;
                let uploadName = item.file.name;

                // Compress images client-side before upload
                if (item.kind === 'image') {
                    try {
                        const compressed = await imageCompression(item.file, {
                            maxSizeMB: 1,
                            maxWidthOrHeight: 1920,
                            initialQuality: 0.8,
                            useWebWorker: true,
                        });
                        payload = compressed;
                        contentType = compressed.type || item.file.type;
                        uploadSize = compressed.size;
                        uploadName = compressed.name || item.file.name;
                    } catch {
                        // If compression fails, fall back to original
                    }
                }

                // 1) Ask backend for a presigned URL
                const signedRes = await fetch(`${API_URL}/uploads/signed-url`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        fileName: uploadName,
                        fileType: contentType,
                        fileSize: uploadSize,
                    }),
                });
                const signedData = await signedRes.json();
                if (!signedRes.ok) {
                    throw new Error(signedData.error || 'Failed to get signed URL');
                }
                const { signedUrl, key, publicUrl } = signedData as SignedUrlResponse;

                // 2) PUT directly to R2 with progress
                await uploadWithProgress(signedUrl, payload, contentType, (pct) => {
                    setProgress((p) => ({ ...p, [item.id]: pct }));
                });

                uploaded.push({ type: item.kind, url: publicUrl, key });
            }

            return uploaded;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Upload failed';
            setError(msg);
            throw err;
        } finally {
            setIsUploading(false);
        }
    }, [files, session?.access_token]);

    const limits = useMemo(() => ({
        maxFiles,
        maxImageMb: MAX_IMAGE_BYTES / (1024 * 1024),
        maxVideoMb: MAX_VIDEO_BYTES / (1024 * 1024),
        acceptedMime: ALLOWED_MIME as readonly string[],
    }), [maxFiles]);

    return {
        files,
        addFiles,
        removeFile,
        reset,
        uploadAll,
        isUploading,
        progress,
        error,
        limits,
    };
}
