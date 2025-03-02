export interface User {
    id?: number;
    first_name: string;
    last_name: string;
    email: string;
    password?: string; // Optional because it won't be included in responses
    passwordConfirmation?: string; // Optional because it won't be included in responses
    isAdmin: boolean;
    isUser: boolean;
    created_at?: string; // Optional because it will be set by the backend
    updated_at?: string; // Optional because it will be set by the backend
    token?: string; // Optional token for authenticated users
    rememberMe?: boolean; // Optional remember me property
    role?: 'admin' | 'user';
}