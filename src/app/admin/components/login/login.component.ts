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
    lastFormState: FormState = FormState.LOGIN; // Add this property
    errorMessage: string = '';
    successMessage: string = '';
    loading: boolean = false;
    verificationLinkSent: boolean = false;
    rememberMe: boolean = false;
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
        // Login form with better validation messages
        this.loginForm = this.fb.group({
            email: ['', [
                Validators.required, 
                Validators.email
            ]],
            password: ['', [
                Validators.required, 
                Validators.minLength(8)
            ]],
            rememberMe: [false]
        });

        // Register form with improved validation feedback
        this.registerForm = this.fb.group({
            firstname: ['', [
                Validators.required, 
                Validators.minLength(2)
            ]],
            lastname: ['', [
                Validators.required, 
                Validators.minLength(2)
            ]],
            email: ['', [
                Validators.required, 
                Validators.email
            ]],
            password: ['', [
                Validators.required,
                Validators.minLength(8),
                // Improved regex pattern for password validation
                Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/)
            ]],
            password_confirmation: ['', [
                Validators.required
            ]]
        }, {
            validators: this.passwordMatchValidator
        });

        // Forgot password form
        this.forgotPasswordForm = this.fb.group({
            email: ['', [
                Validators.required, 
                Validators.email
            ]]
        });

        // Reset password form
        this.resetPasswordForm = this.fb.group({
            token: ['', [
                Validators.required
            ]],
            email: ['', [
                Validators.required, 
                Validators.email
            ]],
            password: ['', [
                Validators.required,
                Validators.minLength(8),
                Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/)
            ]],
            password_confirmation: ['', [
                Validators.required
            ]]
        }, {
            validators: this.passwordMatchValidator
        });

        // Password confirmation form
        this.passwordConfirmForm = this.fb.group({
            password: ['', [
                Validators.required, 
                Validators.minLength(8)
            ]]
        });
    }

    private passwordMatchValidator(control: AbstractControl): { [key: string]: any } | null {
        const password = control.get('password');
        const confirmPassword = control.get('password_confirmation');

        if (password && confirmPassword && password.value !== confirmPassword.value) {
            confirmPassword.setErrors({ 'passwordMismatch': true });
            return { 'passwordMismatch': true };
        }
        return null;
    }

    ngOnInit(): void {
        // Handle query parameters
        this.route.queryParams
            .pipe(takeUntil(this.destroy$))
            .subscribe(params => {
                if (params['verified'] === 'true') {
                    this.successMessage = 'Your email has been successfully verified. You can now log in.';
                    this.showToastForSeconds(5);
                }
        
                const token = params['token'];
                const email = params['email'];
        
                if (token && email) {
                    this.currentFormState = FormState.RESET_PASSWORD;
                    this.resetPasswordForm.patchValue({ token, email });
                }
            });
        
        // Redirect if already authenticated
        this.authService.getIdentity()
            .pipe(takeUntil(this.destroy$))
            .subscribe((isAuthenticated: boolean) => {
                if (isAuthenticated) {
                    const user = this.authService.getCurrentUser();
                    if (user) {
                        if (user.isAdmin) {
                            this.router.navigate(['/admin/admin-dashboard']);
                        } else {
                            this.router.navigate(['/']);
                        }
                    }
                }
            });
        
        // Load saved credentials if "Remember Me" was checked
        const savedEmail = localStorage.getItem('rememberMeEmail');
        const savedPassword = localStorage.getItem('rememberMePassword');
        if (savedEmail && savedPassword) {
            this.loginForm.patchValue({
                email: savedEmail,
                password: savedPassword,
                rememberMe: true
            });
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    goToHomepage(): void {
        if (this.currentFormState === FormState.LOGIN) {
            this.router.navigate(['/']);
        } else {
            this.lastFormState = this.currentFormState;
            this.currentFormState = FormState.LOGIN;
        }
    }

    onLoginSubmit(): void {
        this.clearMessages();

        if (this.loginForm.invalid) {
            this.markFormGroupTouched(this.loginForm);
            return;
        }

        this.loading = true;
        const { email, password, rememberMe } = this.loginForm.value;

        // Handle "Remember Me" functionality
        if (rememberMe) {
            localStorage.setItem('rememberMeEmail', email);
            localStorage.setItem('rememberMePassword', password);
        } else {
            localStorage.removeItem('rememberMeEmail');
            localStorage.removeItem('rememberMePassword');
        }

        this.authService.login(email, password)
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
                    } else {
                        this.errorMessage = 'Invalid response from server. Please try again.';
                        this.showToastForSeconds(5);
                    }
                },
                error: (error) => {
                    this.loading = false;
                    this.errorMessage = error.message || 'Login failed. Please check your credentials.';
                    this.showToastForSeconds(5);
                }
            });
    }

    onRegisterSubmit(): void {
        this.clearMessages();

        if (this.registerForm.invalid) {
            this.markFormGroupTouched(this.registerForm);
            return;
        }

        this.loading = true;
        const userData: Partial<User> = {
            first_name: this.registerForm.value.firstname,
            last_name: this.registerForm.value.lastname,
            email: this.registerForm.value.email,
            password: this.registerForm.value.password,
            password_confirmation: this.registerForm.value.password_confirmation,
            isAdmin: false,
            isUser: true
        };

        this.authService.register(userData)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.loading = false;
                    this.successMessage = 'Registration successful! Please check your email to verify your account.';
                    this.showToastForSeconds(5);
                    this.currentFormState = FormState.LOGIN;
                },
                error: (error) => {
                    this.loading = false;
                    this.errorMessage = error.message || 'Registration failed. Please try again.';
                    this.showToastForSeconds(5);
                }
            });
    }

    onForgotPasswordSubmit(): void {
        this.clearMessages();

        if (this.forgotPasswordForm.invalid) {
            this.markFormGroupTouched(this.forgotPasswordForm);
            return;
        }

        this.loading = true;
        const { email } = this.forgotPasswordForm.value;

        this.authService.forgotPassword(email)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.loading = false;
                    this.successMessage = 'Password reset instructions have been sent to your email.';
                    this.showToastForSeconds(5);
                },
                error: (error) => {
                    this.loading = false;
                    this.errorMessage = error.message || 'Failed to send password reset email.';
                    this.showToastForSeconds(5);
                }
            });
    }

    onResetPasswordSubmit(): void {
        this.clearMessages();

        if (this.resetPasswordForm.invalid) {
            this.markFormGroupTouched(this.resetPasswordForm);
            return;
        }

        this.loading = true;
        const { token, email, password, password_confirmation } = this.resetPasswordForm.value;

        this.authService.resetPassword(token, email, password, password_confirmation)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.loading = false;
                    this.successMessage = 'Password reset successful. Please login with your new password.';
                    this.showToastForSeconds(5);
                    this.currentFormState = FormState.LOGIN;
                },
                error: (error) => {
                    this.loading = false;
                    this.errorMessage = error.message || 'Failed to reset password.';
                    this.showToastForSeconds(5);
                }
            });
    }

    verifyEmail(token: string, email: string): void {
        this.authService.verifyEmail(token, email)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.successMessage = 'Email verified successfully. You can now log in.';
                    this.showToastForSeconds(5);
                    this.currentFormState = FormState.LOGIN;
                },
                error: (error) => {
                    this.errorMessage = error.message || 'Failed to verify email. Please try again.';
                    this.showToastForSeconds(5);
                }
            });
    }

    showToastForSeconds(seconds: number): void {
        setTimeout(() => {
            this.clearMessages();
        }, seconds * 1000);
    }

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
        this.lastFormState = this.currentFormState;
        this.currentFormState = state;
        this.clearMessages();
    }

    clearMessages(): void {
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

    // Helper method to mark all controls in a form group as touched
    markFormGroupTouched(formGroup: FormGroup) {
        Object.values(formGroup.controls).forEach(control => {
            control.markAsTouched();
            
            if (control instanceof FormGroup) {
                this.markFormGroupTouched(control);
            }
        });
    }

    // Form control getters for template access
    get loginEmail() { return this.loginForm.get('email'); }
    get loginPassword() { return this.loginForm.get('password'); }
    get registerFirstName() { return this.registerForm.get('firstname'); }
    get registerLastName() { return this.registerForm.get('lastname'); }
    get registerEmail() { return this.registerForm.get('email'); }
    get registerPassword() { return this.registerForm.get('password'); }
    get registerPasswordConfirmation() { return this.registerForm.get('password_confirmation'); }
    get forgotEmail() { return this.forgotPasswordForm.get('email'); }
    get confirmPassword() { return this.passwordConfirmForm.get('password'); }
    
    // Helper method to get validation error messages
    getErrorMessage(control: AbstractControl | null): string {
        if (!control || !control.errors || !control.touched) return '';
        
        if (control.errors['required']) return 'This field is required';
        if (control.errors['email']) return 'Please enter a valid email address';
        if (control.errors['minlength']) {
            const requiredLength = control.errors['minlength'].requiredLength;
            return `Minimum length is ${requiredLength} characters`;
        }
        if (control.errors['pattern']) {
            if (control.errors['pattern'].requiredPattern.includes('password')) {
                return 'Password must contain uppercase, lowercase, number and special character';
            }
            return 'Invalid format';
        }
        if (control.errors['passwordMismatch']) return 'Passwords must match';
        
        return 'Invalid input';
    }
}