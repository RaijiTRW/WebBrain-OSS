import type { CSSProperties } from "react";

const HEADER_GLASS_PROPS = {
  width: 800,
  height: 200,
  borderRadius: 28,
  innerShadowColor: "#000000",
  innerShadowBlur: 21,
  innerShadowSpread: -2,
  glassTintColor: "rgba(255, 255, 255, 0)",
  glassTintOpacity: 0,
  frostBlurRadius: 3,
  noiseFrequency: 0.008,
  noiseStrength: 142
} as const;

type HeaderGlassStyle = CSSProperties & {
  "--webbrain-glass-width": string;
  "--webbrain-glass-height": string;
  "--webbrain-glass-radius": string;
  "--webbrain-glass-inner-shadow-color": string;
  "--webbrain-glass-inner-shadow-blur": string;
  "--webbrain-glass-inner-shadow-spread": string;
  "--webbrain-glass-tint-color": string;
  "--webbrain-glass-tint-opacity": number;
  "--webbrain-glass-frost-blur": string;
};

export function HeaderLiquidGlass() {
  const {
    width,
    height,
    borderRadius,
    innerShadowColor,
    innerShadowBlur,
    innerShadowSpread,
    glassTintColor,
    glassTintOpacity,
    frostBlurRadius,
    noiseFrequency,
    noiseStrength
  } = HEADER_GLASS_PROPS;
  const style: HeaderGlassStyle = {
    "--webbrain-glass-width": `${width}px`,
    "--webbrain-glass-height": `${height}px`,
    "--webbrain-glass-radius": `var(--webbrain-header-radius, ${borderRadius}px)`,
    "--webbrain-glass-inner-shadow-color": innerShadowColor,
    "--webbrain-glass-inner-shadow-blur": `${innerShadowBlur}px`,
    "--webbrain-glass-inner-shadow-spread": `${innerShadowSpread}px`,
    "--webbrain-glass-tint-color": glassTintColor,
    "--webbrain-glass-tint-opacity": glassTintOpacity,
    "--webbrain-glass-frost-blur": `${frostBlurRadius}px`
  };

  return (
    <span className="webbrain-header-liquid-glass" style={style} aria-hidden="true">
      <svg
        className="webbrain-header-liquid-glass__filters"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="presentation"
        focusable="false"
      >
        <defs>
          <filter
            id="webbrain-header-glass-distortion"
            x={-noiseStrength}
            y={-noiseStrength}
            width={width + noiseStrength * 2}
            height={height + noiseStrength * 2}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency={noiseFrequency}
              numOctaves="4"
              seed="11"
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix in="noise" type="saturate" values="0" result="monoNoise" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="monoNoise"
              scale={noiseStrength}
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            <feGaussianBlur in="displaced" stdDeviation={frostBlurRadius} result="frosted" />
            <feComposite in="frosted" in2="SourceGraphic" operator="over" />
          </filter>
        </defs>
      </svg>
      <span className="webbrain-header-liquid-glass__frost" />
      <span className="webbrain-header-liquid-glass__refraction" />
      <span className="webbrain-header-liquid-glass__inner-shadow" />
    </span>
  );
}
