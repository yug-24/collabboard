import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Layers } from 'lucide-react';

const TermsPage = () => {
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
          <h1 className="text-3xl font-bold text-surface-900 mb-2">Terms of Service</h1>
          <p className="text-surface-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <div className="prose prose-surface max-w-none text-surface-700 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using CollabBoard ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. We reserve the right to modify these terms at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">2. Description of Service</h2>
              <p>
                CollabBoard is a real-time collaborative whiteboarding platform that allows users to draw, brainstorm, and work together on shared digital canvases. The Service is provided "as is" and "as available".
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">3. User Accounts and Security</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>You must provide accurate and complete registration information.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You are solely responsible for all activities that occur under your account.</li>
                <li>You must immediately notify us of any unauthorized use of your account.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">4. Acceptable Use Policy</h2>
              <p>When using CollabBoard, you agree not to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Use the Service for any illegal or unauthorized purpose.</li>
                <li>Upload, post, or transmit any content that is infringing, libelous, defamatory, obscene, or otherwise objectionable.</li>
                <li>Attempt to bypass or break any security mechanism of the Service.</li>
                <li>Transmit any viruses, malware, or any code of a destructive nature.</li>
                <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">5. Intellectual Property</h2>
              <p>
                You retain all rights and ownership to the content you create and upload to CollabBoard. By using the Service, you grant us a worldwide, non-exclusive, royalty-free license to host, store, and display your content strictly for the purpose of providing the Service to you and your collaborators.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">6. Termination</h2>
              <p>
                We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including without limitation if you breach the Terms of Service. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">7. Limitation of Liability</h2>
              <p>
                In no event shall CollabBoard, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
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

export default TermsPage;
