import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { XIcon, CheckIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface AvatarCropModalProps {
    imageSrc: string;
    onConfirm: (blob: Blob) => void;
    onCancel: () => void;
}

async function getCroppedBlob(imageSrc: string, croppedArea: Area): Promise<Blob> {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', reject);
        img.src = imageSrc;
    });

    const canvas = document.createElement('canvas');
    const size = 400;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(
        image,
        croppedArea.x,
        croppedArea.y,
        croppedArea.width,
        croppedArea.height,
        0,
        0,
        size,
        size,
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Error al procesar la imagen'));
        }, 'image/webp', 0.88);
    });
}

export function AvatarCropModal({ imageSrc, onConfirm, onCancel }: AvatarCropModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedArea, setCroppedArea] = useState<Area | null>(null);
    const [processing, setProcessing] = useState(false);

    useBodyScrollLock(true);

    const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
        setCroppedArea(croppedAreaPixels);
    }, []);

    const handleConfirm = async () => {
        if (!croppedArea) return;
        setProcessing(true);
        try {
            const blob = await getCroppedBlob(imageSrc, croppedArea);
            onConfirm(blob);
        } catch {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0">
                <button
                    onClick={onCancel}
                    disabled={processing}
                    className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors disabled:opacity-40"
                >
                    <XIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Cancelar</span>
                </button>
                <span className="text-sm font-semibold text-white">Ajustar foto</span>
                <button
                    onClick={handleConfirm}
                    disabled={processing || !croppedArea}
                    className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors disabled:opacity-40"
                >
                    {processing ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                        <CheckIcon className="h-5 w-5" />
                    )}
                    <span className="text-sm font-semibold">Listo</span>
                </button>
            </div>

            {/* Crop area */}
            <div className="relative flex-1">
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                    style={{
                        containerStyle: { background: '#000' },
                        mediaStyle: {},
                        cropAreaStyle: {
                            border: '2px solid rgba(255,255,255,0.8)',
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
                        },
                    }}
                />
            </div>

            {/* Zoom controls */}
            <div className="shrink-0 px-6 pb-8 pt-4 flex items-center gap-3"
                style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
                <button
                    onClick={() => setZoom(z => Math.max(1, z - 0.2))}
                    disabled={zoom <= 1}
                    className="text-white/60 hover:text-white transition-colors disabled:opacity-30"
                >
                    <ZoomOutIcon className="h-5 w-5" />
                </button>
                <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={e => setZoom(Number(e.target.value))}
                    className="flex-1 accent-primary h-1 cursor-pointer"
                />
                <button
                    onClick={() => setZoom(z => Math.min(3, z + 0.2))}
                    disabled={zoom >= 3}
                    className="text-white/60 hover:text-white transition-colors disabled:opacity-30"
                >
                    <ZoomInIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
