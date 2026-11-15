import { PageHeader } from "../components/common/PageHeader";

export default function Legal({ kind }: { kind: "privacy" | "terms" }) {
  const privacy = kind === "privacy";
  return (
    <>
      <PageHeader title={privacy ? "Privacy Policy" : "Terms & Conditions"} />
      <section className="section">
        <div className="container-page max-w-3xl space-y-5 leading-relaxed text-charcoal/80">
          {privacy ? (
            <>
              <h2 className="text-2xl">What we will collect</h2>
              <p>Information you provide through forms (for example name, phone, email, hair details and uploaded photographs) to handle bookings, consultations, orders and enquiries.</p>
              <h2 className="text-2xl">Marketing</h2>
              <p>Marketing messages will only be sent where you have given separate, optional consent.</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl">Online orders</h2>
              <p>Online product orders require full payment before an order is confirmed.</p>
              <h2 className="text-2xl">Consultations</h2>
              <p>Online photo consultations are offered subject to the business's stated policy.</p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
