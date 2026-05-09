export default function PulseLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 14C8 10.686 10.686 8 14 8H50C53.314 8 56 10.686 56 14V38C56 41.314 53.314 44 50 44H37.5L30.5 56L23.5 44H14C10.686 44 8 41.314 8 38V14Z"
        fill="white"
        fillOpacity="0.18"
        stroke="white"
        strokeOpacity="0.25"
        strokeWidth="1"
      />
      <path
        d="M12 26H19L23 16L28 37L32 22L35.5 26H52"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
