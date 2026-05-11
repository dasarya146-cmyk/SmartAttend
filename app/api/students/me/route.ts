import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Student } from '@/lib/models/Student';

// GET /api/students/me — returns own profile (without heavy base64 fields)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    await connectDB();
    const student = await Student.findOne({ email: session.user.email })
      .select('-profilePhoto -faceDescriptor')
      .lean();

    if (!student) {
      return NextResponse.json({ success: false, error: 'Not found.', needsOnboarding: true }, { status: 404 });
    }

    return NextResponse.json({ success: true, student });
  } catch (err) {
    console.error('[Students ME]', err);
    return NextResponse.json({ success: false, error: 'Server error.' }, { status: 500 });
  }
}
