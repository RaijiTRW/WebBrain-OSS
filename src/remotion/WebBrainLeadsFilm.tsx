import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import { Video } from "@remotion/media";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const smooth = Easing.bezier(0.22, 1, 0.36, 1);

const businessScenes = [
  "media/webbrain-business-cafe.png",
  "media/webbrain-business-salon.png",
  "media/webbrain-business-shop.png",
  "media/webbrain-business-clinic.png"
];

const leadCards = [
  { delay: 208, color: "#c8ff72", image: "media/webbrain-business-cafe.png" },
  { delay: 238, color: "#72e6ff", image: "media/webbrain-business-salon.png" },
  { delay: 268, color: "#f6d08a", image: "media/webbrain-business-clinic.png" }
];

const fade = (frame: number, start: number, duration: number) =>
  interpolate(frame, [start, start + duration], [0, 1], { ...clamp, easing: ease });

const fadeOut = (frame: number, start: number, duration: number) =>
  interpolate(frame, [start, start + duration], [1, 0], { ...clamp, easing: ease });

const sceneOpacity = (frame: number, start: number, end: number) =>
  fade(frame, start, 28) * fadeOut(frame, end, 28);

export const WebBrainLeadsFilm = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;

  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#020304" }}>
      <CinematicBackground frame={frame} seconds={seconds} />

      <div style={{ position: "absolute", inset: 0, opacity: sceneOpacity(frame, 0, 112) }}>
        <BusinessMontage frame={frame} />
      </div>

      <div style={{ position: "absolute", inset: 0, opacity: sceneOpacity(frame, 86, 214) }}>
        <WebsiteSubmissionShot frame={frame} />
      </div>

      <div style={{ position: "absolute", inset: 0, opacity: sceneOpacity(frame, 220, 340) }}>
        <LeadArrivalShot frame={frame} />
      </div>

      <div style={{ position: "absolute", inset: 0, opacity: fade(frame, 304, 42) }}>
        <FinalStudioShot frame={frame} />
      </div>

      <FilmGrade frame={frame} />
    </AbsoluteFill>
  );
};

const CinematicBackground = ({ frame, seconds }: { frame: number; seconds: number }) => {
  const slowZoom = interpolate(frame, [0, 420], [1.02, 1.14], { ...clamp, easing: smooth });

  return (
    <AbsoluteFill style={{ transform: `scale(${slowZoom})` }}>
      <Video
        src={staticFile("media/webbrain-hero-kling-loop.mp4")}
        muted
        loop
        objectFit="cover"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.2,
          filter: "saturate(0.9) contrast(1.08) brightness(0.58)"
        }}
      />
      <Img
        src={staticFile("media/video-assets/lead-atmosphere.svg")}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.6,
          transform: `translate3d(${Math.sin(seconds * 0.35) * 26}px, ${Math.cos(seconds * 0.31) * 18}px, 0)`
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 22% 18%, rgba(114,230,255,0.16), transparent 30%), radial-gradient(circle at 78% 30%, rgba(200,255,114,0.13), transparent 28%), linear-gradient(180deg, rgba(2,3,4,0.2), #020304 92%)"
        }}
      />
    </AbsoluteFill>
  );
};

const BusinessMontage = ({ frame }: { frame: number }) => {
  return (
    <AbsoluteFill>
      {businessScenes.map((src, index) => {
        const start = index * 24;
        const opacity = fade(frame, start, 20) * fadeOut(frame, start + 76, 24);
        const scale = interpolate(frame, [start, start + 110], [1.12, 1.02], { ...clamp, easing: smooth });
        const x = interpolate(frame, [start, start + 110], [index % 2 === 0 ? -34 : 34, 0], {
          ...clamp,
          easing: smooth
        });

        return (
          <Img
            key={src}
            src={staticFile(src)}
            style={{
              position: "absolute",
              inset: -70,
              width: 2060,
              height: 1220,
              objectFit: "cover",
              opacity,
              transform: `translateX(${x}px) scale(${scale})`,
              filter: "saturate(0.86) contrast(1.08) brightness(0.62)"
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(2,3,4,0.82), rgba(2,3,4,0.14) 46%, rgba(2,3,4,0.74)), linear-gradient(180deg, rgba(2,3,4,0.18), rgba(2,3,4,0.88))"
        }}
      />
      <GlassBrowserPreview frame={frame} />
    </AbsoluteFill>
  );
};

const GlassBrowserPreview = ({ frame }: { frame: number }) => {
  const reveal = fade(frame, 22, 48);
  const lift = interpolate(frame, [22, 110], [48, -18], { ...clamp, easing: smooth });

  return (
    <div
      style={{
        position: "absolute",
        left: 244,
        top: 164 + lift,
        width: 1430,
        height: 732,
        borderRadius: 42,
        overflow: "hidden",
        opacity: reveal,
        transform: `perspective(1600px) rotateX(4deg) rotateY(${interpolate(frame, [22, 130], [-8, -2], {
          ...clamp,
          easing: smooth
        })}deg)`,
        background: "rgba(7,10,13,0.68)",
        border: "1px solid rgba(236,250,255,0.15)",
        boxShadow: "0 70px 180px rgba(0,0,0,0.62), 0 0 120px rgba(114,230,255,0.12)",
        backdropFilter: "blur(18px)"
      }}
    >
      <BrowserBar progress={interpolate(frame, [22, 132], [0.18, 0.82], clamp)} />
      <Img
        src={staticFile("media/webbrain-ref-hero.png")}
        style={{
          position: "absolute",
          left: 0,
          top: 64,
          width: "100%",
          height: 668,
          objectFit: "cover",
          opacity: 0.48,
          filter: "blur(5px) saturate(0.78) brightness(0.58)"
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "64px 0 0 0",
          background:
            "linear-gradient(90deg, rgba(2,3,4,0.76), rgba(2,3,4,0.1) 54%, rgba(2,3,4,0.66)), linear-gradient(180deg, rgba(2,3,4,0.12), rgba(2,3,4,0.82))"
        }}
      />
      <HeroShapes frame={frame} />
    </div>
  );
};

const WebsiteSubmissionShot = ({ frame }: { frame: number }) => {
  const shotProgress = interpolate(frame, [82, 220], [0, 1], { ...clamp, easing: smooth });
  const browserX = interpolate(frame, [82, 220], [130, -180], { ...clamp, easing: smooth });
  const submitProgress = interpolate(frame, [146, 184], [0, 1], { ...clamp, easing: ease });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 160 + browserX,
          top: 110,
          width: 1240,
          height: 780,
          borderRadius: 42,
          overflow: "hidden",
          transform: `perspective(1500px) rotateX(4deg) rotateY(${interpolate(shotProgress, [0, 1], [-5, 1], clamp)}deg)`,
          border: "1px solid rgba(236,250,255,0.16)",
          background: "rgba(7,10,13,0.82)",
          boxShadow: "0 76px 170px rgba(0,0,0,0.62), 0 0 110px rgba(200,255,114,0.1)"
        }}
      >
        <BrowserBar progress={0.68 + submitProgress * 0.22} />
        <Img
          src={staticFile("media/webbrain-asset-product-cafe.png")}
          style={{
            position: "absolute",
            top: 64,
            left: 0,
            width: "100%",
            height: 716,
            objectFit: "cover",
            opacity: 0.48,
            filter: "blur(5px) saturate(0.78) brightness(0.58)"
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "64px 0 0 0",
            background:
              "linear-gradient(90deg, rgba(2,3,4,0.78), rgba(2,3,4,0.1) 44%, rgba(2,3,4,0.64)), linear-gradient(180deg, rgba(2,3,4,0.08), rgba(2,3,4,0.8))"
          }}
        />
        <HeroShapes frame={frame} shifted />
        <FormPanel frame={frame} submitProgress={submitProgress} />
      </div>
      <CursorAction frame={frame} />
    </AbsoluteFill>
  );
};

const LeadArrivalShot = ({ frame }: { frame: number }) => {
  const phoneReveal = fade(frame, 198, 38);
  const phoneY = interpolate(frame, [198, 310], [52, -20], { ...clamp, easing: smooth });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 128,
          top: 138,
          width: 650,
          height: 780,
          borderRadius: 48,
          overflow: "hidden",
          opacity: fade(frame, 196, 42),
          transform: `perspective(1400px) rotateX(5deg) rotateY(8deg) translateY(${interpolate(frame, [196, 320], [28, -16], {
            ...clamp,
            easing: smooth
          })}px)`,
          border: "1px solid rgba(255,255,255,0.13)",
          background: "rgba(8,12,16,0.72)",
          boxShadow: "0 70px 160px rgba(0,0,0,0.56), 0 0 110px rgba(114,230,255,0.1)"
        }}
      >
        <Img
          src={staticFile("media/webbrain-business-services.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.62,
            filter: "saturate(0.82) brightness(0.7)"
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(2,3,4,0.18), rgba(2,3,4,0.82))"
          }}
        />
        <FormReceipt frame={frame} />
      </div>

      <div
        style={{
          position: "absolute",
          right: 210,
          top: 120 + phoneY,
          width: 560,
          height: 790,
          borderRadius: 58,
          opacity: phoneReveal,
          background: "linear-gradient(180deg, rgba(18,29,35,0.8), rgba(4,7,10,0.78))",
          border: "1px solid rgba(237,250,255,0.16)",
          boxShadow: "0 80px 170px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.14)",
          overflow: "hidden",
          backdropFilter: "blur(22px)"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 26% 16%, rgba(200,255,114,0.18), transparent 25%), radial-gradient(circle at 72% 42%, rgba(114,230,255,0.13), transparent 26%)"
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 52,
            top: 52,
            width: 66,
            height: 66,
            borderRadius: 22,
            background: "linear-gradient(135deg, rgba(200,255,114,0.24), rgba(114,230,255,0.14))",
            border: "1px solid rgba(255,255,255,0.12)"
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 54,
            top: 72,
            width: 132,
            height: 30,
            borderRadius: 999,
            background: "rgba(200,255,114,0.12)",
            border: "1px solid rgba(200,255,114,0.18)"
          }}
        />
        {leadCards.map((lead, index) => (
          <NotificationCard key={lead.delay} frame={frame} index={index} {...lead} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const FinalStudioShot = ({ frame }: { frame: number }) => {
  const push = interpolate(frame, [304, 420], [44, -12], { ...clamp, easing: smooth });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 148,
          top: 130 + push,
          width: 1624,
          height: 780,
          borderRadius: 52,
          overflow: "hidden",
          background: "rgba(6,10,13,0.74)",
          border: "1px solid rgba(255,255,255,0.13)",
          boxShadow: "0 90px 190px rgba(0,0,0,0.64), 0 0 140px rgba(114,230,255,0.1)"
        }}
      >
        <Img
          src={staticFile("media/webbrain-ref-product.png")}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.36,
            filter: "blur(5px) saturate(0.78) brightness(0.58)"
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(2,3,4,0.78), rgba(2,3,4,0.2) 50%, rgba(2,3,4,0.78)), linear-gradient(180deg, rgba(2,3,4,0.08), rgba(2,3,4,0.78))"
          }}
        />
        <FinalGallery frame={frame} />
        <FinalLeadStack frame={frame} />
      </div>
    </AbsoluteFill>
  );
};

const BrowserBar = ({ progress }: { progress: number }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: 64,
      background: "linear-gradient(180deg, rgba(24,34,42,0.95), rgba(8,12,16,0.92))",
      borderBottom: "1px solid rgba(255,255,255,0.08)"
    }}
  >
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: 34 + i * 25,
          top: 26,
          width: 11,
          height: 11,
          borderRadius: 99,
          background: ["#ff8f70", "#f6d08a", "#c8ff72"][i],
          opacity: 0.64
        }}
      />
    ))}
    <div
      style={{
        position: "absolute",
        left: 152,
        top: 17,
        width: 640,
        height: 30,
        borderRadius: 999,
        background: "rgba(255,255,255,0.055)",
        border: "1px solid rgba(255,255,255,0.08)",
        overflow: "hidden"
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          background: "linear-gradient(90deg, rgba(114,230,255,0.0), rgba(200,255,114,0.22), rgba(255,255,255,0.08))"
        }}
      />
    </div>
    <div
      style={{
        position: "absolute",
        right: 44,
        top: 21,
        width: 132,
        height: 24,
        borderRadius: 999,
        background: "rgba(255,255,255,0.055)",
        border: "1px solid rgba(255,255,255,0.075)"
      }}
    />
  </div>
);

const HeroShapes = ({ frame, shifted = false }: { frame: number; shifted?: boolean }) => {
  const pulse = interpolate(frame % 74, [0, 28, 74], [0.2, 1, 0.2], clamp);
  const baseY = shifted ? 28 : 0;

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 94,
          top: 158 + baseY,
          width: 520,
          height: 68,
          borderRadius: 999,
          background: "linear-gradient(90deg, rgba(255,255,255,0.28), rgba(200,255,114,0.36), rgba(255,255,255,0.08))",
          boxShadow: "0 22px 60px rgba(200,255,114,0.14)",
          opacity: 0.8
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 262 + baseY,
          width: 384,
          height: 20,
          borderRadius: 999,
          background: "rgba(255,255,255,0.2)"
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 306 + baseY,
          width: 286,
          height: 17,
          borderRadius: 999,
          background: "rgba(255,255,255,0.13)"
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 396 + baseY,
          width: 220,
          height: 58,
          borderRadius: 999,
          background: "linear-gradient(135deg, #fbfff5, #c8ff72)",
          boxShadow: `0 0 ${28 + pulse * 42}px rgba(200,255,114,0.26)`
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 344,
          top: 396 + baseY,
          width: 172,
          height: 58,
          borderRadius: 999,
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.1)"
        }}
      />
    </>
  );
};

const FormPanel = ({ frame, submitProgress }: { frame: number; submitProgress: number }) => {
  const reveal = fade(frame, 112, 42);
  const check = fade(frame, 176, 16);

  return (
    <div
      style={{
        position: "absolute",
        right: 78,
        top: 142,
        width: 388,
        height: 486,
        borderRadius: 34,
        opacity: reveal,
        background: "linear-gradient(180deg, rgba(17,26,32,0.86), rgba(4,7,10,0.76))",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 38px 100px rgba(0,0,0,0.44), inset 0 1px 0 rgba(255,255,255,0.12)",
        backdropFilter: "blur(18px)"
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 34,
          top: 34,
          width: 148,
          height: 22,
          borderRadius: 999,
          background: "rgba(255,255,255,0.18)"
        }}
      />
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          style={{
            position: "absolute",
            left: 34,
            right: 34,
            top: 104 + row * 84,
            height: 48,
            borderRadius: 16,
            background: "rgba(255,255,255,0.065)",
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              width: `${interpolate(frame, [122 + row * 10, 158 + row * 10], [20, [62, 78, 48][row]], {
                ...clamp,
                easing: ease
              })}%`,
              height: "100%",
              background: "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.14))"
            }}
          />
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          left: 34,
          right: 34,
          bottom: 38,
          height: 62,
          borderRadius: 999,
          background: `linear-gradient(135deg, rgba(251,255,245,${0.92 + submitProgress * 0.08}), rgba(200,255,114,1))`,
          boxShadow: `0 0 ${24 + submitProgress * 70}px rgba(200,255,114,${0.2 + submitProgress * 0.18})`,
          transform: `scale(${1 - submitProgress * 0.025})`
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 25,
            height: 13,
            borderLeft: "5px solid rgba(2,3,4,0.76)",
            borderBottom: "5px solid rgba(2,3,4,0.76)",
            opacity: check,
            transform: "translate(-50%, -62%) rotate(-45deg)"
          }}
        />
      </div>
    </div>
  );
};

const CursorAction = ({ frame }: { frame: number }) => {
  const opacity = sceneOpacity(frame, 112, 196);
  const x = interpolate(frame, [112, 152, 184], [1070, 1220, 1220], { ...clamp, easing: smooth });
  const y = interpolate(frame, [112, 152, 184], [652, 714, 714], { ...clamp, easing: smooth });
  const press = interpolate(frame, [152, 160, 168], [1, 0.82, 1], clamp);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 34,
        height: 34,
        opacity,
        transform: `scale(${press}) rotate(-14deg)`,
        filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.45))"
      }}
    >
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "0px solid transparent",
          borderRight: "24px solid transparent",
          borderTop: "34px solid rgba(255,255,255,0.9)"
        }}
      />
    </div>
  );
};

const FormReceipt = ({ frame }: { frame: number }) => {
  const reveal = fade(frame, 202, 32);

  return (
    <div
      style={{
        position: "absolute",
        left: 54,
        right: 54,
        bottom: 62,
        height: 178,
        borderRadius: 32,
        opacity: reveal,
        background: "rgba(3,6,8,0.68)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 28px 80px rgba(0,0,0,0.45)"
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 30,
          top: 28,
          width: 62,
          height: 62,
          borderRadius: 22,
          background: "linear-gradient(135deg, #fbfff4, #c8ff72)",
          boxShadow: "0 0 38px rgba(200,255,114,0.28)"
        }}
      />
      <div style={{ position: "absolute", left: 118, top: 35, width: 230, height: 14, borderRadius: 99, background: "rgba(255,255,255,0.28)" }} />
      <div style={{ position: "absolute", left: 118, top: 68, width: 310, height: 11, borderRadius: 99, background: "rgba(255,255,255,0.15)" }} />
      <div style={{ position: "absolute", left: 118, top: 96, width: 174, height: 11, borderRadius: 99, background: "rgba(255,255,255,0.12)" }} />
    </div>
  );
};

const NotificationCard = ({
  frame,
  index,
  delay,
  color,
  image
}: {
  frame: number;
  index: number;
  delay: number;
  color: string;
  image: string;
}) => {
  const reveal = fade(frame, delay, 28);
  const y = 172 + index * 162 + interpolate(frame, [delay, delay + 28], [44, 0], { ...clamp, easing: ease });

  return (
    <div
      style={{
        position: "absolute",
        left: 42,
        top: y,
        width: 476,
        height: 122,
        borderRadius: 30,
        opacity: reveal,
        background: "linear-gradient(180deg, rgba(255,255,255,0.095), rgba(255,255,255,0.042))",
        border: "1px solid rgba(255,255,255,0.11)",
        boxShadow: `0 30px 70px rgba(0,0,0,0.34), 0 0 ${reveal * 54}px ${color}33`,
        overflow: "hidden"
      }}
    >
      <Img
        src={staticFile(image)}
        style={{
          position: "absolute",
          left: 18,
          top: 18,
          width: 86,
          height: 86,
          borderRadius: 22,
          objectFit: "cover",
          filter: "saturate(0.9) brightness(0.86)"
        }}
      />
      <div style={{ position: "absolute", left: 128, top: 28, width: 160, height: 13, borderRadius: 99, background: "rgba(255,255,255,0.32)" }} />
      <div style={{ position: "absolute", left: 128, top: 58, width: 244, height: 10, borderRadius: 99, background: "rgba(255,255,255,0.16)" }} />
      <div style={{ position: "absolute", left: 128, top: 84, width: 118, height: 10, borderRadius: 99, background: "rgba(255,255,255,0.12)" }} />
      <div
        style={{
          position: "absolute",
          right: 30,
          top: 45,
          width: 32,
          height: 32,
          borderRadius: 99,
          background: color,
          boxShadow: `0 0 32px ${color}`,
          opacity: 0.82
        }}
      />
    </div>
  );
};

const FinalGallery = ({ frame }: { frame: number }) => {
  return (
    <div style={{ position: "absolute", left: 82, top: 128, display: "flex", gap: 28 }}>
      {businessScenes.map((src, index) => {
        const reveal = fade(frame, 314 + index * 10, 30);
        return (
          <div
            key={src}
            style={{
              width: 260,
              height: 460,
              borderRadius: 32,
              overflow: "hidden",
              position: "relative",
              opacity: reveal,
              transform: `translateY(${interpolate(frame, [314 + index * 10, 354 + index * 10], [46, 0], {
                ...clamp,
                easing: ease
              })}px)`,
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 42px 86px rgba(0,0,0,0.42)"
            }}
          >
            <Img
              src={staticFile(src)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "saturate(0.88) brightness(0.72)"
              }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 45%, rgba(2,3,4,0.76))" }} />
          </div>
        );
      })}
    </div>
  );
};

const FinalLeadStack = ({ frame }: { frame: number }) => {
  return (
    <div
      style={{
        position: "absolute",
        right: 92,
        top: 116,
        width: 430,
        height: 548,
        borderRadius: 38,
        background: "rgba(5,8,11,0.7)",
        border: "1px solid rgba(255,255,255,0.13)",
        boxShadow: "0 48px 110px rgba(0,0,0,0.46)",
        backdropFilter: "blur(18px)"
      }}
    >
      {leadCards.map((lead, index) => {
        const reveal = fade(frame, 324 + index * 12, 28);
        return (
          <div
            key={lead.image}
            style={{
              position: "absolute",
              left: 28,
              top: 46 + index * 152,
              width: 374,
              height: 118,
              borderRadius: 28,
              opacity: reveal,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)"
            }}
          >
            <Img
              src={staticFile(lead.image)}
              style={{
                position: "absolute",
                left: 18,
                top: 18,
                width: 82,
                height: 82,
                borderRadius: 22,
                objectFit: "cover",
                filter: "saturate(0.86) brightness(0.84)"
              }}
            />
            <div style={{ position: "absolute", left: 122, top: 34, width: 150, height: 12, borderRadius: 99, background: "rgba(255,255,255,0.3)" }} />
            <div style={{ position: "absolute", left: 122, top: 64, width: 206, height: 10, borderRadius: 99, background: "rgba(255,255,255,0.14)" }} />
            <div
              style={{
                position: "absolute",
                right: 24,
                top: 42,
                width: 34,
                height: 34,
                borderRadius: 99,
                background: lead.color,
                boxShadow: `0 0 34px ${lead.color}`,
                opacity: 0.8
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

const FilmGrade = ({ frame }: { frame: number }) => {
  const sweep = interpolate(frame, [0, 420], [-720, 2460], { ...clamp, easing: Easing.inOut(Easing.ease) });

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 50% 46%, transparent 0%, transparent 52%, rgba(2,3,4,0.5) 78%, rgba(2,3,4,0.88) 100%)"
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.14,
          mixBlendMode: "soft-light",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.48'/%3E%3C/svg%3E\")"
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -120,
          left: sweep,
          width: 440,
          height: 1320,
          transform: "rotate(18deg)",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.075), transparent)",
          filter: "blur(22px)",
          opacity: 0.58
        }}
      />
    </>
  );
};
