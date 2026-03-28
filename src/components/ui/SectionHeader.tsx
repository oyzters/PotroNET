import type { ReactNode } from 'react';

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    accentLabel?: string;
    children?: ReactNode;
    align?: 'left' | 'center';
}

/**
 * SectionHeader — modern, clean page section header with neon accent decoration.
 * Replaces the old emoji-badge approach with an elegant left-accent line style.
 */
export function SectionHeader({
    title,
    subtitle,
    accentLabel,
    children,
    align = 'center',
}: SectionHeaderProps) {
    const isCenter = align === 'center';

    return (
        <div className={`px-4 md:px-8 pt-8 md:pt-12 pb-8 ${isCenter ? 'text-center' : ''}`}>
            <div className={`${isCenter ? 'max-w-3xl mx-auto' : ''}`}>
                {/* Accent label — small caps above title */}
                {accentLabel && (
                    <p
                        className="mb-3 text-xs font-bold uppercase tracking-[0.2em]"
                        style={{ color: 'oklch(0.68 0.15 237)' }}
                    >
                        {accentLabel}
                    </p>
                )}

                {/* Title with decorative line */}
                <div className={`relative ${isCenter ? 'inline-block' : 'block'} mb-4`}>
                    <h1
                        className="text-3xl md:text-[2.6rem] font-black leading-[1.1] tracking-tight text-foreground"
                    >
                        {title}
                    </h1>
                    {/* Neon underline accent */}
                    <div
                        className={`mt-2 h-[3px] rounded-full ${isCenter ? 'mx-auto' : ''}`}
                        style={{
                            width: isCenter ? '3.5rem' : '3rem',
                            background: 'linear-gradient(90deg, oklch(0.68 0.15 237), oklch(0.65 0.22 300))',
                            boxShadow: '0 0 8px oklch(0.68 0.15 237 / 0.7)',
                        }}
                    />
                </div>

                {/* Subtitle */}
                {subtitle && (
                    <p className="text-muted-foreground text-base md:text-[1.05rem] leading-relaxed max-w-xl mx-auto">
                        {subtitle}
                    </p>
                )}

                {/* Optional children (e.g., action buttons) */}
                {children && (
                    <div className={`mt-6 flex gap-3 ${isCenter ? 'justify-center' : ''}`}>
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}
