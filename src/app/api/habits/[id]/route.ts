import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Habit } from '@/lib/models';
import { authenticateUser, createAuthErrorResponse } from '@/lib/auth-middleware';

// PUT /api/habits/[id] - Update a habit
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateUser(request);
    
    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error!, authResult.status!);
    }

    const { id } = await params;
    const updates = await request.json();

    await connectToDatabase();

    // Find and update the habit (only if it belongs to the authenticated user)
    const habit = await Habit.findOneAndUpdate(
      { _id: id, userId: authResult.user!.id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!habit) {
      return NextResponse.json(
        { error: 'Habit not found' },
        { status: 404 }
      );
    }

    const transformedHabit = {
      id: habit._id.toString(),
      name: habit.name,
      category: habit.category,
      frequency: habit.frequency,
      reminder: habit.reminder,
      history: habit.history,
      color: habit.color,
      userId: habit.userId.toString(),
    };

    return NextResponse.json({
      success: true,
      habit: transformedHabit,
    });

  } catch (error) {
    console.error('Update habit error:', error);
    return NextResponse.json(
      { error: 'Failed to update habit' },
      { status: 500 }
    );
  }
}

// DELETE /api/habits/[id] - Delete a habit
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateUser(request);
    
    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error!, authResult.status!);
    }

    const { id } = await params;

    await connectToDatabase();

    // Find and delete the habit (only if it belongs to the authenticated user)
    const habit = await Habit.findOneAndDelete({
      _id: id,
      userId: authResult.user!.id
    });

    if (!habit) {
      return NextResponse.json(
        { error: 'Habit not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Habit deleted successfully',
    });

  } catch (error) {
    console.error('Delete habit error:', error);
    return NextResponse.json(
      { error: 'Failed to delete habit' },
      { status: 500 }
    );
  }
}
