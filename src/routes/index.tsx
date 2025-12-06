import { Routes, Route } from "react-router-dom";
import HomePage from "@/pages/Home";
import DeepfakeGeneratePage from "@/pages/Generate/Deepfake";
import GeneralGeneratePage from "@/pages/Generate/General";
import FakeDetectPage from "@/pages/Detect/Fake";
import UnsafeDetectPage from "@/pages/Detect/Unsafe";
import DataOutputPage from "@/pages/Data/Output";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/generate/deepfake" element={<DeepfakeGeneratePage />} />
      <Route path="/generate/general" element={<GeneralGeneratePage />} />
      <Route path="/detect/fake" element={<FakeDetectPage />} />
      <Route path="/detect/unsafe" element={<UnsafeDetectPage />} />
      <Route path="/data/output" element={<DataOutputPage />} />
    </Routes>
  );
};

export default AppRoutes;
