import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapIcon, PencilIcon, ChevronDownIcon } from 'lucide-react';
import { CurriculumMapModal } from '@/components/roadmap/CurriculumMapModal';

interface Career { id: string; name: string }
interface Subject { id: string; name: string; semester: number; credits: number; career_id: string }
interface UserSubject { id: string; subject_id: string; status: string; subject: Subject }

const STATUS_COLORS: Record<string, string> = {
    APROBADA: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-400',
    CURSANDO: 'bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-400',
    REPROBADA: 'bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-400',
    NO_CURSADA: 'bg-muted border-border text-muted-foreground',
};

const STATUS_LABELS: Record<string, string> = {
    NO_CURSADA: 'No cursada',
    CURSANDO: 'Cursando',
    APROBADA: 'Aprobada',
    REPROBADA: 'Reprobada',
};

const STATUS_DOT_COLORS: Record<string, string> = {
    APROBADA: 'bg-emerald-500',
    CURSANDO: 'bg-amber-500',
    REPROBADA: 'bg-red-500',
    NO_CURSADA: 'bg-gray-400',
};

const STATUS_BUTTON_COLORS: Record<string, string> = {
    NO_CURSADA: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600',
    CURSANDO: 'bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/30',
    APROBADA: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/30',
    REPROBADA: 'bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/30',
};

const ALL_STATUSES = ['NO_CURSADA', 'CURSANDO', 'APROBADA', 'REPROBADA'] as const;

function ProgressRing({ percentage, size = 120, strokeWidth = 10 }: { percentage: number; size?: number; strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <svg width={size} height={size} className="mx-auto -rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/50"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="text-emerald-500 transition-all duration-500"
            />
        </svg>
    );
}

export function RoadmapPage() {
    const { userId } = useParams<{ userId: string }>();
    const { session, user, profile } = useAuth();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [userSubjects, setUserSubjects] = useState<Record<string, string>>({});
    const [careerName, setCareerName] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [expandedSemesters, setExpandedSemesters] = useState<Record<number, boolean>>({});
    const [activeSelector, setActiveSelector] = useState<string | null>(null);

    const targetUserId = userId || user?.id;
    const isOwnRoadmap = targetUserId === user?.id;
    const careerId = profile?.career_id;

    useEffect(() => {
        const fetchData = async () => {
            if (!session?.access_token || !targetUserId) return;
            setLoading(true);
            try {
                let userCareerId = careerId;
                if (userId && userId !== user?.id) {
                    const profileData = await api<{ profile: { career_id: string; career: Career | null } }>(`/profiles/${userId}`, { token: session.access_token });
                    userCareerId = profileData.profile.career_id;
                    setCareerName(profileData.profile.career?.name || '');
                } else {
                    setCareerName(profile?.career?.name || '');
                }

                if (!userCareerId) { setLoading(false); return; }

                const [subjectsData, userSubjectsData] = await Promise.all([
                    api<{ subjects: Subject[] }>(`/subjects?career_id=${userCareerId}`, { token: session.access_token }),
                    api<{ user_subjects: UserSubject[] }>(`/subjects/user?user_id=${targetUserId}`, { token: session.access_token }),
                ]);

                setSubjects(subjectsData.subjects);
                const statusMap: Record<string, string> = {};
                userSubjectsData.user_subjects.forEach(us => { statusMap[us.subject_id] = us.status; });
                setUserSubjects(statusMap);
            } catch { /* silent */ } finally { setLoading(false); }
        };
        fetchData();
    }, [session?.access_token, targetUserId, careerId, userId, user?.id, profile?.career?.name]);

    const handleStatusChange = async (subjectId: string, status: string) => {
        if (!session?.access_token || !isOwnRoadmap) return;
        setActiveSelector(null);
        try {
            await api('/subjects/user', {
                method: 'PATCH', token: session.access_token,
                body: JSON.stringify({ subject_id: subjectId, status }),
            });
            if (status === 'NO_CURSADA') {
                const newMap = { ...userSubjects };
                delete newMap[subjectId];
                setUserSubjects(newMap);
            } else {
                setUserSubjects(prev => ({ ...prev, [subjectId]: status }));
            }
        } catch { /* silent */ }
    };

    const handleSaveMapEdit = async (newStatuses: Record<string, string>) => {
        if (!session?.access_token) return;
        const allSubjectIds = subjects.map(s => s.id);
        await Promise.all(
            allSubjectIds.map(async (subjectId) => {
                const prev = userSubjects[subjectId] || 'NO_CURSADA';
                const next = newStatuses[subjectId] || 'NO_CURSADA';
                if (prev === next) return;
                await api('/subjects/user', {
                    method: 'PATCH',
                    token: session.access_token,
                    body: JSON.stringify({ subject_id: subjectId, status: next }),
                });
            })
        );
        setUserSubjects(newStatuses);
        setModalOpen(false);
    };

    const toggleSemester = (sem: number) => {
        setExpandedSemesters(prev => ({ ...prev, [sem]: !prev[sem] }));
    };

    const toggleSelector = (subjectId: string) => {
        if (!isOwnRoadmap) return;
        setActiveSelector(prev => prev === subjectId ? null : subjectId);
    };

    // Group by semester
    const semesters: Record<number, Subject[]> = {};
    subjects.forEach(s => {
        if (!semesters[s.semester]) semesters[s.semester] = [];
        semesters[s.semester].push(s);
    });

    const semesterNumbers = Object.keys(semesters).map(Number).sort((a, b) => a - b);

    // Stats
    const total = subjects.length;
    const approved = Object.values(userSubjects).filter(s => s === 'APROBADA').length;
    const inProgress = Object.values(userSubjects).filter(s => s === 'CURSANDO').length;
    const failed = Object.values(userSubjects).filter(s => s === 'REPROBADA').length;
    const percentage = total > 0 ? Math.round((approved / total) * 100) : 0;

    // Expand all semesters by default on first load
    useEffect(() => {
        if (semesterNumbers.length > 0 && Object.keys(expandedSemesters).length === 0) {
            const initial: Record<number, boolean> = {};
            semesterNumbers.forEach(sem => { initial[sem] = true; });
            setExpandedSemesters(initial);
        }
    }, [semesterNumbers.length]); // eslint-disable-line react-hooks/exhaustive-deps

    if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

    if (!careerId && isOwnRoadmap) {
        return (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                <MapIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-lg font-medium text-muted-foreground">Selecciona tu carrera primero</p>
                <p className="mt-1 text-sm text-muted-foreground">Ve a tu perfil y elige tu carrera para ver tu mapa curricular</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="section-title text-2xl! mb-0">Mapa Curricular</h1>
                    <p className="text-sm text-muted-foreground">{careerName || 'Carrera'}</p>
                </div>
                {isOwnRoadmap && subjects.length > 0 && (
                    <Button size="sm" onClick={() => setModalOpen(true)}>
                        <PencilIcon />
                        Editar mapa
                    </Button>
                )}
            </div>

            {/* Progress section */}
            <Card>
                <CardContent className="py-6">
                    <div className="flex flex-col items-center gap-4">
                        {/* Circular progress ring with percentage */}
                        <div className="relative">
                            <ProgressRing percentage={percentage} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-4xl font-black">{percentage}%</span>
                            </div>
                        </div>

                        {/* Status badges */}
                        <div className="flex flex-wrap justify-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                {approved} Aprobadas
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-sm font-medium text-amber-700 dark:text-amber-400">
                                {inProgress} Cursando
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-sm font-medium text-red-700 dark:text-red-400">
                                {failed} Reprobadas
                            </span>
                        </div>

                        {/* Linear bar (secondary) */}
                        {total > 0 && (
                            <div className="w-full max-w-md">
                                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                                    <div className="flex h-full">
                                        <div className="bg-emerald-500 transition-all" style={{ width: `${(approved / total) * 100}%` }} />
                                        <div className="bg-amber-500 transition-all" style={{ width: `${(inProgress / total) * 100}%` }} />
                                        <div className="bg-red-500 transition-all" style={{ width: `${(failed / total) * 100}%` }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Semester sections */}
            {subjects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                    <p className="text-muted-foreground">No hay materias registradas para esta carrera aun</p>
                    <p className="mt-1 text-sm text-muted-foreground">Las materias seran cargadas por los administradores</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {semesterNumbers.map(sem => {
                        const isExpanded = expandedSemesters[sem] ?? false;
                        const semSubjects = semesters[sem];
                        const semApproved = semSubjects.filter(s => userSubjects[s.id] === 'APROBADA').length;

                        return (
                            <Card key={sem} className="overflow-hidden">
                                {/* Collapsible header */}
                                <button
                                    type="button"
                                    onClick={() => toggleSemester(sem)}
                                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-base font-semibold">Semestre {sem}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {semApproved}/{semSubjects.length}
                                        </span>
                                    </div>
                                    <ChevronDownIcon className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Collapsible content */}
                                {isExpanded && (
                                    <CardContent className="pt-0 pb-3 px-3">
                                        {/* Mobile: vertical list, Desktop: grid */}
                                        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-3">
                                            {semSubjects.map(subject => {
                                                const status = userSubjects[subject.id] || 'NO_CURSADA';
                                                const isSelectorOpen = activeSelector === subject.id;

                                                return (
                                                    <div key={subject.id} className="space-y-1">
                                                        <div
                                                            onClick={() => toggleSelector(subject.id)}
                                                            className={`rounded-lg border p-3 transition-all ${STATUS_COLORS[status]} ${isOwnRoadmap ? 'cursor-pointer active:scale-[0.98]' : ''}`}
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="text-sm font-medium">{subject.name}</p>
                                                                <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[status]}`}>
                                                                    {STATUS_LABELS[status]}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Inline status selector */}
                                                        {isSelectorOpen && isOwnRoadmap && (
                                                            <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-background p-2">
                                                                {ALL_STATUSES.map(s => (
                                                                    <button
                                                                        key={s}
                                                                        type="button"
                                                                        onClick={() => handleStatusChange(subject.id, s)}
                                                                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${STATUS_BUTTON_COLORS[s]} ${status === s ? 'ring-2 ring-offset-1 ring-current' : ''}`}
                                                                    >
                                                                        {STATUS_LABELS[s]}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                {Object.entries(STATUS_DOT_COLORS).map(([status, dotColor]) => (
                    <div key={status} className="flex items-center gap-1.5">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor}`} />
                        <span>{STATUS_LABELS[status]}</span>
                    </div>
                ))}
            </div>

            <CurriculumMapModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                subjects={subjects}
                initialStatuses={userSubjects}
                onSave={handleSaveMapEdit}
            />
        </div>
    );
}
