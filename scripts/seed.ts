/*
  Seed script:
  - Creates/overwrites a test user
  - Seeds a few habits with history populated for the past week only (Mon-Sun of last week)
  - Seeds a few todos created/completed on last week
  - Ensures the current week has no completions/todos
*/

import fs from 'fs';
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import connectToDatabase from '../src/lib/mongodb';
import { User, Habit, Todo } from '../src/lib/models';

// Helpers
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDate(d: Date) {
  return startOfDay(d).toISOString().slice(0, 10);
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Get last week's Monday..Sunday date strings (relative to current locale week starting Monday)
function getLastWeekDates(): string[] {
  const today = startOfDay(new Date());
  const day = today.getDay(); // 0=Sun .. 6=Sat
  // Compute Monday of current week: if Sunday (0), go back 6 days; else back (day-1)
  const mondayThisWeek = addDays(today, day === 0 ? -6 : -(day - 1));
  const mondayLastWeek = addDays(mondayThisWeek, -7);
  // Build 7 days
  return Array.from({ length: 7 }, (_, i) => isoDate(addDays(mondayLastWeek, i)));
}

function getThisWeekDates(): string[] {
  const today = startOfDay(new Date());
  const day = today.getDay();
  const mondayThisWeek = addDays(today, day === 0 ? -6 : -(day - 1));
  return Array.from({ length: 7 }, (_, i) => isoDate(addDays(mondayThisWeek, i)));
}

async function main() {
  // Load env from .env.local if present, else fallback to .env
  const envLocal = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envLocal)) {
    dotenvConfig({ path: envLocal });
  } else {
    dotenvConfig();
  }

  const mongoUri = process.env.mongo_uri
  if (!mongoUri) {
    console.error('Missing mongo_uri in environment (.env.local)');
    process.exit(1);
  }

  await connectToDatabase();

  const username = 'testuser';
  const password = 'password123';

  // Idempotent: remove existing test user and related data
  const existing = await User.findOne({ username });
  if (existing) {
    await Habit.deleteMany({ userId: existing._id });
    await Todo.deleteMany({ userId: existing._id });
    await User.deleteOne({ _id: existing._id });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({ username, password: hashed });

  const lastWeek = getLastWeekDates();
  const thisWeek = getThisWeekDates();

  // Seed habits with last week's completions only
  const habitsSeed = [
    {
      name: 'Morning Run',
      category: 'Health',
      frequency: 'daily' as const,
      reminder: '07:00',
      color: '#22C55E',
      history: lastWeek, // completed each day last week
    },
    {
      name: 'Read 20 pages',
      category: 'Learning',
      frequency: 'daily' as const,
      reminder: '21:00',
      color: '#3B82F6',
      history: lastWeek.filter((_, i) => i % 2 === 0), // every other day last week
    },
    {
      name: 'Weekly Review',
      category: 'Productivity',
      frequency: 'weekly' as const,
      reminder: '',
      color: '#F59E0B',
      history: [lastWeek[6]], // completed on last Sunday
    },
  ];

  const habits = await Habit.insertMany(
    habitsSeed.map((h) => ({ ...h, userId: user._id }))
  );

  // Ensure no entries for this week in habits
  // (history already only contains lastWeek; just a guard in case defaults change)
  for (const h of habits) {
    h.history = h.history.filter((d: string) => !thisWeek.includes(d));
    await h.save();
  }

  // Seed todos created last week, none this week
  const priorities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
  const todoDocs = [] as any[];
  for (let i = 0; i < 6; i++) {
    const created = new Date(lastWeek[0]); // Monday last week as base
    created.setDate(created.getDate() + i);
    const title = `Last week task #${i + 1}`;
    const priority = priorities[i % priorities.length];
    const completed = i % 3 !== 0; // mark some as completed
    todoDocs.push({ title, completed, priority, userId: user._id, createdAt: created });
  }
  await Todo.insertMany(todoDocs);

  console.log('Seed completed');
  console.log('Login with:', { username, password });
  console.log('Habits created:', habits.length);
  const todosCount = await Todo.countDocuments({ userId: user._id });
  console.log('Todos created:', todosCount);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch (e) {}
    process.exit(0);
  });
