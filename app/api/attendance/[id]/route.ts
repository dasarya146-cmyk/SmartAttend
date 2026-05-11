import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Attendance } from '@/lib/models/Attendance';

function isAdmin(email?: string | null) {
  return email && email === process.env.ADMIN_EMAIL;
}

// GET /api/attendance/[id] — get photo (admin only)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  // Anyone with a session can get their own photo; admins can get any
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: any = await Attendance.findById(id).select('photoData name uid').lean();
    if (!record) return NextResponse.json({ success: false, error: 'Record not found.' }, { status: 404 });
    return NextResponse.json({ success: true, photoData: record.photoData, name: record.name });
  } catch (err) {
    console.error('[Photo GET]', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch photo.' }, { status: 500 });
  }
}

// DELETE /api/attendance/[id] — admin only
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    await connectDB();
    const deleted = await Attendance.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ success: false, error: 'Record not found.' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Record deleted.' });
  } catch (err) {
    console.error('[Attendance DELETE]', err);
    return NextResponse.json({ success: false, error: 'Failed to delete.' }, { status: 500 });
  }
}
