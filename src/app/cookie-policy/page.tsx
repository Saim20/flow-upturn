export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background-secondary dark:bg-background-primary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-surface-primary rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-foreground-primary mb-2">Cookie Policy</h1>
        <p className="text-foreground-secondary mb-8">Last updated: November 29, 2025</p>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-foreground-secondary mb-6">
            This Cookie Policy explains how Upturn (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, and &quot;our&quot;) uses cookies and similar technologies to recognize you when you visit our website and use our Flow application (&quot;Service&quot;). It explains what these technologies are and why we use them, as well as your rights to control our use of them.
          </p>

          <h2 className="text-2xl font-semibold text-foreground-primary mt-8 mb-4">What are Cookies?</h2>
          <p className="text-foreground-secondary mb-6">
            Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.
          </p>
          <p className="text-foreground-secondary mb-6">
            Cookies set by the website owner (in this case, Upturn) are called &quot;first party cookies&quot;. Cookies set by parties other than the website owner are called &quot;third party cookies&quot;. Third party cookies enable third party features or functionality to be provided on or through the website (e.g., advertising, interactive content, and analytics). The parties that set these third party cookies can recognize your computer both when it visits the website in question and also when it visits certain other websites.
          </p>

          <h2 className="text-2xl font-semibold text-foreground-primary mt-8 mb-4">Why Do We Use Cookies?</h2>
          <p className="text-foreground-secondary mb-4">
            We use first party and third party cookies for several reasons. Some cookies are required for technical reasons in order for our Service to operate, and we refer to these as &quot;essential&quot; or &quot;strictly necessary&quot; cookies. Other cookies also enable us to track and target the interests of our users to enhance the experience on our Service. Third parties serve cookies through our Service for advertising, analytics, and other purposes.
          </p>

          <h2 className="text-2xl font-semibold text-foreground-primary mt-8 mb-4">Types of Cookies We Use</h2>
          
          <h3 className="text-xl font-semibold text-foreground-primary mt-6 mb-3">1. Essential Cookies</h3>
          <p className="text-foreground-secondary mb-4">
            These cookies are strictly necessary to provide you with services available through our Service and to use some of its features, such as access to secure areas. Because these cookies are strictly necessary to deliver the Service to you, you cannot refuse them without impacting how our Service functions.
          </p>
          <div className="bg-background-tertiary dark:bg-surface-secondary p-4 rounded-lg mb-6">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary">
                  <th className="text-left py-2 font-semibold text-foreground-primary">Cookie Name</th>
                  <th className="text-left py-2 font-semibold text-foreground-primary">Purpose</th>
                  <th className="text-left py-2 font-semibold text-foreground-primary">Expiry</th>
                </tr>
              </thead>
              <tbody className="text-foreground-secondary">
                <tr className="border-b border-border-primary">
                  <td className="py-2">sb-*-auth-token</td>
                  <td className="py-2">Authentication and session management</td>
                  <td className="py-2">Session / 24 hours</td>
                </tr>
                <tr className="border-b border-border-primary">
                  <td className="py-2">supabase-auth-token</td>
                  <td className="py-2">User authentication state</td>
                  <td className="py-2">Session</td>
                </tr>
                <tr>
                  <td className="py-2">XSRF-TOKEN</td>
                  <td className="py-2">Security - prevents cross-site request forgery</td>
                  <td className="py-2">Session</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-semibold text-foreground-primary mt-6 mb-3">2. Functionality Cookies</h3>
          <p className="text-foreground-secondary mb-4">
            These cookies are used to recognize you when you return to our Service. This enables us to personalize our content for you, greet you by name, and remember your preferences (for example, your choice of language or region).
          </p>
          <div className="bg-background-tertiary dark:bg-surface-secondary p-4 rounded-lg mb-6">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary">
                  <th className="text-left py-2 font-semibold text-foreground-primary">Cookie Name</th>
                  <th className="text-left py-2 font-semibold text-foreground-primary">Purpose</th>
                  <th className="text-left py-2 font-semibold text-foreground-primary">Expiry</th>
                </tr>
              </thead>
              <tbody className="text-foreground-secondary">
                <tr className="border-b border-border-primary">
                  <td className="py-2">user-preferences</td>
                  <td className="py-2">Stores user preferences and settings</td>
                  <td className="py-2">1 year</td>
                </tr>
                <tr>
                  <td className="py-2">theme</td>
                  <td className="py-2">Remembers light/dark mode preference</td>
                  <td className="py-2">1 year</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-semibold text-foreground-primary mt-6 mb-3">3. Analytics and Performance Cookies</h3>
          <p className="text-foreground-secondary mb-4">
            These cookies are used to collect information about traffic to our Service and how users use our Service. The information gathered does not identify any individual visitor. We use this information to help operate our Service more efficiently, to gather broad demographic information, and to monitor the level of activity on our Service.
          </p>
          <div className="bg-background-tertiary dark:bg-surface-secondary p-4 rounded-lg mb-6">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary">
                  <th className="text-left py-2 font-semibold text-foreground-primary">Cookie Name</th>
                  <th className="text-left py-2 font-semibold text-foreground-primary">Purpose</th>
                  <th className="text-left py-2 font-semibold text-foreground-primary">Expiry</th>
                </tr>
              </thead>
              <tbody className="text-foreground-secondary">
                <tr>
                  <td className="py-2">_ga, _gid</td>
                  <td className="py-2">Google Analytics - tracks user interactions</td>
                  <td className="py-2">2 years / 24 hours</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-semibold text-foreground-primary mt-8 mb-4">How Can You Control Cookies?</h2>
          <p className="text-foreground-secondary mb-4">
            You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences in the following ways:
          </p>
          <ul className="list-disc pl-6 text-foreground-secondary space-y-2 mb-6">
            <li>
              <strong>Browser Settings:</strong> You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our Service though your access to some functionality and areas of our Service may be restricted.
            </li>
            <li>
              <strong>Cookie Preference Center:</strong> You can manage your cookie preferences through our cookie consent banner when you first visit our Service.
            </li>
            <li>
              <strong>Opt-Out Links:</strong> You can opt out of Google Analytics by installing the Google Analytics Opt-out Browser Add-on: <a href="https://tools.google.com/dlpage/gaoptout" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">https://tools.google.com/dlpage/gaoptout</a>
            </li>
          </ul>

          <h2 className="text-2xl font-semibold text-foreground-primary mt-8 mb-4">How to Control Cookies in Your Browser</h2>
          <p className="text-foreground-secondary mb-4">
            Most web browsers allow some control of most cookies through the browser settings. To find out more about cookies, including how to see what cookies have been set, visit:
          </p>
          <ul className="list-disc pl-6 text-foreground-secondary space-y-2 mb-6">
            <li><a href="https://www.aboutcookies.org" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">www.aboutcookies.org</a></li>
            <li><a href="https://www.allaboutcookies.org" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">www.allaboutcookies.org</a></li>
          </ul>
          <p className="text-foreground-secondary mb-4">
            Find out how to manage cookies on popular browsers:
          </p>
          <ul className="list-disc pl-6 text-foreground-secondary space-y-2 mb-6">
            <li><a href="https://support.google.com/accounts/answer/61416" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
            <li><a href="https://support.microsoft.com/en-us/microsoft-edge" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
            <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
            <li><a href="https://support.apple.com/en-us/HT201265" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">Safari (Desktop)</a></li>
            <li><a href="https://support.apple.com/en-us/HT201265" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">Safari (Mobile)</a></li>
            <li><a href="https://support.google.com/chrome/answer/95647" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">Android Browser</a></li>
          </ul>

          <h2 className="text-2xl font-semibold text-foreground-primary mt-8 mb-4">Other Tracking Technologies</h2>
          <p className="text-foreground-secondary mb-6">
            In addition to cookies, we may use other similar technologies like web beacons (sometimes called &quot;tracking pixels&quot; or &quot;clear gifs&quot;). These are tiny graphics files that contain a unique identifier that enable us to recognize when someone has visited our Service. This allows us, for example, to monitor the traffic patterns of users from one page within our Service to another, to deliver or communicate with cookies, to understand whether you have come to our Service from an online advertisement displayed on a third-party website, and to improve site performance.
          </p>

          <h2 className="text-2xl font-semibold text-foreground-primary mt-8 mb-4">Do Not Track Signals</h2>
          <p className="text-foreground-secondary mb-6">
            Some browsers have a &quot;Do Not Track&quot; feature that lets you tell websites that you do not want to have your online activities tracked. These features are not yet uniform, and our Service does not currently respond to &quot;Do Not Track&quot; signals.
          </p>

          <h2 className="text-2xl font-semibold text-foreground-primary mt-8 mb-4">Updates to This Cookie Policy</h2>
          <p className="text-foreground-secondary mb-6">
            We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons. Please therefore re-visit this Cookie Policy regularly to stay informed about our use of cookies and related technologies.
          </p>
          <p className="text-foreground-secondary mb-6">
            The date at the top of this Cookie Policy indicates when it was last updated.
          </p>

          <h2 className="text-2xl font-semibold text-foreground-primary mt-8 mb-4">Contact Us</h2>
          <p className="text-foreground-secondary mb-4">
            If you have any questions about our use of cookies or other technologies, please contact us:
          </p>
          <ul className="list-disc pl-6 text-foreground-secondary space-y-2 mb-6">
            <li>By email: support@upturn.com.bd</li>
            <li>By visiting our website: <a href="https://flow.upturn.com.bd" className="text-primary-600 hover:underline">https://flow.upturn.com.bd</a></li>
            <li>By mail: 154 Shantinagar, Flat - B6, Paltan, Dhaka - 1217, Bangladesh</li>
          </ul>

          <div className="mt-8 pt-6 border-t border-border-primary">
            <p className="text-foreground-tertiary text-sm">
              For more information about how we handle your personal data, please see our <a href="/privacy-policy" className="text-primary-600 hover:underline">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
