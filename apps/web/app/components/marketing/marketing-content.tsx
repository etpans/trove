import { MessageIcon, PeopleIcon, PhotoIcon } from "./icons";

export const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#schools", label: "For schools" },
];

export const heroHighlights = [
  "Write in plain language",
  "Attach student work",
  "Share only selected notes",
];

export const features = [
  {
    description:
      "Write what you noticed, in your own words. No rubrics to fill in.",
    icon: <MessageIcon />,
    tintClassName: "bg-[#E1F5EE] text-[#0F6E56]",
    title: "Comments, not scores",
  },
  {
    description:
      "Attach the actual work and annotate the part your comment is about.",
    icon: <PhotoIcon />,
    tintClassName: "bg-[#FAECE7] text-[#993C1D]",
    title: "Photos with context",
  },
  {
    description:
      "Pick which notes go to parents. Everything else stays private to you.",
    icon: <PeopleIcon />,
    tintClassName: "bg-[#EEEDFE] text-[#534AB7]",
    title: "Share moments home",
  },
];
