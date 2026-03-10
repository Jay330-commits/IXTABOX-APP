import IxtaownerAuthGuard from "./IxtaownerAuthGuard";

export default function IxtaownerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <IxtaownerAuthGuard>{children}</IxtaownerAuthGuard>;
}
