export interface User {
  id: string;
  username: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupCredentials {
  username: string;
  password: string;
  confirmPassword: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => void;
}

// Existing types for habits and todos
export interface Habit {
  id: string;
  name: string;
  category: string;
  frequency: "daily" | "weekly" | "monthly";
  reminder: string;
  history: string[];
  color: string;
  userId: string; // Link habits to users
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  createdAt: string;
  userId: string; // Link todos to users
}

export interface DailyHabit {
  id: string;
  name: string;
  completed: boolean;
}

export interface DailyTodo {
  id: string;
  title: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
}
