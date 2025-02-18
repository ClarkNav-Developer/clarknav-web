import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';
import { User } from '../../../models/user';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
    loginForm!: FormGroup;
    registerForm!: FormGroup;
    forgotPasswordForm!: FormGroup;
    resetPasswordForm!: FormGroup;
    isLoginForm: boolean = true;
    isForgotPasswordForm: boolean = false;
    isResetPasswordForm: boolean = false;
    errorMessage: string = '';
    successMessage: string = '';
    loading: boolean = false;
    private destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router
    ) {
        this.initializeForms();
    }

    private initializeForms(): void {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(8)]],
            rememberMe: [false]
        });

        this.registerForm = this.fb.group({
            first_name: ['', [Validators.required, Validators.minLength(2)]],
            last_name: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [
                Validators.required,
                Validators.minLength(8),
                Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
            ]],
            password_confirmation: ['', [Validators.required]]
        }, {
            validators: this.passwordMatchValidator
        });

        this.forgotPasswordForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]]
        });

        this.resetPasswordForm = this.fb.group({
            token: ['', [Validators.required]],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [
                Validators.required,
                Validators.minLength(8),
                Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
            ]],
            password_confirmation: ['', [Validators.required]]
        }, {
            validators: this.passwordMatchValidator
        });
    }

    private passwordMatchValidator(control: AbstractControl): { [key: string]: any } | null {
        const password = control.get('password');
        const confirmPassword = control.get('password_confirmation');

        if (password && confirmPassword && password.value !== confirmPassword.value) {
            return { 'passwordMismatch': true };
        }
        return null;
    }

    ngOnInit(): void {
        // Check if we're on the reset password route
        if (window.location.pathname.includes('reset-password')) {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const email = urlParams.get('email');

            if (token && email) {
                this.isResetPasswordForm = true;
                this.isLoginForm = false;
                this.isForgotPasswordForm = false;
                this.resetPasswordForm.patchValue({ token, email });
            }
        }

        // Subscribe to auth state
        this.authService.isAuthenticated
            .pipe(takeUntil(this.destroy$))
            .subscribe(isAuthenticated => {
                if (isAuthenticated) {
                    this.authService.currentUser
                        .pipe(takeUntil(this.destroy$))
                        .subscribe(user => {
                            if (user?.email_verified_at) {
                                if (user.isAdmin) {
                                    this.router.navigate(['/admin/admin-dashboard']);
                                } else {
                                    this.router.navigate(['/']);
                                }
                            } else {
                                this.router.navigate(['/verify-email']);
                            }
                        });
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onLoginSubmit(): void {
        this.errorMessage = '';
        this.successMessage = '';

        if (this.loginForm.valid) {
            this.loading = true;
            const { email, password, rememberMe } = this.loginForm.value;

            this.authService.login(email, password, rememberMe)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (response) => {
                        this.loading = false;
                        console.log('Login response:', response); // Log the response
                        if (response && response.user) {
                            if (!response.user.email_verified_at) {
                                this.successMessage = 'Please verify your email address to continue.';
                                this.router.navigate(['/verify-email']);
                            } else {
                                this.authService.currentUser.subscribe(user => {
                                    if (user?.isAdmin) {
                                        this.router.navigate(['/admin/admin-dashboard']);
                                    } else {
                                        this.router.navigate(['/']);
                                    }
                                });
                            }
                        } else if (response && response.message) {
                            this.errorMessage = response.message; // Display backend error message
                        } else {
                            this.errorMessage = 'Invalid response from server. Please try again.';
                        }
                    },
                    error: (error) => {
                        this.loading = false;
                        this.errorMessage = error.message || 'Login failed. Please check your credentials.';
                        console.error('Login error:', error); // Log the error for debugging
                    }
                });
        } else {
            this.errorMessage = 'Please fill in all required fields correctly.';
        }
    }

    onRegisterSubmit(): void {
        this.errorMessage = '';
        this.successMessage = '';

        if (this.registerForm.valid) {
            console.log('Form values:', this.registerForm.value); // Log form values
            this.loading = true;
            const userData: Partial<User> = {
                ...this.registerForm.value,
                isAdmin: false,
                isUser: true
            };

            this.authService.register(userData)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        this.loading = false;
                        this.successMessage = 'Registration successful! Please check your email to verify your account.';
                        this.router.navigate(['/verify-email']);
                    },
                    error: (error) => {
                        this.loading = false;
                        this.errorMessage = error.message || 'Registration failed. Please try again.';
                        console.error('Registration error:', error); // Log the error for debugging
                    }
                });
        } else {
            console.log('Form validation errors:', this.registerForm.errors); // Log validation errors
            this.errorMessage = 'Please fill in all required fields correctly.';
        }
    }

    onForgotPasswordSubmit(): void {
        this.errorMessage = '';
        this.successMessage = '';

        if (this.forgotPasswordForm.valid) {
            this.loading = true;
            const { email } = this.forgotPasswordForm.value;

            this.authService.forgotPassword(email)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        this.loading = false;
                        this.successMessage = 'Password reset instructions have been sent to your email.';
                    },
                    error: (error) => {
                        this.loading = false;
                        this.errorMessage = error.message || 'Failed to send password reset email.';
                        console.error('Forgot password error:', error); // Log the error for debugging
                    }
                });
        }
    }

    onResetPasswordSubmit(): void {
        this.errorMessage = '';
        this.successMessage = '';

        if (this.resetPasswordForm.valid) {
            this.loading = true;
            const { token, email, password, password_confirmation } = this.resetPasswordForm.value;

            this.authService.resetPassword(token, email, password, password_confirmation)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        this.loading = false;
                        this.successMessage = 'Password reset successful. Please login with your new password.';
                        this.onLoginClick();
                    },
                    error: (error) => {
                        this.loading = false;
                        this.errorMessage = error.message || 'Failed to reset password.';
                        console.error('Reset password error:', error); // Log the error for debugging
                    }
                });
        }
    }

    onRegisterClick(): void {
        this.isLoginForm = false;
        this.isForgotPasswordForm = false;
        this.isResetPasswordForm = false;
        this.clearMessages();
    }

    onLoginClick(): void {
        this.isLoginForm = true;
        this.isForgotPasswordForm = false;
        this.isResetPasswordForm = false;
        this.clearMessages();
    }

    onForgotPasswordClick(): void {
        this.isLoginForm = false;
        this.isForgotPasswordForm = true;
        this.isResetPasswordForm = false;
        this.clearMessages();
    }

    private clearMessages(): void {
        this.errorMessage = '';
        this.successMessage = '';
    }

    togglePassword(inputId: string, iconId: string): void {
        const input = document.getElementById(inputId) as HTMLInputElement;
        const icon = document.getElementById(iconId) as HTMLElement;

        if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = 'visibility_off';
        } else {
            input.type = 'password';
            icon.textContent = 'visibility';
        }
    }

    // Form getters for template
    get loginEmail() { return this.loginForm.get('email'); }
    get loginPassword() { return this.loginForm.get('password'); }
    get registerFirstName() { return this.registerForm.get('first_name'); }
    get registerLastName() { return this.registerForm.get('last_name'); }
    get registerEmail() { return this.registerForm.get('email'); }
    get registerPassword() { return this.registerForm.get('password'); }
    get registerPasswordConfirmation() { return this.registerForm.get('password_confirmation'); }
    get forgotEmail() { return this.forgotPasswordForm.get('email'); }
}