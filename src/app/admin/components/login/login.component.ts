import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';
import { User } from '../../../models/user';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  isLoginForm = true;
  errorMessage = '';
  rememberMe: boolean = false;

  loginForm: FormGroup;
  registerForm: FormGroup;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false] // Add rememberMe control here
    });

    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      passwordConfirmation: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.isLoginForm = params['mode'] !== 'register';
    });

    // Load saved credentials if "Remember Me" was checked
    const savedEmail = localStorage.getItem('rememberMeEmail');
    const savedPassword = localStorage.getItem('rememberMePassword');
    if (savedEmail && savedPassword) {
      this.loginForm.patchValue({
        email: savedEmail,
        password: savedPassword
      });
      this.rememberMe = true;
    }
  }

  togglePassword(fieldId: string, iconId: string) {
    const passwordInput = document.getElementById(fieldId) as HTMLInputElement;
    const passwordIcon = document.getElementById(iconId) as HTMLElement;
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      passwordIcon.textContent = 'visibility_off';
    } else {
      passwordInput.type = 'password';
      passwordIcon.textContent = 'visibility';
    }
  }

  onLoginClick() {
    this.isLoginForm = true;
    this.errorMessage = '';
  }

  onRegisterClick() {
    this.isLoginForm = false;
    this.errorMessage = '';
  }

  onLoginSubmit() {
    if (this.loginForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly.';
      return;
    }

    const { email, password } = this.loginForm.value;

    if (this.rememberMe) {
      localStorage.setItem('rememberMeEmail', email);
      localStorage.setItem('rememberMePassword', password);
    } else {
      localStorage.removeItem('rememberMeEmail');
      localStorage.removeItem('rememberMePassword');
    }

    this.authService.login(email, password).subscribe({
      next: (response) => {
        if (this.authService.isAuthenticated) {
          this.authService.getIdentity().subscribe({
            next: (isAuthenticated) => {
              if (isAuthenticated) {
                const user = this.authService.getCurrentUser();
                if (user?.isAdmin) {
                  this.router.navigate(['/admin/admin-dashboard']);
                } else {
                  this.router.navigate(['']);
                }
              } else {
                this.errorMessage = 'Failed to retrieve user identity.';
              }
            },
            error: () => {
              this.errorMessage = 'Error fetching user identity.';
            }
          });
        }
      },
      error: (error) => {
        this.errorMessage = 'Invalid email or password.';
      }
    });
  }

  onRegisterSubmit() {
    if (this.registerForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly.';
      return;
    }

    const { firstName, lastName, email, password, passwordConfirmation } = this.registerForm.value;

    if (password !== passwordConfirmation) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    const newUser: Partial<User> = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      password: password,
      isAdmin: false,
      isUser: true,
    };

    const registrationData = {
      ...newUser,
      password_confirmation: passwordConfirmation
    };

    this.authService.register(registrationData).subscribe({
      next: (response) => {
        alert('Registration successful');
        this.onLoginClick();
      },
      error: (error) => {
        this.errorMessage = 'Registration failed: ' + (error.error.message || 'Please try again.');
      }
    });
  }
}