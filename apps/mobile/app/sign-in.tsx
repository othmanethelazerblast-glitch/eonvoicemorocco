import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";

/**
 * Email + password sign-in. Clerk Expo has no prebuilt <SignIn> component
 * (unlike @clerk/nextjs on web), so this is hand-rolled. Assumes the
 * password strategy is enabled in the Clerk dashboard — same instance the
 * web app uses via its hosted SignInButton/SignUpButton modal.
 */
export default function SignInScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
      } else {
        setError("Connexion incomplete — verifiez vos identifiants.");
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "errors" in err
          ? // @ts-expect-error Clerk's ClerkAPIResponseError shape
            (err.errors?.[0]?.message ?? "Erreur de connexion.")
          : "Erreur de connexion.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 8 }}>Facturation Conforme</Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          borderColor: "#d1d5db",
          borderRadius: 8,
          padding: 12,
        }}
      />
      <TextInput
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          borderColor: "#d1d5db",
          borderRadius: 8,
          padding: 12,
        }}
      />

      {error && <Text style={{ color: "#dc2626", fontSize: 13 }}>{error}</Text>}

      <Pressable
        onPress={handleSubmit}
        disabled={submitting || !email || !password}
        style={{
          backgroundColor: "#0f172a",
          borderRadius: 8,
          padding: 14,
          alignItems: "center",
          opacity: submitting || !email || !password ? 0.6 : 1,
        }}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "600" }}>Se connecter</Text>}
      </Pressable>
    </View>
  );
}
