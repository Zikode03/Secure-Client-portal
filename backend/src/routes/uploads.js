import express from "express";

const router = express.Router();

router.use((_req, res) => {
  return res.status(410).json({
    error: "Document file uploads are disabled in this system.",
  });
});

export default router;
