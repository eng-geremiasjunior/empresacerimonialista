"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ClientFormState = { error: string } | { ok: true } | null;

function readForm(formData: FormData) {
  const get = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value === "" ? null : value;
  };
  return {
    name: String(formData.get("name") ?? "").trim(),
    phone: get("phone"),
    whatsapp: get("whatsapp"),
    email: get("email"),
    cpf: get("cpf"),
    instagram: get("instagram"),
    address: get("address"),
    city: get("city"),
    birthday: get("birthday"),
    notes: get("notes"),
  };
}

function validate(form: ReturnType<typeof readForm>): string | null {
  if (!form.name) return "Informe o nome do cliente.";
  if (form.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(form.birthday)) {
    return "Data de nascimento inválida.";
  }
  return null;
}

export async function createClientRecord(
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const form = readForm(formData);
  const invalid = validate(form);
  if (invalid) return { error: invalid };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("clients")
    .insert({ cerimonialista_id: user.id, ...form })
    .select("id")
    .single();

  if (error) {
    return { error: "Não foi possível salvar o cliente. Tente novamente." };
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function updateClientRecord(
  clientId: string,
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const form = readForm(formData);
  const invalid = validate(form);
  if (invalid) return { error: invalid };

  const supabase = createClient();
  const { error } = await supabase
    .from("clients")
    .update(form)
    .eq("id", clientId);

  if (error) {
    return { error: "Não foi possível salvar o cliente. Tente novamente." };
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}
