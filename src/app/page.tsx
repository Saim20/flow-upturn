import Link from 'next/link';
import {
  ClipboardText,
  ChartBar,
  SignIn,
  CalendarX,
  Bell,
  Clipboard,
  CurrencyDollar,
  WarningCircle,
  UserPlus,
  UserMinus,
  Users,
  CreditCard,
  Building,
  GitBranch,
  ShieldCheck,
  Briefcase,
  CheckCircle,
  ArrowRight,
  Gear,
  IdentificationCard,
  Receipt,
} from '@phosphor-icons/react/dist/ssr';

// Force static generation for landing page
export const dynamic = 'force-static';
export const revalidate = false;

export default function LandingPage() {
  // Note: Authentication check is handled by proxy.ts
  // Authenticated users are automatically redirected to /home
  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header / Navigation */}
      <header className="border-b border-border-primary bg-surface-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">Flow</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-foreground-secondary hover:text-primary-600 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-foreground-secondary hover:text-primary-600 transition-colors">
                Pricing
              </a>
              <a href="#about" className="text-foreground-secondary hover:text-primary-600 transition-colors">
                About
              </a>
            </nav>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-foreground-secondary hover:text-primary-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/contact"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h2 className="text-5xl md:text-6xl font-bold text-foreground-primary mb-6">
              Streamline Your Business
              <span className="block text-primary-600 mt-2">Operations & HR</span>
            </h2>
            <p className="text-xl text-foreground-secondary max-w-3xl mx-auto mb-8">
              Flow is a comprehensive operations management platform that brings together workflow
              automation, human resources, stakeholder management, and financial accounting in one
              unified solution.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/contact"
                className="px-8 py-4 bg-primary-600 text-white text-lg font-semibold rounded-lg hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                Contact Sales
                <ArrowRight size={24} weight="bold" />
              </Link>
              <a
                href="#features"
                className="px-8 py-4 border-2 border-primary-600 text-primary-600 text-lg font-semibold rounded-lg hover:bg-primary-50 transition-colors"
              >
                Explore Features
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section id="features" className="py-20 bg-background-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-foreground-primary mb-4">
              Everything You Need to Run Your Business
            </h3>
            <p className="text-xl text-foreground-secondary max-w-3xl mx-auto">
              Integrated modules that work together seamlessly to power your operations
            </p>
          </div>

          {/* Workflow Management */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-lg">
                <Briefcase size={32} weight="duotone" />
              </div>
              <h4 className="text-3xl font-bold text-foreground-primary">Workflow Management</h4>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard
                icon={<ClipboardText size={32} weight="duotone" />}
                title="Task Management"
                description="Assign, track, and manage day-to-day tasks with priority levels and deadlines"
                iconColor="bg-indigo-100 text-indigo-700"
              />
              <FeatureCard
                icon={<ChartBar size={32} weight="duotone" />}
                title="Project Tracking"
                description="Plan and execute complex projects with milestones and progress monitoring"
                iconColor="bg-blue-100 text-blue-700"
              />
              <FeatureCard
                icon={<GitBranch size={32} weight="duotone" />}
                title="Process Automation"
                description="Define custom workflows and automate stakeholder management processes"
                iconColor="bg-teal-100 text-teal-700"
              />
            </div>
          </div>

          {/* HR & People Management */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-purple-100 text-purple-700 rounded-lg">
                <Users size={32} weight="duotone" />
              </div>
              <h4 className="text-3xl font-bold text-foreground-primary">HR & People Management</h4>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              <FeatureCard
                icon={<SignIn size={32} weight="duotone" />}
                title="Attendance Tracking"
                description="Monitor employee check-ins, check-outs, and work hours"
                iconColor="bg-green-100 text-green-700"
              />
              <FeatureCard
                icon={<CalendarX size={32} weight="duotone" />}
                title="Leave Management"
                description="Handle leave requests, approvals, and balance tracking"
                iconColor="bg-blue-100 text-blue-700"
              />
              <FeatureCard
                icon={<CreditCard size={32} weight="duotone" />}
                title="Payroll"
                description="Manage salary structures, deductions, and payment history"
                iconColor="bg-indigo-100 text-indigo-700"
              />
              <FeatureCard
                icon={<IdentificationCard size={32} weight="duotone" />}
                title="HRIS"
                description="Comprehensive employee information and records system"
                iconColor="bg-blue-100 text-blue-700"
              />
            </div>
          </div>

          {/* Employee Services */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-cyan-100 text-cyan-700 rounded-lg">
                <Bell size={32} weight="duotone" />
              </div>
              <h4 className="text-3xl font-bold text-foreground-primary">Employee Services</h4>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              <FeatureCard
                icon={<Bell size={32} weight="duotone" />}
                title="Notices & Announcements"
                description="Broadcast company-wide communications and updates"
                iconColor="bg-amber-100 text-amber-700"
              />
              <FeatureCard
                icon={<Clipboard size={32} weight="duotone" />}
                title="Requisitions"
                description="Request and manage equipment, supplies, and services"
                iconColor="bg-cyan-100 text-cyan-700"
              />
              <FeatureCard
                icon={<CurrencyDollar size={32} weight="duotone" />}
                title="Settlements"
                description="Track and process expense reimbursements efficiently"
                iconColor="bg-emerald-100 text-emerald-700"
              />
              <FeatureCard
                icon={<WarningCircle size={32} weight="duotone" />}
                title="Complaints"
                description="Handle workplace issues and concerns systematically"
                iconColor="bg-red-100 text-red-700"
              />
            </div>
          </div>

          {/* Operations & Admin */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-violet-100 text-violet-700 rounded-lg">
                <Gear size={32} weight="duotone" />
              </div>
              <h4 className="text-3xl font-bold text-foreground-primary">Operations & Admin</h4>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              <FeatureCard
                icon={<UserPlus size={32} weight="duotone" />}
                title="Onboarding"
                description="Streamline new employee joining processes and workflows"
                iconColor="bg-purple-100 text-purple-700"
              />
              <FeatureCard
                icon={<UserMinus size={32} weight="duotone" />}
                title="Offboarding"
                description="Manage employee exit procedures systematically"
                iconColor="bg-red-100 text-red-700"
              />
              <FeatureCard
                icon={<Building size={32} weight="duotone" />}
                title="Stakeholder Management"
                description="Manage clients, vendors, and partners with custom processes"
                iconColor="bg-purple-100 text-purple-700"
              />
              <FeatureCard
                icon={<ShieldCheck size={32} weight="duotone" />}
                title="Team Permissions"
                description="Granular access control with team-based permissions"
                iconColor="bg-violet-100 text-violet-700"
              />
            </div>
          </div>

          {/* Financial Management */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg">
                <CurrencyDollar size={32} weight="duotone" />
              </div>
              <h4 className="text-3xl font-bold text-foreground-primary">Financial Management</h4>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <FeatureCard
                icon={<CurrencyDollar size={32} weight="duotone" />}
                title="Transaction Management"
                description="Track financial transactions with custom categories and payment methods"
                iconColor="bg-emerald-100 text-emerald-700"
              />
              <FeatureCard
                icon={<Receipt size={32} weight="duotone" />}
                title="Stakeholder Billing"
                description="Manage stakeholder-specific billing and transaction workflows"
                iconColor="bg-purple-100 text-purple-700"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-foreground-primary mb-4">
              Simple, Transparent Pricing
            </h3>
            <p className="text-xl text-foreground-secondary max-w-3xl mx-auto">
              Choose the plan that fits your organization size. All plans include full access to all features.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Starter Plan */}
            <PricingCard
              title="Starter"
              price="5,000"
              period="BDT/month"
              description="Perfect for small teams getting started"
              features={[
                'Up to 10 users',
                'All workflow features',
                'HR & Payroll management',
                'Task & Project tracking',
                'Attendance & Leave',
                'Email support',
              ]}
              highlighted={false}
            />

            {/* Growth Plan */}
            <PricingCard
              title="Growth"
              price="10,000"
              period="BDT/month"
              description="For growing teams that need more power"
              features={[
                'Up to 25 users',
                'Everything in Starter',
                'Advanced reporting',
                'Custom workflows',
                'Priority support',
                'Data export',
              ]}
              highlighted={true}
            />

            {/* Professional Plan */}
            <PricingCard
              title="Professional"
              price="18,000"
              period="BDT/month"
              description="For larger organizations with complex needs"
              features={[
                'Up to 50 users',
                'Everything in Growth',
                'Advanced permissions',
                'API access',
                'Dedicated support',
                'Custom integrations',
              ]}
              highlighted={false}
            />
          </div>

          {/* Stakeholder Add-on */}
          <div className="bg-surface-secondary border border-border-primary rounded-xl p-8 max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    <Building size={24} weight="duotone" />
                  </div>
                  <h4 className="text-2xl font-bold text-foreground-primary">
                    Stakeholder Management Add-on
                  </h4>
                </div>
                <p className="text-foreground-secondary mb-4">
                  Extend your operations to manage external stakeholders, clients, and partners with custom workflows
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-foreground-secondary">
                    <CheckCircle size={20} weight="fill" className="text-success" />
                    <span>Custom stakeholder processes</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground-secondary">
                    <CheckCircle size={20} weight="fill" className="text-success" />
                    <span>Public ticket submission portal</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground-secondary">
                    <CheckCircle size={20} weight="fill" className="text-success" />
                    <span>Transaction tracking per stakeholder</span>
                  </li>
                </ul>
              </div>
              <div className="text-center md:text-right">
                <div className="text-4xl font-bold text-primary-600 mb-2">300 BDT</div>
                <div className="text-foreground-secondary mb-4">per stakeholder/month</div>
                <Link
                  href="/contact"
                  className="inline-block px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>

          {/* Enterprise CTA */}
          <div className="text-center mt-12">
            <p className="text-lg text-foreground-secondary mb-4">
              Need a custom solution for your enterprise?
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-primary-600 text-primary-600 font-semibold rounded-lg hover:bg-primary-50 transition-colors"
            >
              Contact Sales
              <ArrowRight size={20} weight="bold" />
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Flow */}
      <section id="about" className="py-20 bg-background-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-foreground-primary mb-4">
              Why Choose Flow?
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mb-4">
                <CheckCircle size={32} weight="duotone" />
              </div>
              <h4 className="text-xl font-bold text-foreground-primary mb-3">All-in-One Solution</h4>
              <p className="text-foreground-secondary">
                Stop juggling multiple tools. Flow brings together operations, HR, and accounting in one platform.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 text-success rounded-full mb-4">
                <ShieldCheck size={32} weight="duotone" />
              </div>
              <h4 className="text-xl font-bold text-foreground-primary mb-3">Secure & Reliable</h4>
              <p className="text-foreground-secondary">
                Enterprise-grade security with team-based permissions and device management for complete control.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-100 text-violet-700 rounded-full mb-4">
                <Gear size={32} weight="duotone" />
              </div>
              <h4 className="text-xl font-bold text-foreground-primary mb-3">Highly Customizable</h4>
              <p className="text-foreground-secondary">
                Tailor workflows, processes, and permissions to match your unique business requirements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-primary-600 to-primary-800">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Operations?
          </h3>
          <p className="text-xl text-primary-100 mb-8">
            Join forward-thinking organizations that trust Flow to streamline their business
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/contact"
              className="px-8 py-4 bg-white text-primary-600 text-lg font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-lg flex items-center gap-2"
            >
              Contact Sales
              <ArrowRight size={24} weight="bold" />
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 border-2 border-white text-white text-lg font-semibold rounded-lg hover:bg-white/10 transition-colors"
            >
              Schedule a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-primary border-t border-border-primary py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h5 className="text-lg font-bold text-foreground-primary mb-4">Flow</h5>
              <p className="text-foreground-secondary text-sm">
                Comprehensive operations management platform for modern businesses
              </p>
            </div>

            <div>
              <h6 className="font-semibold text-foreground-primary mb-4">Product</h6>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="text-foreground-secondary text-sm hover:text-primary-600 transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-foreground-secondary text-sm hover:text-primary-600 transition-colors">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h6 className="font-semibold text-foreground-primary mb-4">Company</h6>
              <ul className="space-y-2">
                <li>
                  <Link href="/contact" className="text-foreground-secondary text-sm hover:text-primary-600 transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/terms-of-service" className="text-foreground-secondary text-sm hover:text-primary-600 transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="text-foreground-secondary text-sm hover:text-primary-600 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h6 className="font-semibold text-foreground-primary mb-4">Get Started</h6>
              <ul className="space-y-2">
                <li>
                  <Link href="/login" className="text-foreground-secondary text-sm hover:text-primary-600 transition-colors">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-foreground-secondary text-sm hover:text-primary-600 transition-colors">
                    Contact Sales
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border-primary pt-8 text-center">
            <p className="text-foreground-secondary text-sm">
              &copy; {new Date().getFullYear()} Flow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconColor: string;
}

function FeatureCard({ icon, title, description, iconColor }: FeatureCardProps) {
  return (
    <div className="bg-surface-primary border border-border-primary rounded-xl p-6 hover:shadow-lg transition-shadow">
      <div className={`inline-flex items-center justify-center p-3 ${iconColor} rounded-lg mb-4`}>
        {icon}
      </div>
      <h5 className="text-lg font-bold text-foreground-primary mb-2">{title}</h5>
      <p className="text-foreground-secondary text-sm">{description}</p>
    </div>
  );
}

interface PricingCardProps {
  title: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted: boolean;
}

function PricingCard({ title, price, period, description, features, highlighted }: PricingCardProps) {
  return (
    <div
      className={`rounded-xl p-8 ${
        highlighted
          ? 'bg-primary-600 text-white ring-4 ring-primary-200 shadow-xl scale-105'
          : 'bg-surface-primary border border-border-primary'
      }`}
    >
      <div className="text-center mb-6">
        <h4
          className={`text-2xl font-bold mb-2 ${
            highlighted ? 'text-white' : 'text-foreground-primary'
          }`}
        >
          {title}
        </h4>
        <p className={`text-sm mb-4 ${highlighted ? 'text-primary-100' : 'text-foreground-secondary'}`}>
          {description}
        </p>
        <div className="flex items-baseline justify-center gap-2">
          <span className={`text-4xl font-bold ${highlighted ? 'text-white' : 'text-primary-600'}`}>
            {price}
          </span>
          <span className={`text-sm ${highlighted ? 'text-primary-100' : 'text-foreground-secondary'}`}>
            {period}
          </span>
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-3">
            <CheckCircle
              size={20}
              weight="fill"
              className={highlighted ? 'text-white' : 'text-success'}
            />
            <span className={`text-sm ${highlighted ? 'text-white' : 'text-foreground-secondary'}`}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href="/contact"
        className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition-colors ${
          highlighted
            ? 'bg-white text-primary-600 hover:bg-gray-50'
            : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}
      >
        Contact Sales
      </Link>
    </div>
  );
}
