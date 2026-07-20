import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { SignedIn, SignedOut, useAuth, useClerk, useOrganizationList } from "@clerk/clerk-expo";
import { trpc } from "@/lib/trpc";

function OrganizationPicker() {
  const { isLoaded, userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const memberships = userMemberships.data ?? [];

  if (memberships.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Text style={{ textAlign: "center", color: "#666" }}>
          Aucune organisation. Creez-en une depuis le site web pour continuer.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 4 }}>Choisir une organisation</Text>
      {memberships.map((m) => (
        <Pressable
          key={m.id}
          onPress={() => setActive?.({ organization: m.organization.id })}
          style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 14 }}
        >
          <Text style={{ fontWeight: "500" }}>{m.organization.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function CompanyList() {
  const router = useRouter();
  const { signOut } = useClerk();
  const companies = trpc.company.list.useQuery();

  return (
    <View style={{ flex: 1, paddingTop: 60 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "700" }}>Societes</Text>
        <Pressable onPress={() => signOut()}>
          <Text style={{ color: "#dc2626", fontSize: 13 }}>Deconnexion</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
        data={companies.data ?? []}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={companies.isFetching} onRefresh={() => companies.refetch()} />}
        ListEmptyComponent={
          !companies.isLoading ? (
            <Text style={{ color: "#666" }}>Aucune societe pour le moment.</Text>
          ) : (
            <ActivityIndicator />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/company/${item.id}`)}
            style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 16 }}
          >
            <Text style={{ fontWeight: "600", fontSize: 16 }}>{item.name}</Text>
            <Text style={{ color: "#666", fontSize: 13, marginTop: 2 }}>{item.city}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function AuthedHome() {
  const { orgId } = useAuth();
  if (!orgId) {
    return <OrganizationPicker />;
  }
  return <CompanyList />;
}

export default function IndexScreen() {
  return (
    <>
      <SignedOut>
        <Redirect href="/sign-in" />
      </SignedOut>
      <SignedIn>
        <AuthedHome />
      </SignedIn>
    </>
  );
}
