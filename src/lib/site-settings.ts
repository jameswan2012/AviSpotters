import path from "node:path";
import { fileExists, uploadsRoot } from "@/lib/uploads";

export type DynamicWatermarkSetting = {
  enabled: boolean;
  position: { x: number; y: number };
  fontSize: number;
  opacity: number;
  font: "system" | "rounded" | "serif" | "mono" | "script";
  density?: number;
  angleDeg?: number;
  speedSec?: number;
  opacityRight?: number;
  opacityLeft?: number;
};

export type SiteFooterContactLink = {
  label: string;
  value: string;
  href?: string | null;
};

export type SiteFooterFriendLink = {
  label: string;
  href: string;
};

export type EmailDeliveryProvider = "auto" | "smtp" | "resend" | "geeksend";

export type SiteBrandSetting = {
  logoUrl: string | null;
};

export type SiteFooterContactItem = {
  type: "wechat" | "qq" | "x" | "website" | "facebook" | "whatsapp" | "xiaohongshu" | "weibo";
  label: string;
  url: string;
};

export type SiteFooterSetting = {
  icp: string | null;
  contactLinks: SiteFooterContactItem[];
  friendLinks: Array<{ label: string; url: string }>;
  groupQrUrl: string | null;
};

export async function getRegistrationSetting(): Promise<any> {
  return {
    enabled: true,
    emailVerificationEnabled: true,
    phoneFeatureEnabled: true,
    phoneRegistrationEnabled: true,
    forcePhoneLogin: false,
  };
}

export async function getEmailDeliverySettingForSend(): Promise<any> {
  return {
    provider: (process.env.MAIL_PROVIDER || "auto").trim().toLowerCase(),
  };
}

export const SITE_FOOTER_KEY = "siteFooter";

export async function getAiTrainingSetting(): Promise<any> {
  return { enabled: false };
}

export async function setAiTrainingSetting(value: unknown) {
  return value;
}

export async function getAiReviewSettingForSend(): Promise<any> {
  return { enabled: false, allowUploaderSelfUse: false };
}

export async function getAiReviewSettingAdminView(): Promise<any> {
  return { enabled: false, allowUploaderSelfUse: false };
}

export async function setAiReviewSetting(value: unknown) {
  return value;
}

export async function getDynamicWatermarkSetting(): Promise<any> {
  return {
    enabled: false,
    position: { x: 0.85, y: 0.85 },
    fontSize: 24,
    opacity: 0.4,
    font: "system",
    density: 1,
    angleDeg: -22,
    speedSec: 60,
    opacityRight: 0,
    opacityLeft: 0.18,
  } satisfies DynamicWatermarkSetting;
}

export async function setDynamicWatermarkSetting(value: unknown) {
  return value;
}

export async function getEmailSmtpSettingAdminView(): Promise<any> {
  return { host: "", port: 587, user: "", from: "" };
}

export async function getEmailDeliverySettingAdminView(): Promise<any> {
  return { provider: (process.env.MAIL_PROVIDER || "auto").trim().toLowerCase() };
}

export async function setEmailSmtpSetting(value: unknown) {
  return value;
}

export async function setEmailDeliverySetting(value: unknown) {
  return value;
}

export async function getSiteFooterSettingAdminView(): Promise<any> {
  return { icp: null, contactLinks: [] as SiteFooterContactLink[], friendLinks: [] as SiteFooterFriendLink[] };
}

export async function getSiteFooterSetting(): Promise<SiteFooterSetting> {
  return {
    icp: null,
    contactLinks: [],
    friendLinks: [],
    groupQrUrl: null,
  };
}

export async function setSiteFooterSetting(value: unknown) {
  return value;
}

export async function setSiteFooterGroupQr(value: unknown) {
  return value;
}

export async function setSiteBrandLogo(value: unknown) {
  return value;
}

export async function getSiteBrandSetting(): Promise<SiteBrandSetting> {
  const candidates = [
    "site/logo-dark.png",
    "site/logo-dark.jpg",
    "site/logo-light.png",
    "site/logo-light.jpg",
  ];
  for (const rel of candidates) {
    if (await fileExists(path.join(uploadsRoot(), rel))) {
      return {
        logoUrl: "/api/site/logo",
      };
    }
  }
  return {
    logoUrl: null,
  };
}

export async function getMaintenanceSetting(): Promise<any> {
  return { enabled: false, message: "" };
}

export async function setMaintenanceSetting(value: unknown) {
  return value;
}

export async function getPhotoCategorySetting(): Promise<any> {
  return null;
}

export async function setPhotoCategorySetting(value: unknown) {
  return value;
}

export async function setRegistrationSetting(value: unknown) {
  return value;
}

export async function getActiveNews(): Promise<any> {
  return null;
}
