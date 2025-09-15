import mongoose, { Schema, Document } from 'mongoose';

// User model
export interface IUser extends Document {
  _id: string;
  username: string;
  password: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username must be less than 30 characters'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Habit model
export interface IHabit extends Document {
  _id: string;
  name: string;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  reminder: string;
  history: string[];
  color: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const HabitSchema = new Schema<IHabit>({
  name: {
    type: String,
    required: [true, 'Habit name is required'],
    trim: true,
    maxlength: [100, 'Habit name must be less than 100 characters'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [50, 'Category must be less than 50 characters'],
  },
  frequency: {
    type: String,
    required: [true, 'Frequency is required'],
    enum: ['daily', 'weekly', 'monthly'],
  },
  reminder: {
    type: String,
    default: '',
  },
  history: [{
    type: String,
  }],
  color: {
    type: String,
    required: [true, 'Color is required'],
    match: [/^#[0-9A-F]{6}$/i, 'Invalid color format'],
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Todo model
export interface ITodo extends Document {
  _id: string;
  title: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const TodoSchema = new Schema<ITodo>({
  title: {
    type: String,
    required: [true, 'Todo title is required'],
    trim: true,
    maxlength: [200, 'Todo title must be less than 200 characters'],
  },
  completed: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: String,
    required: [true, 'Priority is required'],
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for better performance
HabitSchema.index({ userId: 1, createdAt: -1 });
TodoSchema.index({ userId: 1, createdAt: -1 });
UserSchema.index({ username: 1 });

// Export models (use existing models if already compiled)
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const Habit = mongoose.models.Habit || mongoose.model<IHabit>('Habit', HabitSchema);
export const Todo = mongoose.models.Todo || mongoose.model<ITodo>('Todo', TodoSchema);
