import { Routes, Route } from "react-router-dom";
import { Dashboard } from "./dashboard";
import { Compare } from "./compare";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        // create 3 params year, circuit, session
        <Route
          path="/dashboard/:year/:circuit/:session"
          element={<Compare />}
        />
      </Routes>
    </>
  );
}

export default App;
