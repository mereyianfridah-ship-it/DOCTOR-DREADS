import { ConsultationForm } from "../components/consultation/ConsultationForm";
import { PageHeader } from "../components/common/PageHeader";

export default function Consultation() {
  return (
    <>
      <PageHeader 
        eyebrow="Consultation" 
        title="Start your loc journey" 
        description="Tell us about your hair and goals. Loc installation starts with a consultation so we can recommend the right approach and quote." 
      />
      <section className="section">
        <div className="container-page max-w-3xl">
          <ConsultationForm />
        </div>
      </section>
    </>
  );
}