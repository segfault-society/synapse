import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { SynapseHeader } from "@/components/synapse/synapse-header";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/synapse/persona-switcher", () => ({
  PersonaSwitcher: () => <div data-testid="persona-switcher" />,
}));

describe("SynapseHeader", () => {
  it('renders the "SYNAPSE" wordmark text', () => {
    render(<SynapseHeader />);
    // The wordmark is split: "SYN" + <span>A</span> + "PSE"
    // Check the container element
    const header = screen.getByRole("banner");
    expect(header.textContent).toContain("SYNAPSE");
  });

  it('renders the highlighted "A" in the wordmark', () => {
    render(<SynapseHeader />);
    // The "A" is inside a span with text-primary class
    const aSpan = screen.getByText("A");
    expect(aSpan).toBeInTheDocument();
    expect(aSpan.tagName).toBe("SPAN");
  });

  it("has a nav link to /", () => {
    render(<SynapseHeader />);
    const links = screen.getAllByRole("link", { name: /home/i });
    expect(links.length).toBeGreaterThan(0);
  });

  it("has nav links to /me, /admin, /demo", () => {
    render(<SynapseHeader />);
    expect(screen.getByRole("link", { name: /^me$/i })).toHaveAttribute("href", "/me");
    expect(screen.getByRole("link", { name: /^admin$/i })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: /^demo$/i })).toHaveAttribute("href", "/demo");
  });

  it("renders the persona switcher placeholder", () => {
    render(<SynapseHeader />);
    expect(screen.getByTestId("persona-switcher")).toBeInTheDocument();
  });
});
