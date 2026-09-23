import express from "express";
import cors from "cors";
import { whatsappService } from "./whatsapp";
import { readHistory, listContacts } from "./logger";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/status", (_req, res) => {
  res.json(whatsappService.getStatus());
});

app.post("/api/send", async (req, res) => {
  const { phone, message } = req.body as { phone?: string; message?: string };

  if (!phone || !message) {
    return res.status(400).json({ error: "phone dan message wajib diisi." });
  }

  try {
    await whatsappService.sendMessage(phone, message);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Gagal mengirim pesan." });
  }
});

app.get("/api/history/:phone", (req, res) => {
  res.json(readHistory(req.params.phone));
});

app.get("/api/contacts", (_req, res) => {
  res.json(listContacts());
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend berjalan di http://localhost:${PORT}`);
});
