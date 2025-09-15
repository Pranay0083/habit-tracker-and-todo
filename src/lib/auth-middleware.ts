import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { User } from '@/lib/models';
import { getTokenFromRequest, verifyToken } from '@/lib/jwt';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

export async function authenticateUser(request: Request) {
  try {
    // Get token from request
    const token = getTokenFromRequest(request);
    
    if (!token) {
      return { error: 'No token provided', status: 401 };
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return { error: 'Invalid or expired token', status: 401 };
    }

    // Connect to database
    await connectToDatabase();

    // Verify user exists
    const user = await User.findById(payload.userId);
    if (!user) {
      return { error: 'User not found', status: 401 };
    }

    // Return user data
    return {
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
      }
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return { error: 'Authentication failed', status: 500 };
  }
}

export function createAuthErrorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
