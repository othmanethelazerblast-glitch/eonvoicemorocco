import { Text, View } from "react-native";
import { trpc } from "@/lib/trpc";

export default function DashboardScreen() {
  const organization = trpc.organization.current.useQuery(undefined, { retry: false });

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Tableau de bord</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>
        {organization.isLoading && "Chargement..."}
        {organization.isError && "Connectez-vous pour voir vos societes."}
        {organization.data?.name}
      </Text>
    </View>
  );
}
