import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Attendance } from '@/lib/models/Attendance';
import { College } from '@/lib/models/College';
import { getISTDate, escapeCSV } from '@/lib/utils';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || 'today';
  const branch = searchParams.get('branch') || '';
  const course = searchParams.get('course') || '';

  try {
    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const college: any = await College.findOne({ adminEmail: session.user.email, isActive: true }).lean();
    if (!college) return NextResponse.json({ success: false, error: 'No college found.' }, { status: 404 });

    const filter: Record<string, unknown> = { collegeId: college._id };
    if (date === 'today') filter.date = getISTDate();
    else if (date && date !== 'all') filter.date = date;
    if (branch) filter.branch = new RegExp(branch, 'i');
    if (course) filter.course = course;

    const records = await Attendance.find(filter).select('-photoData -__v').sort({ timestamp: -1 }).lean();

    const headers = ['#','Name','Reg No','Email','Branch','Semester','Course','College','Date','Time (IST)','Distance','Face Verified','Face Confidence','Latitude','Longitude'];
    const rows = records.map((r, i) => [
      i+1, r.name, r.regNo, r.email, r.branch, r.semester, r.course, r.collegeName,
      r.date, r.time, r.distanceFromCampus, r.faceVerified ? 'Yes' : 'No',
      `${Math.round((r.faceConfidence || 0) * 100)}%`, r.latitude, r.longitude,
    ].map(escapeCSV).join(','));

    const csv = [headers.map(escapeCSV).join(','), ...rows].join('\r\n');
    const filename = `attendance_${college.shortName}_${getISTDate()}.csv`;

    return new Response('\uFEFF' + csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` },
    });
  } catch (err) {
    console.error('[Export]', err);
    return NextResponse.json({ success: false, error: 'Export failed.' }, { status: 500 });
  }
}
