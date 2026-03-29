import type { ReactNode } from 'react';

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    children?: ReactNode;
    align?: 'left' | 'center';
}

export function SectionHeader({
    title,
    subtitle,
    children,
    align = 'left',
}: SectionHeaderProps) {
    return (
        <div className="pt-2 pb-4">
            <div className={`flex items-start justify-between gap-3 ${align === 'center' ? 'justify-center text-center flex-col items-center' : ''}`}>
                <div className="min-w-0 flex-1">
                    <h1 className="text-lg font-bold leading-tight">{title}</h1>
                    {subtitle && (
                        <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>
                    )}
                </div>
                {children && (
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}
