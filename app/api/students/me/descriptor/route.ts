import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Student } from '@/lib/models/Student';

// GET /api/students/me/descriptor — returns stored face descriptor for matching
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const student: any = await Student.findOne({ email: session.user.email })
      .select('faceDescriptor name')
      .lean();

    if (!student) {
      return NextResponse.json({ success: false, error: 'Not found.', needsOnboarding: true }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      faceDescriptor: student.faceDescriptor,
      name: student.name,
    });
  } catch (err) {
    console.error('[Students Descriptor]', err);
    return NextResponse.json({ success: false, error: 'Server error.' }, { status: 500 });
  }
}
