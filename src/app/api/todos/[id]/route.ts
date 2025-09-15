import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Todo } from '@/lib/models';
import { authenticateUser, createAuthErrorResponse } from '@/lib/auth-middleware';

// PUT /api/todos/[id] - Update a todo
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

    // Validate priority if it's being updated
    if (updates.priority && !['high', 'medium', 'low'].includes(updates.priority)) {
      return NextResponse.json(
        { error: 'Invalid priority. Must be high, medium, or low' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find and update the todo (only if it belongs to the authenticated user)
    const todo = await Todo.findOneAndUpdate(
      { _id: id, userId: authResult.user!.id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    const transformedTodo = {
      id: todo._id.toString(),
      title: todo.title,
      completed: todo.completed,
      priority: todo.priority,
      userId: todo.userId.toString(),
      createdAt: todo.createdAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      todo: transformedTodo,
    });

  } catch (error) {
    console.error('Update todo error:', error);
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    );
  }
}

// DELETE /api/todos/[id] - Delete a todo
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

    // Find and delete the todo (only if it belongs to the authenticated user)
    const todo = await Todo.findOneAndDelete({
      _id: id,
      userId: authResult.user!.id
    });

    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Todo deleted successfully',
    });

  } catch (error) {
    console.error('Delete todo error:', error);
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
