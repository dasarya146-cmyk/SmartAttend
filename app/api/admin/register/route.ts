import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { College } from '@/lib/models/College';

// POST /api/admin/register — admin signs up and creates their college
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'You must be logged in with Google to register.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { collegeName, shortName, campusName, campusLat, campusLon,
            campusRadius, windowStart, windowEnd, courses } = body;

    if (!collegeName || !shortName || !campusName || !campusLat || !campusLon) {
      return NextResponse.json({ success: false, error: 'College name, short name, campus name and coordinates are required.' }, { status: 400 });
    }

    await connectDB();

    const existing = await College.findOne({ adminEmail: session.user.email });
    if (existing) {
      return NextResponse.json({ success: false, error: 'You already have a registered college.' }, { status: 409 });
    }

    const college = await College.create({
      name:         collegeName.trim(),
      shortName:    shortName.trim().toUpperCase(),
      adminEmail:   session.user.email,
      adminName:    session.user.name || session.user.email,
      campusName:   campusName.trim(),
      campusLat:    parseFloat(campusLat),
      campusLon:    parseFloat(campusLon),
      campusRadius: parseInt(campusRadius) || 500,
      windowStart:  windowStart || '08:00',
      windowEnd:    windowEnd   || '18:00',
      courses:      Array.isArray(courses) ? courses : ['BTech', 'MCA', 'MBA', 'MSc', 'Other'],
      logoUrl:      session.user.image || null,
    });

    return NextResponse.json({ success: true, message: 'College registered successfully!', college }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: number };
    if (e.code === 11000) {
      return NextResponse.json({ success: false, error: 'A college is already registered with your email.' }, { status: 409 });
    }
    console.error('[Admin Register]', err);
    return NextResponse.json({ success: false, error: 'Registration failed.' }, { status: 500 });
  }
}
