import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Attendance } from '@/lib/models/Attendance';
import { Student } from '@/lib/models/Student';
import { College } from '@/lib/models/College';
import { getISTDate } from '@/lib/utils';

async function getAdminCollege(email: string) {
  return College.findOne({ adminEmail: email, isActive: true }).lean();
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });

  try {
    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const college: any = await getAdminCollege(session.user.email);
    if (!college) return NextResponse.json({ success: false, error: 'No college found.', needsSetup: true }, { status: 404 });

    const todayIST = getISTDate();
    const collegeId = college._id;

    const [totalStudents, totalAttendance, todayCount, courseBreakdown, last7Days, branchBreakdown] = await Promise.all([
      Student.countDocuments({ collegeId, isActive: true }),
      Attendance.countDocuments({ collegeId }),
      Attendance.countDocuments({ collegeId, date: todayIST }),

      Attendance.aggregate([
        { $match: { collegeId } },
        { $group: { _id: '$course', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Attendance.aggregate([
        { $match: { collegeId, date: { $gte: (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); })() } } },
        { $group: { _id: '$date', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      Attendance.aggregate([
        { $match: { collegeId } },
        { $group: { _id: '$branch', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
    ]);

    const labels: string[] = [], data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      const found = last7Days.find((x: { _id: string; count: number }) => x._id === dateStr);
      labels.push(label); data.push(found ? found.count : 0);
    }

    const recentToday = await Attendance.find({ collegeId, date: todayIST })
      .select('name regNo course time branch faceVerified faceConfidence').sort({ timestamp: -1 }).limit(10).lean();

    return NextResponse.json({ success: true, stats: { totalStudents, totalAttendance, todayCount, courseBreakdown, branchBreakdown, chart: { labels, data }, recentToday, college } });
  } catch (err) {
    console.error('[Admin Stats]', err);
    return NextResponse.json({ success: false, error: 'Failed to load stats.' }, { status: 500 });
  }
}
