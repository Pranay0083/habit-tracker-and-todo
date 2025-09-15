import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Habit } from '@/lib/models';
import { authenticateUser, createAuthErrorResponse } from '@/lib/auth-middleware';

// GET /api/habits - Get all habits for the authenticated user
export async function GET(request: Request) {
  try {
    const authResult = await authenticateUser(request);
    
    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error!, authResult.status!);
    }

    await connectToDatabase();

    const habits = await Habit.find({ userId: authResult.user!.id })
      .sort({ createdAt: -1 });

    // Transform the data to match frontend expectations
    const transformedHabits = habits.map(habit => ({
      id: habit._id.toString(),
      name: habit.name,
      category: habit.category,
      frequency: habit.frequency,
      reminder: habit.reminder,
      history: habit.history,
      color: habit.color,
      userId: habit.userId.toString(),
    }));

    return NextResponse.json({
      success: true,
      habits: transformedHabits,
    });

  } catch (error) {
    console.error('Get habits error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch habits' },
      { status: 500 }
    );
  }
}

// POST /api/habits - Create a new habit
export async function POST(request: Request) {
  try {
    const authResult = await authenticateUser(request);
    
    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error!, authResult.status!);
    }

    const { name, category, frequency, reminder, color } = await request.json();

    // Validation
    if (!name || !category || !frequency || !color) {
      return NextResponse.json(
        { error: 'Name, category, frequency, and color are required' },
        { status: 400 }
      );
    }

    if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency. Must be daily, weekly, or monthly' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const newHabit = new Habit({
      name: name.trim(),
      category: category.trim(),
      frequency,
      reminder: reminder || '',
      history: [],
      color,
      userId: authResult.user!.id,
    });

    await newHabit.save();

    const transformedHabit = {
      id: newHabit._id.toString(),
      name: newHabit.name,
      category: newHabit.category,
      frequency: newHabit.frequency,
      reminder: newHabit.reminder,
      history: newHabit.history,
      color: newHabit.color,
      userId: newHabit.userId.toString(),
    };

    return NextResponse.json({
      success: true,
      habit: transformedHabit,
    }, { status: 201 });

  } catch (error) {
    console.error('Create habit error:', error);
    return NextResponse.json(
      { error: 'Failed to create habit' },
      { status: 500 }
    );
  }
}
