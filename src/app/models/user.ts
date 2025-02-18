// export interface User {
//     id?: number;
//     first_name: string;
//     last_name: string;
//     email: string;
//     password?: string; // Optional because it won't be included in responses
//     passwordConfirmation?: string; // Optional because it won't be included in responses
//     isAdmin: boolean;
//     isUser: boolean;
//     created_at?: string; // Optional because it will be set by the backend
//     updated_at?: string; // Optional because it will be set by the backend
//     token?: string; // Optional token for authenticated users
//     rememberMe?: boolean; // Optional remember me property
// }

export interface User {
    id?: number;
    first_name: string;
    last_name: string;
    email: string;
    password?: string; // Optional because it might not be returned in responses
    password_confirmation?: string; // Optional because it might not be returned in responses
    isAdmin: boolean;
    isUser: boolean;
    email_verified_at?: string; // Optional because it might be null
    remember_token?: string; // Optional because it might be null
    created_at: string;
    updated_at: string;
}