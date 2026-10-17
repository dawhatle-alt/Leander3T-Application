import "./site.css";

// Public pages share the ported mockup styles, scoped under .site.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="site">{children}</div>;
}
