import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { ArtworkDetail } from "./pages/ArtworkDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/artwork/:slug" element={<ArtworkDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
