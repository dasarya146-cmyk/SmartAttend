import mongoose, { Schema, models, model } from 'mongoose';

export interface IStudent {
  _id: string;
  uid: string;
  email: string;
  name: string;
  regNo: string;
  branch: string;
  semester: string;
  course: string;
  collegeId: mongoose.Types.ObjectId;
  collegeName: string;
  photoUrl: string | null;
  profilePhoto: string | null;
  faceDescriptor: number[] | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>({
  uid:       { type: String, required: true, unique: true, index: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  name:      { type: String, required: true, trim: true, maxlength: 100 },
  regNo:     { type: String, required: true, trim: true, maxlength: 30 },
  branch:    { type: String, required: true, trim: true, maxlength: 100 },
  semester:  { type: String, required: true, trim: true, maxlength: 20 },
  course:    { type: String, required: true, trim: true },
  collegeId:   { type: Schema.Types.ObjectId, ref: 'College', required: true, index: true },
  collegeName: { type: String, required: true, trim: true },
  photoUrl:       { type: String, default: null },
  profilePhoto:   { type: String, default: null },
  faceDescriptor: { type: [Number], default: null },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

export const Student = models.Student || model<IStudent>('Student', StudentSchema);
