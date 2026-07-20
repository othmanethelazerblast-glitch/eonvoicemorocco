import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
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

const STATUS_COLORS: Record<string, string> = {
  draft: "#64748b",
  issued: "#2563eb",
  submitted: "#d97706",
  cleared: "#16a34a",
  rejected: "#dc2626",
  void: "#94a3b8",
};

export default function CompanyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const invoices = trpc.invoice.listByCompany.useQuery({ companyId: id });

  return (
    <View style={{ flex: 1, paddingTop: 60 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          marginBottom: 12,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: "#2563eb", fontSize: 14 }}>Retour</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: "/invoice/new", params: { companyId: id } })}
          style={{ backgroundColor: "#0f172a", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>+ Facture</Text>
        </Pressable>
      </View>

      <Text style={{ fontSize: 22, fontWeight: "700", paddingHorizontal: 20, marginBottom: 12 }}>Factures</Text>

      <FlatList
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 40 }}
        data={invoices.data ?? []}
        keyExtractor={(inv) => inv.id}
        refreshControl={<RefreshControl refreshing={invoices.isFetching} onRefresh={() => invoices.refetch()} />}
        ListEmptyComponent={
          !invoices.isLoading ? (
            <Text style={{ color: "#666" }}>Aucune facture pour le moment.</Text>
          ) : (
            <ActivityIndicator />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/invoice/${item.id}`)}
            style={{
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 10,
              padding: 16,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text style={{ fontWeight: "600", fontSize: 15 }}>
                {item.invoiceNumber ?? "Brouillon"} — {item.client.name}
              </Text>
              <Text style={{ color: "#666", fontSize: 13, marginTop: 2 }}>
                {item.totalInclTax.toString()} {item.currency}
              </Text>
            </View>
            <Text
              style={{
                color: STATUS_COLORS[item.status] ?? "#64748b",
                fontWeight: "600",
                fontSize: 12,
              }}
            >
              {STATUS_LABELS[item.status] ?? item.status}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
