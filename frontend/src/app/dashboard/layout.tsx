import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex bg-black h-screen w-screen text-white font-sans overflow-hidden">
        <AppSidebar />
        <main className="flex-1 p-6 h-full flex flex-col overflow-hidden relative">
          {/* Top Header Row with Collapse/Expand Trigger */}
          <div className="flex-shrink-0 flex items-center mb-2 z-30">
            <SidebarTrigger className="text-neutral-400 hover:text-white hover:bg-white/[0.02] border border-white/[0.05] bg-neutral-950/40 p-2.5 rounded-xl transition-all duration-200" />
          </div>
          
          {/* Dashboard Children Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
