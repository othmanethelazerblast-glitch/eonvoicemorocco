import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";

interface DraftLine {
  description: string;
  quantity: string;
  unitPrice: string;
  tvaRate: number;
  productId?: string;
}

const TVA_RATES = [0.2, 0.14, 0.1, 0.07, 0];

function emptyLine(): DraftLine {
  return { description: "", quantity: "1", unitPrice: "0", tvaRate: 0.2 };
}

export default function NewInvoiceScreen() {
  const { companyId } = useLocalSearchParams<{ companyId: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const clients = trpc.clients.listByCompany.useQuery({ companyId });
  const products = trpc.products.listByCompany.useQuery({ companyId });

  const [clientId, setClientId] = useState<string | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  const createDraft = trpc.invoice.createDraft.useMutation({
    onSuccess: async (invoice) => {
      await utils.invoice.listByCompany.invalidate({ companyId });
      router.replace(`/invoice/${invoice.id}`);
    },
  });

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function applyProduct(index: number, productId: string) {
    const product = products.data?.find((p) => p.id === productId);
    if (!product) return;
    updateLine(index, {
      productId,
      description: product.name,
      unitPrice: product.defaultUnitPrice.toString(),
      tvaRate: Number(product.tvaRate),
    });
  }

  function submit() {
    if (!clientId) return;
    createDraft.mutate({
      companyId,
      clientId,
      lines: lines.map((line) => ({
        productId: line.productId,
        description: line.description,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        tvaRate: line.tvaRate,
      })),
    });
  }

  const canSubmit =
    !!clientId &&
    lines.length > 0 &&
    lines.every((l) => l.description.trim().length > 0 && Number(l.quantity) > 0 && Number(l.unitPrice) >= 0);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60, gap: 16 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable onPress={() => router.back()}>
        <Text style={{ color: "#2563eb", fontSize: 14 }}>Annuler</Text>
      </Pressable>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Nouvelle facture</Text>

      <View>
        <Text style={{ fontWeight: "600", marginBottom: 8 }}>Client</Text>
        {clients.isLoading && <ActivityIndicator />}
        <View style={{ gap: 8 }}>
          {(clients.data ?? []).map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setClientId(c.id)}
              style={{
                borderWidth: 1,
                borderColor: clientId === c.id ? "#0f172a" : "#e5e7eb",
                backgroundColor: clientId === c.id ? "#0f172a" : "transparent",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Text style={{ color: clientId === c.id ? "#fff" : "#0f172a", fontWeight: "500" }}>{c.name}</Text>
            </Pressable>
          ))}
          {!clients.isLoading && (clients.data ?? []).length === 0 && (
            <Text style={{ color: "#666" }}>Aucun client — creez-en un depuis le site web.</Text>
          )}
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <Text style={{ fontWeight: "600" }}>Lignes</Text>
        {lines.map((line, index) => (
          <View key={index} style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 12, gap: 8 }}>
            {(products.data ?? []).length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {(products.data ?? []).map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => applyProduct(index, p.id)}
                    style={{
                      borderWidth: 1,
                      borderColor: line.productId === p.id ? "#0f172a" : "#d1d5db",
                      borderRadius: 6,
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>{p.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <TextInput
              placeholder="Description"
              value={line.description}
              onChangeText={(v) => updateLine(index, { description: v })}
              style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, padding: 10 }}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                placeholder="Qte"
                keyboardType="numeric"
                value={line.quantity}
                onChangeText={(v) => updateLine(index, { quantity: v })}
                style={{ flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, padding: 10 }}
              />
              <TextInput
                placeholder="Prix unitaire"
                keyboardType="numeric"
                value={line.unitPrice}
                onChangeText={(v) => updateLine(index, { unitPrice: v })}
                style={{ flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, padding: 10 }}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {TVA_RATES.map((rate) => (
                <Pressable
                  key={rate}
                  onPress={() => updateLine(index, { tvaRate: rate })}
                  style={{
                    borderWidth: 1,
                    borderColor: line.tvaRate === rate ? "#0f172a" : "#d1d5db",
                    borderRadius: 6,
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                  }}
                >
                  <Text style={{ fontSize: 12 }}>TVA {(rate * 100).toFixed(0)}%</Text>
                </Pressable>
              ))}
            </ScrollView>
            {lines.length > 1 && (
              <Pressable onPress={() => setLines((prev) => prev.filter((_, i) => i !== index))}>
                <Text style={{ color: "#dc2626", fontSize: 12 }}>Retirer cette ligne</Text>
              </Pressable>
            )}
          </View>
        ))}
        <Pressable onPress={() => setLines((prev) => [...prev, emptyLine()])}>
          <Text style={{ color: "#2563eb", fontSize: 13 }}>+ Ajouter une ligne</Text>
        </Pressable>
      </View>

      {createDraft.isError && (
        <Text style={{ color: "#dc2626", fontSize: 13 }}>{createDraft.error.message}</Text>
      )}

      <Pressable
        onPress={submit}
        disabled={!canSubmit || createDraft.isPending}
        style={{
          backgroundColor: "#0f172a",
          borderRadius: 8,
          padding: 14,
          alignItems: "center",
          opacity: !canSubmit || createDraft.isPending ? 0.5 : 1,
        }}
      >
        {createDraft.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "600" }}>Creer le brouillon</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
