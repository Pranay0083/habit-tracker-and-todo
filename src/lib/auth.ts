import { User } from "@/types";
import ApiService from "./api";

const CURRENT_USER_KEY = "habit_tracker_current_user";
const REMEMBER_ME_KEY = "habit_tracker_remember_me";

export class AuthService {
  static async signup(username: string, password: string, confirmPassword: string): Promise<User> {
    try {
      const response = await ApiService.signup({ username, password, confirmPassword });
      return response.user;
    } catch (error) {
      throw error;
    }
  }

  static async login(username: string, password: string): Promise<User> {
    try {
      const response = await ApiService.login({ username, password });
      return response.user;
    } catch (error) {
      throw error;
    }
  }

  static saveCurrentUser(user: User, rememberMe: boolean = false): void {
    if (typeof window === "undefined") return;
    
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    
    if (rememberMe) {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1); // Remember for 1 month
      localStorage.setItem(REMEMBER_ME_KEY, expiryDate.toISOString());
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
  }

  static getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;
    
    // Check if token exists
    const token = localStorage.getItem('auth_token');
    if (!token) {
      this.clearCurrentUser();
      return null;
    }

    const rememberMeExpiry = localStorage.getItem(REMEMBER_ME_KEY);
    if (rememberMeExpiry) {
      const expiryDate = new Date(rememberMeExpiry);
      if (new Date() > expiryDate) {
        // Remember me has expired
        this.clearCurrentUser();
        return null;
      }
    }

    const userStr = localStorage.getItem(CURRENT_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  static clearCurrentUser(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
    ApiService.logout();
  }

  static isRemembered(): boolean {
    if (typeof window === "undefined") return false;
    const rememberMeExpiry = localStorage.getItem(REMEMBER_ME_KEY);
    if (!rememberMeExpiry) return false;
    
    const expiryDate = new Date(rememberMeExpiry);
    return new Date() <= expiryDate;
  }
}
