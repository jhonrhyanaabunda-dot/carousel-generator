import type { TemplateId } from "@/types";

// Dealership brand catalog. Each brand has its own card on the templates page
// and its own default content (name, contact, base template) that pre-fills
// the generator when a brand template is clicked.
export type BrandId = "parks-lincoln" | "bmw" | "nissan" | "subaru";

export interface BrandConfig {
  id: BrandId;
  name: string;           // Short label shown on the tab
  fullName: string;       // Used as the default dealership/brand name
  make: string;           // Manufacturer word ("Lincoln") for model-lineup prefix
  category: string;       // OEM / lifestyle category
  primary: string;        // Hex used for placeholder gradient + accent tinting
  secondary: string;      // Secondary tint
  text: string;           // Text color over the gradient
  baseTemplateId: TemplateId;
  defaults: {
    brandName: string;
    headline: string;
    subtitle: string;
    body: string;
    phone: string;
    hours: string;
    website: string;
    address: string;
    ctaText: string;
  };
}

export const BRANDS: BrandConfig[] = [
  {
    id: "parks-lincoln",
    name: "Parks Lincoln",
    fullName: "Parks Lincoln of Longwood",
    make: "Lincoln",
    category: "Luxury",
    primary: "#0B0D0F",
    secondary: "#E8DBC8",
    text: "#FFFFFF",
    baseTemplateId: "premium-dealer",
    defaults: {
      brandName: "Parks Lincoln of Longwood",
      headline: "Visit Parks Lincoln of Longwood.",
      subtitle: "51 years same corner of Seminole County.",
      body:
        "3.0L Twin-Turbo V6 engine. 383 horsepower. 7-passenger seating. 415 lb/ft torque. " +
        "51 years serving Seminole County. 2,605+ verified Google reviews at 4.8 stars. " +
        "Family-owned. Award-winning service.",
      phone: "(407) 268-5050",
      hours: "M-F 7 AM-6 PM · Sat 8 AM-4 PM",
      website: "www.parkslincoln.com",
      address: "3505 N. U.S. 17-92, Longwood, FL 32750",
      ctaText: "Visit Parks Lincoln of Longwood.",
    },
  },
  {
    id: "bmw",
    name: "BMW",
    fullName: "BMW of Your City",
    make: "BMW",
    category: "Performance",
    primary: "#0066B1",
    secondary: "#1C2531",
    text: "#FFFFFF",
    baseTemplateId: "premium-dealer",
    defaults: {
      brandName: "BMW of Your City",
      headline: "The Ultimate Driving Machine.",
      subtitle: "Engineered in Bavaria. Tuned for you.",
      body:
        "M-Performance suspension. 8-speed Steptronic. xDrive intelligent all-wheel drive. " +
        "375 horsepower. 0–60 in 4.3 seconds. iDrive 8 with curved display. " +
        "Certified pre-owned program with 1-year/unlimited-mile warranty.",
      phone: "(555) 234-5678",
      hours: "M-F 9 AM-7 PM · Sat 9 AM-5 PM",
      website: "www.bmwusa.com",
      address: "100 Performance Way, Your City, ST 00000",
      ctaText: "Book your test drive.",
    },
  },
  {
    id: "nissan",
    name: "Nissan",
    fullName: "Big Nissani of Sheffield Village",
    make: "Nissan",
    category: "Mainstream",
    primary: "#C3002F",
    secondary: "#1F1F1F",
    text: "#FFFFFF",
    baseTemplateId: "premium-dealer",
    defaults: {
      brandName: "Big Nissani of Sheffield Village",
      headline: "An authorized Nissan dealer in Sheffield Village since 2014.",
      subtitle: "Innovation that excites.",
      body:
        "ProPILOT Assist 2.0. e-POWER hybrid drivetrain. Intelligent All-Wheel Drive. " +
        "260 horsepower. Zero-Gravity seats. 11+ Nissan models in stock. " +
        "Tier-1 service center with factory-trained technicians.",
      phone: "(440) 934-6001",
      hours: "Mon-Fri 7:30-6 · Sat 8-4",
      website: "www.bignissani90.com",
      address: "5013 Detroit Rd, Sheffield Village, OH",
      ctaText: "Schedule a visit.",
    },
  },
  {
    id: "subaru",
    name: "Subaru",
    fullName: "Subaru of Your City",
    make: "Subaru",
    category: "Adventure",
    primary: "#003DA5",
    secondary: "#19232E",
    text: "#FFFFFF",
    baseTemplateId: "premium-dealer",
    defaults: {
      brandName: "Subaru of Your City",
      headline: "Love. It's what makes a Subaru, a Subaru.",
      subtitle: "Symmetrical All-Wheel Drive on every model.",
      body:
        "EyeSight Driver Assist. SUBARU BOXER engine. Symmetrical AWD. " +
        "Top safety pick+ for 10 consecutive years. 98% of Subaru vehicles sold in the " +
        "last 10 years are still on the road. Subaru Love Promise: building a better world.",
      phone: "(555) 765-4321",
      hours: "M-F 8 AM-6 PM · Sat 9 AM-5 PM",
      website: "www.subaru.com",
      address: "200 Adventure Trail, Your City, ST 00000",
      ctaText: "Find your Subaru.",
    },
  },
];

export function getBrand(id: string | null | undefined): BrandConfig | undefined {
  if (!id) return undefined;
  return BRANDS.find((b) => b.id === id);
}
