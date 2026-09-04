import type MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ComponentProps } from "react";

import { supabase } from "@/lib/supabase";

export type AppOption = {
  kind: string;
  id: string;
  label_es: string;
  label_en: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"] | null;
  parent_id: string | null;
  allowed_targets: string[] | null;
};

export async function getAppOptions(kind: string) {
  const { data, error } = await supabase.rpc("get_public_app_options", {
    p_kinds: [kind],
  });
  if (error) throw error;
  return (data ?? []) as AppOption[];
}

export async function getPlannerOptions() {
  const [categories, { data: provinces, error: provinceError }] = await Promise.all([
    getAppOptions("destination_category"),
    supabase
      .from("destinations")
      .select("province")
      .eq("status", "Activo")
      .order("province"),
  ]);
  if (provinceError) throw provinceError;
  return {
    categories: categories.filter((option) => option.parent_id === null),
    provinces: [
      ...new Set(
        (provinces ?? []).map(({ province }) => province).filter(Boolean),
      ),
    ] as string[],
  };
}
