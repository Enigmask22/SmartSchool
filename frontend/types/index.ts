// Global type definitions that all .ts files will use 
// Temporary workaround for "I'll type this later": export type TODO = any;
export interface User {
    id: string; 
    username: string; 
    role: 'admin' | 'homeroom' | 'subject' | 'student' | 'parent'; 
    name: string; 
    email: string;
}

export interface AuthContextType {
    user: User | null; 
    loading: boolean; 
    error: string | null; 
    login: (credentials: any) => Promise<void>; 
    logout: () => void;
}

export interface ApiResponse<T = any> {
    success: boolean; data?: 
    T; error?: string; 
    message?: string;
}
// Add more as needed during refactoring