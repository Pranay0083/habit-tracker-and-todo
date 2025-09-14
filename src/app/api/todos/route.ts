import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Todo } from '@/lib/models';
import { authenticateUser, createAuthErrorResponse } from '@/lib/auth-middleware';

// GET /api/todos - Get all todos for the authenticated user
export async function GET(request: Request) {
  try {
    const authResult = await authenticateUser(request);
    
    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error!, authResult.status!);
    }

    await connectToDatabase();

    const todos = await Todo.find({ userId: authResult.user!.id })
      .sort({ createdAt: -1 });

    // Transform the data to match frontend expectations
    const transformedTodos = todos.map(todo => ({
      id: todo._id.toString(),
      title: todo.title,
      completed: todo.completed,
      priority: todo.priority,
      userId: todo.userId.toString(),
      createdAt: todo.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      todos: transformedTodos,
    });

  } catch (error) {
    console.error('Get todos error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todos' },
      { status: 500 }
    );
  }
}

// POST /api/todos - Create a new todo
export async function POST(request: Request) {
  try {
    const authResult = await authenticateUser(request);
    
    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error!, authResult.status!);
    }

    const { title, priority = 'medium' } = await request.json();

    // Validation
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!['high', 'medium', 'low'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority. Must be high, medium, or low' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const newTodo = new Todo({
      title: title.trim(),
      completed: false,
      priority,
      userId: authResult.user!.id,
    });

    await newTodo.save();

    const transformedTodo = {
      id: newTodo._id.toString(),
      title: newTodo.title,
      completed: newTodo.completed,
      priority: newTodo.priority,
      userId: newTodo.userId.toString(),
      createdAt: newTodo.createdAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      todo: transformedTodo,
    }, { status: 201 });

  } catch (error) {
    console.error('Create todo error:', error);
    return NextResponse.json(
      { error: 'Failed to create todo' },
      { status: 500 }
    );
  }
}
