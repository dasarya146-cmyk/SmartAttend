import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Settings } from '@/lib/models/Settings';

// GET /api/settings — public, used by student page to load campus config
export async function GET() {
  try {
    await connectDB();
    let settings = await Settings.findOne({ key: 'global' }).lean();
    if (!settings) {
      settings = await Settings.create({ key: 'global' });
    }
    return NextResponse.json({ success: true, settings });
  } catch (err) {
    console.error('[Settings GET]', err);
    return NextResponse.json({ success: false, error: 'Failed to load settings.' }, { status: 500 });
  }
}

// PUT /api/settings — admin only
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    await connectDB();

    const allowed = ['campusLat', 'campusLon', 'campusName', 'campusRadius',
                     'windowStart', 'windowEnd', 'activeCourses',
                     'platformName', 'institutionName', 'programName'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $set: update },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, settings });
  } catch (err) {
    console.error('[Settings PUT]', err);
    return NextResponse.json({ success: false, error: 'Failed to save settings.' }, { status: 500 });
  }
}
