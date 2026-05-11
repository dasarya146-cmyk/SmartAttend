import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { College } from '@/lib/models/College';

// GET /api/colleges — public, used for student college dropdown
export async function GET() {
  try {
    await connectDB();
    const colleges = await College.find({ isActive: true })
      .select('_id name shortName campusName courses')
      .sort({ name: 1 })
      .lean();
    return NextResponse.json({ success: true, colleges });
  } catch (err) {
    console.error('[Colleges GET]', err);
    return NextResponse.json({ success: false, error: 'Failed to load colleges.' }, { status: 500 });
  }
}
