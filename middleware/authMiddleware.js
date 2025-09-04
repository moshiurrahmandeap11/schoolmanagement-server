const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.cookies.token; // cookie থেকে token
  if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
    req.user = decoded; // user info
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: "Invalid Token" });
  }
};

module.exports = verifyToken;
