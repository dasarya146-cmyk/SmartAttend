import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Student } from '@/lib/models/Student';
import { College } from '@/lib/models/College';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, regNo, branch, semester, course, collegeId, profilePhoto, faceDescriptor } = body;

    if (!name || !regNo || !branch || !semester || !course || !collegeId) {
      return NextResponse.json({ success: false, error: 'All fields including college are required.' }, { status: 400 });
    }

    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const college: any = await College.findById(collegeId).lean();
    if (!college) return NextResponse.json({ success: false, error: 'Invalid college selected.' }, { status: 400 });

    const existing = await Student.findOne({ email: session.user.email });
    if (existing) return NextResponse.json({ success: false, error: 'Profile already exists.' }, { status: 409 });

    const uid = (session.user as Record<string, string>).uid || session.user.email;
    const student = await Student.create({
      uid, email: session.user.email,
      name: name.trim(), regNo: regNo.trim(),
      branch: branch.trim(), semester: semester.trim(), course,
      collegeId: new mongoose.Types.ObjectId(collegeId),
      collegeName: college.name,
      photoUrl: session.user.image || null,
      profilePhoto: profilePhoto || null,
      faceDescriptor: faceDescriptor || null,
    });

    return NextResponse.json({ success: true, message: 'Profile created!', student: { id: student._id, name: student.name, regNo: student.regNo, course: student.course, collegeName: student.collegeName } }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: number };
    if (e.code === 11000) return NextResponse.json({ success: false, error: 'Profile already exists.' }, { status: 409 });
    console.error('[Onboard]', err);
    return NextResponse.json({ success: false, error: 'Failed to save profile.' }, { status: 500 });
  }
}
