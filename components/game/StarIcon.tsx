import { useId } from "react";

interface StarIconProps {
    className?: string;
}

export default function StarIcon({ className }: StarIconProps) {
    const id = useId();
    const starFillId = `starFill-${id}`;
    const starStrokeId = `starStroke-${id}`;
    const innerGlowId = `innerGlow-${id}`;
    const starClipId = `starClip-${id}`;

    return (
        <svg
            width="96"
            height="96"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className={className}
        >
            <defs>
                {/* ⭐ FILL — ทองชัดขึ้น */}
                <linearGradient id={starFillId} x1="4" y1="2" x2="20" y2="22">
                    <stop offset="0%" stopColor="#FFD54F" />
                    <stop offset="45%" stopColor="#FFB300" />
                    <stop offset="75%" stopColor="#FF8F00" />
                    <stop offset="100%" stopColor="#FF6F00" />
                </linearGradient>

                {/* ⭐ STROKE — ขาว + ทองเข้ม */}
                <linearGradient id={starStrokeId} x1="4" y1="2" x2="20" y2="22">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                    <stop offset="100%" stopColor="#E65100" stopOpacity="1" />
                </linearGradient>

                {/* ✨ INNER GLOW — ชัดขึ้น */}
                <filter id={innerGlowId} x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="1.4" result="b" />
                    <feComposite in="b" in2="SourceAlpha" operator="in" result="ib" />
                    <feColorMatrix
                        in="ib"
                        type="matrix"
                        values="
              1 0 0 0 1
              0 1 0 0 0.9
              0 0 1 0 0.35
              0 0 0 0.7 0
            "
                        result="g"
                    />
                    <feMerge>
                        <feMergeNode in="SourceGraphic" />
                        <feMergeNode in="g" />
                    </feMerge>
                </filter>

                <clipPath id={starClipId}>
                    <path d="M12 2.55l2.95 6.08 6.7.97-4.86 4.66 1.16 6.65L12 18.95 6.05 20.91l1.16-6.65L2.35 9.6l6.7-.97L12 2.55z" />
                </clipPath>
            </defs>

            <g>
                {/* ⭐ BODY */}
                <path
                    d="M12 2.55l2.95 6.08 6.7.97-4.86 4.66 1.16 6.65L12 18.95 6.05 20.91l1.16-6.65L2.35 9.6l6.7-.97L12 2.55z"
                    fill={`url(#${starFillId})`}
                    stroke={`url(#${starStrokeId})`}
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                />

                {/* ✨ HIGHLIGHTS */}
                <g clipPath={`url(#${starClipId})`}>
                    <path
                        d="M4.2 8.1c3.4-2.2 7.6-3.3 11.8-3.2"
                        stroke="#FFFFFF"
                        strokeOpacity="0.65"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        filter={`url(#${innerGlowId})`}
                    />
                    <path
                        d="M4 10.9c4.8-2.5 10.6-3.3 16.6-2.6"
                        stroke="#FFFFFF"
                        strokeOpacity="0.35"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                    />
                </g>
            </g>
        </svg>
    );
}
