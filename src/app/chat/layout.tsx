import Sidebar from '@/components/chat/sidebar'
import TopNav from '@/components/chat/top-nav'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen flex-col bg-[#070d1f]">
      {/* Global Top Navigation */}
      <TopNav />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative border-l border-[#32457c]/10 bg-[#070d1f]">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#32457c]/5 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#0a2257]/5 blur-[120px] pointer-events-none" />
          
          <div className="relative h-full z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
