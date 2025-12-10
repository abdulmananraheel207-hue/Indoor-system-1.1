// App.jsx - Clean version
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginSelector from "./components/LoginSelector";
import MainApp from "./components/MainApp";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginSelector />} />
        <Route path="/home" element={<MainApp />} />
        {/* Add a catch-all route without Navigate */}
        <Route path="*" element={<LoginSelector />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
