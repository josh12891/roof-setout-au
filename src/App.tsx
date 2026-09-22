import { HashRouter, Navigate, Route, Routes } from "react-router";
import { UnlockProvider } from "./components/unlock-provider.tsx";
import { AboutPage, PrivacyPage } from "./pages/AboutPage.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { CommonRafterTool } from "./components/roof/common-rafter-tool.tsx";
import { GableEndsTool } from "./components/roof/gable-ends-tool.tsx";
import { HipSetoutTool } from "./components/roof/hip-setout-tool.tsx";
import { CreeperTool } from "./components/roof/creeper-tool.tsx";
import { LtJunctionTool } from "./components/roof/lt-junction-tool.tsx";

export default function App() {
  return (
    <HashRouter>
      <UnlockProvider>
        <div className="min-h-dvh pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/gable" element={<GableEndsTool />} />
            <Route path="/common" element={<CommonRafterTool />} />
            <Route path="/hip" element={<HipSetoutTool />} />
            <Route path="/creeper" element={<CreeperTool />} />
            <Route path="/junction" element={<LtJunctionTool />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </UnlockProvider>
    </HashRouter>
  );
}
