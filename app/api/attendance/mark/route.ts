import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Attendance } from '@/lib/models/Attendance';
import { Student } from '@/lib/models/Student';
import { College } from '@/lib/models/College';
import { haversine, isInWindow, getISTDate, getISTTime } from '@/lib/utils';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'You must be logged in.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { latitude, longitude, photoData, faceVerified, faceConfidence } = body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ success: false, error: 'Valid GPS coordinates required.' }, { status: 400 });
    }
    if (!faceVerified) {
      return NextResponse.json({ success: false, error: 'Face verification failed. Please retry.' }, { status: 400 });
    }

    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const student: any = await Student.findOne({ email: session.user.email }).lean();
    if (!student) {
      return NextResponse.json({ success: false, error: 'Profile not found. Please complete onboarding.', needsOnboarding: true }, { status: 404 });
    }

    // Load this student's college config
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const college: any = await College.findById(student.collegeId).lean();
    if (!college) {
      return NextResponse.json({ success: false, error: 'Your college configuration was not found.' }, { status: 404 });
    }

    if (!isInWindow(college.windowStart, college.windowEnd)) {
      return NextResponse.json({
        success: false,
        error: `Attendance only allowed ${college.windowStart}–${college.windowEnd} IST at ${college.name}.`,
      }, { status: 400 });
    }

    const distance = haversine(latitude, longitude, college.campusLat, college.campusLon);
    if (distance > college.campusRadius) {
      return NextResponse.json({
        success: false,
        error: `You are ${Math.round(distance)}m from campus. Must be within ${college.campusRadius}m.`,
      }, { status: 400 });
    }

    const todayIST = getISTDate();
    const existing = await Attendance.findOne({ uid: student.uid, date: todayIST });
    if (existing) {
      return NextResponse.json({
        success: false,
        error: `Attendance already marked today at ${existing.time}.`,
      }, { status: 409 });
    }

    const record = await Attendance.create({
      studentId: student._id,
      uid: student.uid,
      name: student.name,
      regNo: student.regNo,
      email: student.email,
      branch: student.branch,
      semester: student.semester,
      course: student.course,
      collegeId: student.collegeId,
      collegeName: student.collegeName,
      latitude, longitude,
      distanceFromCampus: `${Math.round(distance)}m`,
      faceVerified: true,
      faceConfidence: faceConfidence || 0,
      photoData: photoData || null,
      date: todayIST,
      time: getISTTime(),
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Attendance marked for ${student.name}!`,
      record: { id: record._id, name: record.name, regNo: record.regNo, course: record.course, date: record.date, time: record.time, distanceFromCampus: record.distanceFromCampus },
    }, { status: 201 });

  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    if (e.code === 11000) return NextResponse.json({ success: false, error: 'Attendance already marked today.' }, { status: 409 });
    console.error('[Attendance Mark]', e.message);
    return NextResponse.json({ success: false, error: 'Failed to mark attendance.' }, { status: 500 });
  }
}
