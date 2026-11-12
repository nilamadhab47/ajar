import { BRAND } from "@/lib/config";
import { SiteNav } from "@/site/components/SiteNav";
import { SITE } from "@/site/config";
import { DoorHero } from "@/site/sections/DoorHero";
import { Clocks } from "@/site/sections/Clocks";
import { DeskDrops } from "@/site/sections/DeskDrops";
import { Invitation } from "@/site/sections/Invitation";
import { Knock } from "@/site/sections/Knock";
import { LivingWorld } from "@/site/sections/LivingWorld";
import { WorkingApart } from "@/site/sections/WorkingApart";
import { Yours } from "@/site/sections/Yours";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: BRAND.product,
  description: SITE.description,
  url: SITE.url,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteNav />
      <main>
        <DoorHero />
        <WorkingApart />
        <LivingWorld />
        <Knock />
        <DeskDrops />
        <Clocks />
        <Yours />
      </main>
      <Invitation />
    </>
  );
}
