import Image from "next/image";
import Link from "next/link";

// Split sign-in layout from the approved mockup: coursing panel with the logo
// on the left, the form on limestone on the right. Stacks on phones.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="flex flex-col items-center justify-center gap-[30px] coursing px-6 py-12 text-limestone md:p-[60px]">
        <Link href="/" aria-label="Leander 3T home">
          <Image
            src="/brand/leander-3t-logo.png"
            alt="Leander 3T"
            width={300}
            height={199}
            priority
            className="w-[min(300px,60vw)] drop-shadow-[0_18px_40px_rgba(0,0,0,.5)] md:w-[min(300px,70%)]"
          />
        </Link>
        <h2 className="text-center font-display text-[28px] leading-[1.05] font-bold uppercase md:text-[34px]">
          Every course level.
          <br />
          Every job on record.
        </h2>
        <p className="max-w-[38ch] text-center text-[15px] text-[#b0a494]">
          The Leander 3T job system — jobs, materials, orders, and photos for
          the whole team, in one place.
        </p>
      </div>
      <div className="flex items-center justify-center bg-limestone px-7 py-[60px]">
        <div className="w-[min(420px,100%)]">{children}</div>
      </div>
    </div>
  );
}
