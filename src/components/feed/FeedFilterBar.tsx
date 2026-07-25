import { useRef, type ReactNode } from "react";
import {
    LayoutGridIcon,
    HelpCircleIcon,
    CalendarIcon,
    FileTextIcon,
    NewspaperIcon,
    TrophyIcon,
} from "lucide-react";

interface FilterItem {
    key: string;
    icon: ReactNode;
    label: string;
    sublabel: string;
}

const FILTERS: FilterItem[] = [
    { key: "all",       icon: <LayoutGridIcon className="h-5 w-5" />, label: "Todo",      sublabel: "El feed"  },
    { key: "questions", icon: <HelpCircleIcon  className="h-5 w-5" />, label: "Preguntas", sublabel: "Dudas"    },
    { key: "events",    icon: <CalendarIcon    className="h-5 w-5" />, label: "Eventos",   sublabel: "Campus"   },
    { key: "resources", icon: <FileTextIcon    className="h-5 w-5" />, label: "Recursos",  sublabel: "Apuntes"  },
    { key: "news",      icon: <NewspaperIcon   className="h-5 w-5" />, label: "Noticias",  sublabel: "ITSON"    },
    { key: "rankings",  icon: <TrophyIcon      className="h-5 w-5" />, label: "Ranking",   sublabel: "Top"      },
];

interface FeedFilterBarProps {
    active: string;
    onChange: (key: string) => void;
}

export function FeedFilterBar({ active, onChange }: FeedFilterBarProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <div
            className="mx-4 md:mx-0 mb-5 rounded-[22px] p-1.5"
            style={{
                background: "var(--lg-bg)",
                backdropFilter: "blur(24px) saturate(1.5)",
                WebkitBackdropFilter: "blur(24px) saturate(1.5)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 var(--lg-border)",
            }}
        >
            <div
                ref={scrollRef}
                className="flex gap-1 overflow-x-auto"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none", scrollSnapType: "x mandatory" }}
            >
                {FILTERS.map((item) => {
                    const isActive = item.key === active;
                    return (
                        <button
                            key={item.key}
                            onClick={() => onChange(item.key)}
                            className={`
                                relative flex flex-col items-center gap-1 px-3 py-2.5 rounded-[16px]
                                shrink-0 select-none active:scale-95
                                transition-all duration-300
                                ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"}
                            `}
                            style={{
                                minWidth: "80px",
                                scrollSnapAlign: "center",
                                ...(isActive ? {
                                    background: "var(--background, white)",
                                    boxShadow: "0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
                                    transform: "translateY(-1px)",
                                } : {}),
                            }}
                        >
                            <span className={`transition-all duration-300 ${isActive ? "text-primary scale-110" : "text-muted-foreground/60"}`}>
                                {item.icon}
                            </span>
                            <span className={`text-[12px] leading-none transition-all duration-300 ${isActive ? "font-bold" : "font-medium"}`}>
                                {item.label}
                            </span>
                            <span
                                className="text-[10px] leading-none text-muted-foreground font-medium transition-all duration-200"
                                style={{ opacity: isActive ? 1 : 0, height: isActive ? "auto" : 0, overflow: "hidden" }}
                            >
                                {item.sublabel}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
