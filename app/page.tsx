import Image from "next/image";
import { Button } from "@/components/ui/button";

// M0 placeholder. The real public site (M8) follows design/approved-mockup.html.
export default function Home() {
  return (
    <main className="flex min-h-screen items-center coursing text-limestone">
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-14 px-7 py-24 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <span className="eyebrow text-amber">
            Leander, Texas <span className="chalk-line" aria-hidden="true" />{" "}
            Masonry Contractors
          </span>
          <h1 className="mt-6 mb-5 font-display text-[clamp(56px,8.5vw,108px)] leading-[0.92] font-bold uppercase">
            Brick<span className="text-flame">.</span> Stone
            <span className="text-flame">.</span>
            <br />
            Stucco<span className="text-flame">.</span>
          </h1>
          <p className="max-w-[56ch] text-lg text-mortar">
            The new Leander 3T job system is under construction.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Button variant="fire" size="lg">
              Request More Information
            </Button>
          </div>
        </div>
        <div className="flex justify-center">
          <Image
            src="/brand/leander-3t-logo.png"
            alt="Leander 3T"
            width={320}
            height={212}
            priority
          />
        </div>
      </div>
    </main>
  );
}
