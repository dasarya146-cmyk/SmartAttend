import mongoose, { Schema, models, model } from 'mongoose';

export interface IAttendance {
  _id: string;
  studentId: mongoose.Types.ObjectId;
  uid: string;
  name: string;
  regNo: string;
  email: string;
  branch: string;
  semester: string;
  course: string;
  collegeId: mongoose.Types.ObjectId;
  collegeName: string;
  latitude: number;
  longitude: number;
  distanceFromCampus: string;
  faceVerified: boolean;
  faceConfidence: number;
  photoData: string | null;
  date: string;
  time: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>({
  studentId:  { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  uid:        { type: String, required: true, index: true },
  name:       { type: String, required: true, trim: true },
  regNo:      { type: String, trim: true },
  email:      { type: String, trim: true, lowercase: true },
  branch:     { type: String, trim: true },
  semester:   { type: String, trim: true },
  course:     { type: String, trim: true },
  collegeId:  { type: Schema.Types.ObjectId, ref: 'College', required: true, index: true },
  collegeName:{ type: String, trim: true },
  latitude:   { type: Number, required: true },
  longitude:  { type: Number, required: true },
  distanceFromCampus: { type: String, default: '—' },
  faceVerified:  { type: Boolean, default: false },
  faceConfidence:{ type: Number, default: 0 },
  photoData:  { type: String, default: null },
  date:       { type: String, required: true, index: true },
  time:       { type: String },
  timestamp:  { type: Date, default: Date.now },
}, { timestamps: true });

AttendanceSchema.index({ uid: 1, date: 1 }, { unique: true });

export const Attendance = models.Attendance || model<IAttendance>('Attendance', AttendanceSchema);
