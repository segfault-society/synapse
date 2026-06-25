import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ResourceCard } from "@/components/synapse/resource-card";
import { makeResource } from "@/test/utils";

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

describe("ResourceCard", () => {
  it("renders the resource name", () => {
    const resource = makeResource({ name: "Room 101" });
    render(<ResourceCard resource={resource} />);
    expect(screen.getByText("Room 101")).toBeInTheDocument();
  });

  it("renders a humanized class badge", () => {
    const resource = makeResource({ resource_class: "computer_lab" });
    render(<ResourceCard resource={resource} />);
    expect(screen.getByText("Computer Lab")).toBeInTheDocument();
  });

  it("renders the building name", () => {
    const resource = makeResource({ building: "Science Block" });
    render(<ResourceCard resource={resource} />);
    expect(screen.getByText("Science Block")).toBeInTheDocument();
  });

  it("renders capacity as 'X seats'", () => {
    const resource = makeResource({ capacity: 24 });
    render(<ResourceCard resource={resource} />);
    expect(screen.getByText("24 seats")).toBeInTheDocument();
  });

  it("renders each equipment item as a Badge chip", () => {
    const resource = makeResource({ equipment: ["Projector", "Whiteboard", "TV"] });
    render(<ResourceCard resource={resource} />);
    expect(screen.getByText("Projector")).toBeInTheDocument();
    expect(screen.getByText("Whiteboard")).toBeInTheDocument();
    expect(screen.getByText("TV")).toBeInTheDocument();
  });

  it("links to /resources/{id}", () => {
    const resource = makeResource({ id: "res-abc123" });
    render(<ResourceCard resource={resource} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/resources/res-abc123");
  });

  it("does not crash with equipment as a non-array string (Json guard)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resource = makeResource({ equipment: "not-an-array" as any });
    expect(() => render(<ResourceCard resource={resource} />)).not.toThrow();
  });

  it("does not crash with equipment as null", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resource = makeResource({ equipment: null as any });
    expect(() => render(<ResourceCard resource={resource} />)).not.toThrow();
  });
});
