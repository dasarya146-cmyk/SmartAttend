import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Attendance } from '@/lib/models/Attendance';
import { getISTDate } from '@/lib/utils';

function isAdmin(email: string | null | undefined) {
  return email && email === process.env.ADMIN_EMAIL;
}

// GET /api/attendance — admin: paginated, filtered records
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || 'today';
  const branch = searchParams.get('branch') || '';
  const course = searchParams.get('course') || '';
  const search = searchParams.get('search') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(200, parseInt(searchParams.get('limit') || '100'));

  try {
    await connectDB();

    const filter: Record<string, unknown> = {};
    if (date === 'today') filter.date = getISTDate();
    else if (date && date !== 'all') filter.date = date;
    if (branch) filter.branch = new RegExp(branch, 'i');
    if (course) filter.course = course;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { regNo: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .select('-photoData')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(filter),
    ]);

    return NextResponse.json({ success: true, records, total, page });
  } catch (err) {
    console.error('[Attendance GET]', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch records.' }, { status: 500 });
  }
}
