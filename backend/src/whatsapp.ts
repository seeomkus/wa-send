import { Client, LocalAuth } from "whatsapp-web.js";
import QRCode from "qrcode";
import { logMessage } from "./logger";

type Status = "starting" | "qr" | "ready" | "disconnected";

class WhatsAppService {
  private client: Client;
  private status: Status = "starting";
  private qrDataUrl: string | null = null;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
        ],
        protocolTimeout: 120000,
      },
    });

    this.client.on("qr", async (qr) => {
      this.status = "qr";
      this.qrDataUrl = await QRCode.toDataURL(qr);
    });

    this.client.on("ready", () => {
      this.status = "ready";
      this.qrDataUrl = null;
    });

    this.client.on("disconnected", () => {
      this.status = "disconnected";
    });

    this.client.initialize();
  }

  getStatus() {
    return { status: this.status, qr: this.qrDataUrl };
  }

  async sendMessage(phone: string, message: string) {
    if (this.status !== "ready") {
      throw new Error("WhatsApp client belum siap. Silakan scan QR terlebih dahulu.");
    }
    const digits = phone.replace(/\D/g, "");

    const numberId = await this.client.getNumberId(digits);
    if (!numberId) {
      throw new Error(`Nomor ${phone} tidak terdaftar di WhatsApp.`);
    }

    const result = await this.client.sendMessage(numberId._serialized, message);
    logMessage(phone, message);
    return result;
  }
}

export const whatsappService = new WhatsAppService();
