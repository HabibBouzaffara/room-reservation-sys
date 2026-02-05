// src/app/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem('token'); // JWT stored in localStorage
    if (token) {
      return true; // User is logged in
    } else {
      this.router.navigate(['/login']);
      return false; // Not logged in
    }
  }
}
