import { User, LoginCredentials, SignupCredentials } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// API utility functions
class ApiService {
  private static getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem('auth_token');
  }

  private static setToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem('auth_token', token);
  }

  private static removeToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem('auth_token');
  }

  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}/api${endpoint}`;
    const token = this.getToken();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'An error occurred');
    }

    return response.json();
  }

  // Authentication methods
  static async signup(credentials: SignupCredentials): Promise<{ user: User; token: string }> {
    const response = await this.request<{ user: User; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    this.setToken(response.token);
    return response;
  }

  static async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const response = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
      }),
    });
    
    this.setToken(response.token);
    return response;
  }

  static logout(): void {
    this.removeToken();
  }

  // Habits methods
  static async getHabits(): Promise<any[]> {
    const response = await this.request<{ habits: any[] }>('/habits');
    return response.habits;
  }

  static async createHabit(habit: {
    name: string;
    category: string;
    frequency: string;
    reminder?: string;
    color: string;
  }): Promise<any> {
    const response = await this.request<{ habit: any }>('/habits', {
      method: 'POST',
      body: JSON.stringify(habit),
    });
    return response.habit;
  }

  static async updateHabit(id: string, updates: any): Promise<any> {
    const response = await this.request<{ habit: any }>(`/habits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.habit;
  }

  static async deleteHabit(id: string): Promise<void> {
    await this.request(`/habits/${id}`, {
      method: 'DELETE',
    });
  }

  // Todos methods
  static async getTodos(): Promise<any[]> {
    const response = await this.request<{ todos: any[] }>('/todos');
    return response.todos;
  }

  static async createTodo(todo: {
    title: string;
    priority?: string;
  }): Promise<any> {
    const response = await this.request<{ todo: any }>('/todos', {
      method: 'POST',
      body: JSON.stringify(todo),
    });
    return response.todo;
  }

  static async updateTodo(id: string, updates: any): Promise<any> {
    const response = await this.request<{ todo: any }>(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.todo;
  }

  static async deleteTodo(id: string): Promise<void> {
    await this.request(`/todos/${id}`, {
      method: 'DELETE',
    });
  }
}

export default ApiService;
