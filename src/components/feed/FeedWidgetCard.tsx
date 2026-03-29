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
        <div className={`${bgTint} overflow-hidden rounded-none md:rounded-xl border-y md:border border-border/30 my-0 md:my-2`}>
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
