/**
 * DEMONSTRATION account data only. Replace with Supabase queries
 * (auth.getUser(), bookings, orders) in the backend phase.
 */
export const demoProfile = {
  fullName: "Demo Customer",
  email: "demo.customer@example.com",
  phone: "+254 000 000 000",
};

export const demoBookings = [
  { id: "BK-DEMO-001", service: "Loc Retouching", date: "2026-11-20", time: "10:00", location: "Salon", status: "Upcoming" },
  { id: "BK-DEMO-002", service: "Loc Maintenance", date: "2026-09-12", time: "14:00", location: "Salon", status: "Completed" },
];

export const demoOrders = [
  { id: "ORD-DEMO-001", date: "2026-10-02", items: "Loc Butter Moisturizer × 1, Wide-Tooth Comb × 1", total: 1550, status: "Delivered" },
  { id: "ORD-DEMO-002", date: "2026-08-18", items: "Strong Hold Moulding Gel × 2", total: 1800, status: "Delivered" },
];
