declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    MEDIA?: R2Bucket;
    WHATSAPP_ACCESS_TOKEN?: string;
    WHATSAPP_PHONE_NUMBER_ID?: string;
    WHATSAPP_API_VERSION?: string;
    WHATSAPP_AUTH_TEMPLATE_NAME?: string;
    WHATSAPP_AUTH_TEMPLATE_LANGUAGE?: string;
    CUSTOMER_OTP_SECRET?: string;
  }
}
