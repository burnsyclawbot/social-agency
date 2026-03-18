import Header from '../components/layout/Header';

export default function HistoryPage() {
  return (
    <>
      <Header
        title="Post History"
        subtitle="Published and scheduled posts"
      />
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto text-center text-soft-gray text-sm">
          No posts published yet. Posts will appear here after publishing.
        </div>
      </div>
    </>
  );
}
