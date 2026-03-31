import { useAuth } from '@/contexts/AuthContext';

export function useRole() {
    const { profile } = useAuth();
    const role = profile?.role ?? 'user';

    return {
        role,
        isUser: role === 'user',
        isAdmin: role === 'admin',
        isSudo: role === 'sudo',
        /** Can moderate content: delete publications/comments, warn users */
        isModerator: role === 'admin' || role === 'sudo',
        /** Can ban/unban users and change roles */
        canBan: role === 'sudo',
        canChangeRoles: role === 'sudo',
        /** Access to PotroNET-Admin (external panel) */
        canAccessAdmin: role === 'sudo',
    };
}
