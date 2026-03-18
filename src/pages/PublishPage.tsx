import Header from '../components/layout/Header';

export default function PublishPage() {
  return (
    <>
      <Header
        title="Publish"
        subtitle="Review and publish your content plan"
      />
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto text-center text-soft-gray text-sm">
          No content ready to publish. Generate a plan and upload media first.
        </div>
      </div>
    </>
  );
}
