import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Layers } from 'lucide-react';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Layers size={16} className="text-white" />
            </div>
            <span className="font-semibold text-surface-900 text-lg">CollabBoard</span>
          </Link>
          <Link to="/login" className="flex items-center gap-2 text-sm font-medium text-surface-600 hover:text-surface-900 transition-colors">
            <ArrowLeft size={16} />
            Back to App
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-surface-900 mb-2">Privacy Policy</h1>
          <p className="text-surface-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <div className="prose prose-surface max-w-none text-surface-700 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">1. Information We Collect</h2>
              <p>We collect information to provide better services to all our users. The types of personal information we collect include:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>Account Information:</strong> When you create an account, we collect your name, email address, and password.</li>
                <li><strong>Content Data:</strong> We store the drawings, text, and other content you create on your whiteboards.</li>
                <li><strong>Usage Data:</strong> We automatically collect information about how you interact with our services, such as access times, pages viewed, and your IP address.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">2. How We Use Your Information</h2>
              <p>We use the information we collect from all our services for the following purposes:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>To provide, maintain, and improve our services.</li>
                <li>To enable real-time collaboration features and synchronize your data across devices.</li>
                <li>To authenticate your identity and protect against fraud or unauthorized access.</li>
                <li>To send you technical notices, updates, security alerts, and support messages.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">3. Data Sharing and Disclosure</h2>
              <p>
                We do not sell your personal information to third parties. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>With your collaborators:</strong> When you invite others to your boards, they will be able to see your name, cursor, and the content you create.</li>
                <li><strong>With service providers:</strong> We use third-party services (like hosting providers) who assist us in operating our platform.</li>
                <li><strong>For legal reasons:</strong> We may share information if we have a good-faith belief that access, use, preservation, or disclosure of the information is reasonably necessary to meet any applicable law, regulation, legal process, or enforceable governmental request.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">4. Data Security</h2>
              <p>
                We work hard to protect CollabBoard and our users from unauthorized access to or unauthorized alteration, disclosure, or destruction of information we hold. We use industry-standard encryption protocols (SSL/TLS) to protect data in transit and secure database architectures to protect data at rest.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">5. Your Data Rights</h2>
              <p>Depending on your location, you may have the right to:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Access the personal data we hold about you.</li>
                <li>Request that we correct any inaccuracies in your personal data.</li>
                <li>Request the deletion of your personal data and account.</li>
                <li>Export a copy of your whiteboard data.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">6. Changes to This Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top of this Privacy Policy. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-200 bg-white py-8">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-surface-500">
            &copy; {new Date().getFullYear()} CollabBoard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPage;
