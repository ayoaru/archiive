const { getAuth } = require("@clerk/express");

// Rejects any request without a signed-in Clerk session and exposes the
// user's id as req.userId for the routes. Must run after clerkMiddleware().
// (Clerk's own requireAuth() redirects to a sign-in page, which suits page
// apps but not a JSON API, so we return a 401 instead.)
const requireUser = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
};

module.exports = { requireUser };
