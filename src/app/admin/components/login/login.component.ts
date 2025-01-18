import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  isLoginForm = true;
  email = '';
  password = '';
  errorMessage = '';

  constructor(private router: Router) {}

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
    // Static login logic
    if (this.email === 'admin@example.com' && this.password === 'admin') {
      this.router.navigate(['/admin/admin-dashboard']);
    } else if (this.email === 'user@example.com' && this.password === 'user') {
      this.router.navigate(['/dashboard']);
    } else {
      this.errorMessage = 'Invalid email or password';
    }
  }

  onRegisterSubmit(event: Event) {
    event.preventDefault();
    // Handle registration form submission
    console.log('Registration form submitted');
  }
}