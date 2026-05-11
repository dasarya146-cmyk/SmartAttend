import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { College } from '@/lib/models/College';

async function getAdminCollege(email: string) {
  const college = await College.findOne({ adminEmail: email, isActive: true });
  return college;
}

// GET /api/admin/college — get admin's own college
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }
  try {
    await connectDB();
    const college = await getAdminCollege(session.user.email);
    if (!college) {
      return NextResponse.json({ success: false, error: 'No college found.', needsSetup: true }, { status: 404 });
    }
    return NextResponse.json({ success: true, college });
  } catch (err) {
    console.error('[Admin College GET]', err);
    return NextResponse.json({ success: false, error: 'Server error.' }, { status: 500 });
  }
}

// PUT /api/admin/college — update admin's college settings
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }
  try {
    const body = await req.json();
    await connectDB();

    const allowed = ['name', 'shortName', 'campusName', 'campusLat', 'campusLon',
                     'campusRadius', 'windowStart', 'windowEnd', 'courses'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const college = await College.findOneAndUpdate(
      { adminEmail: session.user.email },
      { $set: update },
      { new: true }
    );
    if (!college) {
      return NextResponse.json({ success: false, error: 'College not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, college });
  } catch (err) {
    console.error('[Admin College PUT]', err);
    return NextResponse.json({ success: false, error: 'Failed to update.' }, { status: 500 });
  }
}
