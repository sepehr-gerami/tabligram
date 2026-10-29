import { Badge } from "@/components/ui/badge";
import type { Tone } from "@/lib/constants";

export const StatusBadge = ({ meta }: { meta: { label: string; tone: Tone } }) => <Badge tone={meta.tone}>{meta.label}</Badge>;
