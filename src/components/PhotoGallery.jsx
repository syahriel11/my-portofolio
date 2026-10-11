import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  memo,
} from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "../supabase";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Default slides dikosongkan (foto akan dimuat dari Supabase gallery_photos)
const DEFAULT_SLIDES = [];

/* ── 3D Coverflow Carousel Component ── */
function CoverCarousel({
  slides = [],
  rotate = 40,
  depth = 0.8,
  perspective = 3,
  falloff = 0.56,
  fade = 0.1,
  cardWidth = "clamp(240px, 28vw, 380px)",
  gap = 0.05,
  loop = true,
  showNavigation = true,
  className,
}) {
  const totalSlides = slides.length;
  const containerRef = useRef(null);
  const cardRefs = useRef([]);
  const currentPosRef = useRef(0);
  const targetPosRef = useRef(0);
  const cardWidthRef = useRef(0);
  const animFrameRef = useRef(null);
  const pointerStateRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const getNormalizedIndex = useCallback(
    (val) => {
      if (totalSlides === 0) return 0;
      return ((Math.round(val) % totalSlides) + totalSlides) % totalSlides;
    },
    [totalSlides]
  );

  const updatePositions = useCallback(() => {
    const cardW = cardWidthRef.current;
    if (!cardW || totalSlides === 0) return;

    const spacing = cardW * (1 + gap);
    const currentPos = currentPosRef.current;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;

      let offset = index - currentPos;
      if (loop && totalSlides > 2) {
        offset = ((offset % totalSlides) + totalSlides) % totalSlides;
        if (offset > totalSlides / 2) offset -= totalSlides;
      }

      const absOffset = Math.abs(offset);
      const falloffVal = Math.pow(absOffset, falloff);
      const rotation = Math.min(rotate * falloffVal, 82) * Math.sign(offset);

      card.style.transform = `translateX(calc(-50% + ${offset * spacing
        }px)) translateZ(${-depth * cardW * falloffVal}px) rotateY(${-rotation}deg)`;

      const loopFade = (loop && totalSlides > 2)
        ? Math.min(1, Math.max(0, totalSlides / 2 - absOffset))
        : 1;
      card.style.opacity = String(Math.max(0, 1 - fade * absOffset) * loopFade);
      card.style.zIndex = String(100 - Math.round(absOffset));
    });
  }, [totalSlides, depth, fade, falloff, gap, loop, rotate]);

  const animateTo = useCallback(
    (target) => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      targetPosRef.current = target;
      setActiveIndex(getNormalizedIndex(target));

      const step = () => {
        const diff = target - currentPosRef.current;
        if (Math.abs(diff) < 0.0004) {
          currentPosRef.current = target;
          updatePositions();
          animFrameRef.current = null;
          return;
        }
        currentPosRef.current += diff * 0.16;
        updatePositions();
        animFrameRef.current = requestAnimationFrame(step);
      };

      animFrameRef.current = requestAnimationFrame(step);
    },
    [getNormalizedIndex, updatePositions]
  );

  const clampIndex = useCallback(
    (val) => {
      if (totalSlides === 0) return 0;
      return loop ? val : Math.max(0, Math.min(totalSlides - 1, val));
    },
    [totalSlides, loop]
  );

  const stepSlide = useCallback(
    (direction) => {
      animateTo(clampIndex(Math.round(targetPosRef.current) + direction));
    },
    [animateTo, clampIndex]
  );

  // Pointer interaction
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const targetElementRef = useRef(null);

  const handlePointerDown = (e) => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    targetPosRef.current = currentPosRef.current;
    isDraggingRef.current = false;
    startXRef.current = e.clientX;
    targetElementRef.current = e.target;
    pointerStateRef.current = {
      id: e.pointerId,
      x: e.clientX,
      pos: currentPosRef.current,
      v: 0,
      t: performance.now(),
    };
  };

  const handlePointerMove = (e) => {
    const state = pointerStateRef.current;
    if (!state || state.id !== e.pointerId) return;

    if (Math.abs(e.clientX - startXRef.current) > 5) {
      isDraggingRef.current = true;
    }

    const cardSpacing = cardWidthRef.current * (1 + gap);
    if (!cardSpacing) return;

    const now = performance.now();
    const prevPos = currentPosRef.current;
    currentPosRef.current = clampIndex(
      state.pos - (e.clientX - state.x) / cardSpacing
    );

    state.v =
      ((currentPosRef.current - prevPos) / Math.max(now - state.t, 1)) * 1000;
    state.t = now;

    const norm = getNormalizedIndex(currentPosRef.current);
    if (norm !== activeIndex) setActiveIndex(norm);
    updatePositions();
  };

  const handlePointerUp = (e) => {
    const state = pointerStateRef.current;
    if (!state || state.id !== e.pointerId) return;
    pointerStateRef.current = null;

    // Check if clicked directly on a card
    if (!isDraggingRef.current && targetElementRef.current) {
      const cardEl = targetElementRef.current.closest('[role="group"]');
      if (cardEl) {
        const idx = cardRefs.current.indexOf(cardEl);
        if (idx !== -1 && totalSlides > 0) {
          const currentRound = Math.round(currentPosRef.current);
          const currentNorm =
            ((currentRound % totalSlides) + totalSlides) % totalSlides;
          let diff = idx - currentNorm;
          if (loop) {
            if (diff > totalSlides / 2) diff -= totalSlides;
            else if (diff < -totalSlides / 2) diff += totalSlides;
          }
          if (diff !== 0) {
            animateTo(clampIndex(currentRound + diff));
            return;
          }
        }
      }
    }

    // Apply inertia
    const inertia = Math.max(-2, Math.min(2, state.v * 0.18));
    animateTo(clampIndex(Math.round(currentPosRef.current + inertia)));
  };

  const wheelTimeoutRef = useRef(null);
  const handleWheel = (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
    const cardSpacing = cardWidthRef.current * (1 + gap);
    if (!cardSpacing) return;

    if (Math.abs(e.deltaX) < 5) return;
    e.preventDefault();

    currentPosRef.current = clampIndex(
      currentPosRef.current + (e.deltaX / cardSpacing) * 1.5
    );
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const norm = getNormalizedIndex(currentPosRef.current);
    if (norm !== activeIndex) setActiveIndex(norm);
    updatePositions();

    clearTimeout(wheelTimeoutRef.current);
    wheelTimeoutRef.current = setTimeout(() => {
      animateTo(clampIndex(Math.round(currentPosRef.current)));
    }, 150);
  };

  // ResizeObserver for accurate sizing
  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      if (totalSlides === 0) return;
      const firstCard = cardRefs.current[0];
      if (firstCard) {
        cardWidthRef.current = firstCard.offsetWidth;
        updatePositions();
      }
    };

    measure();
    const rafId = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [updatePositions, totalSlides, slides]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (wheelTimeoutRef.current !== null) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, []);

  if (totalSlides === 0) return null;

  return (
    <div
      className={cn(
        "w-full relative flex flex-col items-center select-none overflow-hidden",
        className
      )}
      style={{ "--cf-card": cardWidth }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Photo Gallery Carousel"
    >
      <div className="relative w-full">
        {/* Navigation Arrows */}
        {showNavigation && totalSlides > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => stepSlide(-1)}
              className="absolute left-4 sm:left-10 top-1/2 z-[110] -translate-y-1/2 rounded-full bg-slate-900/80 p-3 text-white border border-white/15 backdrop-blur-md transition-all hover:bg-blue-600 hover:scale-110 hover:border-blue-400 active:scale-95 shadow-lg shadow-black/50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => stepSlide(1)}
              className="absolute right-4 sm:right-10 top-1/2 z-[110] -translate-y-1/2 rounded-full bg-slate-900/80 p-3 text-white border border-white/15 backdrop-blur-md transition-all hover:bg-blue-600 hover:scale-110 hover:border-blue-400 active:scale-95 shadow-lg shadow-black/50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* 3D Viewport */}
        <div
          ref={containerRef}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              stepSlide(-1);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              stepSlide(1);
            }
          }}
          className="cursor-grab py-12 outline-none active:cursor-grabbing w-full flex items-center justify-center overflow-visible"
          style={{
            perspective: `calc(var(--cf-card) * ${perspective})`,
            touchAction: "pan-y",
          }}
        >
          <div
            className="relative select-none w-full flex items-center justify-center"
            style={{
              height: "var(--cf-card)",
              transformStyle: "preserve-3d",
            }}
          >
            {slides.map((slide, index) => (
              <div
                key={slide.id || index}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${totalSlides}`}
                className="absolute left-1/2 top-0 aspect-square overflow-hidden rounded-3xl bg-slate-900/60 shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/10 will-change-transform cursor-pointer transition-shadow hover:shadow-[0_20px_60px_rgba(37,99,235,0.3)] hover:border-blue-500/40"
                style={{
                  width: "var(--cf-card)",
                  transform: "translateX(-50%)",
                }}
              >
                <img
                  src={slide.src || slide.image_url}
                  alt={slide.alt || "Gallery Photo"}
                  draggable={false}
                  loading="lazy"
                  className="h-full w-full select-none object-cover pointer-events-none transition-transform duration-500 hover:scale-105"
                  style={{
                    objectPosition:
                      slide.position ||
                      getPhotoPosition(slide.src || slide.image_url),
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function getPhotoPosition(url) {
  if (!url) return "center center";
  const match = url.match(/#pos=([a-zA-Z0-9%_-]+)/);
  if (!match) return "center center";
  const val = match[1];
  if (val === "top") return "center 15%";
  if (val === "center") return "center 50%";
  if (val === "bottom") return "center 85%";
  const num = parseInt(val, 10);
  if (!isNaN(num)) return `center ${num}%`;
  return "center center";
}

/* ── Main PhotoGallery Section ── */
const PhotoGallery = () => {
  const [photos, setPhotos] = useState(DEFAULT_SLIDES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // Jika tabel belum dibuat di Supabase, fallback demo photos tetap digunakan
        console.warn("Supabase gallery_photos:", error.message);
      } else if (data && data.length > 0) {
        const formatted = data.map((item) => ({
          id: item.id,
          src: item.image_url,
          position: getPhotoPosition(item.image_url),
          alt: "Gallery Photo",
        }));
        setPhotos(formatted);
      }
    } catch (err) {
      console.warn("Using fallback demo photos:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 md:py-24 overflow-hidden relative z-10" id="Gallery">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Section Header */}
      <div className="text-center lg:mb-10 mb-6 px-[5%]">
        <div data-aos="fade-up" data-aos-duration="600">
          <h2
            className="section-label mx-auto"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Memories & Gallery
          </h2>
        </div>
        <p
          className="text-sm md:text-base text-gray-400 mt-3 max-w-xl mx-auto font-light"
          data-aos="fade-up"
          data-aos-delay="200"
        >
          Koleksi dokumentasi kegiatan, momen berharga, dan kenangan perjalanan.
        </p>
      </div>

      {/* 3D Coverflow Carousel */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">Belum ada foto galeri yang ditambahkan.</p>
        </div>
      ) : (
        <div className="w-full">
          <CoverCarousel
            slides={photos}
            showNavigation={photos.length > 1}
            loop={photos.length >= 3}
            cardWidth="clamp(250px, 30vw, 400px)"
            rotate={40}
            depth={0.8}
          />
        </div>
      )}
    </section>
  );
};

export default memo(PhotoGallery);
