import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Phone } from "lucide-react";
import { RequestForm } from "@/components/marketing/request-form";

export const metadata: Metadata = {
  title: "Leander 3T — Brick, Stone & Stucco Masonry in Central Texas",
  description:
    "Exterior masonry partner for Central Texas production homebuilders. Brick, stone and stucco crews, materials ordered against the plan, and a supervisor who owns every job. 5,100+ homes completed.",
  alternates: { canonical: "/" },
};

const TRADES = [
  {
    n: "01",
    name: "Brick",
    img: "/marketing/brick.jpg",
    alt: "Brick veneer laid in running bond",
    text: "Full brick veneer laid in true courses — drop slabs, pavers, and detail work included, mortar matched to your spec.",
    chips: ["Veneer + details", "All mortar colors", "Lintels supplied"],
  },
  {
    n: "02",
    name: "Stone",
    img: "/marketing/stone.jpg",
    alt: "Natural stone wall with tight color blending",
    text: "Natural and manufactured stone set with clean joints and tight color blending — accents, elevations, and full facades.",
    chips: ["Chop + blend", "Drop footage tracked", "Buff to gray mortar"],
  },
  {
    n: "03",
    name: "Stucco",
    img: "/marketing/stucco.jpg",
    alt: "Finished three-coat stucco texture",
    text: "Three-coat stucco systems with lath, beads, and weep detailing done right — finished in your body and trim colors.",
    chips: ["Lath to finish", "Paint coordinated", "Expansion detailed"],
  },
];

const NUMBERS = [
  ["5,100+", "Homes completed"],
  ["3", "Trades, one crew system"],
  ["25+", "Active subdivisions"],
  ["2", "Companies, one standard"],
];

const STEPS = [
  [
    "Job Intake",
    "Your CM submits the plan, elevation, and specs online. We confirm square footages and colors the same day.",
  ],
  [
    "Materials Ordered",
    "Sand, mortar, lintels, stone, and stucco supplies ordered against the plan with delivery dates set to your schedule.",
  ],
  [
    "Crews Scheduled",
    "Dedicated brick, stone, and stucco crews sequenced per trade — with a supervisor who owns the whole job.",
  ],
  [
    "Complete & Walk",
    "Photo-documented progress and a completion walk when the last joint is struck. On record, on time.",
  ],
];

const BUILDERS = [
  "Ashton Woods",
  "Pulte",
  "Tri Pointe",
  "Masonwood",
  "Lott Brothers",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "GeneralContractor",
  name: "Leander 3T, LLC",
  description:
    "Brick, stone and stucco masonry for Central Texas production homebuilders.",
  telephone: "+1-512-260-2577",
  address: {
    "@type": "PostalAddress",
    streetAddress: "127 Woodland Trail",
    addressLocality: "Leander",
    addressRegion: "TX",
    postalCode: "78641",
    addressCountry: "US",
  },
  areaServed: "Central Texas",
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Static, trusted content.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="site-nav" aria-label="Main">
        <div className="nav-inner">
          <Link href="/" aria-label="Leander 3T home">
            <Image
              src="/brand/leander-3t-logo.png"
              alt="Leander 3T"
              width={70}
              height={46}
              className="nav-logo"
              priority
            />
          </Link>
          <div className="nav-links">
            <a href="#svc">Our Trades</a>
            <a href="#proc">How We Work</a>
            <a href="#contact">Contact</a>
            <Link className="btn btn-fire btn-sm" href="/sign-in">
              Builder Sign In
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <header className="hero coursing">
          <div className="hero-inner">
            <div>
              <span className="on-dark eyebrow">
                Leander, Texas{" "}
                <span className="chalk-line" aria-hidden="true" /> Masonry
                Contractors
              </span>
              <h1>
                Brick<span className="dot">.</span> Stone
                <span className="dot">.</span>
                <br />
                <span className="hollow">Stucco</span>
                <span className="dot">.</span>
              </h1>
              <p className="lede">
                Leander 3T is the exterior masonry partner behind more than
                5,100 Central Texas homes. Three trades, one accountable crew
                system — precision work for production builders, from the first
                course to the final walk.
              </p>
              <div className="hero-ctas">
                <a className="btn btn-fire" href="#contact">
                  Request More Information
                  <ArrowRight className="size-[18px]" aria-hidden />
                </a>
                <a className="btn btn-ghost-dark" href="#svc">
                  See Our Trades
                </a>
              </div>
            </div>
            <div className="hero-logo-wrap">
              <Image
                src="/brand/leander-3t-logo.png"
                alt=""
                width={320}
                height={212}
                priority
                sizes="(max-width: 1024px) 80vw, 320px"
              />
              <span className="hero-badge">
                <b>5,100+</b> homes completed
              </span>
            </div>
          </div>
        </header>

        <div className="trustband">
          <div className="tb-inner">
            <span className="tb-label">Trusted by Central Texas builders</span>
            <div className="tb-names">
              {BUILDERS.map((b) => (
                <span key={b}>{b}</span>
              ))}
            </div>
          </div>
        </div>

        <section className="section" id="svc" aria-labelledby="svc-title">
          <div className="section-head">
            <span className="eyebrow">
              Three trades <span className="chalk-line" aria-hidden="true" />{" "}
              One standard
            </span>
            <h2 id="svc-title">The 3T in Leander 3T</h2>
            <p>
              Every home gets a dedicated crew per trade, a supervisor who owns
              the schedule, and materials ordered against the plan — not
              guesswork.
            </p>
          </div>
          <div className="trades">
            {TRADES.map((t) => (
              <article key={t.name} className="trade">
                <div className="swatch">
                  <Image
                    src={t.img}
                    alt={t.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 380px"
                  />
                </div>
                <div className="trade-body">
                  <h3>
                    <span className="t-num">{t.n}</span> {t.name}
                  </h3>
                  <p>{t.text}</p>
                  <div className="chips">
                    {t.chips.map((c) => (
                      <span key={c} className="chip">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className="numbers coursing"
          aria-label="Leander 3T by the numbers"
        >
          <div className="num-inner">
            {NUMBERS.map(([n, l]) => (
              <div key={l} className="num">
                <div className="n">{n}</div>
                <div className="l">{l}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="proc" aria-labelledby="proc-title">
          <div className="section-head">
            <span className="eyebrow">
              Built for builders{" "}
              <span className="chalk-line" aria-hidden="true" /> Process
            </span>
            <h2 id="proc-title">From plan to final walk</h2>
            <p>
              A process your construction managers can see — every job, every
              order, every date, tracked in one system.
            </p>
          </div>
          <ol className="process">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="step">
                <span className="s-num">STEP 0{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="section"
          id="contact"
          aria-labelledby="contact-title"
        >
          <div className="contact-grid">
            <div className="addr-card">
              <span className="eyebrow">
                Get in touch <span className="chalk-line" aria-hidden="true" />
              </span>
              <h2 id="contact-title" className="contact-title">
                Let&apos;s build
                <br />
                together
              </h2>
              <p className="intro">
                Starting a new community, or need a masonry partner who shows up
                on schedule? Tell us about your project and we&apos;ll respond
                within one business day.
              </p>
              <div className="addr-block">
                <MapPin className="size-[22px]" aria-hidden />
                <div>
                  <div className="a-l">Office</div>
                  <div className="a-v">
                    127 Woodland Trail, Leander, TX 78641
                  </div>
                </div>
              </div>
              <div className="addr-block">
                <Phone className="size-[22px]" aria-hidden />
                <div>
                  <div className="a-l">Phone</div>
                  <div className="a-v">
                    <a href="tel:+15122602577">(512) 260-2577</a>
                  </div>
                </div>
              </div>
            </div>
            <RequestForm />
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="f-inner">
          <Image
            src="/brand/leander-3t-logo.png"
            alt="Leander 3T"
            width={85}
            height={56}
            className="f-logo"
          />
          <div className="f-meta">
            LEANDER 3T, LLC · 3T CONSTRUCTION SOLUTIONS
            <br />
            127 WOODLAND TRAIL, LEANDER TX 78641 · (512) 260-2577
          </div>
          <Link className="btn btn-ghost-dark btn-sm" href="/sign-in">
            Team Sign In
          </Link>
        </div>
      </footer>
    </>
  );
}
