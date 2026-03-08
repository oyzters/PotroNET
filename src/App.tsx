import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { FeedPage } from '@/pages/FeedPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { TermsPage } from '@/pages/TermsPage';
import { SearchPage } from '@/pages/SearchPage';
import { ProfessorsPage } from '@/pages/ProfessorsPage';
import { ProfessorDetailPage } from '@/pages/ProfessorDetailPage';
import { TutoringPage } from '@/pages/TutoringPage';
import { RoadmapPage } from '@/pages/RoadmapPage';
import { FriendsPage } from '@/pages/FriendsPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { AppLayout } from '@/components/layout/AppLayout';
import type { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;
    return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (user) return <Navigate to="/feed" replace />;
    return <>{children}</>;
}

function ProtectedPage({ children }: { children: ReactNode }) {
    const { profile, loading } = useAuth();
    const location = useLocation();

    // If profile loaded and no career_id, redirect to onboarding (unless already there)
    if (!loading && profile && !profile.career_id && location.pathname !== '/onboarding') {
        return <ProtectedRoute><Navigate to="/onboarding" replace /></ProtectedRoute>;
    }

    return <ProtectedRoute><AppLayout>{children}</AppLayout></ProtectedRoute>;
}

export function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <Routes>
                        <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
                        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
                        <Route path="/feed" element={<ProtectedPage><FeedPage /></ProtectedPage>} />
                        <Route path="/profile/:id" element={<ProtectedPage><ProfilePage /></ProtectedPage>} />
                        <Route path="/search" element={<ProtectedPage><SearchPage /></ProtectedPage>} />
                        <Route path="/professors" element={<ProtectedPage><ProfessorsPage /></ProtectedPage>} />
                        <Route path="/professors/:id" element={<ProtectedPage><ProfessorDetailPage /></ProtectedPage>} />
                        <Route path="/tutoring" element={<ProtectedPage><TutoringPage /></ProtectedPage>} />
                        <Route path="/roadmap" element={<ProtectedPage><RoadmapPage /></ProtectedPage>} />
                        <Route path="/roadmap/:userId" element={<ProtectedPage><RoadmapPage /></ProtectedPage>} />
                        <Route path="/friends" element={<ProtectedPage><FriendsPage /></ProtectedPage>} />
                        <Route path="/messages" element={<ProtectedPage><MessagesPage /></ProtectedPage>} />
                        <Route path="/messages/:userId" element={<ProtectedPage><MessagesPage /></ProtectedPage>} />
                        <Route path="/notifications" element={<ProtectedPage><NotificationsPage /></ProtectedPage>} />
                        <Route path="/terms" element={<TermsPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}

export default App;