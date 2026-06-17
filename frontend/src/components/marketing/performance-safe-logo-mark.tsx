import type { PerformanceSafeCuratedLogoSlug } from "@/lib/performance-safe-curated-logos";
import { getPerformanceSafeCuratedLogoSpec } from "@/lib/performance-safe-curated-logos";

const FONT =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function MicrosoftSquares() {
  const size = 3.8;
  const gap = 0.5;
  const colors = ["#F25022", "#7FBA00", "#00A4EF", "#FFB900"] as const;
  return (
    <>
      {colors.map((fill, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        return (
          <rect
            key={fill}
            x={col * (size + gap)}
            y={row * (size + gap)}
            width={size}
            height={size}
            fill={fill}
            rx={0.2}
          />
        );
      })}
    </>
  );
}

function NvidiaAccent() {
  return <rect x={0} y={2.2} width={2.8} height={11.5} rx={0.4} fill="#76B900" />;
}

function AmazonSmile() {
  return (
    <path
      d="M42 11.2c3.2 1.2 6.4 1.8 9.8 1.8"
      fill="none"
      stroke="#FF9900"
      strokeWidth={1.1}
      strokeLinecap="round"
    />
  );
}

function BrandSvgContent({ slug }: { slug: PerformanceSafeCuratedLogoSlug }) {
  const spec = getPerformanceSafeCuratedLogoSpec(slug);
  if (!spec) {
    return null;
  }

  switch (slug) {
    case "apple":
      return (
        <text
          x={44}
          y={12.5}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={14.5}
          fontWeight={600}
          fill={spec.brandColor}
        >
          Apple
        </text>
      );
    case "microsoft":
      return (
        <>
          <g transform="translate(14 3.2)">
            <MicrosoftSquares />
          </g>
          <text
            x={52}
            y={12.5}
            textAnchor="middle"
            fontFamily={FONT}
            fontSize={12}
            fontWeight={600}
            fill={spec.brandColor}
          >
            Microsoft
          </text>
        </>
      );
    case "google":
      return (
        <text
          x={44}
          y={12.8}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={14}
          fontWeight={600}
        >
          <tspan fill="#4285F4">G</tspan>
          <tspan fill="#EA4335">o</tspan>
          <tspan fill="#FBBC05">o</tspan>
          <tspan fill="#4285F4">g</tspan>
          <tspan fill="#34A853">l</tspan>
          <tspan fill="#EA4335">e</tspan>
        </text>
      );
    case "amazon":
      return (
        <>
          <text
            x={38}
            y={12.2}
            textAnchor="middle"
            fontFamily={FONT}
            fontSize={14}
            fontWeight={600}
            fill={spec.brandColor}
          >
            amazon
          </text>
          <AmazonSmile />
        </>
      );
    case "nvidia":
      return (
        <>
          <g transform="translate(10 3.5)">
            <NvidiaAccent />
          </g>
          <text
            x={50}
            y={12.5}
            textAnchor="middle"
            fontFamily={FONT}
            fontSize={13}
            fontWeight={700}
            letterSpacing={0.6}
            fill={spec.brandColor}
          >
            NVIDIA
          </text>
        </>
      );
    case "meta":
      return (
        <text
          x={44}
          y={12.8}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={15}
          fontWeight={700}
          fill={spec.brandColor}
        >
          Meta
        </text>
      );
    case "visa":
      return (
        <text
          x={44}
          y={12.8}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={15}
          fontWeight={800}
          letterSpacing={1.2}
          fill={spec.brandColor}
          style={{ fontStyle: "normal" }}
        >
          VISA
        </text>
      );
    case "salesforce":
      return (
        <text
          x={44}
          y={12.8}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={14.5}
          fontWeight={600}
          fill={spec.brandColor}
        >
          salesforce
        </text>
      );
    case "netflix":
      return (
        <text
          x={44}
          y={12.5}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={13}
          fontWeight={800}
          letterSpacing={0.8}
          fill={spec.brandColor}
        >
          NETFLIX
        </text>
      );
    default:
      return null;
  }
}

type PerformanceSafeLogoMarkProps = {
  slug: PerformanceSafeCuratedLogoSlug;
};

/** Inline curated wordmark — consistent optical height, no network assets. */
export function PerformanceSafeLogoMark({ slug }: PerformanceSafeLogoMarkProps) {
  const spec = getPerformanceSafeCuratedLogoSpec(slug);
  if (!spec) {
    return null;
  }

  return (
    <svg
      className="performance-safe-logo-mark"
      viewBox="0 0 88 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      data-performance-safe-logo-mark={slug}
      data-optical-scale={spec.opticalScale}
      data-render-type={spec.renderType}
      data-quality-status={spec.qualityStatus}
    >
      <g
        className="performance-safe-logo-mark__inner"
        transform={`translate(44 8) scale(${spec.opticalScale}) translate(-44 -8)`}
      >
        <BrandSvgContent slug={slug} />
      </g>
    </svg>
  );
}
