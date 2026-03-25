export interface ContentPlan {
  id: string;
  topic: string;
  generatedAt: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'media-pending' | 'ready' | 'published';
  days: Day[];
}

export interface Day {
  dayNumber: number;
  date: string;
  angle: string;
  shotList: ShotList;
  posts: Post[];
}

export type ShotStatus = 'planned' | 'taken' | 'uploaded';

export interface ShotMedia {
  id: string;
  originalName: string;
  displayName: string;
  url: string;
  type: 'image' | 'video';
  size?: number;
}

export interface ShotList {
  contentType: string;
  subject: string;
  framing: string;
  setting: string;
  keyElements: string;
  lighting: string;
  platformFormat: string;
  fileNames: string[];
  notes: string;
  status: ShotStatus;
  media: ShotMedia[];
}

export interface Post {
  id: string;
  platform: Platform;
  text: string;
  scheduledTime: string;
  mediaUrls: string[];
  status: PostStatus;
  postSubmissionId?: string;
  publicUrl?: string;
  errorMessage?: string;
  validation: ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface MediaFile {
  name: string;
  file?: File;
  url?: string;
  matchedTo?: string;
  autoMatched: boolean;
  type: 'image' | 'video';
}

export interface PostLogEntry {
  id: string;
  date: string;
  platform: Platform;
  text: string;
  mediaUrls: string[];
  status: 'published' | 'failed';
  publicUrl?: string;
  errorMessage?: string;
  planId?: string;
}

export type Platform = 'instagram' | 'tiktok' | 'facebook' | 'linkedin';
export type PostStatus = 'draft' | 'validated' | 'publishing' | 'published' | 'failed';
