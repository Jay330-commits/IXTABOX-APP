import { OwnerNavProvider } from "./OwnerNavContext";

export default function PostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen h-[100dvh] w-full min-w-0 max-w-[100vw] overflow-x-hidden overflow-y-auto scrollbar-hide bg-slate-950 text-white">
      <OwnerNavProvider>
        {children}
      </OwnerNavProvider>
    </div>
  );
}
