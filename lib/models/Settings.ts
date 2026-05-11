import { Schema, models, model } from 'mongoose';

export interface ISettings {
  _id: string;
  key: string;
  campusLat: number;
  campusLon: number;
  campusName: string;
  campusRadius: number;
  windowStart: string;
  windowEnd: string;
  activeCourses: string[];
  platformName: string;
  institutionName: string;
  programName: string;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>({
  key:           { type: String, default: 'global', unique: true },
  campusLat:     { type: Number, default: 20.2169125 },
  campusLon:     { type: Number, default: 85.6829219 },
  campusName:    { type: String, default: 'GITAM University, Bhubaneswar' },
  campusRadius:  { type: Number, default: 700 },
  windowStart:   { type: String, default: '00:00' },
  windowEnd:     { type: String, default: '23:59' },
  activeCourses: { type: [String], default: ['BTech', 'MCA', 'MBA', 'MSc', 'Other'] },
  platformName:  { type: String, default: 'Smart Attendance' },
  institutionName: { type: String, default: 'GITAM University, Bhubaneswar' },
  programName:   { type: String, default: 'Training Program' },
}, { timestamps: true });

export const Settings = models.Settings || model<ISettings>('Settings', SettingsSchema);
