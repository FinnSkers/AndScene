import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ProfileSelect from './pages/ProfileSelect';
import Home from './pages/Home';
import Browse from './pages/Browse';
import Anime from './pages/Anime';
import Watch from './pages/Watch';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profiles" element={<ProfileSelect />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/anime" element={<Anime />} />
          <Route path="/watch/:type/:id" element={<Watch />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
