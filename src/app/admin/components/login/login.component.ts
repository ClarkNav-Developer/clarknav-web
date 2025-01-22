import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Inject } from '@angular/core';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  isLoginForm = true;
  email = '';
  password = '';
  firstName = '';
  lastName = '';
  errorMessage = '';

  constructor(@Inject(AuthService) private authService: AuthService, private router: Router) {}

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
    this.authService.login({ email: this.email, password: this.password })
      .subscribe(
        (response: any) => {
          this.router.navigate(['/dashboard']);
        },
        (error) => {
          this.errorMessage = 'Invalid email or password';
        }
      );
  }

  onRegisterSubmit(event: Event) {
    event.preventDefault();
    this.authService.register({
      first_name: this.firstName,
      last_name: this.lastName,
      email: this.email,
      password: this.password
    }).subscribe(
      (response: any) => {
        this.isLoginForm = true;
      },
      (error) => {
        this.errorMessage = 'Registration failed';
      }
    );
  }
}