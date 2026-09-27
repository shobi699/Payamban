"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";

// Clean, fast, embedded SVG icons
const Icons = {
  ArrowLeft: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  ArrowDown: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  ),
  ArrowUpLeft: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M7 7h10v10" />
    </svg>
  ),
  BadgeCheck: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Zap: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  ShieldCheck: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  ScanSearch: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
    </svg>
  ),
  Send: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  Lock: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  MoonStar: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  Bot: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Check: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  Plus: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  MessagesSquare: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  BellRing: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  ListChecks: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  Contact: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Smartphone: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  Users: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  CreditCard: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  Coins: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function PayambanLandingClient() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
    const fa = (n: number | string) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
    const pad = (n: number) => fa(String(n).padStart(2, "0"));

    /* Navigation scroll header */
    const nav = root.querySelector("#nav") as HTMLElement | null;

    /* Phone sequence simulation */
    const screen = root.querySelector("#screen") as HTMLElement | null;
    let phoneInterval: NodeJS.Timeout | null = null;
    if (screen) {
      if (reduce) {
        screen.classList.add("s3");
      } else {
        const seq = [
          ["s1", 900],
          ["s2", 1900],
          ["s3", 2700],
          ["", 7800],
        ] as const;
        const runSeq = () => {
          screen.className = "screen";
          seq.forEach(([c, t]) =>
            setTimeout(() => {
              if (screen) screen.className = "screen" + (c ? " " + c : "");
            }, t)
          );
        };
        runSeq();
        phoneInterval = setInterval(runSeq, 8200);
      }
    }

    /* Hero rig: scroll + pointer interaction */
    const rig = root.querySelector("#rig") as HTMLElement | null;
    const hero = root.querySelector("#hero") as HTMLElement | null;
    let mx = 0, my = 0, tx = 0, ty = 0;

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      reqAnimation();
    };

    const handlePointerLeave = () => {
      tx = ty = 0;
      reqAnimation();
    };

    if (hero) {
      hero.addEventListener("pointermove", handlePointerMove);
      hero.addEventListener("pointerleave", handlePointerLeave);
    }

    /* Features ring */
    const ring = root.querySelector("#ring") as HTMLElement | null;
    const featTrack = root.querySelector("#featTrack") as HTMLElement | null;
    const fIndex = root.querySelector("#fIndex") as HTMLElement | null;
    const fNum = root.querySelector("#fNum") as HTMLElement | null;
    const fFill = root.querySelector("#fFill") as HTMLElement | null;

    let R = 0;
    let activeIdx = -1;
    let panels: HTMLElement[] = [];
    let idxBtns: HTMLButtonElement[] = [];

    if (ring && fIndex) {
      panels = Array.from(ring.children) as HTMLElement[];
      const N = panels.length;
      const STEP = 360 / N;

      panels.forEach((p, i) => {
        p.style.setProperty("--a", -i * STEP + "deg");
        const li = document.createElement("li");
        const b = document.createElement("button");
        const h3Title = p.querySelector("h3")?.textContent || "";
        b.innerHTML = `<span>${pad(i + 1)}</span>${h3Title}`;
        b.addEventListener("click", () => {
          if (!featTrack) return;
          const top = featTrack.getBoundingClientRect().top + window.scrollY;
          const span = featTrack.offsetHeight - window.innerHeight;
          window.scrollTo({
            top: top + span * (i / (N - 1)) + 2,
            behavior: reduce ? "auto" : "smooth",
          });
        });
        li.appendChild(b);
        fIndex.appendChild(li);
      });

      idxBtns = Array.from(fIndex.querySelectorAll("button"));

      const sizeRing = () => {
        if (!panels[0]) return;
        const w = panels[0].offsetWidth || 280;
        R = Math.round(w / 2 / Math.tan(Math.PI / N)) + 24;
        ring.style.setProperty("--r", R + "px");
      };
      sizeRing();
      window.addEventListener("resize", sizeRing);
    }

    /* 3D Tunnel */
    const why = root.querySelector("#why") as HTMLElement | null;
    const planes = Array.from(root.querySelectorAll(".plane")) as HTMLElement[];
    const tGrid = root.querySelector("#tGrid") as HTMLElement | null;

    /* CTA 3D layered logo */
    const logo3d = root.querySelector("#logo3d") as HTMLElement | null;
    const cta = root.querySelector("#cta") as HTMLElement | null;
    if (logo3d && logo3d.children.length === 0) {
      for (let l = 0; l < 14; l++) {
        const s = document.createElement("span");
        s.style.setProperty("--l", String(l));
        s.textContent = "P";
        logo3d.appendChild(s);
      }
    }

    const progress = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return clamp(-r.top / (r.height - window.innerHeight), 0, 1);
    };

    const visible = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
    };

    let raf = 0;
    const reqAnimation = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const frame = () => {
      raf = 0;
      const y = window.scrollY;
      if (nav) nav.classList.toggle("solid", y > 20);

      // Hero rig
      if (hero && visible(hero) && rig) {
        mx += (tx - mx) * 0.08;
        my += (ty - my) * 0.08;
        const p = clamp(y / (window.innerHeight * 0.9), 0, 1);
        const ry = reduce ? -8 : -24 + 30 * p + mx * 10;
        const rx = reduce ? 4 : 12 - 20 * p - my * 7;
        rig.style.transform = `translateY(${p * 60}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${
          reduce ? 0 : 3 - 3 * p
        }deg)`;
        if (Math.abs(tx - mx) > 0.002 || Math.abs(ty - my) > 0.002) reqAnimation();
      }

      // Ring
      if (featTrack && visible(featTrack) && ring && panels.length > 0) {
        const N = panels.length;
        const STEP = 360 / N;
        const p = progress(featTrack);
        const rot = p * STEP * (N - 1);
        ring.style.transform = `translateZ(${-R}px) rotateY(${rot}deg)`;
        let best = 0,
          bestC = -2;
        panels.forEach((el, i) => {
          const d = (((-i * STEP + rot) % 360) + 540) % 360 - 180;
          const c = Math.cos((d * Math.PI) / 180);
          el.style.opacity = (0.1 + 0.9 * Math.pow(Math.max(0, c), 2.2)).toFixed(3);
          if (c > bestC) {
            bestC = c;
            best = i;
          }
        });
        if (best !== activeIdx) {
          activeIdx = best;
          panels.forEach((el, i) => el.classList.toggle("on", i === best));
          idxBtns.forEach((b, i) => b.classList.toggle("on", i === best));
          if (fNum) fNum.textContent = pad(best + 1);
        }
        if (fFill) fFill.style.transform = `scaleX(${p})`;
      }

      // 3D Tunnel
      if (why && visible(why) && planes.length > 0 && tGrid) {
        const p = progress(why);
        const D = Math.min(850, window.innerHeight * 1.05);
        const cam = p * (planes.length - 1 + 0.35) * D;
        planes.forEach((el, i) => {
          const z = -i * D + cam;
          const o = clamp(z > 0 ? 1 - z / (D * 0.45) : 1 + z / (D * 2.2), 0, 1);
          const side = i % 2 ? -1 : 1;
          const x = side * Math.min(16, window.innerWidth / 70) * clamp(-z / D, 0, 3);
          const rY = side * clamp(-z / D, 0, 2) * -5;
          el.style.transform = `translate3d(${x}vw, ${clamp(-z / D, 0, 3) * -24}px, ${z}px) rotateY(${rY}deg)`;
          el.style.opacity = o.toFixed(3);
          el.style.zIndex = String(100 - i);
          el.style.pointerEvents = o > 0.6 ? "auto" : "none";
        });
        tGrid.style.backgroundPosition = `0 ${cam * 0.35}px`;
      }

      // CTA 3D Logo
      if (cta && visible(cta) && logo3d) {
        const r = cta.getBoundingClientRect();
        const p = clamp(1 - (r.top + r.height / 2) / window.innerHeight, -0.5, 1.5);
        logo3d.style.transform = reduce
          ? "rotateY(-20deg) rotateX(10deg)"
          : `rotateY(${-50 + p * 70}deg) rotateX(${14 - p * 10}deg)`;
      }
    };

    window.addEventListener("scroll", reqAnimation, { passive: true });

    /* Intersection observer for .rv elements */
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
    root.querySelectorAll(".rv").forEach((el) => io.observe(el));

    /* 3D Pricing cards tilt */
    const cleanupTiltList: Array<() => void> = [];
    if (!reduce) {
      root.querySelectorAll<HTMLElement>(".plan").forEach((card) => {
        const onMove = (e: PointerEvent) => {
          if (e.pointerType !== "mouse") return;
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          card.classList.add("tilting");
          card.style.setProperty("--ry", px * 14 + "deg");
          card.style.setProperty("--rx", -py * 12 + "deg");
        };
        const onLeave = () => {
          card.classList.remove("tilting");
          card.style.setProperty("--ry", "0deg");
          card.style.setProperty("--rx", "0deg");
        };
        card.addEventListener("pointermove", onMove);
        card.addEventListener("pointerleave", onLeave);
        cleanupTiltList.push(() => {
          card.removeEventListener("pointermove", onMove);
          card.removeEventListener("pointerleave", onLeave);
        });
      });
    }

    reqAnimation();

    return () => {
      if (phoneInterval) clearInterval(phoneInterval);
      window.removeEventListener("scroll", reqAnimation);
      if (hero) {
        hero.removeEventListener("pointermove", handlePointerMove);
        hero.removeEventListener("pointerleave", handlePointerLeave);
      }
      io.disconnect();
      cleanupTiltList.forEach((c) => c());
    };
  }, []);

  return (
    <div ref={containerRef} className="payamban-page" dir="rtl">
      {/* HEADER / NAVIGATION */}
      <header className="nav" id="nav">
        <Link href="#top" className="brand" aria-label="پیام‌بان">
          <span className="mark">P</span>
          <span>پیام‌بان</span>
        </Link>
        <nav aria-label="منوی اصلی">
          <a href="#features">امکانات ۹ گانه</a>
          <a href="#why">چرا پیام‌بان؟</a>
          <a href="#how">نحوه کارکرد</a>
          <a href="#pricing">تعرفه‌ها و پلن‌ها</a>
          <a href="#faq">سوالات متداول</a>
        </nav>
        <div className="nav-cta">
          <Link href="/login" className="login">
            ورود به حساب
          </Link>
          <Link href="/dashboard" className="btn btn-ink">
            <span>ورود به پیشخوان</span>
            <Icons.ArrowLeft />
          </Link>
        </div>
      </header>

      <main id="top">
        {/* HERO SECTION WITH INTERACTIVE 3D PHONE */}
        <section className="hero" id="hero">
          <div>
            <span className="eyebrow">
              <span className="tag">🚀 شماره یک</span>
              سامانه اتوماسیون هوشمند اینستاگرام در ایران
            </span>
            <h1>
              فروش پیج‌تان را با <span className="hl">ادمین هوشمند پیام‌بان</span> متحول کنید!
            </h1>
            <p className="lead">
              پیام‌بان کامنت‌ها و دایرکت‌های اینستاگرام را در کمتر از ۱ ثانیه پاسخ می‌دهد، اطلاعات
              مشتریان را در فرم دریافت می‌کند، پیام یادآوری ارسال می‌کند و هیچ مشتری را از دست
              نمی‌دهد؛ حتی زمانی که خواب هستید!
            </p>
            <div className="hero-ctas">
              <Link href="/dashboard" className="btn btn-lime">
                <span>ورود سریع به پیشخوان</span>
                <Icons.ArrowLeft />
              </Link>
              <a href="#features" className="btn btn-ghost">
                <span>مشاهده امکانات ۹ گانه</span>
                <Icons.ArrowDown />
              </a>
            </div>
            <div className="trust">
              <span>
                <Icons.BadgeCheck />
                تاییدیه رسمی Meta Graph API
              </span>
              <span>
                <Icons.Zap />
                ارسال در کمتر از ۱ ثانیه
              </span>
              <span>
                <Icons.ShieldCheck />
                بدون نیاز به پسورد پیج
              </span>
            </div>
          </div>

          <div className="scene" aria-label="نمایش پاسخ خودکار به کامنت">
            <div className="rig" id="rig">
              <div className="phone">
                <div className="screen" id="screen">
                  <div className="bar">
                    <span>پیام‌بان پرو</span>
                    <span className="live">اتوماسیون فعال ۲۴ ساعته</span>
                  </div>
                  <div className="acct">
                    <span className="av d">P</span>
                    <div>
                      <b>آنلاین‌شاپ نمونه</b>
                      <small>payamban.official@ · اکانت تجاری تأییدشده</small>
                    </div>
                    <span className="pill">فعال</span>
                  </div>
                  <div className="post">
                    <div className="post-visual">
                      <span>کمپین ریلز: تخفیف ویژه عیدانه</span>
                      <b>٪۲۰</b>
                    </div>
                    <div className="post-body">
                      <p>کلمه «قیمت» رو کامنت کنید تا لیست قیمت و لینک خرید مستقیم رو براتون دایرکت کنم!</p>
                      <span className="kw">کلیدواژه فعال: قیمت</span>
                    </div>
                  </div>
                  <div className="comment step-anim c1">
                    <span className="av m">M</span>
                    <div>
                      <b>مهدی محمدی</b>
                      <span>قیمت لطفا 😍</span>
                    </div>
                  </div>
                  <div className="match step-anim c2">
                    <Icons.ScanSearch />
                    تطابق کلمه کلیدی «قیمت» در ۰.۳ ثانیه
                  </div>
                  <div className="dm step-anim c3">
                    <div className="dm-h">
                      <Icons.Send />
                      پیام‌بان ← مهدی
                    </div>
                    <p>سلام مهدی عزیز! لیست قیمت جدید به همراه ۲۰٪ تخفیف اختصاصی خدمت شما 👇</p>
                    <div className="cat">
                      <span>مشاهده کاتالوگ و خرید با تخفیف</span>
                      <Icons.ArrowUpLeft />
                    </div>
                  </div>
                  <div className="safe">
                    <Icons.Lock />
                    ارسال ایمن از طریق API رسمی اینستاگرام متا
                  </div>
                </div>
              </div>
              <div className="chip a">
                <Icons.BadgeCheck />
                تاییدیه رسمی Meta
              </div>
              <div className="chip b">
                <Icons.Zap />
                ارسال آنی پاسخ هوشمند
              </div>
              <div className="chip c">
                <Icons.MoonStar />
                حتی وقتی خوابید
              </div>
            </div>
            <p className="scene-cap">
              نمای واقعی از پاسخ خودکار: بلافاصله پس از ثبت کامنت، بدون حتی یک ثانیه معطلی کاربر.
            </p>
          </div>
        </section>

        {/* ROTATING TICKER BANNER */}
        <div className="ticker" aria-hidden="true">
          <div className="ticker-track">
            <span>⚡️ پاسخ‌دهی ۲۴ ساعته بدون توقف</span>
            <span>🔒 اتصال با پروتکل رسمی اینستاگرام</span>
            <span>💰 افزایش نرخ تبدیل کامنت به خرید</span>
            <span>📱 مدیریت آسان از موبایل و دسکتاپ</span>
            <span>⚡️ پاسخ‌دهی ۲۴ ساعته بدون توقف</span>
            <span>🔒 اتصال با پروتکل رسمی اینستاگرام</span>
            <span>💰 افزایش نرخ تبدیل کامنت به خرید</span>
            <span>📱 مدیریت آسان از موبایل و دسکتاپ</span>
          </div>
        </div>

        {/* 9 FEATURES 3D ROTATING RING */}
        <div className="sec-head" id="features">
          <span className="kicker">امکانات ۹ گانه</span>
          <h2 className="rv">بسته جامع ابزارهای ۹ گانه هوشمند پیام‌بان</h2>
          <p className="rv" style={{ ["--i" as string]: 1 }}>
            تمامی ابزارهایی که یک پیج فروشگاهی، مدرس، پزشک یا برند برای اتوماسیون کامل فروش در
            اینستاگرام به آن احتیاج دارد، در یک پلتفرم یکپارچه و امن.
          </p>
        </div>
        <section className="features" id="featTrack">
          <div className="f-stage">
            <ol className="f-index" id="fIndex"></ol>
            <div className="ring-wrap">
              <div className="f-floor"></div>
              <div className="ring" id="ring">
                <article className="fp">
                  <span className="num">۰۱</span>
                  <div className="ic">
                    <Icons.MessagesSquare />
                  </div>
                  <h3>پاسخ هوشمند دایرکت</h3>
                  <p>پاسخگویی فوری و ۲۴ ساعته به پیام‌های دایرکت و ریپلای‌های استوری بدون نیاز به حضور ادمین.</p>
                </article>
                <article className="fp">
                  <span className="num">۰۲</span>
                  <div className="ic">
                    <Icons.Send />
                  </div>
                  <h3>پاسخ خودکار کامنت</h3>
                  <p>تشخیص هوشمند کلمات کلیدی در کامنت پست‌ها و ریلز و ارسال آنی پاسخ در کامنت و دایرکت.</p>
                </article>
                <article className="fp">
                  <span className="num">۰۳</span>
                  <div className="ic">
                    <Icons.BellRing />
                  </div>
                  <h3>پیگیری خودکار (فالوآپ)</h3>
                  <p>ارسال هوشمند پیام‌های یادآوری سبد خرید و تکمیل سفارش به مشتریان پس از چند ساعت یا چند روز.</p>
                </article>
                <article className="fp">
                  <span className="num">۰۴</span>
                  <div className="ic">
                    <Icons.ListChecks />
                  </div>
                  <h3>فرم‌ساز مرحله‌به‌مرحله</h3>
                  <p>دریافت منظم و گام‌به‌گام اطلاعات مشتری، شماره تلفن، آدرس و انتخاب محصول در محیط دایرکت.</p>
                </article>
                <article className="fp">
                  <span className="num">۰۵</span>
                  <div className="ic">
                    <Icons.MessagesSquare />
                  </div>
                  <h3>کامنت‌های بی‌پاسخ</h3>
                  <p>شناسایی و لیست کردن تمام کامنت‌های جا مانده و پاسخ‌نداده پیج همراه با امکان ریپلای ۱-کلیکی.</p>
                </article>
                <article className="fp">
                  <span className="num">۰۶</span>
                  <div className="ic">
                    <Icons.Contact />
                  </div>
                  <h3>دفترچه تلفن و مدیریت مخاطبان</h3>
                  <p>ذخیره خودکار شماره‌های موبایل لیدها با برچسب‌گذاری و قابلیت دانلود خروجی استاندارد اکسل.</p>
                </article>
                <article className="fp">
                  <span className="num">۰۷</span>
                  <div className="ic">
                    <Icons.Smartphone />
                  </div>
                  <h3>پیامک هوشمند (کاوه‌نگار / فراز)</h3>
                  <p>ارسال پیامک خوش‌آمدگویی، کد پیگیری و فاکتور به مشتریان بلافاصله پس از ثبت شماره در دایرکت.</p>
                </article>
                <article className="fp">
                  <span className="num">۰۸</span>
                  <div className="ic">
                    <Icons.Users />
                  </div>
                  <h3>دسترسی ادمین و همکاران</h3>
                  <p>افزودن نامحدود همکاران و ادمین‌های پیج با تعیین سطح دسترسی اختصاصی بدون نیاز به پسورد پیج.</p>
                </article>
                <article className="fp">
                  <span className="num">۰۹</span>
                  <div className="ic">
                    <Icons.Coins />
                  </div>
                  <h3>همکاری در فروش و درآمدزایی</h3>
                  <p>دریافت پورسانت و کمیسیون نقدی دائمی به ازای هر کاربری که با لینک معرف شما ثبت‌نام کند.</p>
                </article>
              </div>
              <div className="f-meter">
                <span id="fNum">۰۱</span>
                <div className="track">
                  <div className="fill" id="fFill"></div>
                </div>
                <span>۰۹</span>
              </div>
            </div>
          </div>
        </section>

        {/* WHY PAYAMBAN? 3D TUNNEL */}
        <section className="why" id="why">
          <div className="t-stage">
            <div className="t-grid" id="tGrid"></div>
            <div className="t-head">
              <span className="kicker">چرا پیام‌بان؟</span>
              <h2>چرا برترین برندها و پیج‌های اینستاگرام پیام‌بان را انتخاب می‌کنند؟</h2>
              <p>زیرساختی مقاوم برای رشد واقعی، سرعت بالا و امنیت کامل.</p>
            </div>
            <div className="t-scene" id="tScene">
              <article className="plane">
                <div className="p-ic">
                  <Icons.ShieldCheck />
                </div>
                <h3>
                  امنیت ۱۰۰٪ و بدون بلاکی <small>۰۱</small>
                </h3>
                <p>اتصال مستقیم از طریق سرورهای رسمی Meta Graph API صورت می‌پذیرد؛ پیج شما هرگز دچار شادوبن یا بلاکی نمی‌شود.</p>
              </article>
              <article className="plane">
                <div className="p-ic">
                  <Icons.Zap />
                </div>
                <h3>
                  پاسخگویی در کسری از ثانیه <small>۰۲</small>
                </h3>
                <p>مشتری دقیقاً در لحظه‌ای که در اوج انگیزه خرید است، پاسخ را دریافت می‌کند و نرخ تبدیل کامنت به فروش به شدت بالا می‌رود.</p>
              </article>
              <article className="plane">
                <div className="p-ic">
                  <Icons.Bot />
                </div>
                <h3>
                  هوش مصنوعی مکالمه‌گر <small>۰۳</small>
                </h3>
                <p>ربات مجهز به هوش مصنوعی به سوالات تخصصی مشتریان درباره محصولات، سایزبندی و مشخصات فنی دقیق پاسخ می‌دهد.</p>
              </article>
              <article className="plane">
                <div className="p-ic">
                  <Icons.CreditCard />
                </div>
                <h3>
                  اتصال به درگاه و پیامک ایرانی <small>۰۴</small>
                </h3>
                <p>هماهنگی کامل با درگاه بانکی شتاب (زرین‌پال و زیبال) و پنل‌های پیامکی کاوه‌نگار و فراز اس‌ام‌اس جهت صدور فاکتور و اطلاع‌رسانی.</p>
              </article>
            </div>
          </div>
        </section>

        {/* 3 STEPS HOW IT WORKS */}
        <section className="how" id="how">
          <div className="sec-head">
            <span className="kicker">نحوه کارکرد</span>
            <h2 className="rv">شروع به کار آسان در ۳ مرحله ساده</h2>
            <p className="rv" style={{ ["--i" as string]: 1 }}>
              بدون نیاز به دانش فنی یا برنامه‌نویسی، کمتر از ۵ دقیقه پیج خود را هوشمند کنید.
            </p>
          </div>
          <div className="steps">
            <div className="step rv y" style={{ ["--i" as string]: 0 }}>
              <span className="n">۰۱</span>
              <h3>ثبت‌نام و اتصال پیج اینستاگرام</h3>
              <p>در کمتر از ۲ دقیقه ثبت‌نام کنید و پیج کاری خود را بدون نیاز به پسورد، با پروتکل رسمی و ایمن متا متصل کنید.</p>
            </div>
            <div className="step rv y" style={{ ["--i" as string]: 1 }}>
              <span className="n">۰۲</span>
              <h3>تعریف کمپین و کلیدواژه‌ها</h3>
              <p>پست یا ریلز مد نظر را انتخاب کرده، کلمه کلیدی (مثلاً «قیمت» یا «خرید») و متن پاسخ دلخواه را تنظیم کنید.</p>
            </div>
            <div className="step rv y" style={{ ["--i" as string]: 2 }}>
              <span className="n">۰۳</span>
              <h3>رشد خودکار فروش و تعامل</h3>
              <p>سیستم پیام‌بان به صورت ۲۴ ساعته و بدون وقفه، پیام‌ها را ارسال کرده و فروش شما را متحول می‌سازد.</p>
            </div>
          </div>
        </section>

        {/* COMMERCIAL PRICING PLANS */}
        <section className="pricing" id="pricing">
          <div className="sec-head">
            <span className="kicker">تعرفه‌ها و پلن‌ها</span>
            <h2 className="rv">تعرفه‌ها و پلن‌های تجاری</h2>
            <p className="rv" style={{ ["--i" as string]: 1 }}>
              پلن‌های اقتصادی و منعطف متناسب با مقیاس کسب‌وکار شما، با امکان پرداخت آنلاین شتابی یا کارت‌به‌کارت.
            </p>
          </div>
          <div className="plans">
            <div className="plan rv" style={{ ["--i" as string]: 0 }}>
              <h3>استارتر (برنزی)</h3>
              <div className="price">
                <b>۲۹۰,۰۰۰</b>
                <span>تومان / ماهانه</span>
              </div>
              <ul>
                <li>
                  <Icons.Check />
                  ۵,۰۰۰ دایرکت خودکار در ماه
                </li>
                <li>
                  <Icons.Check />
                  ۱ اکانت اینستاگرام تجاری
                </li>
                <li>
                  <Icons.Check />
                  پاسخ خودکار نامحدود کامنت‌ها
                </li>
                <li>
                  <Icons.Check />
                  فرم‌ساز دریافت شماره مشتری
                </li>
                <li>
                  <Icons.Check />
                  ۱۰۰ پیامک رایگان با کاوه‌نگار
                </li>
                <li>
                  <Icons.Check />
                  دفترچه تلفن و خروجی اکسل
                </li>
              </ul>
              <Link href="/billing" className="btn btn-ghost">
                انتخاب پلن استارتر
              </Link>
            </div>

            <div className="plan hot rv" style={{ ["--i" as string]: 1 }}>
              <span className="badge">پیشنهاد ویژه آنلاین‌شاپ‌ها</span>
              <h3>حرفه‌ای (طلایی - پرفروش)</h3>
              <div className="price">
                <b>۶۹۰,۰۰۰</b>
                <span>تومان / ماهانه</span>
              </div>
              <ul>
                <li>
                  <Icons.Check />
                  ۲۰,۰۰۰ دایرکت خودکار در ماه
                </li>
                <li>
                  <Icons.Check />
                  ۳ اکانت اینستاگرام همزمان
                </li>
                <li>
                  <Icons.Check />
                  پاسخگوی هوش مصنوعی (AI)
                </li>
                <li>
                  <Icons.Check />
                  ویترین دیجیتال محصولات در دایرکت
                </li>
                <li>
                  <Icons.Check />
                  پیگیری خودکار و پیام یادآوری
                </li>
                <li>
                  <Icons.Check />
                  ۵۰۰ پیامک اختصاصی اطلاع‌رسانی
                </li>
                <li>
                  <Icons.Check />
                  پشتیبانی تلفنی و اولویت‌دار
                </li>
              </ul>
              <Link href="/billing" className="btn btn-ink">
                <span>شروع با پلن حرفه‌ای</span>
                <Icons.ArrowLeft />
              </Link>
            </div>

            <div className="plan rv" style={{ ["--i" as string]: 2 }}>
              <h3>سازمانی (VIP)</h3>
              <div className="price">
                <b>۱,۴۹۰,۰۰۰</b>
                <span>تومان / ماهانه</span>
              </div>
              <ul>
                <li>
                  <Icons.Check />
                  دایرکت و کامنت نامحدود
                </li>
                <li>
                  <Icons.Check />
                  ۱۰ اکانت اینستاگرام همزمان
                </li>
                <li>
                  <Icons.Check />
                  ۲,۰۰۰ پیامک سازمانی ماهانه
                </li>
                <li>
                  <Icons.Check />
                  هوش مصنوعی با آموزش داده اختصاصی
                </li>
                <li>
                  <Icons.Check />
                  مدیریت چند ادمین و سطوح دسترسی
                </li>
                <li>
                  <Icons.Check />
                  وب‌هوک اختصاصی و اتصال به سایت
                </li>
                <li>
                  <Icons.Check />
                  مدیر اختصاصی و پشتیبانی ۲۴ ساعته
                </li>
              </ul>
              <Link href="/billing" className="btn btn-ghost">
                انتخاب پلن سازمانی
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ ACCORDION */}
        <div className="faq-sec" id="faq">
          <section className="faq">
            <div className="sec-head">
              <span className="kicker">سوالات متداول</span>
              <h2>سوالات متداول کاربران</h2>
              <p>پاسخ به سوالات پرتکرار شما در مورد عملکرد، امنیت و تعرفه‌ها.</p>
            </div>
            <div>
              <details className="qa rv" style={{ ["--i" as string]: 0 }} open>
                <summary>
                  <span>آیا برای استفاده نیاز به پسورد اکانت اینستاگرام است؟</span>
                  <span className="pm">
                    <Icons.Plus />
                  </span>
                </summary>
                <p>خیر، مطلقاً! اتصال از طریق کلیدهای رسمی فیس‌بوک و متا صورت می‌گیرد و هیچ پسوردی از پیج شما دریافت یا ذخیره نمی‌شود.</p>
              </details>
              <details className="qa rv" style={{ ["--i" as string]: 1 }}>
                <summary>
                  <span>آیا خطر بن شدن یا بلاک شدن پیج وجود دارد؟</span>
                  <span className="pm">
                    <Icons.Plus />
                  </span>
                </summary>
                <p>خیر. پیام‌بان از API رسمی اینستاگرام استفاده می‌کند و تمام ارسال‌ها بر اساس نرخ مجاز (Rate Limit) شرکت متا زمان‌بندی و ارسال می‌شوند.</p>
              </details>
              <details className="qa rv" style={{ ["--i" as string]: 2 }}>
                <summary>
                  <span>آیا در طول شبانه‌روز و هنگام خاموش بودن کامپیوتر کار می‌کند؟</span>
                  <span className="pm">
                    <Icons.Plus />
                  </span>
                </summary>
                <p>بله، سرورهای ابری پیام‌بان به صورت ۲۴ ساعته و بدون حتی یک ثانیه وقفه فعال هستند و نیازی نیست شما آنلاین باشید.</p>
              </details>
              <details className="qa rv" style={{ ["--i" as string]: 3 }}>
                <summary>
                  <span>آیا امکان تست رایگان وجود دارد؟</span>
                  <span className="pm">
                    <Icons.Plus />
                  </span>
                </summary>
                <p>بله! پس از ثبت‌نام اولیه، پلن تست رایگان به مدت ۱۴ روز برای شما فعال می‌شود تا با خیالی آسوده تمام امکانات را بررسی کنید.</p>
              </details>
              <details className="qa rv" style={{ ["--i" as string]: 4 }}>
                <summary>
                  <span>چگونه می‌توانم پیامک تایید سفارش ارسال کنم؟</span>
                  <span className="pm">
                    <Icons.Plus />
                  </span>
                </summary>
                <p>تنها با وارد کردن API Key پنل کاوه‌نگار یا فراز اس‌ام‌اس در بخش پیامک هوشمند، پیامک‌ها به صورت خودکار به لیدها ارسال می‌شوند.</p>
              </details>
              <details className="qa rv" style={{ ["--i" as string]: 5 }}>
                <summary>
                  <span>پشتیبانی سامانه به چه صورت است؟</span>
                  <span className="pm">
                    <Icons.Plus />
                  </span>
                </summary>
                <p>تیم پشتیبانی ما از طریق تیکت، گفتگوی آنلاین و پشتیبانی اختصاصی به صورت هفت روز هفته پاسخگوی شما عزیزان است.</p>
              </details>
            </div>
          </section>
        </div>

        {/* CTA BOTTOM HERO WITH 3D LAYERED LOGO */}
        <section className="cta" id="cta">
          <div>
            <h2 className="rv">همین امروز فروش پیج خود را متحول کنید</h2>
            <p className="rv" style={{ ["--i" as string]: 1 }}>
              به جمع هزاران پیج موفق بپیوندید که بدون خستگی و کاملاً هوشمند با پیام‌بان، از اینستاگرام درآمد میلیونی دارند.
            </p>
            <Link href="/dashboard" className="btn btn-ink rv" style={{ ["--i" as string]: 2 }}>
              <span>شروع رایگان و ورود به پیشخوان</span>
              <Icons.ArrowLeft />
            </Link>
          </div>
          <div className="logo3d-wrap" aria-hidden="true">
            <div className="logo3d" id="logo3d"></div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer>
        <div>
          <Link href="#top" className="brand">
            <span className="mark">P</span>
            <span>پیام‌بان</span>
          </Link>
          <p>
            سامانه هوشمند پاسخگویی خودکار کامنت و دایرکت اینستاگرام با تاییدیه رسمی متا و اتصال به
            درگاه‌های پرداخت و پیامک کشور.
          </p>
        </div>
        <div className="f-links">
          <a href="#features">امکانات ۹ گانه</a>
          <a href="#pricing">تعرفه‌ها</a>
          <Link href="/login">ورود به حساب</Link>
          <Link href="/dashboard">پیشخوان مدیریت</Link>
        </div>
        <div className="legal">
          <span>© ۱۴۰۴ تمامی حقوق مادی و معنوی برای سامانه هوشمند پیام‌بان (Payamban Pro) محفوظ است.</span>
          <span>
            <Icons.Lock />
            اتصال امن SSL با پروتکل شتاب
          </span>
        </div>
      </footer>
    </div>
  );
}
