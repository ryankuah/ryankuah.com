import { Fireside } from "@/components/fireside";

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Fireside />
      {children}
    </>
  );
}
