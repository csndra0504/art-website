import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { ArtworkDetail } from "./pages/ArtworkDetail";
import { Events } from "./pages/Events";
import { Commissions } from "./pages/Commissions";
import { Subscribe } from "./pages/Subscribe";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/artwork/:slug" element={<ArtworkDetail />} />
          <Route path="/events" element={<Events />} />
          <Route path="/commissions" element={<Commissions />} />
          <Route path="/subscribe" element={<Subscribe />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
