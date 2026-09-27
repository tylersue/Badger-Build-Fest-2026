/** The seed the demo store reads: Proxier startup content in demo mode, the original presentation seed otherwise. */
import * as classic from "./seed";
import * as proxier from "@/lib/demo-backend/seed";
import { DEMO_MODE } from "@/lib/config/demo";

const active = DEMO_MODE ? proxier : classic;
export const { FLAGS, IDENTITIES, INTERVIEW_TURNS, MARIA, PROFILES, REVIEWS } = active;
