import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SheetHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Right-side action slot (e.g. a "Create" button). */
  right?: ReactNode;
  /** Overrides for the header row (padding/spacing when the parent already insets). */
  style?: StyleProp<ViewStyle>;
  closeTestID?: string;
}

/**
 * In-content header for iOS formSheet screens.
 *
 * The liquid-glass sheets have NO native header (react-native-screens formSheet
 * bugs #3092 / #4275 hide the content when a native header is used), so every
 * sheet screen renders this header itself: ✕ close, title/subtitle, and an
 * optional right-side action.
 */
export function SheetHeader({
  title,
  subtitle,
  onClose,
  right,
  style,
  closeTestID = "close-button",
}: SheetHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <Pressable
        onPress={onClose}
        testID={closeTestID}
        hitSlop={8}
        style={({ pressed }) => [styles.closeButton, pressed && styles.closePressed]}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Ionicons name="close" size={17} color="#1C1C1E" />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    // Keep the header above the scroll content: never shrink it and paint it
    // on top — a formSheet ScrollView can otherwise be laid out over the header
    // (react-native-screens Fabric quirk).
    flexShrink: 0,
    zIndex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  closePressed: { opacity: 0.6 },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5, color: "#111" },
  subtitle: { marginTop: 2, fontSize: 13, color: "#6B7280" },
});