import Header from '../components/layout/Header';
import { Upload } from 'lucide-react';

export default function MediaPage() {
  return (
    <>
      <Header
        title="Media Upload"
        subtitle="Upload and match media files to your content plan"
      />
      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="border-2 border-dashed border-warm-beige rounded-xl p-12 text-center bg-white/50 hover:border-dusty-rose/50 transition-colors cursor-pointer">
            <Upload size={40} className="mx-auto text-soft-gray mb-4" />
            <p className="text-charcoal font-medium">
              Drop media files here or click to upload
            </p>
            <p className="text-sm text-soft-gray mt-2">
              Use naming convention: day1-ig.jpg, day1-tiktok.mp4, day1-fb.jpg, etc.
            </p>
          </div>

          <div className="mt-8 text-center text-soft-gray text-sm">
            Generate a content plan first, then upload media files to match.
          </div>
        </div>
      </div>
    </>
  );
}
