import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ProjectPlatform } from "@/lib/api";

const PLATFORMS: {
  id: ProjectPlatform;
  title: string;
  icon: "logo-apple" | "logo-android" | "phone-portrait";
  disabled?: boolean;
}[] = [
  { id: "ios", title: "iOS", icon: "logo-apple" },
  { id: "android", title: "Android", icon: "logo-android", disabled: true },
  { id: "both", title: "Both", icon: "phone-portrait", disabled: true },
];

interface PlatformSelectorProps {
  value: ProjectPlatform;
  onChange: (platform: ProjectPlatform) => void;
}

/**
 * Target-platform picker. iOS is the default and only available option today —
 * Android / Both are shown but disabled ("soon") until support lands.
 */
export function PlatformSelector({ value, onChange }: PlatformSelectorProps) {
  return (
    <View style={styles.segmented}>
      {PLATFORMS.map((p) => {
        const active = value === p.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => !p.disabled && onChange(p.id)}
            disabled={p.disabled}
            style={[
              styles.segment,
              active && styles.segmentActive,
              p.disabled && styles.segmentDisabled,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: p.disabled }}
          >
            <Ionicons
              name={p.icon}
              size={14}
              color={active ? "#fff" : p.disabled ? "#9CA3AF" : "#111"}
            />
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {p.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 4,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  segmentActive: { backgroundColor: "#111" },
  segmentDisabled: { opacity: 0.5 },
  segmentText: { fontSize: 14, fontWeight: "700", color: "#374151" },
  segmentTextActive: { color: "#fff" },
});