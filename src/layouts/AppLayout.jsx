import QuadApp from "../QuadApp.jsx";

/**
 * Main application shell (swap, pools, privpay, profile, landing).
 * Routed at `/*` separately from {@link DocsLayout} at `/docs/*`.
 */
export default function AppLayout() {
  return <QuadApp />;
}
