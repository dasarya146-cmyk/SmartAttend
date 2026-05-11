import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Student } from '@/lib/models/Student';
import { College } from '@/lib/models/College';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const branch = searchParams.get('branch') || '';
  const course = searchParams.get('course') || '';

  try {
    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const college: any = await College.findOne({ adminEmail: session.user.email, isActive: true }).lean();
    if (!college) return NextResponse.json({ success: false, error: 'No college.', needsSetup: true }, { status: 404 });

    const filter: Record<string, unknown> = { collegeId: college._id, isActive: true };
    if (branch) filter.branch = new RegExp(branch, 'i');
    if (course) filter.course = course;
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { regNo: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];

    const students = await Student.find(filter).select('-profilePhoto -faceDescriptor').sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, students, count: students.length });
  } catch (err) {
    console.error('[Admin Students GET]', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch.' }, { status: 500 });
  }
}
