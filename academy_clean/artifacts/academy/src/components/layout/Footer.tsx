import { Link } from "wouter";
import { Linkedin, Instagram, Twitter, Facebook, MapPin, Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer style={{ background: "#0f0f1a" }} className="text-white pt-14 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 text-right">
          {/* Column 1 - About */}
          <div>
            <div className="flex items-center gap-2 justify-end mb-4">
              <span className="font-extrabold text-white text-lg">أكاديمية البرمجة المتكاملة</span>
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">AP</div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              منصتك الشاملة لتعلم البرمجة وبناء مستقبلك التقني. نقدم أفضل المناهج التعليمية باللغة العربية لجميع المستويات.
            </p>
            <div className="flex gap-3 justify-end">
              {[
                { Icon: Linkedin, href: "#", label: "لينكدإن" },
                { Icon: Instagram, href: "#", label: "انستغرام" },
                { Icon: Twitter, href: "#", label: "تويتر" },
                { Icon: Facebook, href: "#", label: "فيسبوك" },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-indigo-600 flex items-center justify-center transition-colors"
                  data-testid={`link-social-${label}`}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2 - Quick links */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-white">روابط سريعة</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "الصفحة الرئيسية", href: "/" },
                { label: "خارطة الطريق", href: "/roadmap" },
                { label: "الكورسات", href: "/courses" },
                { label: "المشاريع", href: "/projects" },
                { label: "اتصل بنا", href: "/" },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-gray-400 hover:text-cyan-400 transition-colors" data-testid={`footer-link-${item.label}`}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 - Learning paths */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-white">المسارات التعليمية</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "أساسيات البرمجة", href: "/roadmap" },
                { label: "تطوير الواجهات الأمامية", href: "/roadmap" },
                { label: "تطوير الواجهات الخلفية", href: "/roadmap" },
                { label: "تطوير تطبيقات الجوال", href: "/courses" },
                { label: "تطوير الويب الشامل", href: "/courses" },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-gray-400 hover:text-cyan-400 transition-colors" data-testid={`footer-path-${item.label}`}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 - Contact */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-white">اتصل بنا</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2.5 flex-row-reverse">
                <MapPin size={16} className="text-cyan-400 mt-0.5 shrink-0" />
                <span>الرياض، المملكة العربية السعودية</span>
              </li>
              <li className="flex items-center gap-2.5 flex-row-reverse">
                <Phone size={16} className="text-cyan-400 shrink-0" />
                <span dir="ltr">+966 789 456 123</span>
              </li>
              <li className="flex items-center gap-2.5 flex-row-reverse">
                <Mail size={16} className="text-cyan-400 shrink-0" />
                <span>info@academy.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 text-center text-gray-500 text-sm">
          جميع الحقوق محفوظة &copy; 2025 أكاديمية البرمجة المتكاملة
        </div>
      </div>
    </footer>
  );
}
