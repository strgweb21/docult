import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 }
      );
    }

    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error verifying password:', error);
    return NextResponse.json(
      { error: 'Failed to verify password' },
      { status: 500 }
    );
  }
}
