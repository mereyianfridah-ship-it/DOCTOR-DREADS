import { HeroSection } from "../components/home/HeroSection";
import { IntroSection } from "../components/home/IntroSection";
import { FeaturedServices } from "../components/home/FeaturedServices";
import { FeaturedProducts } from "../components/home/FeaturedProducts";
import { WhyChoose } from "../components/home/WhyChoose";
import { GalleryPreview } from "../components/home/GalleryPreview";
import { Testimonials } from "../components/home/Testimonials";
import { BookingCTA } from "../components/home/BookingCTA";

export default function Home() {
  return (
    <>
      <HeroSection />
      <IntroSection />
      <FeaturedServices />
      <FeaturedProducts />
      <WhyChoose />
      <GalleryPreview />
      <Testimonials />
      <BookingCTA />
    </>
  );
}
