import LogoMark from "../brand/LogoMark";
import HeaderAuthActions from "./HeaderAuthActions";
import { navLinks } from "./marketing-content";

const navLinkClassName = "rounded-md px-3 py-2 hover:text-[#111111]";

export default function SiteHeader() {
  return (
    <header className="border-b border-[#efede8] bg-white/95 backdrop-blur">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <a className="flex items-center gap-3" href="#">
          <LogoMark />
          <span className="text-lg font-semibold tracking-[-0.04em] lowercase">
            trove
          </span>
        </a>

        <ul className="flex flex-wrap items-center gap-2 text-sm text-[#6b6b6b] sm:justify-end">
          {navLinks.map((link) => (
            <li key={link.label}>
              <a className={navLinkClassName} href={link.href}>
                {link.label}
              </a>
            </li>
          ))}
          <HeaderAuthActions />
        </ul>
      </nav>
    </header>
  );
}
