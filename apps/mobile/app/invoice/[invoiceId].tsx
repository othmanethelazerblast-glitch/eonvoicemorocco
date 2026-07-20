import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  issued: "Emise",
  submitted: "Soumise",
  cleared: "Validee (DGI)",
  rejected: "Rejetee",
  void: "Annulee",
};

export default function InvoiceDetailScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const invoice = trpc.invoice.getById.useQuery({ invoiceId });

  const issue = trpc.invoice.issue.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.invoice.getById.invalidate({ invoiceId }),
        utils.invoice.listByCompany.invalidate(),
      ]);
    },
  });

  if (invoice.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!invoice.data) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Text>Facture introuvable.</Text>
      </View>
    );
  }

  const data = invoice.data;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60, gap: 16 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable onPress={() => router.back()}>
        <Text style={{ color: "#2563eb", fontSize: 14 }}>Retour</Text>
      </Pressable>

      <View>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>
          {data.invoiceNumber ?? "Brouillon"}
        </Text>
        <Text style={{ color: "#666", marginTop: 2 }}>
          {data.client.name} — {STATUS_LABELS[data.status] ?? data.status}
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        {data.lines.map((line) => (
          <View
            key={line.id}
            style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 12 }}
          >
            <Text style={{ fontWeight: "500" }}>{line.description}</Text>
            <Text style={{ color: "#666", fontSize: 13, marginTop: 2 }}>
              {line.quantity.toString()} x {line.unitPrice.toString()} — TVA{" "}
              {(Number(line.tvaRate) * 100).toFixed(0)}%
            </Text>
          </View>
        ))}
      </View>

      <View style={{ borderTopWidth: 1, borderColor: "#e5e7eb", paddingTop: 12, gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: "#666" }}>Total HT</Text>
          <Text>{data.totalExclTax.toString()} {data.currency}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: "#666" }}>TVA</Text>
          <Text>{data.totalTax.toString()} {data.currency}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontWeight: "700" }}>Total TTC</Text>
          <Text style={{ fontWeight: "700" }}>
            {data.totalInclTax.toString()} {data.currency}
          </Text>
        </View>
      </View>

      {issue.isError && <Text style={{ color: "#dc2626", fontSize: 13 }}>{issue.error.message}</Text>}

      {data.status === "draft" && (
        <Pressable
          onPress={() => issue.mutate({ invoiceId })}
          disabled={issue.isPending}
          style={{
            backgroundColor: "#0f172a",
            borderRadius: 8,
            padding: 14,
            alignItems: "center",
            opacity: issue.isPending ? 0.6 : 1,
          }}
        >
          {issue.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "600" }}>Emettre la facture</Text>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
}
