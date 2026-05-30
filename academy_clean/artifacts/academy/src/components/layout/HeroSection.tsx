interface HeroSectionProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

export default function HeroSection({ title, subtitle, children }: HeroSectionProps) {
  return (
    <section
      className="relative overflow-hidden py-20 px-4 text-center"
      style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #4c1d95 100%)" }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full opacity-20" style={{ background: "radial-gradient(circle,#a78bfa,transparent)" }} />
      <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full opacity-20" style={{ background: "radial-gradient(circle,#60a5fa,transparent)" }} />

      <div className="relative max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-tight">
          {title}
        </h1>
        <p className="text-lg text-indigo-200 leading-relaxed max-w-2xl mx-auto mb-6">
          {subtitle}
        </p>
        {children}
      </div>
    </section>
  );
}
