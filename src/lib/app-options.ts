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
  const [{ data: rows, error }, { data: provinces, error: provinceError }] =
    await Promise.all([
      supabase.from("destinations").select("category").eq("status", "Activo"),
      supabase
        .from("destinations")
        .select("province")
        .eq("status", "Activo")
        .order("province"),
    ]);
  if (error) throw error;
  if (provinceError) throw provinceError;
  const styles = [
    ...new Set(
      (rows ?? [])
        .flatMap(({ category }) =>
          String(category)
            .split("/")
            .map((value) => value.trim()),
        )
        .filter(Boolean),
    ),
  ].sort();
  return {
    styles: ["Todo", ...styles],
    provinces: [
      ...new Set(
        (provinces ?? []).map(({ province }) => province).filter(Boolean),
      ),
    ] as string[],
  };
}
