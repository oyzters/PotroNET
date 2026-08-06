import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';

interface FeedWidgetCardProps {
    accentColor: string;
    bgTint: string;
    icon: ReactNode;
    title: string;
    ctaLabel?: string;
    ctaTo?: string;
    children: ReactNode;
}

export function FeedWidgetCard({ bgTint, icon, title, ctaLabel, ctaTo, children }: FeedWidgetCardProps) {
    return (
        <div className={`overflow-hidden rounded-3xl bg-card/75 dark:bg-card/45 backdrop-blur-xl border border-border/60 dark:border-white/10 p-4.5 mb-4 shadow-sm shadow-black/5 mx-1 md:mx-0 transition-all duration-300`}>
            <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                        {icon}
                        <h3 className="text-[13px] font-bold">{title}</h3>
                    </div>
                    {ctaLabel && ctaTo && (
                        <Link to={ctaTo} className="flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline">
                            {ctaLabel}
                            <ArrowRightIcon className="h-3 w-3" />
                        </Link>
                    )}
                </div>
                {children}
            </div>
        </div>
    );
}
