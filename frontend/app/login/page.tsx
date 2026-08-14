import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(#c1c8c2 1px, transparent 1px),
              linear-gradient(90deg, #c1c8c2 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(transparent 0%, rgba(209,231,211,0.2) 100%)",
          }}
        />
        <div className="relative z-10 w-full max-w-md mx-4">
          <div className="glass-panel p-10 shadow-[0_20px_40px_rgba(45,79,62,0.05)]">
            <div className="flex flex-col items-center mb-8">
              <span className="material-symbols-outlined text-4xl text-primary mb-4">lock</span>
              <h1 className="text-headline-lg text-primary mb-2">Admin Access</h1>
              <span className="text-label-caps bg-mint-accent/20 border border-mint-accent text-primary px-3 py-1">
                Protected Area
              </span>
            </div>
            <LoginForm />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
