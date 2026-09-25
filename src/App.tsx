import { HashRouter, Navigate, Route, Routes } from "react-router";
import { UnlockProvider } from "./components/unlock-provider.tsx";
import { AboutPage, PrivacyPage } from "./pages/AboutPage.tsx";
import { RoofSetoutPage } from "./pages/RoofSetoutPage.tsx";

export default function App() {
  return (
    <HashRouter>
      <UnlockProvider>
        <div className="min-h-dvh bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <Routes>
            <Route path="/" element={<RoofSetoutPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </UnlockProvider>
    </HashRouter>
  );
}
