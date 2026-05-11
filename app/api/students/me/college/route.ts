import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Student } from '@/lib/models/Student';
import { College } from '@/lib/models/College';

// GET /api/students/me/college — returns the student's college config for attendance page
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }
  try {
    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const student: any = await Student.findOne({ email: session.user.email }).select('collegeId').lean();
    if (!student) return NextResponse.json({ success: false, needsOnboarding: true }, { status: 404 });

    const college = await College.findById(student.collegeId)
      .select('campusLat campusLon campusRadius campusName windowStart windowEnd name')
      .lean();

    if (!college) return NextResponse.json({ success: false, error: 'College not found.' }, { status: 404 });
    return NextResponse.json({ success: true, college });
  } catch (err) {
    console.error('[Student College]', err);
    return NextResponse.json({ success: false, error: 'Server error.' }, { status: 500 });
  }
}
