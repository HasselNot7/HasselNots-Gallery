import { fetchSettings } from "@/lib/api-server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";

export default async function HomePage() {
  let settings = null;
  try {
    settings = await fetchSettings();
  } catch {
    // use defaults
  }

  return (
    <>
      <Navbar />
      <HeroSection
        heroTitle={settings?.hero_title}
        heroDescription={settings?.hero_description}
        heroIcon={settings?.hero_icon}
        heroIconUrl={settings?.hero_icon_url}
        shaderColors={{
          color1: settings?.bg_color1,
          color2: settings?.bg_color2,
          color3: settings?.bg_color3,
          color4: settings?.bg_color4,
          color5: settings?.bg_color5,
          color6: settings?.bg_color6,
          base: settings?.bg_base,
          gradientSize: settings?.hero_gradient_size ? parseFloat(settings.hero_gradient_size) : undefined,
          gradientCount: settings?.hero_gradient_count ? parseFloat(settings.hero_gradient_count) : undefined,
          speed: settings?.hero_speed ? parseFloat(settings.hero_speed) : undefined,
          color1Weight: settings?.hero_color1_weight ? parseFloat(settings.hero_color1_weight) : undefined,
          color2Weight: settings?.hero_color2_weight ? parseFloat(settings.hero_color2_weight) : undefined,
        }}
      />
      <Footer />
    </>
  );
}
