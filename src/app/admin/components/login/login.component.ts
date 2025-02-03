import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Inject } from '@angular/core';
import { AuthService } from '../../../auth/auth.service';
import { User } from '../../../models/user';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  isLoginForm = true;
  email = '';
  password = '';
  passwordConfirmation = '';
  firstName = '';
  lastName = '';
  errorMessage = '';
  rememberMe: boolean = false;

  constructor(
    @Inject(AuthService) private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.isLoginForm = params['mode'] !== 'register';
    });
  }

  togglePassword() {
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const passwordIcon = document.querySelector('.password-eye .material-icons') as HTMLElement;
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
  }

  onRegisterClick() {
    this.isLoginForm = false;
  }

  onLoginSubmit(event: Event) {
    event.preventDefault();
    this.authService.login(this.email, this.password).subscribe(
      (response: any) => {
        this.authService.getIdentity().subscribe({
          next: (isAuthenticated) => {
            if (isAuthenticated) {
              const user = this.authService.getCurrentUser();
              if (user?.isAdmin) {
                this.router.navigate(['/admin/admin-dashboard']);
              } else if (user?.isUser) {
                this.router.navigate(['']);
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
      },
      (error) => {
        this.errorMessage = 'Invalid email or password';
      }
    );
  }

  onRegisterSubmit(event: Event) {
    event.preventDefault();
    const newUser: Partial<User> = {
      first_name: this.firstName,
      last_name: this.lastName,
      email: this.email,
      password: this.password,
      isAdmin: false, // Default to false
      isUser: true,   // Default to true
    };

    // Map passwordConfirmation to password_confirmation
    const registrationData = {
      ...newUser,
      password_confirmation: this.passwordConfirmation
    };

    this.authService.register(registrationData).subscribe(
      (response: any) => {
        alert('Registration successful');
        this.onLoginClick();
      },
      (error) => {
        this.errorMessage = 'Registration failed: ' + error.error.message;
      }
    );
  }
}