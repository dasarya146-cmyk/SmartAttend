import mongoose, { Schema, models, model } from 'mongoose';

export interface ICollege {
  _id: string;
  name: string;
  shortName: string;
  adminEmail: string;   // Google email of the admin who owns this college
  adminName: string;
  campusLat: number;
  campusLon: number;
  campusRadius: number; // meters
  campusName: string;
  windowStart: string;  // HH:MM 24h IST
  windowEnd: string;
  courses: string[];
  logoUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CollegeSchema = new Schema<ICollege>({
  name:          { type: String, required: true, trim: true, maxlength: 200 },
  shortName:     { type: String, required: true, trim: true, maxlength: 20 },
  adminEmail:    { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  adminName:     { type: String, required: true, trim: true },
  campusLat:     { type: Number, required: true },
  campusLon:     { type: Number, required: true },
  campusRadius:  { type: Number, default: 500 },
  campusName:    { type: String, required: true, trim: true },
  windowStart:   { type: String, default: '08:00' },
  windowEnd:     { type: String, default: '10:00' },
  courses:       { type: [String], default: ['BTech', 'MCA', 'MBA', 'MSc', 'Other'] },
  logoUrl:       { type: String, default: null },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

export const College = models.College || model<ICollege>('College', CollegeSchema);
