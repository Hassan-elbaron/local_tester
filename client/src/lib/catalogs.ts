// ─── Shared catalog data used in Settings + Companies ────────────────────────

export const SOCIAL_CATALOG = [
  { type: "facebook",  label: "Facebook",          color: "#1877F2", icon: "📘", fields: [{ key: "page_access_token", label: "Page Access Token" }, { key: "page_id", label: "Page ID" }], link: "https://developers.facebook.com", hint: "Meta Developers → Create App → Generate Page Access Token" },
  { type: "instagram", label: "Instagram",          color: "#E4405F", icon: "📸", fields: [{ key: "access_token", label: "Access Token" }, { key: "business_account_id", label: "Business Account ID" }], link: "https://developers.facebook.com", hint: "Meta Business Suite → Settings → Instagram API" },
  { type: "twitter",   label: "Twitter / X",        color: "#000000", icon: "🐦", fields: [{ key: "bearer_token", label: "Bearer Token" }, { key: "api_key", label: "API Key" }, { key: "api_secret", label: "API Secret" }], link: "https://developer.twitter.com", hint: "Twitter Developer Portal → Projects → Keys" },
  { type: "tiktok",    label: "TikTok",             color: "#010101", icon: "🎵", fields: [{ key: "access_token", label: "Access Token" }, { key: "advertiser_id", label: "Advertiser ID" }], link: "https://ads.tiktok.com/marketing_api", hint: "TikTok Marketing API → Create App" },
  { type: "linkedin",  label: "LinkedIn",           color: "#0A66C2", icon: "💼", fields: [{ key: "access_token", label: "Access Token" }, { key: "company_id", label: "Company Page ID" }], link: "https://www.linkedin.com/developers", hint: "LinkedIn Developers → Create App → Auth" },
  { type: "youtube",   label: "YouTube",            color: "#FF0000", icon: "▶️", fields: [{ key: "api_key", label: "YouTube Data API Key" }, { key: "channel_id", label: "Channel ID" }], link: "https://console.cloud.google.com", hint: "Google Cloud Console → APIs → YouTube Data API v3" },
  { type: "snapchat",  label: "Snapchat",           color: "#FFFC00", icon: "👻", fields: [{ key: "client_id", label: "Client ID" }, { key: "client_secret", label: "Client Secret" }], link: "https://businesshelp.snapchat.com", hint: "Snap Business → Marketing API" },
  { type: "whatsapp",  label: "WhatsApp Business",  color: "#25D366", icon: "💬", fields: [{ key: "access_token", label: "Access Token" }, { key: "phone_number_id", label: "Phone Number ID" }], link: "https://developers.facebook.com/docs/whatsapp", hint: "Meta Developers → WhatsApp → Business API" },
];

export const ANALYTICS_CATALOG = [
  { type: "website",      label: "الموقع الإلكتروني",        color: "#6366F1", icon: "🌐", fields: [{ key: "url", label: "Website URL" }, { key: "sitemap_url", label: "Sitemap URL (optional)" }], hint: "أدخل رابط الموقع لتحليل المحتوى والـ SEO" },
  { type: "ga4",          label: "Google Analytics 4",        color: "#F9A825", icon: "📊", fields: [{ key: "measurement_id", label: "Measurement ID (G-XXXXXXXX)" }, { key: "api_secret", label: "API Secret" }], link: "https://analytics.google.com", hint: "Admin → Data Streams → Measurement Protocol API secrets" },
  { type: "gtm",          label: "Google Tag Manager",        color: "#4285F4", icon: "🏷️", fields: [{ key: "container_id", label: "Container ID (GTM-XXXXXXX)" }], link: "https://tagmanager.google.com", hint: "Admin → Container Settings → Container ID" },
  { type: "gsc",          label: "Google Search Console",     color: "#34A853", icon: "🔍", fields: [{ key: "site_url", label: "Site URL" }], link: "https://search.google.com/search-console", hint: "Search Console → Settings → Users & Permissions" },
  { type: "meta_pixel",   label: "Meta Pixel",                color: "#1877F2", icon: "🎯", fields: [{ key: "pixel_id", label: "Pixel ID" }], link: "https://business.facebook.com/events_manager", hint: "Events Manager → Pixels" },
  { type: "tiktok_pixel", label: "TikTok Pixel",              color: "#010101", icon: "🎯", fields: [{ key: "pixel_id", label: "Pixel ID" }, { key: "access_token", label: "Access Token" }], link: "https://ads.tiktok.com", hint: "TikTok Ads Manager → Assets → Events" },
  { type: "hotjar",       label: "Hotjar",                    color: "#FD3A5C", icon: "🔥", fields: [{ key: "site_id", label: "Site ID" }], link: "https://www.hotjar.com", hint: "Hotjar → Settings → Sites & Organizations" },
  { type: "semrush",      label: "SEMrush",                   color: "#FF642D", icon: "📈", fields: [{ key: "api_key", label: "API Key" }], link: "https://www.semrush.com/api-analytics", hint: "Account → API Key" },
];
