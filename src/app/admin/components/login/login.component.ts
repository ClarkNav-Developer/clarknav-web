import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';
import { User } from '../../../models/user';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

enum FormState {
    LOGIN = 'LOGIN',
    REGISTER = 'REGISTER',
    FORGOT_PASSWORD = 'FORGOT_PASSWORD',
    RESET_PASSWORD = 'RESET_PASSWORD',
    PASSWORD_CONFIRMATION = 'PASSWORD_CONFIRMATION'
}

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
    passwordConfirmForm!: FormGroup;
    currentFormState: FormState = FormState.LOGIN;
    errorMessage: string = '';
    successMessage: string = '';
    loading: boolean = false;
    verificationLinkSent: boolean = false;
    private destroy$ = new Subject<void>();

    FormState = FormState;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private route: ActivatedRoute
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
            firstname: ['', [Validators.required, Validators.minLength(2)]],
            lastname: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [
                Validators.required,
                Validators.minLength(8),
                Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/)
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
                Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/)
            ]],
            password_confirmation: ['', [Validators.required]]
        }, {
            validators: this.passwordMatchValidator
        });

        this.passwordConfirmForm = this.fb.group({
            password: ['', [Validators.required, Validators.minLength(8)]]
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
        // Existing logic for other routes
        if (window.location.pathname.includes('reset-password')) {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const email = urlParams.get('email');
    
            if (token && email) {
                this.currentFormState = FormState.RESET_PASSWORD;
                this.resetPasswordForm.patchValue({ token, email });
            }
        } else if (window.location.pathname.includes('confirm-password')) {
            this.currentFormState = FormState.PASSWORD_CONFIRMATION;
        }
    
        // Existing logic for authentication state
        this.authService.isAuthenticated
            .pipe(takeUntil(this.destroy$))
            .subscribe(isAuthenticated => {
                if (isAuthenticated) {
                    this.authService.currentUser
                        .pipe(takeUntil(this.destroy$))
                        .subscribe(user => {
                            if (user?.isAdmin) {
                                this.router.navigate(['/admin/admin-dashboard']);
                            } else {
                                this.router.navigate(['/']);
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
                        if (response && response.user) {
                            if (response.user.isAdmin) {
                                this.router.navigate(['/admin/admin-dashboard']);
                            } else {
                                this.router.navigate(['/']);
                            }
                        } else if (response && response.message) {
                            this.errorMessage = response.message;
                        } else {
                            this.errorMessage = 'Invalid response from server. Please try again.';
                        }
                    },
                    error: (error) => {
                        this.loading = false;
                        this.errorMessage = error.message || 'Login failed. Please check your credentials.';
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
            this.loading = true;
            const userData: Partial<User> = {
                ...this.registerForm.value,
                isAdmin: false,
                isUser: true
            };
    
            this.authService.register(userData)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (response) => {
                        this.loading = false;
                        this.successMessage = 'Registration successful!';
                        this.currentFormState = FormState.LOGIN;
                    },
                    error: (error) => {
                        this.loading = false;
                        this.errorMessage = error.message || 'Registration failed. Please try again.';
                    }
                });
        } else {
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
                        this.currentFormState = FormState.LOGIN;
                    },
                    error: (error) => {
                        this.loading = false;
                        this.errorMessage = error.message || 'Failed to reset password.';
                    }
                });
        }
    }

    onPasswordConfirmSubmit(): void {
        this.errorMessage = '';
        this.successMessage = '';

        if (this.passwordConfirmForm.valid) {
            this.loading = true;
            const { password } = this.passwordConfirmForm.value;

            this.authService.confirmPassword(password)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        this.loading = false;
                        this.successMessage = 'Password confirmed successfully.';
                        this.router.navigate(['/protected-route']);
                    },
                    error: (error) => {
                        this.loading = false;
                        this.errorMessage = error.message || 'Failed to confirm password.';
                    }
                });
        } else {
            this.errorMessage = 'Please enter your password.';
        }
    }

    // verifyEmail(id: string, hash: string): void {
    //     this.authService.verifyEmail(id, hash).subscribe({
    //         next: (response) => {
    //             this.successMessage = 'Email verified successfully. You can now log in.';
    //             this.currentFormState = FormState.LOGIN;
    //             // Optionally, log the user in automatically
    //             this.authService.getAuthenticatedUser().subscribe(user => {
    //                 if (user) {
    //                     this.authService.setAuthenticated(true, user);
    //                     this.router.navigate(['/']);
    //                 }
    //             });
    //         },
    //         error: (error) => {
    //             this.errorMessage = error.message || 'Email verification failed. Please try again.';
    //         }
    //     });
    // }

    // resendVerificationEmail(): void {
    //     this.loading = true;
    //     this.errorMessage = '';
    //     this.successMessage = '';

    //     this.authService.sendVerificationEmail()
    //         .pipe(takeUntil(this.destroy$))
    //         .subscribe({
    //             next: () => {
    //                 this.loading = false;
    //                 this.verificationLinkSent = true;
    //                 this.successMessage = 'A new verification link has been sent to your email address.';
    //             },
    //             error: (error) => {
    //                 this.loading = false;
    //                 this.errorMessage = error.message || 'Failed to send verification email.';
    //             }
    //         });
    // }

    logout(): void {
        this.authService.logout()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.currentFormState = FormState.LOGIN;
                    this.router.navigate(['/login']);
                },
                error: (error) => {
                    console.error('Logout error:', error);
                    this.currentFormState = FormState.LOGIN;
                    this.router.navigate(['/login']);
                }
            });
    }

    setFormState(state: FormState): void {
        this.currentFormState = state;
        this.clearMessages();
    }

    private clearMessages(): void {
        this.errorMessage = '';
        this.successMessage = '';
        this.verificationLinkSent = false;
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

    get loginEmail() { return this.loginForm.get('email'); }
    get loginPassword() { return this.loginForm.get('password'); }
    get registerFirstName() { return this.registerForm.get('firstname'); }
    get registerLastName() { return this.registerForm.get('lastname'); }
    get registerEmail() { return this.registerForm.get('email'); }
    get registerPassword() { return this.registerForm.get('password'); }
    get registerPasswordConfirmation() { return this.registerForm.get('password_confirmation'); }
    get forgotEmail() { return this.forgotPasswordForm.get('email'); }
    get confirmPassword() { return this.passwordConfirmForm.get('password'); }
}