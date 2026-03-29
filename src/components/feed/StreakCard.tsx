import { FlameIcon } from 'lucide-react';
import { FeedWidgetCard } from './FeedWidgetCard';

interface StreakCardProps {
    reputation: number;
    fullName: string;
}

export function StreakCard({ reputation, fullName }: StreakCardProps) {
    const firstName = fullName.split(' ')[0];

    let message: string;
    let sub: string;
    if (reputation >= 100) {
        message = `${firstName}, eres una leyenda`;
        sub = `${reputation} puntos de reputación. Sigue así.`;
    } else if (reputation >= 50) {
        message = `${firstName}, vas con todo`;
        sub = `${reputation} puntos de reputación. Cada vez más cerca del top.`;
    } else if (reputation >= 10) {
        message = `Buen progreso, ${firstName}`;
        sub = `${reputation} puntos de reputación. Publica, comenta y califica para subir.`;
    } else {
        message = `Bienvenido, ${firstName}`;
        sub = 'Empieza a participar para ganar puntos de reputación.';
    }

    return (
        <FeedWidgetCard
            accentColor=""
            bgTint="bg-muted/30"
            icon={<FlameIcon className="h-4 w-4 text-orange-500" />}
            title="Tu progreso"
        >
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                    <span className="text-lg font-black text-orange-500 animate-[pulse_2s_ease-in-out_infinite]">{reputation}</span>
                </div>
                <div>
                    <p className="text-[13px] font-bold">{message}</p>
                    <p className="text-[11px] text-muted-foreground">{sub}</p>
                </div>
            </div>
        </FeedWidgetCard>
    );
}
