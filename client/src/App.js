import './App.css';
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react';
import { clerkAppearance } from './theme';
import { ColorModeProvider, useColorMode } from './colorMode';
import { AxiosAuth } from './auth';
import { AccentSync } from './profile';
import ProtectedRoute from './components/ProtectedRoute';
import { SignInPage, SignUpPage } from './pages/signIn';
import Home from './pages/home';
import Closet from './pages/closet';
import Wishlist from './pages/wishlist';
import Outfit from './pages/outfit';
import AddOutfit from './pages/addOutfit';
import AddItem from './pages/addItem';
import UpdateItem from './pages/updateItem';
import UpdateOutfit from './pages/updateOutfit';
import UpdateWishlistItem from './pages/updateWishlistItem';
import SearchItem from './pages/searchItem';
import Settings from './pages/settings';

// Lives inside the Router so Clerk can navigate with react-router.
const ClerkWithRoutes = () => {
  const navigate = useNavigate();
  const { mode, accent } = useColorMode();

  return (
    <ClerkProvider
      publishableKey={process.env.REACT_APP_CLERK_PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/sign-in"
      appearance={clerkAppearance(mode, accent)}
    >
      <AxiosAuth />
      <AccentSync />
      <Routes>
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/pages/home" element={<Home />} />
          <Route path="/pages/closet" element={<Closet />} />
          <Route path="/pages/wishlist" element={<Wishlist />} />
          <Route path="/pages/outfit" element={<Outfit />} />
          <Route path="/pages/addOutfit" element={<AddOutfit />} />
          <Route path="/pages/addItem" element={<AddItem />} />
          <Route path="/pages/searchItem" element={<SearchItem />} />
          <Route path="/pages/settings" element={<Settings />} />
          <Route path="/closet/update/:id" element={<UpdateItem />} />
          <Route path="/outfit/update/:id" element={<UpdateOutfit />} />
          <Route path="/wishlist/update/:id" element={<UpdateWishlistItem />} />
        </Route>
      </Routes>
    </ClerkProvider>
  );
};

function App() {
  return (
    <ColorModeProvider>
      <Router>
        <ClerkWithRoutes />
      </Router>
    </ColorModeProvider>
  );
}

export default App;
