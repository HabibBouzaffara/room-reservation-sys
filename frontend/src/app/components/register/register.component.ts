import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  register() {
    this.authService
      .register({
        name: this.name,
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: () => {
          alert('Registration successful');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          alert(err.error?.message || 'Registration failed');
        },
      });
  }
}
