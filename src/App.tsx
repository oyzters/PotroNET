import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { useRole } from '@/hooks/useRole';
import { NeonBackground } from '@/components/ui/NeonBackground';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { FeedPage } from '@/pages/FeedPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { TermsPage } from '@/pages/TermsPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { GuidelinesPage } from '@/pages/GuidelinesPage';
import { RankingPage } from '@/pages/RankingPage';
import { SearchPage } from '@/pages/SearchPage';
import { ProfessorsPage } from '@/pages/ProfessorsPage';
import { ProfessorDetailPage } from '@/pages/ProfessorDetailPage';
import { TutoringPage } from '@/pages/TutoringPage';
import { ResourcesPage } from '@/pages/ResourcesPage';
import { RoadmapPage } from '@/pages/RoadmapPage';
import { FriendsPage } from '@/pages/FriendsPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotificationSettingsPage } from '@/pages/NotificationSettingsPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { ModerationPage } from '@/pages/ModerationPage';
import { SudoToolsPage } from '@/pages/SudoToolsPage';
import { AppLayout } from '@/components/layout/AppLayout';
import type { ReactNode } from 'react';

function ScrollToTop() {
    const { pathname } = useLocation();
    
    useEffect(() => {
        window.scrollTo(0, 0);
        // Desplazamos al inicio el contenedor interno que usa PotroNET para todo el layout
        const scrollArea = document.getElementById('main-scroll-area');
        if (scrollArea) scrollArea.scrollTo({ top: 0, behavior: 'instant' });
    }, [pathname]);
    
    return null;
}
function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-background">
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
            <div className="flex min-h-dvh items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (user) return <Navigate to="/feed" replace />;
    return <>{children}</>;
}

function ProtectedPage({ children, noPaddingMobile }: { children: ReactNode, noPaddingMobile?: boolean }) {
    const { profile, loading } = useAuth();
    const location = useLocation();

    // If profile loaded and no career_id, redirect to onboarding (unless already there)
    if (!loading && profile && !profile.career_id && location.pathname !== '/onboarding') {
        return <ProtectedRoute><Navigate to="/onboarding" replace /></ProtectedRoute>;
    }

    return <ProtectedRoute><AppLayout noPaddingMobile={noPaddingMobile}>{children}</AppLayout></ProtectedRoute>;
}

function AdminRoute({ children }: { children: ReactNode }) {
    const { isModerator } = useRole();
    const { loading } = useAuth();
    if (loading) return null;
    if (!isModerator) return <Navigate to="/feed" replace />;
    return <>{children}</>;
}

function SudoRoute({ children }: { children: ReactNode }) {
    const { isSudo } = useRole();
    const { loading } = useAuth();
    if (loading) return null;
    if (!isSudo) return <Navigate to="/feed" replace />;
    return <>{children}</>;
}

export function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />
            <ThemeProvider>
                <NeonBackground />
                <ToastProvider>
                <AuthProvider>
                <SettingsProvider>
                    <Routes>
                        <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
                        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />
                        <Route path="/verify-email" element={<VerifyEmailPage />} />
                        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
                        <Route path="/feed" element={<ProtectedPage noPaddingMobile><FeedPage /></ProtectedPage>} />
                        <Route path="/profile/:id" element={<ProtectedPage><ProfilePage /></ProtectedPage>} />
                        <Route path="/search" element={<ProtectedPage><SearchPage /></ProtectedPage>} />
                        <Route path="/professors" element={<ProtectedPage noPaddingMobile><ProfessorsPage /></ProtectedPage>} />
                        <Route path="/professors/:id" element={<ProtectedPage><ProfessorDetailPage /></ProtectedPage>} />
                        <Route path="/tutoring" element={<ProtectedPage><TutoringPage /></ProtectedPage>} />
                        <Route path="/roadmap" element={<ProtectedPage><RoadmapPage /></ProtectedPage>} />
                        <Route path="/roadmap/:userId" element={<ProtectedPage><RoadmapPage /></ProtectedPage>} />
                        <Route path="/friends" element={<ProtectedPage><FriendsPage /></ProtectedPage>} />
                        <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                        <Route path="/messages/:userId" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                        <Route path="/notifications" element={<ProtectedPage><NotificationsPage /></ProtectedPage>} />
                        <Route path="/resources" element={<ProtectedPage><ResourcesPage /></ProtectedPage>} />
                        <Route path="/rankings" element={<ProtectedPage><RankingPage /></ProtectedPage>} />
                        <Route path="/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
                        <Route path="/settings/notifications" element={<ProtectedPage><NotificationSettingsPage /></ProtectedPage>} />
                        <Route path="/moderation" element={
                            <ProtectedPage>
                                <AdminRoute><ModerationPage /></AdminRoute>
                            </ProtectedPage>
                        } />
                        <Route path="/sudo-tools" element={
                            <ProtectedPage>
                                <SudoRoute><SudoToolsPage /></SudoRoute>
                            </ProtectedPage>
                        } />
                        <Route path="/terms" element={<TermsPage />} />
                        <Route path="/privacy" element={<PrivacyPage />} />
                        <Route path="/guidelines" element={<GuidelinesPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </SettingsProvider>
                </AuthProvider>
                </ToastProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}

export default App;