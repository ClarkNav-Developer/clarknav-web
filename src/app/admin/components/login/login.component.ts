import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  isLoginForm = true;

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
    // Handle login form submission
    console.log('Login form submitted');
  }

  onRegisterSubmit(event: Event) {
    event.preventDefault();
    // Handle registration form submission
    console.log('Registration form submitted');
  }
}