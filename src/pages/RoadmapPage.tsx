import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapIcon, PencilIcon } from 'lucide-react';
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

export function RoadmapPage() {
    const { userId } = useParams<{ userId: string }>();
    const { session, user, profile } = useAuth();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [userSubjects, setUserSubjects] = useState<Record<string, string>>({});
    const [careerName, setCareerName] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);

    const targetUserId = userId || user?.id;
    const isOwnRoadmap = targetUserId === user?.id;
    const careerId = profile?.career_id;

    useEffect(() => {
        const fetchData = async () => {
            if (!session?.access_token || !targetUserId) return;
            setLoading(true);
            try {
                // Get user profile to know their career
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Mapa Curricular</h1>
                    <p className="text-sm text-muted-foreground">{careerName || 'Carrera'}</p>
                </div>
                {isOwnRoadmap && subjects.length > 0 && (
                    <Button size="sm" onClick={() => setModalOpen(true)}>
                        <PencilIcon />
                        Editar mapa
                    </Button>
                )}
            </div>

            {/* Progress bar */}
            <Card>
                <CardContent className="py-5">
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold text-emerald-500">{approved}</p>
                            <p className="text-xs text-muted-foreground">Aprobadas</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-amber-500">{inProgress}</p>
                            <p className="text-xs text-muted-foreground">Cursando</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-500">{failed}</p>
                            <p className="text-xs text-muted-foreground">Reprobadas</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{total > 0 ? Math.round((approved / total) * 100) : 0}%</p>
                            <p className="text-xs text-muted-foreground">Progreso</p>
                        </div>
                    </div>
                    {total > 0 && (
                        <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
                            <div className="flex h-full">
                                <div className="bg-emerald-500 transition-all" style={{ width: `${(approved / total) * 100}%` }} />
                                <div className="bg-amber-500 transition-all" style={{ width: `${(inProgress / total) * 100}%` }} />
                                <div className="bg-red-500 transition-all" style={{ width: `${(failed / total) * 100}%` }} />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Semester grid */}
            {subjects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                    <p className="text-muted-foreground">No hay materias registradas para esta carrera aún</p>
                    <p className="mt-1 text-sm text-muted-foreground">Las materias serán cargadas por los administradores</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {semesterNumbers.map(sem => (
                        <Card key={sem}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Semestre {sem}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {semesters[sem].map(subject => {
                                        const status = userSubjects[subject.id] || 'NO_CURSADA';
                                        return (
                                            <div key={subject.id} className={`group relative rounded-lg border p-3 transition-all ${STATUS_COLORS[status]}`}>
                                                <p className="text-sm font-medium pr-16">{subject.name}</p>
                                                <p className="text-xs opacity-70">{STATUS_LABELS[status]}</p>
                                                {isOwnRoadmap && (
                                                    <select
                                                        value={status}
                                                        onChange={e => handleStatusChange(subject.id, e.target.value)}
                                                        className="absolute right-2 top-2 rounded border border-border bg-background px-1.5 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                                                    >
                                                        <option value="NO_CURSADA">No cursada</option>
                                                        <option value="CURSANDO">Cursando</option>
                                                        <option value="APROBADA">Aprobada</option>
                                                        <option value="REPROBADA">Reprobada</option>
                                                    </select>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-sm">
                {Object.entries(STATUS_COLORS).map(([status, colors]) => (
                    <div key={status} className={`rounded-lg border px-3 py-1.5 ${colors}`}>
                        {STATUS_LABELS[status]}
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
