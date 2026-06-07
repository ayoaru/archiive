import './App.css';
import React from 'react';
import NavBar from './components/NavBar';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/home';
import Closet from './pages/closet';
import Wishlist from './pages/wishlist';
import AddItem from './pages/addItem';
import UpdateItem from './pages/updateItem';
import UpdateWishlistItem from './pages/updateWishlistItem';
import SearchItem from './pages/searchItem';

function App() {
  return (
    <React.Fragment>
      <Router>
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pages/home" element={<Home />} />
          <Route path="/pages/closet" element={<Closet />} />
          <Route path="/pages/wishlist" element={<Wishlist />} />
          <Route path="/pages/addItem" element={<AddItem />} />
          <Route path="/pages/searchItem" element={<SearchItem />} />
          <Route path="/closet/update/:id" element={<UpdateItem />} />
          <Route path="/wishlist/update/:id" element={<UpdateWishlistItem />} />
        </Routes>
      </Router>
    </React.Fragment>
  );
}

export default App;
