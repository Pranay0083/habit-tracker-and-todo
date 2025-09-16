import { Habit, Todo } from "@/types";
import ApiService from "./api";

export class DataService {
  // Habits management
  static async getUserHabits(userId: string): Promise<Habit[]> {
    try {
      return await ApiService.getHabits();
    } catch (error) {
      console.error('Error fetching habits:', error);
      return [];
    }
  }

  static async updateHabit(userId: string, habitId: string, updates: Partial<Habit>): Promise<void> {
    try {
      await ApiService.updateHabit(habitId, updates);
    } catch (error) {
      console.error('Error updating habit:', error);
      throw error;
    }
  }

  static async createHabit(habit: {
    name: string;
    category: string;
    frequency: string;
    reminder?: string;
    color: string;
  }): Promise<Habit> {
    try {
      return await ApiService.createHabit(habit);
    } catch (error) {
      console.error('Error creating habit:', error);
      throw error;
    }
  }

  static async deleteHabit(habitId: string): Promise<void> {
    try {
      await ApiService.deleteHabit(habitId);
    } catch (error) {
      console.error('Error deleting habit:', error);
      throw error;
    }
  }

  // Todos management
  static async getUserTodos(userId: string): Promise<Todo[]> {
    try {
      return await ApiService.getTodos();
    } catch (error) {
      console.error('Error fetching todos:', error);
      return [];
    }
  }

  static async updateTodo(userId: string, todoId: string, updates: Partial<Todo>): Promise<void> {
    try {
      await ApiService.updateTodo(todoId, updates);
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  }

  static async createTodo(todo: {
    title: string;
    priority?: string;
  }): Promise<Todo> {
    try {
      return await ApiService.createTodo(todo);
    } catch (error) {
      console.error('Error creating todo:', error);
      throw error;
    }
  }

  static async deleteTodo(todoId: string): Promise<void> {
    try {
      await ApiService.deleteTodo(todoId);
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  }

  // Utility to get today's date as ISO string
  static todayISO(): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
}
