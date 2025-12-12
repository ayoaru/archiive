import './App.css';
import React from 'react';
import NavBar from './components/NavBar';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/home';
import AddItem from './pages/addItem';

function App() {
  return (
    <React.Fragment>
      <Router>
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pages/home" element={<Home />} />
          <Route path="/pages/addItem" element={<AddItem />} />
        </Routes>
      </Router>
    </React.Fragment>
  );
}

export default App;
