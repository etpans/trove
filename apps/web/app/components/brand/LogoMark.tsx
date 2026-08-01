export default function LogoMark() {
  return (
    <div className="flex size-9 items-center justify-center rounded-[10px] border border-[#111111] bg-white">
      <svg
        aria-hidden="true"
        className="size-5 text-[#111111]"
        fill="none"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6.25 5.25h11.5a1.5 1.5 0 0 1 1.5 1.5v10.5a1.5 1.5 0 0 1-1.5 1.5H6.25a1.5 1.5 0 0 1-1.5-1.5V6.75a1.5 1.5 0 0 1 1.5-1.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M8.5 8.75h7M8.5 12h7M8.5 15.25h4.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
