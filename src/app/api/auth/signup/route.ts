import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb';
import { User } from '@/lib/models';
import { signToken } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const { username, password, confirmPassword } = await request.json();

    // Validation
    if (!username || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Username, password, and confirmPassword are required' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters long' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = new User({
      username: username.toLowerCase(),
      password: hashedPassword,
    });

    await newUser.save();

    // Generate JWT token
    const token = signToken({
      userId: newUser._id.toString(),
      username: newUser.username,
    });

    // Return user data (without password) and token
    const userData = {
      id: newUser._id.toString(),
      username: newUser.username,
      createdAt: newUser.createdAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      user: userData,
      token,
    }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
